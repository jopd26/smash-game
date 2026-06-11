class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = canvas.width;
    this.H = canvas.height;
    this.shakeX = 0;
    this.shakeY = 0;
    this.shakeFrames = 0;
    this.flashAlpha = 0;
    this.effectParticles = [];
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.W = w; this.H = h;
  }

  shake(intensity) {
    this.shakeX = (Math.random() - 0.5) * intensity;
    this.shakeY = (Math.random() - 0.5) * intensity;
    this.shakeFrames = 6;
  }

  addEffect(x, y, type, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 5 + 2;
      let col = '#fff';
      if (type === 'fire') col = `hsl(${15 + Math.random() * 30}, 100%, ${50 + Math.random() * 20}%)`;
      else if (type === 'ice') col = `hsl(${195 + Math.random() * 20}, 90%, ${65 + Math.random() * 15}%)`;
      else if (type === 'elec') col = `hsl(${50 + Math.random() * 15}, 100%, ${55 + Math.random() * 20}%)`;
      else if (type === 'earth') col = `hsl(${25 + Math.random() * 15}, 60%, ${35 + Math.random() * 15}%)`;
      this.effectParticles.push({
        x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 2,
        life: 25 + Math.random() * 15, maxLife: 40,
        col, size: 4 + Math.random() * 4,
      });
    }
  }

  updateEffects() {
    if (this.shakeFrames > 0) {
      this.shakeFrames--;
      this.shakeX = (Math.random() - 0.5) * 4;
      this.shakeY = (Math.random() - 0.5) * 4;
      if (this.shakeFrames === 0) { this.shakeX = 0; this.shakeY = 0; }
    }
    this.effectParticles = this.effectParticles.filter(p => p.life > 0);
    for (const p of this.effectParticles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.18;
      p.vx *= 0.95; p.life--;
    }
    if (this.flashAlpha > 0) this.flashAlpha -= 0.04;
  }

  render(gameState) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);
    this._drawBg(gameState.stage);
    this._drawPlatforms(gameState.stage);
    this._drawProjectiles(gameState.projectiles || []);
    this._drawPlayers(gameState.players);
    this._drawEffectParticles();
    if (this.flashAlpha > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flashAlpha})`;
      ctx.fillRect(0, 0, this.W, this.H);
    }
    ctx.restore();
  }

  _drawBg(stageName) {
    const ctx = this.ctx;
    const stage = STAGES[stageName];
    const grad = ctx.createLinearGradient(0, 0, 0, this.H);
    const colors = stage.bgGradient;
    colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.W, this.H);

    // Stars or bg elements
    if (stage.bgElements) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (const el of stage.bgElements) {
        if (el.type === 'star') {
          ctx.beginPath();
          ctx.arc(el.x, el.y, el.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  _drawPlatforms(stageName) {
    const ctx = this.ctx;
    const platforms = STAGES[stageName].platforms;
    for (const plat of platforms) {
      if (plat.type === 'passthrough') {
        const grad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.h);
        grad.addColorStop(0, plat.color);
        grad.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(plat.x, plat.y, plat.w, plat.h, 5);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        const grad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.h);
        grad.addColorStop(0, this._lighten(plat.color, 20));
        grad.addColorStop(0.3, plat.color);
        grad.addColorStop(1, this._darken(plat.color, 30));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(plat.x, plat.y, plat.w, plat.h, 8);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  _drawPlayers(players) {
    const ctx = this.ctx;
    for (const p of players) {
      if (p.state === 'dead') continue;
      // Draw trail
      for (const t of (p.trail || [])) {
        if (t.alpha <= 0) continue;
        ctx.save();
        ctx.globalAlpha = t.alpha * 0.4;
        ctx.fillStyle = p.charData.trailColor || 'rgba(255,255,255,0.2)';
        ctx.fillRect(t.x - PLAYER_W / 2, t.y - PLAYER_H, PLAYER_W, PLAYER_H);
        ctx.restore();
      }
      this._drawCharacter(p);
      this._drawPlayerParticles(p);
    }
  }

  _drawCharacter(p) {
    const ctx = this.ctx;
    const x = p.x, y = p.y;
    const cd = p.charData;
    const flicker = p.invincFrames > 0 && Math.floor(p.invincFrames / 4) % 2 === 0;
    if (flicker) return;
    const frozen = p.freezeTimer > 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(p.facing, 1);

    if (frozen) {
      ctx.shadowColor = '#87CEEB';
      ctx.shadowBlur = 15;
    }

    const col = frozen ? '#87CEEB' : cd.color;
    const col2 = frozen ? '#b0d8ff' : cd.secondaryColor;

    // Body (different shapes per character)
    if (p.charKey === 'blaze') {
      this._drawBlazeBody(ctx, col, col2, p);
    } else if (p.charKey === 'frost') {
      this._drawFrostBody(ctx, col, col2, p);
    } else if (p.charKey === 'volt') {
      this._drawVoltBody(ctx, col, col2, p);
    } else if (p.charKey === 'terra') {
      this._drawTerraBody(ctx, col, col2, p);
    }

    // Attack glow
    if (p.attackState) {
      const atk = p.attackState;
      const d = atk.data;
      const { s, a } = d.frames;
      if (atk.frame >= s && atk.frame < s + a && d.hits) {
        for (const hit of d.hits) {
          const hb = hit.hb;
          ctx.save();
          let glowCol = 'rgba(255,255,100,0.3)';
          if (hit.eff === 'fire') glowCol = 'rgba(255,100,0,0.4)';
          else if (hit.eff === 'ice') glowCol = 'rgba(0,200,255,0.4)';
          else if (hit.eff === 'elec') glowCol = 'rgba(255,230,0,0.4)';
          else if (hit.eff === 'earth') glowCol = 'rgba(150,100,50,0.4)';
          ctx.fillStyle = glowCol;
          ctx.fillRect(hb.x, hb.y, hb.w, hb.h);
          ctx.restore();
        }
      }
    }

    // Damage % indicator (ring glow)
    if (p.damage > 80) {
      ctx.strokeStyle = `rgba(255,${Math.max(0, 255 - p.damage * 2)},0,0.6)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, -PLAYER_H / 2, PLAYER_W, PLAYER_H / 2 + 5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    // Name + damage label
    this._drawPlayerHud(this.ctx, p);
  }

  _drawBlazeBody(ctx, col, col2, p) {
    // Head
    ctx.fillStyle = col2;
    ctx.beginPath();
    ctx.arc(0, -50, 12, 0, Math.PI * 2);
    ctx.fill();
    // Body
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.roundRect(-10, -42, 20, 30, 4);
    ctx.fill();
    // Arms
    ctx.fillStyle = col2;
    const armOff = p.state === 'attack' || p.attackState ? -8 : -5;
    ctx.fillRect(-18, -40, 8, 18);
    ctx.fillRect(10, -40 + armOff, 8, 18);
    // Legs
    ctx.fillStyle = col;
    ctx.fillRect(-11, -12, 9, 14);
    ctx.fillRect(2, -12, 9, 14);
    // Fire on head
    if (!p.freezeTimer) {
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.moveTo(-4, -60); ctx.lineTo(0, -68); ctx.lineTo(4, -60);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FF8C00';
      ctx.beginPath();
      ctx.moveTo(-2, -61); ctx.lineTo(0, -66); ctx.lineTo(2, -61);
      ctx.closePath(); ctx.fill();
    }
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.fillRect(2, -54, 6, 5);
    ctx.fillStyle = '#000';
    ctx.fillRect(4, -53, 3, 3);
  }

  _drawFrostBody(ctx, col, col2, p) {
    // Crystal head shape
    ctx.fillStyle = col2;
    ctx.beginPath();
    ctx.arc(0, -50, 11, 0, Math.PI * 2);
    ctx.fill();
    // Body with crystal pattern
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.roundRect(-9, -42, 18, 28, 3);
    ctx.fill();
    // Crystal details
    ctx.strokeStyle = col2;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -38); ctx.lineTo(-5, -28); ctx.lineTo(0, -20); ctx.lineTo(5, -28); ctx.closePath();
    ctx.stroke();
    // Arms
    ctx.fillStyle = col2;
    ctx.fillRect(-17, -40, 8, 16);
    ctx.fillRect(9, -40, 8, 16);
    // Legs
    ctx.fillStyle = col;
    ctx.fillRect(-10, -14, 9, 14);
    ctx.fillRect(1, -14, 9, 14);
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.fillRect(2, -54, 5, 4);
    ctx.fillStyle = '#4444ff';
    ctx.fillRect(3, -53, 3, 2);
    // Ice crystals on shoulders
    ctx.fillStyle = 'rgba(135,206,235,0.7)';
    ctx.beginPath();
    ctx.moveTo(-17, -40); ctx.lineTo(-22, -44); ctx.lineTo(-17, -48); ctx.closePath();
    ctx.fill();
  }

  _drawVoltBody(ctx, col, col2, p) {
    // Slim fast shape
    ctx.fillStyle = col2;
    ctx.beginPath();
    ctx.arc(0, -51, 10, 0, Math.PI * 2);
    ctx.fill();
    // Body
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.roundRect(-8, -44, 16, 26, 3);
    ctx.fill();
    // Lightning bolt on chest
    ctx.fillStyle = col2;
    ctx.beginPath();
    ctx.moveTo(2, -42); ctx.lineTo(-3, -32); ctx.lineTo(1, -32); ctx.lineTo(-4, -20); ctx.lineTo(5, -31); ctx.lineTo(0, -31); ctx.closePath();
    ctx.fill();
    // Arms (thin/fast)
    ctx.strokeStyle = col2;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-8, -40); ctx.lineTo(-16, -28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -40); ctx.lineTo(16, -28); ctx.stroke();
    // Legs
    ctx.fillStyle = col;
    ctx.fillRect(-9, -18, 8, 18);
    ctx.fillRect(1, -18, 8, 18);
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.fillRect(2, -55, 5, 4);
    ctx.fillStyle = '#ff8800';
    ctx.fillRect(3, -54, 3, 2);
    // Speed lines when running
    if (p.state === 'run') {
      ctx.strokeStyle = 'rgba(255,215,0,0.5)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-25 - i * 5, -30 - i * 8);
        ctx.lineTo(-15 - i * 5, -30 - i * 8);
        ctx.stroke();
      }
    }
  }

  _drawTerraBody(ctx, col, col2, p) {
    // Bulky shape
    ctx.fillStyle = col2;
    ctx.beginPath();
    ctx.arc(0, -50, 14, 0, Math.PI * 2);
    ctx.fill();
    // Wide body
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.roundRect(-14, -38, 28, 32, 5);
    ctx.fill();
    // Rock texture lines
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-10, -30); ctx.lineTo(-5, -22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, -35); ctx.lineTo(10, -25); ctx.stroke();
    // Arms (thick)
    ctx.fillStyle = col;
    ctx.fillRect(-24, -38, 12, 22);
    ctx.fillRect(12, -38, 12, 22);
    // Fists
    ctx.fillStyle = col2;
    ctx.beginPath();
    ctx.arc(-18, -15, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(18, -15, 8, 0, Math.PI * 2);
    ctx.fill();
    // Legs (stumpy)
    ctx.fillStyle = col;
    ctx.fillRect(-13, -6, 11, 10);
    ctx.fillRect(2, -6, 11, 10);
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.fillRect(2, -55, 7, 6);
    ctx.fillStyle = '#228B22';
    ctx.fillRect(4, -54, 4, 4);
  }

  _drawPlayerHud(ctx, p) {
    const x = p.x, y = p.y + 15;
    // Damage %
    const pct = p.damage;
    const r = Math.min(255, Math.floor(pct * 2.5));
    const g = Math.max(0, Math.floor(255 - pct * 2.5));
    ctx.fillStyle = `rgba(0,0,0,0.5)`;
    ctx.beginPath();
    ctx.roundRect(x - 28, y, 56, 18, 4);
    ctx.fill();
    ctx.fillStyle = `rgb(${r},${g},50)`;
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(pct)}%`, x, y + 13);
  }

  _drawPlayerParticles(p) {
    const ctx = this.ctx;
    for (const part of p.particles || []) {
      const alpha = part.life / part.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = part.col;
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawProjectiles(projectiles) {
    const ctx = this.ctx;
    for (const proj of projectiles) {
      ctx.save();
      ctx.shadowColor = proj.col;
      ctx.shadowBlur = 10;
      ctx.fillStyle = proj.col;
      ctx.beginPath();
      if (proj.eff === 'earth') {
        ctx.arc(proj.x, proj.y, proj.w / 2, 0, Math.PI * 2);
      } else {
        ctx.ellipse(proj.x, proj.y, proj.w / 2, proj.h / 2, Math.atan2(proj.vy, proj.vx), 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    }
  }

  _drawEffectParticles() {
    const ctx = this.ctx;
    for (const p of this.effectParticles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _lighten(hex, amount) {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
    return `rgb(${r},${g},${b})`;
  }
  _darken(hex, amount) {
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
    return `rgb(${r},${g},${b})`;
  }
}
