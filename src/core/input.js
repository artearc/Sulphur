// Unified keyboard / mouse / gamepad input with remappable bindings and input buffering.
import { Events } from './events.js';

const DEFAULT_BINDINGS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  light: ['Mouse0', 'KeyJ'],
  heavy: ['Mouse2', 'KeyK'],
  dash: ['Space', 'ShiftLeft', 'ShiftRight'],
  special: ['KeyQ', 'KeyL'],
  interact: ['KeyE', 'KeyF', 'Enter'],
  pause: ['Escape', 'KeyP'],
  map: ['Tab', 'KeyM'],
  confirm: ['Enter', 'Space', 'KeyE'],
  back: ['Escape', 'Backspace'],
};

// Gamepad standard mapping
const PAD = { light: 2, heavy: 3, dash: 0, special: 5, interact: 1, pause: 9, map: 8, confirm: 0, back: 1 };

class InputManager {
  constructor() {
    this.bindings = structuredClone(DEFAULT_BINDINGS);
    this.down = new Set();
    this.pressed = new Set();   // pressed this frame
    this.released = new Set();
    this.buffer = new Map();    // action -> time remaining (input buffering for game feel)
    this.mouse = { x: 0, y: 0, nx: 0, ny: 0, inside: false };
    this.usingPad = false;
    this.padAxes = { mx: 0, mz: 0, ax: 0, az: 0 };
    this.padPrev = [];
    this.enabled = true;
    this.lastDevice = 'kb';
  }

  attach(el) {
    this.el = el;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (e.repeat) return;
      this._press(e.code);
      this.lastDevice = 'kb';
      this.usingPad = false;
    });
    window.addEventListener('keyup', (e) => this._release(e.code));
    window.addEventListener('mousedown', (e) => {
      if (e.target.closest && e.target.closest('.ui-interactive')) return;
      this._press('Mouse' + e.button);
      this.usingPad = false;
    });
    window.addEventListener('mouseup', (e) => this._release('Mouse' + e.button));
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.nx = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.ny = -(e.clientY / window.innerHeight) * 2 + 1;
      this.mouse.inside = true;
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) this.usingPad = false;
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('blur', () => { this.down.clear(); });
  }

  _press(code) {
    if (!this.down.has(code)) {
      this.down.add(code);
      this.pressed.add(code);
    }
  }
  _release(code) {
    if (this.down.has(code)) {
      this.down.delete(code);
      this.released.add(code);
    }
  }

  isDown(action) {
    if (!this.enabled) return false;
    const b = this.bindings[action];
    if (b) for (const c of b) if (this.down.has(c)) return true;
    return this.down.has('Pad' + PAD[action]);
  }
  wasPressed(action) {
    const b = this.bindings[action];
    if (b) for (const c of b) if (this.pressed.has(c)) return true;
    return this.pressed.has('Pad' + PAD[action]);
  }
  wasReleased(action) {
    const b = this.bindings[action];
    if (b) for (const c of b) if (this.released.has(c)) return true;
    return this.released.has('Pad' + PAD[action]);
  }
  // Buffered press: remembered for `window` seconds so inputs during recovery are not lost.
  buffered(action) { return this.buffer.has(action); }
  consume(action) { this.buffer.delete(action); }

  moveVector() {
    let x = 0, z = 0;
    if (this.isDown('left')) x -= 1;
    if (this.isDown('right')) x += 1;
    if (this.isDown('up')) z -= 1;
    if (this.isDown('down')) z += 1;
    if (Math.abs(this.padAxes.mx) + Math.abs(this.padAxes.mz) > 0.01) {
      x = this.padAxes.mx; z = this.padAxes.mz;
    }
    const l = Math.hypot(x, z);
    if (l > 1) { x /= l; z /= l; }
    return { x, z };
  }

  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads && [...pads].find((p) => p && p.connected);
    if (!pad) return;
    const dz = (v) => (Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82);
    this.padAxes.mx = dz(pad.axes[0] || 0);
    this.padAxes.mz = dz(pad.axes[1] || 0);
    this.padAxes.ax = dz(pad.axes[2] || 0);
    this.padAxes.az = dz(pad.axes[3] || 0);
    pad.buttons.forEach((b, i) => {
      const was = this.padPrev[i];
      if (b.pressed && !was) { this._press('Pad' + i); this.usingPad = true; this.lastDevice = 'pad'; }
      if (!b.pressed && was) this._release('Pad' + i);
      this.padPrev[i] = b.pressed;
    });
    // D-pad as movement
    if (pad.buttons[12]?.pressed) this.padAxes.mz = -1;
    if (pad.buttons[13]?.pressed) this.padAxes.mz = 1;
    if (pad.buttons[14]?.pressed) this.padAxes.mx = -1;
    if (pad.buttons[15]?.pressed) this.padAxes.mx = 1;
    if (Math.abs(this.padAxes.mx) + Math.abs(this.padAxes.mz) + Math.abs(this.padAxes.ax) > 0.2) {
      this.usingPad = true; this.lastDevice = 'pad';
    }
  }

  // Called at start of frame
  update(dt) {
    this.pollGamepad();
    for (const [k, t] of this.buffer) {
      const nt = t - dt;
      if (nt <= 0) this.buffer.delete(k); else this.buffer.set(k, nt);
    }
    for (const a of ['light', 'heavy', 'dash', 'special', 'interact']) {
      if (this.wasPressed(a)) this.buffer.set(a, a === 'dash' ? 0.12 : 0.18);
    }
  }
  // Called at end of frame
  endFrame() {
    this.pressed.clear();
    this.released.clear();
  }

  rebind(action, codes) {
    this.bindings[action] = codes;
    Events.emit('input:rebind', { action, codes });
  }
  resetBindings() { this.bindings = structuredClone(DEFAULT_BINDINGS); }
}

export const Input = new InputManager();
export { DEFAULT_BINDINGS };
