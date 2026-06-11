class NetworkManager {
  constructor() {
    this.peer = null;
    this.connections = []; // host: array of client conns; client: [host conn]
    this.role = null; // 'host' | 'client'
    this.localId = null;
    this.playerId = null; // player index in game
    this.playerConfigs = []; // all players (host manages)
    this.roomCode = null;
    this.maxPlayers = 4;

    this.onPlayerJoined = null;
    this.onGameStart = null;
    this.onInputReceived = null;
    this.onStateReceived = null;
    this.onDisconnect = null;
    this.onError = null;
  }

  generateRoomCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
  }

  hostGame(charKey, onReady) {
    this.role = 'host';
    this.roomCode = this.generateRoomCode();
    this.playerId = 0;
    this.playerConfigs = [{ charKey, playerId: 0, ready: false }];

    this.peer = new Peer('smashgame-' + this.roomCode, {
      debug: 0,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      }
    });

    this.peer.on('open', (id) => {
      this.localId = id;
      if (onReady) onReady(this.roomCode);
    });

    this.peer.on('connection', (conn) => {
      if (this.playerConfigs.length >= this.maxPlayers) {
        conn.close();
        return;
      }
      this._setupClientConnection(conn);
    });

    this.peer.on('error', (err) => {
      if (this.onError) this.onError(err.message || err.type);
    });
  }

  joinGame(roomCode, charKey, onConnected) {
    this.role = 'client';
    this.roomCode = roomCode.toUpperCase();

    this.peer = new Peer(undefined, {
      debug: 0,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      }
    });

    this.peer.on('open', (id) => {
      this.localId = id;
      const conn = this.peer.connect('smashgame-' + this.roomCode, {
        reliable: false,
        serialization: 'json',
      });
      this.connections = [conn];
      this._setupHostConnection(conn, charKey, onConnected);
    });

    this.peer.on('error', (err) => {
      if (this.onError) this.onError(err.message || err.type);
    });
  }

  _setupClientConnection(conn) {
    conn.on('open', () => {
      const playerId = this.playerConfigs.length;
      conn.playerId = playerId;
      this.connections.push(conn);

      conn.on('data', (data) => {
        if (data.type === 'input') {
          if (this.onInputReceived) this.onInputReceived(data.playerId, data.state);
        } else if (data.type === 'char_select') {
          const cfg = this.playerConfigs.find(c => c.playerId === data.playerId);
          if (cfg) cfg.charKey = data.charKey;
          this._broadcastLobbyState();
        } else if (data.type === 'ready') {
          const cfg = this.playerConfigs.find(c => c.playerId === data.playerId);
          if (cfg) cfg.ready = true;
          this._broadcastLobbyState();
        }
      });

      conn.on('close', () => {
        this.connections = this.connections.filter(c => c !== conn);
        this.playerConfigs = this.playerConfigs.filter(c => c.playerId !== conn.playerId);
        this._broadcastLobbyState();
        if (this.onDisconnect) this.onDisconnect(conn.playerId);
      });

      // Register player
      this.playerConfigs.push({ charKey: 'blaze', playerId, ready: false });
      conn.send({ type: 'assign', playerId, configs: this.playerConfigs });
      this._broadcastLobbyState();
      if (this.onPlayerJoined) this.onPlayerJoined(playerId, this.playerConfigs);
    });

    conn.on('error', (err) => {
      if (this.onError) this.onError(err.message);
    });
  }

  _setupHostConnection(conn, charKey, onConnected) {
    conn.on('open', () => {
      conn.send({ type: 'join', charKey });
    });

    conn.on('data', (data) => {
      if (data.type === 'assign') {
        this.playerId = data.playerId;
        this.playerConfigs = data.configs;
        if (onConnected) onConnected(this.playerId, this.playerConfigs);
      } else if (data.type === 'lobby_update') {
        this.playerConfigs = data.configs;
        if (this.onPlayerJoined) this.onPlayerJoined(-1, this.playerConfigs);
      } else if (data.type === 'game_start') {
        this.playerConfigs = data.configs;
        if (this.onGameStart) this.onGameStart(data.configs, data.stage);
      } else if (data.type === 'state') {
        if (this.onStateReceived) this.onStateReceived(data.state);
      }
    });

    conn.on('close', () => {
      if (this.onDisconnect) this.onDisconnect(0);
    });
  }

  _broadcastLobbyState() {
    if (this.role !== 'host') return;
    for (const conn of this.connections) {
      if (conn.open) {
        conn.send({ type: 'lobby_update', configs: this.playerConfigs });
      }
    }
    if (this.onPlayerJoined) this.onPlayerJoined(-1, this.playerConfigs);
  }

  sendCharSelect(charKey) {
    if (this.role === 'host') {
      const cfg = this.playerConfigs.find(c => c.playerId === 0);
      if (cfg) cfg.charKey = charKey;
      this._broadcastLobbyState();
    } else {
      this._sendToHost({ type: 'char_select', playerId: this.playerId, charKey });
    }
  }

  sendReady() {
    if (this.role === 'host') {
      const cfg = this.playerConfigs.find(c => c.playerId === 0);
      if (cfg) cfg.ready = true;
      this._broadcastLobbyState();
    } else {
      this._sendToHost({ type: 'ready', playerId: this.playerId });
    }
  }

  startGame(stage) {
    if (this.role !== 'host') return;
    const msg = { type: 'game_start', configs: this.playerConfigs, stage };
    for (const conn of this.connections) {
      if (conn.open) conn.send(msg);
    }
    if (this.onGameStart) this.onGameStart(this.playerConfigs, stage);
  }

  sendInput(inputState) {
    if (this.role === 'client') {
      this._sendToHost({ type: 'input', playerId: this.playerId, state: inputState });
    }
  }

  broadcastState(state) {
    if (this.role !== 'host') return;
    const msg = { type: 'state', state };
    for (const conn of this.connections) {
      if (conn.open) conn.send(msg);
    }
  }

  _sendToHost(data) {
    const conn = this.connections[0];
    if (conn && conn.open) conn.send(data);
  }

  destroy() {
    for (const conn of this.connections) conn.close();
    if (this.peer) this.peer.destroy();
  }

  get playerCount() { return this.playerConfigs.length; }
}
