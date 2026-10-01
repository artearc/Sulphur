// Game: owns the renderer, camera, world, UI, audio and the top-level state machine.
import * as THREE from 'three';
import { PixelPipeline } from '../render/pipeline.js';
import { CameraRig } from '../render/camera.js';
import { World } from './world.js';
import { Input } from '../core/input.js';
import { Save } from '../core/save.js';
import { Events } from '../core/events.js';
import { clamp } from '../core/math.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.pipe = new PixelPipeline(canvas);
    this.rig = new CameraRig(this.pipe);
    this.scene = new THREE.Scene();
    this.world = new World(this);
    this.states = {};
    this.state = null;
    this.stateName = '';
    this.timeScale = 1;
    this.hitstopT = 0;
    this.slowT = 0; this.slowScale = 1;
    this.realTime = 0;
    this.paused = false;
    this.run = null;
    this.ui = null;
    this.audio = null;
    this.last = performance.now();
    this.timers = [];
    this.frameMs = 16;
    Input.attach(canvas);
  }

  addState(name, s) { this.states[name] = s; s.game = this; }
  setState(name, params) {
    const prev = this.state;
    prev?.exit?.(name);
    this.state = this.states[name];
    this.stateName = name;
    this.state.enter?.(params, prev);
    Events.emit('state', { name });
  }

  // Game-time scheduler (pause/hitstop aware for 'sim', wall-clock-ish for 'real'). Replaces setTimeout
  // so cutscenes and waves stay deterministic and testable.
  after(sec, fn, mode = 'sim') { this.timers.push({ t: sec, fn, mode }); }
  wait(sec, mode = 'real') { return new Promise((r) => this.after(sec, r, mode)); }
  tween(sec, fn, mode = 'real') {
    return new Promise((resolve) => this.timers.push({ t: sec, d: sec, fn: () => { fn(1); resolve(); }, step: fn, mode }));
  }
  _tickTimers(simDt, rawDt) {
    const list = this.timers;
    this.timers = [];
    const keep = [];
    for (const tm of list) {
      tm.t -= tm.mode === 'sim' ? simDt : rawDt;
      if (tm.t <= 0) { try { tm.fn(); } catch (e) { console.error(e); } }
      else { if (tm.step) tm.step(1 - tm.t / tm.d); keep.push(tm); }
    }
    this.timers = keep.concat(this.timers);
  }

  // Freeze-frame on impact (game feel). Longest request wins.
  hitstop(t) { this.hitstopT = Math.max(this.hitstopT, t); }
  slowmo(scale, dur) { this.slowScale = scale; this.slowT = dur; }

  start() {
    const loop = (now) => {
      const raw = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.frame(raw);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  frame(rawDt, noRender = false) {
    const t0 = performance.now();
    this.realTime += rawDt;
    Input.update(rawDt);
    let dt = Math.min(rawDt, 1 / 30) * Save.settings.gameSpeed;
    // global time manipulation
    if (this.slowT > 0) { this.slowT -= rawDt; dt *= this.slowScale; }
    let simDt = dt;
    if (this.hitstopT > 0) { this.hitstopT -= rawDt; simDt = 0; }
    if (this.paused) simDt = 0;
    this.simDt = simDt;
    this._tickTimers(simDt, Math.min(rawDt, 0.1));
    this.state?.update?.(simDt, rawDt);
    this.ui?.update?.(rawDt);
    this.audio?.update?.(rawDt);
    if (!noRender) this.pipe.render(this.scene, this.rig.camera, this.realTime);
    Input.endFrame();
    this.frameMs = this.frameMs * 0.95 + (performance.now() - t0) * 0.05;
  }
}
