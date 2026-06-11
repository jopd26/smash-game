const PLAYER_COLORS = ['#FF4500', '#00BFFF', '#FFD700', '#6B8E23'];
const PLAYER_W = 30, PLAYER_H = 60;

class Player {
  constructor(id, charKey, input, spawnX, spawnY) {
    this.id = id;
    this.charKey = charKey;
    this.charData = CHARACTERS[charKey];
    this.input = input;
    this.playerColor = PLAYER_COLORS[id];

    this.x = spawnX;
    this.y = spawnY;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.canDoubleJump = true;
    this.jumpsUsed = 0;

    this.state = 'idle'; // idle, walk, run, jump, fall, attack, hitstun, dead, respawning
    this.attackState = null; // { name, frame, data }
    this.hitstunFrames = 0;
    this.invincFrames = 0;
    this.respawnTimer = 0;

    this.damage = 0;
    this.stocks = 3;

    this.dropThrough = false;
    this.dropThroughTimer = 0;

    this.jabCombo = 0;
    this.jabComboTimer = 0;
    this.landingLag = 0;
    this.wasInAir = false;
    this.lastHitFacing = 1;
    this.smashCharge = 0;
    this.smashCharging = false;
    this.smashAttackName = null;

    this.particles = [];
    this.trail = [];
    this.freezeTimer = 0;

    // Track what platforms were hit this attack frame
    this._hitTargets = new Set();
  }

  get stats() { return this.charData.stats; }

  spawnAt(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.state = 'respawning';
    this.invincFrames = 120;
    this.attackState = null;
    this.hitstunFrames = 0;
    this.dropThrough = false;
    this.jabCombo = 0;
  }

  update(stage, players, projectiles) {
    if (this.state === 'dead') return;
    if (this.freezeTimer > 0) { this.freezeTimer--; return; }

    const s = this.stats;
    const input = this.input;
    input.update();

    if (this.invincFrames > 0) this.invincFrames--;
    if (this.dropThroughTimer > 0) { this.dropThroughTimer--; if (this.dropThroughTimer === 0) this.dropThrough = false; }
    if (this.landingLag > 0) { this.landingLag--; return; }
    if (this.jabComboTimer > 0) this.jabComboTimer--;

    if (this.state === 'respawning') {
      this.state = 'fall';
    }

    // Hitstun
    if (this.hitstunFrames > 0) {
      this.hitstunFrames--;
      this._applyGravity();
      this._applyMovement(stage);
      this._checkDeath(stage);
      return;
    }

    // Attack processing
    if (this.attackState) {
      this._processAttack(players, projectiles);
      this._applyGravity();
      this._applyMovement(stage);
      this._checkDeath(stage);
      return;
    }

    this._processInput(stage, players, projectiles);
    this._applyGravity();
    this._applyMovement(stage);
    this._checkDeath(stage);

    // Trail
    this.trail.push({ x: this.x, y: this.y, alpha: 0.6 });
    if (this.trail.length > 6) this.trail.shift();
    this.trail.forEach(t => { t.alpha -= 0.1; });
  }

  _processInput(stage, players, projectiles) {
    const s = this.stats;
    const input = this.input;
    const stick = input.getStick();

    // Facing
    if (stick.x !== 0 && this.state !== 'attack') this.facing = stick.x > 0 ? 1 : -1;

    // Drop through
    if (this.onGround && stick.y > 0 && input.justPressed('KeyS')) {
      this.dropThrough = true;
      this.dropThroughTimer = 12;
    }

    // Jump
    if ((input.justPressed('KeyW') || input.justPressed('Space') || input.justPressed('ArrowUp'))) {
      if (this.onGround) {
        this.vy = s.jumpVy;
        this.onGround = false;
        this.state = 'jump';
        this.canDoubleJump = true;
        this._spawnParticles(2, 'jump');
      } else if (this.canDoubleJump) {
        this.vy = s.doubleJumpVy;
        this.canDoubleJump = false;
        this._spawnParticles(4, 'doublejump');
      }
    }

    // Fast fall
    if (!this.onGround && stick.y > 0 && this.vy > 0) {
      this.vy = Math.min(this.vy + 2, s.fastFallSpeed);
    }

    // Horizontal movement
    if (this.onGround) {
      if (stick.x !== 0) {
        const targetSpd = Math.abs(stick.x) * s.runSpeed;
        this.vx += (stick.x * targetSpd - this.vx) * 0.3;
        this.state = 'run';
      } else {
        this.vx *= s.friction;
        if (Math.abs(this.vx) < 0.5) this.vx = 0;
        this.state = Math.abs(this.vx) < 0.5 ? 'idle' : 'walk';
      }
    } else {
      if (stick.x !== 0) {
        this.vx += stick.x * s.airAccel;
        this.vx = Math.sign(this.vx) * Math.min(Math.abs(this.vx), s.airSpeed);
      } else {
        this.vx *= s.airFriction;
      }
      this.state = this.vy < 0 ? 'jump' : 'fall';
    }

    // Attack input
    const attackBuf = input.consumeAttackBuffer();
    if (attackBuf) {
      this._startAttack(attackBuf, stick);
    }
  }

