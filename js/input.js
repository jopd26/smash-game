class InputManager {
  constructor() {
    this.keys = {};
    this.prevKeys = {};
    this.attackBuffer = null;
    this.attackBufferTimer = 0;
    this.smashCooldown = 0;
    // Track fresh key presses between frames (not cleared by keyup)
    this._freshSet = new Set();
    this._freshSnap = new Set();
    window.addEventListener('keydown', e => {
      if (!this.keys[e.code]) {
        this._freshSet.add(e.code);
        this.onKeyDown(e.code);
      }
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });
  }

  onKeyDown(code) {
    if (code === 'KeyJ') this.bufferAttack('normal');
    if (code === 'KeyK') this.bufferAttack('special');
  }

  bufferAttack(type) {
    this.attackBuffer = type;
    this.attackBufferTimer = 8;
  }

  update() {
    // Snapshot keys pressed since last frame, then clear accumulator
    this._freshSnap = this._freshSet;
    this._freshSet = new Set();
    this.prevKeys = { ...this.keys };
    if (this.attackBufferTimer > 0) this.attackBufferTimer--;
    if (this.attackBufferTimer === 0) this.attackBuffer = null;
    if (this.smashCooldown > 0) this.smashCooldown--;
  }

  consumeAttackBuffer() {
    const buf = this.attackBuffer;
    this.attackBuffer = null;
    this.attackBufferTimer = 0;
    return buf;
  }

  get left() { return this.keys['KeyA'] || this.keys['ArrowLeft']; }
  get right() { return this.keys['KeyD'] || this.keys['ArrowRight']; }
  get up() { return this.keys['KeyW'] || this.keys['ArrowUp']; }
  get down() { return this.keys['KeyS'] || this.keys['ArrowDown']; }
  get jump() { return this.keys['KeyW'] || this.keys['Space'] || this.keys['ArrowUp']; }

  justPressed(code) {
    return this._freshSnap.has(code);
  }

  getStick() {
    let x = 0, y = 0;
    if (this.left) x -= 1;
    if (this.right) x += 1;
    if (this.up) y -= 1;
    if (this.down) y += 1;
    return { x, y };
  }

  isSmashInput(axis) {
    // Smash = direction key freshly pressed this frame
    if (axis === 'x') {
      return (this._freshSnap.has('KeyD') || this._freshSnap.has('ArrowRight') ||
              this._freshSnap.has('KeyA') || this._freshSnap.has('ArrowLeft')) && this.smashCooldown === 0;
    }
    if (axis === 'up') return this._freshSnap.has('KeyW') || this._freshSnap.has('ArrowUp');
    if (axis === 'down') return this._freshSnap.has('KeyS') || this._freshSnap.has('ArrowDown');
    return false;
  }

  getState() {
    return {
      left: !!this.left, right: !!this.right, up: !!this.up, down: !!this.down,
      jump: !!this.jump,
      attackBuffer: this.attackBuffer,
      keys: { ...this.keys },
      freshKeys: [...this._freshSnap],
    };
  }

  applyState(state) {
    this.keys = state.keys || {};
    this.attackBuffer = state.attackBuffer || null;
  }
}

// Remote player input (controlled over network)
class RemoteInput {
  constructor() {
    this.state = { left:false, right:false, up:false, down:false, jump:false, attackBuffer:null, keys:{}, freshKeys:[] };
    this._buffer = null;
    this._freshSnap = new Set();
  }
  update() {
    if (this._buffer) { this.state = this._buffer; this._buffer = null; }
    this._freshSnap = new Set(this.state.freshKeys || []);
  }
  pushState(state) { this._buffer = state; }
  get left() { return this.state.left; }
  get right() { return this.state.right; }
  get up() { return this.state.up; }
  get down() { return this.state.down; }
  get jump() { return this.state.jump; }
  get attackBuffer() { return this.state.attackBuffer; }
  justPressed(code) { return this._freshSnap.has(code); }
  consumeAttackBuffer() {
    const b = this.state.attackBuffer;
    this.state.attackBuffer = null;
    return b;
  }
  getStick() {
    return {
      x: (this.right ? 1 : 0) - (this.left ? 1 : 0),
      y: (this.down ? 1 : 0) - (this.up ? 1 : 0),
    };
  }
  isSmashInput(axis) {
    if (axis === 'x') return this._freshSnap.has('KeyD') || this._freshSnap.has('KeyA') || this._freshSnap.has('ArrowLeft') || this._freshSnap.has('ArrowRight');
    if (axis === 'up') return this._freshSnap.has('KeyW') || this._freshSnap.has('ArrowUp');
    if (axis === 'down') return this._freshSnap.has('KeyS') || this._freshSnap.has('ArrowDown');
    return false;
  }
  getState() { return this.state; }
}
