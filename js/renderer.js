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
    this.confetti = [];
    this.gameFrame = 0;
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

    this.confetti = this.confetti.filter(c => c.life > 0);
    for (const c of this.confetti) {
      c.x += c.vx; c.y += c.vy;
      c.vy += 0.12; c.vx += Math.sin(c.y * 0.04) * 0.08;
      c.rot += c.rotSpd; c.life--;
    }
  }

  spawnConfetti() {
    const colors = ['#FF4500', '#FFD700', '#00BFFF', '#6B8E23', '#FF69B4', '#9B59B6', '#00FF7F', '#FF1493'];
    for (let i = 0; i < 110; i++) {
      this.confetti.push({
        x: (i / 110) * this.W + (((i * 37) % 100) / 100 - 0.5) * 180,
        y: -15 - ((i * 13) % 70),
        vx: (((i * 7) % 100) / 100 - 0.5) * 5,
        vy: ((i * 3) % 100) / 100 * 2 + 1,
        rot: ((i * 11) % 100) / 100 * Math.PI * 2,
        rotSpd: (((i * 19) % 100) / 100 - 0.5) * 0.25,
        w: 6 + ((i * 5) % 8), h: 3 + ((i * 3) % 5),
        col: colors[i % colors.length],
        life: 200 + ((i * 7) % 60),
      });
    }
  }

  render(gameState) {
    this.gameFrame = gameState.frame || 0;
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

  drawVictoryOverlay(winner, vf) {
    const ctx = this.ctx;

    // Dim background
    const bgAlpha = Math.min(0.55, vf / 70 * 0.55);
    ctx.fillStyle = `rgba(0,0,0,${bgAlpha})`;
    ctx.fillRect(0, 0, this.W, this.H);

    // Confetti
    for (const c of this.confetti) {
      const alpha = Math.min(1, c.life / 40);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.col;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
    }

    // Banner slides in from top with cubic ease-out
    const slideT = Math.min(1, vf / 30);
    const ease = 1 - Math.pow(1 - slideT, 3);
    const bannerW = Math.min(520, this.W - 60);
    const bannerH = 96;
    const bx = (this.W - bannerW) / 2;
    const startY = -(bannerH + 10);
    const endY = this.H / 2 - bannerH / 2;
    const bannerY = startY + (endY - startY) * ease;

    ctx.save();

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.roundRect(bx + 5, bannerY + 5, bannerW, bannerH, 14);
    ctx.fill();

    // Banner background
    ctx.fillStyle = 'rgba(8,8,18,0.94)';
    ctx.beginPath();
    ctx.roundRect(bx, bannerY, bannerW, bannerH, 14);
    ctx.fill();

    // Animated glow border
    const winCol = winner.charData?.color || '#FFD700';
    const glowPulse = 0.65 + Math.sin(vf * 0.13) * 0.35;
    ctx.strokeStyle = winCol;
    ctx.lineWidth = 3;
    ctx.shadowColor = winCol;
    ctx.shadowBlur = 22 * glowPulse;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Crown icon
    const crownX = bx + 36;
    const crownY = bannerY + bannerH / 2 - 2;
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(crownX - 14, crownY + 9);
    ctx.lineTo(crownX - 14, crownY - 7);
    ctx.lineTo(crownX - 6, crownY + 3);
    ctx.lineTo(crownX, crownY - 12);
    ctx.lineTo(crownX + 6, crownY + 3);
    ctx.lineTo(crownX + 14, crownY - 7);
    ctx.lineTo(crownX + 14, crownY + 9);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Win text
    const pulse = 1 + Math.sin(vf * 0.13) * 0.04;
    const textX = this.W / 2 + 12;
    ctx.fillStyle = winCol;
    ctx.shadowColor = winCol;
    ctx.shadowBlur = 16;
    ctx.font = `bold ${Math.round(32 * pulse)}px "Arial Black", Arial, sans-serif`;
    ctx.textAlign = 'center';
    const winText = winner.id === -1 ? 'DRAW!' : `PLAYER ${winner.id + 1} WINS!`;
    ctx.fillText(winText, textX, bannerY + 42);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#cccccc';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText((winner.charData?.name || '').toUpperCase(), textX, bannerY + 68);

    if (vf > 180) {
      const remain = Math.max(1, Math.ceil((240 - vf) / 60));
      ctx.fillStyle = 'rgba(180,180,180,0.55)';
      ctx.font = '12px sans-serif';
      ctx.fillText(`Continuing in ${remain}...`, textX, bannerY + 88);
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

    if (p.charKey === 'blaze') this._drawBlazeBody(ctx, col, col2, p);
    else if (p.charKey === 'frost') this._drawFrostBody(ctx, col, col2, p);
    else if (p.charKey === 'volt') this._drawVoltBody(ctx, col, col2, p);
    else if (p.charKey === 'terra') this._drawTerraBody(ctx, col, col2, p);

    if (p.damage > 80) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = `rgba(255,${Math.max(0, 255 - p.damage * 2)},0,0.6)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, -PLAYER_H / 2, PLAYER_W, PLAYER_H / 2 + 5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
    this._drawPlayerHud(this.ctx, p);
  }

  _getAttackPose(p) {
    if (!p.attackState) return { phase: 'none', progress: 0 };
    const atk = p.attackState;
    const { s, a, e } = atk.data.frames;
    if (atk.frame < s) return { phase: 'startup', progress: atk.frame / Math.max(1, s) };
    if (atk.frame < s + a) return { phase: 'active', progress: (atk.frame - s) / Math.max(1, a) };
    return { phase: 'endlag', progress: (atk.frame - s - a) / Math.max(1, e) };
  }

  _drawAttackTrail(ctx, p) {
    if (!p.attackState) return;
    const atk = p.attackState;
    const d = atk.data;
    if (!d.hits) return;
    const { s, a } = d.frames;
    if (atk.frame < s || atk.frame >= s + a) return;

    const progress = (atk.frame - s) / Math.max(1, a);

    for (const hit of d.hits) {
      const hb = hit.hb;
      const cx = hb.x + hb.w / 2;
      const cy = hb.y + hb.h / 2;
      const rad = Math.max(8, (hb.w + hb.h) / 4);
      const eff = hit.eff || 'normal';

      let c1, c2;
      if (eff === 'fire')       { c1 = '#FF5500'; c2 = '#FFD700'; }
      else if (eff === 'ice')   { c1 = '#88DDFF'; c2 = '#FFFFFF'; }
      else if (eff === 'elec')  { c1 = '#FFE000'; c2 = '#FFFFFF'; }
      else if (eff === 'earth') { c1 = '#AA7733'; c2 = '#DDBB66'; }
      else                      { c1 = '#FFFFFF'; c2 = '#FFFF88'; }

      ctx.save();

      // Main arc trail
      ctx.globalAlpha = 0.9 * (1 - progress * 0.5);
      ctx.strokeStyle = c1;
      ctx.lineWidth = 5 + (1 - progress) * 3;
      ctx.shadowColor = c1;
      ctx.shadowBlur = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, rad, -Math.PI * 0.65, -Math.PI * 0.65 + Math.PI * 1.3 * Math.min(1, progress * 1.8 + 0.2));
      ctx.stroke();

      // Shine line
      ctx.globalAlpha = (1 - progress) * 0.6;
      ctx.strokeStyle = c2;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(cx - rad * 0.6, cy);
      ctx.lineTo(cx + rad * 0.6, cy);
      ctx.stroke();

      // Burst sparks — 5 points rotating outward
      if (progress > 0.1) {
        for (let i = 0; i < 5; i++) {
          const a2 = (i / 5) * Math.PI * 2 + progress * 4;
          const r2 = rad * (0.6 + progress * 0.5);
          ctx.shadowBlur = 8;
          ctx.globalAlpha = (1 - progress) * 0.85;
          ctx.fillStyle = i % 2 === 0 ? c1 : c2;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a2) * r2, cy + Math.sin(a2) * r2, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }

  // ── Character bodies ──────────────────────────────────────────────────────

  _drawBlazeBody(ctx, col, col2, p) {
    const f = this.gameFrame;
    const pose = this._getAttackPose(p);
    const isActive = pose.phase === 'active';
    const isStartup = pose.phase === 'startup';

    // Legs
    const legBob = p.state === 'run' ? Math.sin(f * 0.32) * 3 : 0;
    ctx.fillStyle = this._darken(col, 10);
    ctx.beginPath(); ctx.roundRect(-11, -14 + Math.max(0, legBob), 10, 14 - Math.max(0, legBob), 3); ctx.fill();
    ctx.beginPath(); ctx.roundRect(1, -14 - Math.min(0, legBob), 10, 14 + Math.min(0, legBob), 3); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.fillRect(-11, -3, 10, 3);
    ctx.fillRect(1, -3, 10, 3);

    // Torso with gradient
    const bodyGrad = ctx.createLinearGradient(-11, -42, 11, -12);
    bodyGrad.addColorStop(0, this._lighten(col, 25));
    bodyGrad.addColorStop(1, this._darken(col, 15));
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.roundRect(-11, -42, 22, 30, [4, 4, 6, 6]); ctx.fill();

    // Chest plate highlight
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.roundRect(-8, -40, 16, 10, 3); ctx.fill();

    // Fire emblem on chest
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(0, -37); ctx.lineTo(-3, -30); ctx.lineTo(-1, -30);
    ctx.lineTo(-1, -23); ctx.lineTo(1, -23); ctx.lineTo(1, -30); ctx.lineTo(3, -30);
    ctx.closePath(); ctx.fill();

    // Shoulder pauldrons
    ctx.fillStyle = col2;
    ctx.beginPath(); ctx.arc(-14, -39, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(14, -39, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.arc(-16, -42, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(16, -42, 3, 0, Math.PI * 2); ctx.fill();

    // Back arm
    ctx.fillStyle = this._darken(col2, 15);
    ctx.beginPath(); ctx.roundRect(-26, -40, 13, 12, 4); ctx.fill();
    ctx.fillStyle = '#666';
    ctx.beginPath(); ctx.arc(-19, -28, 5, 0, Math.PI * 2); ctx.fill();

    // Attack arm — extends forward when active, pulls back in startup
    const armTip = isActive ? 28 : (isStartup ? 12 : 18);
    ctx.fillStyle = col2;
    ctx.beginPath(); ctx.roundRect(11, -41, armTip - 11, 12, 4); ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = isActive ? '#FF8800' : 'transparent';
    ctx.shadowBlur = isActive ? 14 : 0;
    ctx.beginPath(); ctx.arc(armTip + 3, -35, 7, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Head — helmet with radial gradient
    const hGrad = ctx.createRadialGradient(-3, -54, 2, 0, -50, 14);
    hGrad.addColorStop(0, this._lighten(col2, 30));
    hGrad.addColorStop(1, col2);
    ctx.fillStyle = hGrad;
    ctx.beginPath(); ctx.arc(0, -50, 13, 0, Math.PI * 2); ctx.fill();

    // Helmet crest (gold spike)
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(-3, -62); ctx.lineTo(0, -72); ctx.lineTo(3, -62);
    ctx.lineTo(2, -63); ctx.lineTo(-2, -63); ctx.closePath(); ctx.fill();

    // Glowing visor
    ctx.fillStyle = 'rgba(255,155,0,0.95)';
    ctx.shadowColor = '#FF8800';
    ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.ellipse(3, -50, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Helmet rivet detail
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.arc(-6, -55, 2, 0, Math.PI * 2); ctx.fill();

    // Deterministic flame wisps above shoulders
    if (!p.freezeTimer) {
      for (let si = 0; si < 2; si++) {
        const sx = si === 0 ? -14 : 14;
        for (let fi = 0; fi < 3; fi++) {
          const ft = ((f * 0.07 + fi * 0.33) % 1 + 1) % 1;
          ctx.globalAlpha = (1 - ft) * 0.9;
          ctx.fillStyle = ft < 0.4 ? '#FF4500' : '#FFD700';
          ctx.shadowColor = '#FF4500';
          ctx.shadowBlur = 5;
          const fSize = Math.max(0.5, 3 - ft * 2);
          ctx.beginPath();
          ctx.ellipse(sx + (fi - 1) * 3, -47 - ft * 13, fSize, fSize * 1.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      ctx.globalAlpha = 1;
    }

    this._drawAttackTrail(ctx, p);
  }

  _drawFrostBody(ctx, col, col2, p) {
    const f = this.gameFrame;
    const pose = this._getAttackPose(p);
    const isActive = pose.phase === 'active';

    // Robe — tapered trapezoid, wider at bottom
    const robeGrad = ctx.createLinearGradient(0, -42, 0, 0);
    robeGrad.addColorStop(0, this._darken(col, 8));
    robeGrad.addColorStop(1, this._lighten(col, 8));
    ctx.fillStyle = robeGrad;
    ctx.beginPath();
    ctx.moveTo(-12, -42); ctx.lineTo(12, -42);
    ctx.lineTo(18, 0); ctx.lineTo(-18, 0); ctx.closePath();
    ctx.fill();

    // Robe fold lines
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-4, -40); ctx.lineTo(-6, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, -40); ctx.lineTo(7, 0); ctx.stroke();

    // Upper torso / robe bodice
    const torsoGrad = ctx.createLinearGradient(-10, -60, 10, -40);
    torsoGrad.addColorStop(0, this._lighten(col, 22));
    torsoGrad.addColorStop(1, col);
    ctx.fillStyle = torsoGrad;
    ctx.beginPath(); ctx.roundRect(-10, -60, 20, 22, [4, 4, 2, 2]); ctx.fill();

    // Crystal diamond emblem on chest
    ctx.strokeStyle = col2;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -57); ctx.lineTo(-5, -50); ctx.lineTo(0, -43); ctx.lineTo(5, -50); ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = col2;
    ctx.beginPath(); ctx.arc(0, -50, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(-1, -51, 1.5, 0, Math.PI * 2); ctx.fill();

    // Back arm (wide sleeve)
    ctx.fillStyle = this._darken(col, 10);
    ctx.beginPath(); ctx.roundRect(-24, -58, 14, 20, 4); ctx.fill();
    // Back wrist crystal
    ctx.fillStyle = col2;
    ctx.beginPath();
    ctx.moveTo(-17, -38); ctx.lineTo(-24, -42); ctx.lineTo(-19, -50); ctx.lineTo(-13, -46); ctx.closePath();
    ctx.fill();

    // Staff arm (extends during active)
    const armTip = isActive ? 28 : 19;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.roundRect(10, -59, armTip - 10, 14, 4); ctx.fill();

    // Staff
    ctx.strokeStyle = '#88DDFF';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#88DDFF';
    ctx.shadowBlur = isActive ? 18 : 7;
    ctx.beginPath(); ctx.moveTo(armTip + 2, -59); ctx.lineTo(armTip + 2, -82); ctx.stroke();
    ctx.shadowBlur = 0;
    // Staff top crystal
    ctx.fillStyle = col2;
    ctx.shadowColor = isActive ? '#88DDFF' : 'transparent';
    ctx.shadowBlur = isActive ? 12 : 0;
    ctx.beginPath();
    ctx.moveTo(armTip + 2, -88); ctx.lineTo(armTip - 4, -78); ctx.lineTo(armTip + 8, -78); ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(armTip + 2, -85, 2.5, 0, Math.PI * 2); ctx.fill();

    // Head with gradient
    const hGrad = ctx.createRadialGradient(-2, -67, 2, 0, -64, 12);
    hGrad.addColorStop(0, this._lighten(col2, 30));
    hGrad.addColorStop(1, this._darken(col2, 8));
    ctx.fillStyle = hGrad;
    ctx.beginPath(); ctx.arc(0, -64, 11, 0, Math.PI * 2); ctx.fill();

    // Ice crown — 3 crystal spikes
    const crownOffsets = [-6, 0, 6];
    crownOffsets.forEach((ox, ci) => {
      ctx.fillStyle = col2;
      ctx.shadowColor = '#88DDFF';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(ox - 3, -73);
      ctx.lineTo(ox, -73 - 9 - ci * 2);
      ctx.lineTo(ox + 3, -73);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.arc(ox, -74 - ci * 1.5, 1.5, 0, Math.PI * 2); ctx.fill();
    });

    // Eyes
    ctx.fillStyle = '#DDEEFF';
    ctx.fillRect(1, -68, 7, 5);
    ctx.fillStyle = '#3388FF';
    ctx.shadowColor = '#88DDFF';
    ctx.shadowBlur = 7;
    ctx.beginPath(); ctx.arc(4, -66, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Orbiting ice crystals (deterministic)
    if (!p.freezeTimer) {
      const orbit = f * 0.04;
      const orbits = [
        { r: 17, a: orbit, yo: -32 },
        { r: 19, a: orbit + Math.PI, yo: -18 },
      ];
      for (const o of orbits) {
        const ox = Math.cos(o.a) * o.r;
        const oy = o.yo + Math.sin(o.a) * 3;
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = col2;
        ctx.shadowColor = '#88DDFF';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(ox, oy - 5); ctx.lineTo(ox - 3, oy); ctx.lineTo(ox, oy + 5); ctx.lineTo(ox + 3, oy); ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    }

    this._drawAttackTrail(ctx, p);
  }

  _drawVoltBody(ctx, col, col2, p) {
    const f = this.gameFrame;
    const pose = this._getAttackPose(p);
    const isActive = pose.phase === 'active';

    // Legs (leaner, longer)
    const legBob = p.state === 'run' ? Math.sin(f * 0.35) * 4 : 0;
    ctx.fillStyle = this._darken(col, 15);
    ctx.beginPath(); ctx.roundRect(-9, -18 + Math.max(0, legBob), 8, 18 - Math.max(0, legBob), 3); ctx.fill();
    ctx.beginPath(); ctx.roundRect(1, -18 - Math.min(0, legBob), 8, 18 + Math.min(0, legBob), 3); ctx.fill();

    // Slim bodysuit
    const bodyGrad = ctx.createLinearGradient(-8, -46, 8, -18);
    bodyGrad.addColorStop(0, this._lighten(col, 28));
    bodyGrad.addColorStop(0.6, col);
    bodyGrad.addColorStop(1, this._darken(col, 22));
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.roundRect(-8, -46, 16, 30, 3); ctx.fill();

    // Lightning bolt on chest (glowing)
    ctx.fillStyle = col2;
    ctx.shadowColor = col2;
    ctx.shadowBlur = 7;
    ctx.beginPath();
    ctx.moveTo(2, -43); ctx.lineTo(-4, -32); ctx.lineTo(0, -32);
    ctx.lineTo(-5, -20); ctx.lineTo(6, -33); ctx.lineTo(1, -33);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;

    // Back arm
    ctx.strokeStyle = this._darken(col, 5);
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-8, -42); ctx.lineTo(-19, -30); ctx.stroke();

    // Front arm — extends during attack
    const armEnd = isActive ? 27 : 18;
    ctx.beginPath(); ctx.moveTo(8, -42); ctx.lineTo(armEnd, -32); ctx.stroke();

    // Electric fist
    ctx.fillStyle = col2;
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = isActive ? 16 : 9;
    ctx.beginPath(); ctx.arc(armEnd + 2, -32, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Electric arcs around fist (deterministic)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = col2;
    ctx.shadowBlur = 8;
    for (let i = 0; i < 3; i++) {
      const a2 = (i / 3) * Math.PI * 2 + f * 0.22;
      const r2 = 7 + Math.sin(f * 0.3 + i) * 2;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.moveTo(armEnd + 2, -32);
      ctx.lineTo(armEnd + 2 + Math.cos(a2) * r2, -32 + Math.sin(a2) * r2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Head
    const hGrad = ctx.createRadialGradient(-2, -53, 2, 0, -51, 11);
    hGrad.addColorStop(0, this._lighten(col2, 25));
    hGrad.addColorStop(1, col2);
    ctx.fillStyle = hGrad;
    ctx.beginPath(); ctx.arc(0, -51, 10, 0, Math.PI * 2); ctx.fill();

    // Spiky hair
    ctx.fillStyle = col;
    const spikes = [-7, -2, 3, 8];
    spikes.forEach((sx, si) => {
      ctx.beginPath();
      ctx.moveTo(sx, -59);
      ctx.lineTo(sx + 3, -63 - (si % 2) * 4);
      ctx.lineTo(sx + 6, -59);
      ctx.closePath(); ctx.fill();
    });

    // Visor / goggles
    ctx.fillStyle = 'rgba(255,140,0,0.92)';
    ctx.shadowColor = '#FFA500';
    ctx.shadowBlur = 9;
    ctx.beginPath(); ctx.roundRect(1, -54, 9, 6, 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.roundRect(2, -53, 4, 2, 1); ctx.fill();

    // Speed lines when running
    if (p.state === 'run') {
      for (let i = 0; i < 3; i++) {
        const lAlpha = 0.55 - i * 0.12;
        ctx.strokeStyle = `rgba(255,215,0,${lAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-30 - i * 6, -30 - i * 8);
        ctx.lineTo(-17 - i * 5, -30 - i * 8);
        ctx.stroke();
      }
    }

    this._drawAttackTrail(ctx, p);
  }

  _drawTerraBody(ctx, col, col2, p) {
    const f = this.gameFrame;
    const pose = this._getAttackPose(p);
    const isActive = pose.phase === 'active';

    // Stubby legs
    ctx.fillStyle = this._darken(col, 10);
    ctx.beginPath(); ctx.roundRect(-14, -10, 12, 10, 3); ctx.fill();
    ctx.beginPath(); ctx.roundRect(2, -10, 12, 10, 3); ctx.fill();
    ctx.fillStyle = this._darken(col, 22);
    ctx.fillRect(-15, -2, 13, 2);
    ctx.fillRect(2, -2, 13, 2);

    // Wide barrel body
    const bodyGrad = ctx.createLinearGradient(-15, -42, 15, -10);
    bodyGrad.addColorStop(0, this._lighten(col, 16));
    bodyGrad.addColorStop(0.5, col);
    bodyGrad.addColorStop(1, this._darken(col, 26));
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.roundRect(-15, -42, 30, 34, 5); ctx.fill();

    // Rock texture crack lines
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-8, -36); ctx.lineTo(-4, -25); ctx.lineTo(-9, -18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, -40); ctx.lineTo(11, -29); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2, -14); ctx.lineTo(4, -10); ctx.stroke();

    // Mossy spots
    ctx.fillStyle = '#228B22';
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < 5; i++) {
      const mx = -10 + ((i * 7) % 22);
      const my = -38 + ((i * 5) % 22);
      ctx.beginPath(); ctx.arc(mx, my, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Back arm (massive)
    ctx.fillStyle = this._darken(col, 8);
    ctx.beginPath(); ctx.roundRect(-34, -40, 20, 26, 5); ctx.fill();
    ctx.fillStyle = col2;
    ctx.beginPath(); ctx.arc(-24, -13, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-28, -15); ctx.lineTo(-22, -9); ctx.stroke();

    // Front arm — extends during attack
    const armRight = isActive ? 36 : 26;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.roundRect(15, -40, armRight - 15, 24, 5); ctx.fill();
    // Boulder fist
    ctx.fillStyle = col2;
    ctx.shadowColor = isActive ? '#CCAA55' : 'transparent';
    ctx.shadowBlur = isActive ? 18 : 0;
    ctx.beginPath(); ctx.arc(armRight + 6, -27, 13, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Fist crack
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(armRight + 2, -30); ctx.lineTo(armRight + 8, -22); ctx.stroke();

    // Wide craggy head (larger than body width)
    const headGrad = ctx.createRadialGradient(-3, -55, 3, 0, -52, 17);
    headGrad.addColorStop(0, this._lighten(col, 20));
    headGrad.addColorStop(1, this._darken(col, 16));
    ctx.fillStyle = headGrad;
    ctx.beginPath(); ctx.arc(0, -52, 16, 0, Math.PI * 2); ctx.fill();

    // Head rock cracks
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-8, -62); ctx.lineTo(-6, -52); ctx.lineTo(-10, -47); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, -63); ctx.lineTo(9, -54); ctx.stroke();

    // Glowing green eyes
    ctx.fillStyle = '#33FF33';
    ctx.shadowColor = '#00EE00';
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(-5, -52, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, -52, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#004400';
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.ellipse(-5, -52, 1.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6, -52, 1.5, 3, 0, 0, Math.PI * 2); ctx.fill();

    // Mossy tuft on top of head
    ctx.fillStyle = '#228B22';
    ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.ellipse(2, -67, 11, 5, -0.2, 0, Math.PI); ctx.fill();
    ctx.globalAlpha = 1;

    // Ground dust when walking/running (deterministic)
    if (p.onGround && (p.state === 'run' || p.state === 'walk')) {
      const dustCycle = (f * 0.08) % 1;
      ctx.globalAlpha = (1 - dustCycle) * 0.45;
      ctx.fillStyle = col2;
      ctx.beginPath(); ctx.arc(-10, 0, 4 + dustCycle * 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(10, 0, 3 + dustCycle * 3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    this._drawAttackTrail(ctx, p);
  }

  // ── HUD / particles / projectiles ─────────────────────────────────────────

  _drawPlayerHud(ctx, p) {
    const x = p.x, y = p.y + 15;
    const pct = p.damage;
    const r = Math.min(255, Math.floor(pct * 2.5));
    const g = Math.max(0, Math.floor(255 - pct * 2.5));
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
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
      ctx.arc(part.x, part.y, Math.max(0, part.size * alpha), 0, Math.PI * 2);
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
      ctx.arc(p.x, p.y, Math.max(0, p.size * (0.5 + alpha * 0.5)), 0, Math.PI * 2);
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