  _startAttack(type, stick) {
    const attacks = this.charData.attacks;
    let atkName = null;

    if (type === 'normal') {
      if (!this.onGround) {
        // Aerial
        if (stick.y < 0) atkName = 'uair';
        else if (stick.y > 0) atkName = 'dair';
        else if (stick.x !== 0) {
          atkName = (stick.x * this.facing > 0) ? 'fair' : 'bair';
        } else atkName = 'nair';
      } else {
        // Ground
        if (stick.y < 0) {
          atkName = this._isSmashUpInput() ? 'usmash' : 'utilt';
        } else if (stick.y > 0) {
          atkName = this._isSmashDownInput() ? 'dsmash' : 'dtilt';
        } else if (stick.x !== 0) {
          if (Math.abs(this.vx) > 3 && stick.x * this.facing > 0) {
            atkName = 'dash';
          } else {
            atkName = this._isSmashSideInput(stick.x) ? 'fsmash' : 'ftilt';
            if (stick.x !== 0) this.facing = stick.x > 0 ? 1 : -1;
          }
        } else {
          // Jab combo
          if (this.jabComboTimer > 0) {
            this.jabCombo = (this.jabCombo % 3) + 1;
          } else {
            this.jabCombo = 1;
          }
          atkName = this.jabCombo === 1 ? 'jab' : this.jabCombo === 2 ? 'jab2' : 'jab3';
          this.jabComboTimer = 18;
        }
      }
    } else if (type === 'special') {
      if (!this.onGround && stick.y < -0.3) atkName = 'uspecial'; // recovery move — air only
      else if (stick.y > 0.3) atkName = 'dspecial';
      else if (stick.x !== 0) { atkName = 'sspecial'; this.facing = stick.x > 0 ? 1 : -1; }
      else atkName = 'nspecial';
    }

    if (atkName && attacks[atkName]) {
      this._hitTargets = new Set();
      this.attackState = {
        name: atkName,
        frame: 0,
        data: attacks[atkName],
        hitDone: false,
      };
      this.state = 'attack';
    }
  }

  _isSmashSideInput(x) {
    return this.input.isSmashInput('x');
  }
  _isSmashUpInput() {
    return this.input.isSmashInput('up');
  }
  _isSmashDownInput() {
    return this.input.isSmashInput('down');
  }

  _processAttack(players, projectiles) {
    const atk = this.attackState;
    atk.frame++;
    const d = atk.data;
    const { s, a, e } = d.frames;
    const totalFrames = s + a + e;

    // Apply movement
    if (d.move && atk.frame === s) {
      this.vx = d.move.x * this.facing;
      this.vy = d.move.y;
    }

    // Startup
    if (atk.frame < s) return;

    // Active
    if (atk.frame >= s && atk.frame < s + a) {
      if (d.projectile && !atk.hitDone) {
        atk.hitDone = true;
        const pd = d.projectile;
        projectiles.push(new Projectile(
          this.x + this.facing * 20, this.y - 20,
          pd.spd * this.facing, pd.grav || 0,
          pd.dmg, pd.kbk, pd.ang, pd.life,
          pd.w, pd.h, pd.col, pd.eff || null, pd.freeze || 0,
          this.id
        ));
      } else if (d.hits) {
        for (const hit of d.hits) {
          const hb = Physics.getHitbox(this, hit);
          for (const target of players) {
            if (target.id === this.id) continue;
            if (target.state === 'dead') continue;
            if (target.invincFrames > 0) continue;
            if (this._hitTargets.has(target.id)) continue;
            const hurt = Physics.getHurtbox(target);
            if (Physics.rectOverlap(hb, hurt)) {
              this._hitTargets.add(target.id);
              target.takeHit(hit, this.facing, this);
            }
          }
        }
      }
    }

    // End
    if (atk.frame >= totalFrames) {
      this.attackState = null;
      this.state = this.onGround ? 'idle' : 'fall';
      if (!this.onGround) this.landingLag = 4;
    }
  }

