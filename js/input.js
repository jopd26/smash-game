class InputManager {
  constructor() {
    this.keys = {};
    this.prevKeys = {};
    this.attackBuffer = null;
    this.attackBufferTimer = 0;
    this.smashThreshold = 8; // velocity for smash input
    this.prevX = 0;
    this.smashCooldown = 0;
    window.addEventListener('keydown', e => {
      if (!this.keys[e.code]) this.onKeyDown(e.code);
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
    return this.keys[code] && !this.prevKeys[code];
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
    // Smash input: quick direction tap
    if (axis === 'x') {
      const cur = (this.keys['KeyD'] || this.keys['ArrowRight']) ? 1 :
                  (this.keys['KeyA'] || this.keys['ArrowLeft']) ? -1 : 0;
      const prev = (this.prevKeys['KeyD'] || this.prevKeys['ArrowRight']) ? 1 :
                   (this.prevKeys['KeyA'] || this.prevKeys['ArrowLeft']) ? -1 : 0;
      return cur !== 0 && prev === 0 && this.smashCooldown === 0;
    }
    if (axis === 'up') {
      return (this.keys['KeyW'] || this.keys['ArrowUp']) && !(this.prevKeys['KeyW'] || this.prevKeys['ArrowUp']);
    }
    if (axis === 'down') {
      return (this.keys['KeyS'] || this.keys['ArrowDown']) && !(this.prevKeys['KeyS'] || this.prevKeys['ArrowDown']);
    }
    return false;
  }

  getState() {
    return {
      left: !!this.left, right: !!this.right, up: !!this.up, down: !!this.down,
      jump: !!this.jump,
      attackBuffer: this.attackBuffer,
      keys: { ...this.keys },
      prevKeys: { ...this.prevKeys },
    };
  }

  applyState(state) {
    this.keys = state.keys || {};
    this.prevKeys = state.prevKeys || {};
    this.attackBuffer = state.attackBuffer || null;
  }
}

// Remote player input (controlled over network)
class RemoteInput {
  constructor() {
    this.state = { left:false, right:false, up:false, down:false, jump:false, attackBuffer:null, keys:{}, prevKeys:{} };
    this._buffer = null;
  }
  update() {
    this.prevKeys = { ...this.state.keys };
    if (this._buffer) { this.state = this._buffer; this._buffer = null; }
  }
  pushState(state) { this._buffer = state; }
  get left() { return this.state.left; }
  get right() { return this.state.right; }
  get up() { return this.state.up; }
  get down() { return this.state.down; }
  get jump() { return this.state.jump; }
  get attackBuffer() { return this.state.attackBuffer; }
  justPressed(code) { return this.state.keys[code] && !this.prevKeys[code]; }
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
    if (axis === 'x') {
      const cur = this.state.keys['KeyD'] ? 1 : this.state.keys['KeyA'] ? -1 : 0;
      const prev = (this.prevKeys || {})['KeyD'] ? 1 : (this.prevKeys || {})['KeyA'] ? -1 : 0;
      return cur !== 0 && prev === 0;
    }
    if (axis === 'up') return this.state.keys['KeyW'] && !(this.prevKeys || {})['KeyW'];
    if (axis === 'down') return this.state.keys['KeyS'] && !(this.prevKeys || {})['KeyS'];
    return false;
  }
  getState() { return this.state; }
}
