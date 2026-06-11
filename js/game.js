class Game {
  constructor(canvas, playerConfigs, stageName, isHost, localPlayerId) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.renderer.resize(880, 620);
    this.stage = stageName || DEFAULT_STAGE;
    this.isHost = isHost;
    this.localPlayerId = localPlayerId;
    this.running = false;
    this.frame = 0;
    this.winner = null;
    this.onGameOver = null;

    this.projectiles = [];
    this.players = [];

    const spawnPts = STAGES[this.stage].spawnPoints;
    for (let i = 0; i < playerConfigs.length; i++) {
      const cfg = playerConfigs[i];
      const spawn = spawnPts[i % spawnPts.length];
      let input;
      if (cfg.inputType === 'local') {
        input = cfg.input;
      } else {
        input = new RemoteInput();
      }
      const player = new Player(i, cfg.charKey, input, spawn.x, spawn.y);
      player.invincFrames = 120;
      this.players.push(player);
    }

    this._raf = null;
    this._loop = this._loop.bind(this);
  }

  start() {
    this.running = true;
    this._raf = requestAnimationFrame(this._loop);
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  _loop(ts) {
    if (!this.running) return;
    this._update();
    this._render();
    this._raf = requestAnimationFrame(this._loop);
  }

  _update() {
    this.frame++;
    if (this.winner) return;

    // Update projectiles
    this.projectiles = this.projectiles.filter(p => !p.dead);
    for (const proj of this.projectiles) {
      proj.update(this.players);
    }

    // Update players
    for (const p of this.players) {
      p.updateParticles();
      if (p.state === 'dead') continue;
      p.update(this.stage, this.players, this.projectiles);
    }

    // Check win condition
    const alive = this.players.filter(p => p.stocks > 0);
    if (alive.length === 1 && this.players.length > 1) {
      this.winner = alive[0];
      if (this.onGameOver) this.onGameOver(this.winner);
    } else if (alive.length === 0) {
      this.winner = { id: -1, charKey: 'none' };
      if (this.onGameOver) this.onGameOver(this.winner);
    }
  }

  _render() {
    this.renderer.updateEffects();
    this.renderer.render({
      stage: this.stage,
      players: this.players,
      projectiles: this.projectiles,
    });
    this._renderHUD();
  }

  _renderHUD() {
    const ctx = this.renderer.ctx;
    const W = this.renderer.W;

    // Player stock + damage panels at top
    const panelW = 160, panelH = 54, gap = 16;
    const totalW = this.players.length * panelW + (this.players.length - 1) * gap;
    let startX = (W - totalW) / 2;

    for (const p of this.players) {
      const px = startX;
      startX += panelW + gap;

      ctx.save();
      // Panel background
      const alpha = p.state === 'dead' ? 0.3 : 0.75;
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      ctx.beginPath();
      ctx.roundRect(px, 8, panelW, panelH, 8);
      ctx.fill();

      // Color accent bar
      ctx.fillStyle = p.charData.color;
      ctx.beginPath();
      ctx.roundRect(px, 8, panelW, 4, [8, 8, 0, 0]);
      ctx.fill();

      // Character name
      ctx.fillStyle = p.state === 'dead' ? '#888' : '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`P${p.id + 1} ${p.charData.name}`, px + 8, 28);

      // Damage %
      const pct = Math.floor(p.damage);
      const dr = Math.min(255, pct * 2.5);
      const dg = Math.max(0, 255 - pct * 2.5);
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = `rgb(${Math.round(dr)},${Math.round(dg)},50)`;
      ctx.fillText(`${pct}%`, px + 8, 50);

      // Stocks (hearts/icons)
      const totalStocks = 3;
      for (let s = 0; s < totalStocks; s++) {
        const alive = s < p.stocks;
        const sx = px + panelW - 16 - s * 22;
        ctx.beginPath();
        ctx.arc(sx, 36, 8, 0, Math.PI * 2);
        ctx.fillStyle = alive ? p.charData.color : 'rgba(100,100,100,0.5)';
        ctx.fill();
        if (alive) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // Player label (local/cpu)
      if (p.id === this.localPlayerId) {
        ctx.fillStyle = '#00ff88';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('YOU', px + panelW - 6, 52);
      }
      ctx.restore();
    }

    // Frame counter (small, for debugging)
    // ctx.fillStyle = 'rgba(255,255,255,0.3)';
    // ctx.font = '10px monospace';
    // ctx.textAlign = 'right';
    // ctx.fillText(`F:${this.frame}`, W - 8, 20);
  }

  // For network: serialize authoritative state
  serializeState() {
    return {
      frame: this.frame,
      players: this.players.map(p => p.serialize()),
      projectiles: this.projectiles.map(p => p.serialize()),
    };
  }

  // For clients: apply received state
  applyState(state) {
    for (const ps of state.players) {
      const p = this.players[ps.id];
      if (p) p.applyState(ps);
    }
  }

  // Push remote input for a specific player
  pushRemoteInput(playerId, inputState) {
    const p = this.players[playerId];
    if (p && p.input instanceof RemoteInput) {
      p.input.pushState(inputState);
    }
  }
}