  takeHit(hit, attackerFacing, attacker) {
    if (this.invincFrames > 0 || this.state === 'dead') return;
    this.damage += hit.dmg;
    this.lastHitFacing = attackerFacing;
    const kb = Physics.resolveKnockback(hit, this);
    this.vx = kb.vx;
    this.vy = kb.vy;
    this.hitstunFrames = kb.hitstun;
    this.attackState = null;
    this.state = 'hitstun';
    this.onGround = false;
    if (hit.freeze) this.freezeTimer = hit.freeze;
    this._spawnParticles(8, hit.eff || 'hit');
    if (attacker) attacker._spawnParticles(3, 'impact');
  }

  _applyGravity() {
    if (!this.onGround) {
      this.vy += this.stats.gravity;
      this.vy = Math.min(this.vy, this.stats.maxFallSpeed);
    }
  }

  _applyMovement(stage) {
    this.x += this.vx;
    this.y += this.vy;
    const platforms = STAGES[stage].platforms;
    this.onGround = false;

    for (const plat of platforms) {
      if (plat.type === 'passthrough') {
        if (this.vy >= 0 && !this.dropThrough) {
          const prevY = this.y - this.vy;
          const platTop = plat.y;
          if (prevY <= platTop && this.y >= platTop - 2 &&
              this.x + PLAYER_W / 2 > plat.x && this.x - PLAYER_W / 2 < plat.x + plat.w) {
            this.y = platTop;
            this.vy = 0;
            this.onGround = true;
            this.canDoubleJump = true;
          }
        }
      } else {
        // Solid platform: check from above first
        const playerBottom = this.y;
        const playerLeft = this.x - PLAYER_W / 2;
        const playerRight = this.x + PLAYER_W / 2;
        const platRight = plat.x + plat.w;
        const platBottom = plat.y + plat.h;

        if (playerRight > plat.x && playerLeft < platRight &&
            playerBottom > plat.y && playerBottom - this.vy <= plat.y + 4 && this.vy >= 0) {
          this.y = plat.y;
          this.vy = 0;
          this.onGround = true;
          this.canDoubleJump = true;
        } else if (playerRight > plat.x && playerLeft < platRight &&
                   this.y - PLAYER_H < platBottom && this.y - PLAYER_H - this.vy >= platBottom - 4 && this.vy < 0) {
          this.y = platBottom + PLAYER_H;
          this.vy = 0;
        } else if (this.y > plat.y && this.y - PLAYER_H < platBottom) {
          if (this.x + PLAYER_W / 2 > plat.x && this.x + PLAYER_W / 2 - this.vx <= plat.x) {
            this.x = plat.x - PLAYER_W / 2;
            this.vx = 0;
          } else if (this.x - PLAYER_W / 2 < platRight && this.x - PLAYER_W / 2 - this.vx >= platRight) {
            this.x = platRight + PLAYER_W / 2;
            this.vx = 0;
          }
        }
      }
    }

    if (this.onGround) {
      this.wasInAir = false;
      if (this.state === 'jump' || this.state === 'fall') {
        this.state = 'idle';
        if (this.landingLag === 0) this.landingLag = 3;
      }
    } else {
      this.wasInAir = true;
    }
  }

