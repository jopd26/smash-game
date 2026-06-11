// Main app — screen management and wiring
const App = (() => {
  let screen = 'lobby';
  let net = null;
  let game = null;
  let localInput = null;
  let selectedChar = 'blaze';
  let isHost = false;
  let localPlayerId = 0;
  let playerConfigs = [];
  let charSelectReady = false;

  const $ = id => document.getElementById(id);

  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active');
      s.classList.add('hidden');
    });
    $(`${name}-screen`).classList.remove('hidden');
    $(`${name}-screen`).classList.add('active');
    screen = name;
  }

  function setStatus(msg, cls = '') {
    const el = $('status-msg');
    el.textContent = msg;
    el.className = cls;
  }

  // ── Lobby ────────────────────────────────────────────────────────────────

  $('host-btn').addEventListener('click', () => {
    $('menu').classList.add('hidden');
    $('host-panel').classList.remove('hidden');
    $('room-code').textContent = '...';
    isHost = true;
    net = new NetworkManager();

    net.onPlayerJoined = (id, configs) => {
      playerConfigs = configs;
      $('player-count').textContent = `${configs.length}/${net.maxPlayers}`;
      const list = $('player-list');
      list.innerHTML = configs.map(c =>
        `<div class="player-entry">P${c.playerId + 1}: ${CHARACTERS[c.charKey]?.name || '?'}${c.ready ? ' ✓' : ''}</div>`
      ).join('');
      $('start-game-btn').disabled = configs.length < 1;
    };

    net.onError = (msg) => setStatus(`Error: ${msg}`, 'error');

    net.hostGame(selectedChar, (roomCode) => {
      $('room-code').textContent = roomCode;
      setStatus('Share this code with friends!', 'success');
      // Update host's own config
      playerConfigs = [{ charKey: selectedChar, playerId: 0, ready: false }];
    });
  });

  $('join-btn').addEventListener('click', () => {
    $('menu').classList.add('hidden');
    $('join-panel').classList.remove('hidden');
    isHost = false;
  });

  $('connect-btn').addEventListener('click', () => {
    const code = $('room-input').value.trim().toUpperCase();
    if (!code || code.length < 4) { setStatus('Enter a valid room code', 'error'); return; }
    setStatus('Connecting...', '');
    net = new NetworkManager();
    net.onError = (msg) => setStatus(`Error: ${msg}`, 'error');

    net.onPlayerJoined = (id, configs) => {
      playerConfigs = configs;
    };

    net.joinGame(code, selectedChar, (pid, configs) => {
      localPlayerId = pid;
      playerConfigs = configs;
      setStatus(`Connected as Player ${pid + 1}!`, 'success');
      // Go to char select
      showCharSelect();
    });
  });

  $('start-game-btn').addEventListener('click', () => {
    if (!net || net.playerCount < 1) return;
    showCharSelect();
  });

  // ── Character Select ──────────────────────────────────────────────────────

  function buildCharSelect() {
    const grid = $('character-grid');
    grid.innerHTML = '';
    Object.keys(CHARACTERS).forEach(key => {
      const ch = CHARACTERS[key];
      const div = document.createElement('div');
      div.className = 'char-card' + (key === selectedChar ? ' selected' : '');
      div.dataset.key = key;
      div.innerHTML = `
        <div class="char-icon" style="background:${ch.color}">
          <span>${ch.name[0]}</span>
        </div>
        <div class="char-name">${ch.name}</div>
        <div class="char-desc">${ch.description}</div>
        <div class="char-stats">
          <div>SPD ${Math.round(ch.stats.runSpeed * 10)}%</div>
          <div>WGT ${ch.stats.weight}%</div>
          <div>JMP ${Math.round(-ch.stats.jumpVy * 6)}%</div>
        </div>
      `;
      div.addEventListener('click', () => {
        document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
        div.classList.add('selected');
        selectedChar = key;
        charSelectReady = false;
        $('ready-btn').textContent = 'READY';
        $('ready-btn').classList.remove('is-ready');
        if (net) net.sendCharSelect(key);
      });
      grid.appendChild(div);
    });
  }

  function showCharSelect() {
    buildCharSelect();
    updateCharSelectPanel();
    showScreen('char-select');
    if (net) {
      net.onPlayerJoined = (id, configs) => {
        playerConfigs = configs;
        updateCharSelectPanel();
      };
      net.onGameStart = (configs, stage) => {
        startGame(configs, stage);
      };
    }
  }

  function updateCharSelectPanel() {
    const el = $('selected-chars');
    el.innerHTML = playerConfigs.map(c =>
      `<div class="sel-entry" style="border-color:${CHARACTERS[c.charKey]?.color || '#888'}">
        P${c.playerId + 1}: ${CHARACTERS[c.charKey]?.name || '?'}${c.ready ? ' <b>READY</b>' : ''}
       </div>`
    ).join('');
  }

  $('ready-btn').addEventListener('click', () => {
    if (!charSelectReady) {
      charSelectReady = true;
      $('ready-btn').textContent = 'WAITING...';
      $('ready-btn').classList.add('is-ready');
      if (net) {
        net.sendCharSelect(selectedChar);
        net.sendReady();
      }
      if (isHost) {
        // Host can start when all human players are ready (or just start immediately for solo)
        setTimeout(() => {
          if (net) {
            net.startGame(DEFAULT_STAGE);
          } else {
            startGame([{ charKey: selectedChar, playerId: 0, ready: true }], DEFAULT_STAGE);
          }
        }, 500);
      }
    }
  });

  // ── Game ──────────────────────────────────────────────────────────────────

  function startGame(configs, stage) {
    showScreen('game');
    const canvas = $('game-canvas');

    localInput = new InputManager();

    const playerSetup = configs.map((cfg, i) => ({
      charKey: cfg.charKey,
      inputType: i === localPlayerId ? 'local' : 'remote',
      input: i === localPlayerId ? localInput : null,
    }));

    game = new Game(canvas, playerSetup, stage || DEFAULT_STAGE, isHost, localPlayerId);
    window.game = game; // expose for debugging / testing

    game.onGameOver = (winner) => {
      showResults(winner);
    };

    if (net && isHost) {
      // Broadcast state every 3 frames
      const origLoop = game._loop.bind(game);
      let stateFrame = 0;
      game._loop = (ts) => {
        origLoop(ts);
        stateFrame++;
        if (stateFrame % 3 === 0) {
          net.broadcastState(game.serializeState());
        }
        // Send local player's input to clients don't need it since host runs auth
      };

      net.onInputReceived = (pid, inputState) => {
        game.pushRemoteInput(pid, inputState);
      };
    } else if (net && !isHost) {
      // Client: send local input to host every frame
      net.onStateReceived = (state) => {
        // Reconcile: apply server state but keep local player's predicted state
        for (const ps of state.players) {
          if (ps.id !== localPlayerId) {
            game.players[ps.id]?.applyState(ps);
          }
        }
      };

      // Override loop to send input
      const origUpdate = game._update.bind(game);
      game._update = () => {
        origUpdate();
        if (localInput) {
          net.sendInput(localInput.getState());
        }
      };
    }

    game.start();
  }

  // ── Results ───────────────────────────────────────────────────────────────

  function showResults(winner) {
    showScreen('results');
    if (winner.id === -1) {
      $('winner-text').textContent = 'DRAW!';
    } else {
      $('winner-text').textContent = `Player ${winner.id + 1} (${winner.charData?.name || '?'}) WINS!`;
      $('winner-text').style.color = winner.charData?.color || '#fff';
    }
    if (game) { game.stop(); game = null; }
  }

  $('rematch-btn').addEventListener('click', () => {
    if (isHost && net) {
      net.startGame(DEFAULT_STAGE);
    } else if (!net) {
      showCharSelect();
    }
  });

  $('menu-btn').addEventListener('click', () => {
    if (net) { net.destroy(); net = null; }
    if (game) { game.stop(); game = null; }
    $('host-panel').classList.add('hidden');
    $('join-panel').classList.add('hidden');
    $('menu').classList.remove('hidden');
    setStatus('');
    showScreen('lobby');
  });

  // ── Solo play (no network) ────────────────────────────────────────────────
  // If the user clicks host then start directly with 1 player for solo practice
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && screen === 'game') {
      $('menu-btn').click();
    }
  });

  // Init
  showScreen('lobby');

  return { showCharSelect, startGame };
})();