  _checkDeath(stage) {
    const bounds = STAGES[stage].deathBounds;
    if (this.x < bounds.left || this.x > bounds.right ||
        this.y < bounds.top || this.y > bounds.bottom) {
      this.stocks--;
      if (this.stocks <= 0) {
        this.state = 'dead';
        this.stocks = 0;
      } else {
        const spawn = STAGES[stage].spawnPoints[this.id % STAGES[stage].spawnPoints.length];
        this.spawnAt(spawn.x, spawn.y);
        this.damage = 0;
      }
    }
  }

  _spawnParticles(count, type) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      let col = '#ffffff';
      if (type === 'fire') col = `hsl(${20 + Math.random() * 30},100%,60%)`;
      else if (type === 'ice') col = `hsl(${190 + Math.random() * 30},100%,70%)`;
      else if (type === 'elec') col = `hsl(${50 + Math.random() * 20},100%,60%)`;
      else if (type === 'earth') col = `hsl(${25 + Math.random() * 20},60%,40%)`;
      else if (type === 'hit') col = '#ffff00';
      else if (type === 'jump') col = 'rgba(200,200,200,0.8)';
      else if (type === 'doublejump') col = `hsl(${Math.random()*360},100%,60%)`;
      this.particles.push({
        x: this.x, y: this.y - 30,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1,
        life: Math.floor(20 + Math.random() * 10),
        maxLife: 30,
        col, size: 3 + Math.random() * 3,
      });
    }
  }

  updateParticles() {
    this.particles = this.particles.filter(p => p.life > 0);
    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.15;
      p.life--;
    }
  }

  serialize() {
    return {
      id: this.id, x: this.x, y: this.y, vx: this.vx, vy: this.vy,
      facing: this.facing, state: this.state,
      attackState: this.attackState ? { name: this.attackState.name, frame: this.attackState.frame } : null,
      hitstunFrames: this.hitstunFrames, invincFrames: this.invincFrames,
      damage: this.damage, stocks: this.stocks,
      onGround: this.onGround, canDoubleJump: this.canDoubleJump,
      freezeTimer: this.freezeTimer,
    };
  }

  applyState(s) {
    this.x = s.x; this.y = s.y; this.vx = s.vx; this.vy = s.vy;
    this.facing = s.facing; this.state = s.state;
    this.hitstunFrames = s.hitstunFrames; this.invincFrames = s.invincFrames;
    this.damage = s.damage; this.stocks = s.stocks;
    this.onGround = s.onGround; this.canDoubleJump = s.canDoubleJump;
    this.freezeTimer = s.freezeTimer || 0;
    if (s.attackState && this.attackState) {
      this.attackState.frame = s.attackState.frame;
    } else if (s.attackState) {
      const atk = this.charData.attacks[s.attackState.name];
      if (atk) this.attackState = { name: s.attackState.name, frame: s.attackState.frame, data: atk, hitDone: true };
    } else {
      this.attackState = null;
    }
  }
}

class Projectile {
  constructor(x, y, vx, grav, dmg, kbk, ang, life, w, h, col, eff, freeze, ownerId) {
    this.x = x; this.y = y; this.vx = vx; this.vy = 0;
    this.grav = grav; this.dmg = dmg; this.kbk = kbk; this.ang = ang;
    this.life = life; this.w = w; this.h = h; this.col = col;
    this.eff = eff; this.freeze = freeze; this.ownerId = ownerId;
    this.dead = false;
    this.bkb = 3; this.kbg = 1.0;
  }

  update(players) {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.grav;
    this.life--;
    if (this.life <= 0) { this.dead = true; return; }

    for (const p of players) {
      if (p.id === this.ownerId || p.state === 'dead' || p.invincFrames > 0) continue;
      const hb = { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
      const hurt = Physics.getHurtbox(p);
      if (Physics.rectOverlap(hb, hurt)) {
        const hit = { dmg: this.dmg, ang: this.ang, bkb: this.bkb, kbg: this.kbg,
                      eff: this.eff, freeze: this.freeze || 0 };
        p.takeHit(hit, Math.sign(this.vx), null);
        this.dead = true;
        break;
      }
    }
  }

  serialize() {
    return { x: this.x, y: this.y, vx: this.vx, vy: this.vy, w: this.w, h: this.h,
             col: this.col, eff: this.eff, life: this.life };
  }
}
