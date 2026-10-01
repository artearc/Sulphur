import { Input } from './core/input.js';
// Dev tooling: pixel magnifier for art-direction passes. window.__mag(cx, cy, w, h, scale)
export function installDebug(game) {
  window.__mag = (cx = 0.5, cy = 0.5, w = 160, h = 120, scale = 4) => {
    game.frame(0);
    const src = game.canvas;
    const sx = Math.round(cx * src.width - w / 2), sy = Math.round(cy * src.height - h / 2);
    let ov = document.getElementById('__mag');
    if (!ov) { ov = document.createElement('canvas'); ov.id = '__mag'; ov.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;image-rendering:pixelated;border:2px solid #f2c45a;background:#000'; document.body.appendChild(ov); }
    ov.width = w * scale; ov.height = h * scale;
    const ctx = ov.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, sx, sy, w, h, 0, 0, w * scale, h * scale);
    ov.style.display = 'block';
    return [sx, sy];
  };
  window.__magOff = () => { const ov = document.getElementById('__mag'); if (ov) ov.style.display = 'none'; };
  // native low-res frame dump of the scene target (no post)
  window.__low = (scale = 2) => {
    const p = game.pipe, rt = p.rtScene;
    const w = rt.width, h = rt.height;
    const buf = new Uint16Array(w * h * 4);
    p.renderer.readRenderTargetPixels(rt, 0, 0, w, h, buf);
    return [w, h];
  };
}

// QA bot: plays the game crudely (fights, takes rewards, walks through doors, advances dialogue).
// Frame-driven so it also works with window.__sim(seconds), which steps the game synchronously
// (useful when the tab is hidden and requestAnimationFrame is throttled).
export function installBot(game) {
  let on = false, atkT = 0, confT = 0;
  const releases = [];
  const tap = (code, frames = 3) => { Input._press(code); releases.push({ code, f: frames }); };
  const hold = new Set();
  const setHold = (codes) => {
    for (const c of [...hold]) if (!codes.includes(c)) { Input._release(c); hold.delete(c); }
    for (const c of codes) if (!hold.has(c)) { Input._press(c); hold.add(c); }
  };
  let ff = null, ffKey = '';
  const moveTo = (p, x, z, stop = 0.4) => {
    const room = game.world.room;
    if (room && Math.hypot(x - p.x, z - p.z) > 2.5) {
      const [ti, tj] = room.cellAt(x, z);
      const key = ti + ',' + tj + room.w;
      if (key !== ffKey) { ff = room.flowField(x, z); ffKey = key; }
      const [ci, cj] = room.cellAt(p.x, p.z);
      let best = null, bd = ff[cj * room.w + ci] >= 0 ? ff[cj * room.w + ci] : 1e9;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const v = ff[(cj + dj) * room.w + ci + di];
        if (v >= 0 && v < bd) { bd = v; best = room.center(ci + di, cj + dj); }
      }
      if (best) { x = best.x; z = best.z; stop = 0.05; }
    }
    const dx = x - p.x, dz = z - p.z;
    const keys = [];
    // unstick: if we barely moved for a while, sidestep
    const moved = Math.hypot(p.x - (game.botLast?.x ?? 0), p.z - (game.botLast?.z ?? 0));
    game.botLast = { x: p.x, z: p.z };
    game.botStuck = moved < 0.01 && Math.hypot(dx, dz) > stop ? (game.botStuck || 0) + 1 : 0;
    if (game.botStuck > 20) { game.botSide = { keys: [Math.random() < 0.5 ? 'KeyA' : 'KeyD', Math.random() < 0.5 ? 'KeyS' : 'KeyW'], f: 25 }; game.botStuck = 0; }
    if (game.botSide && game.botSide.f-- > 0) { setHold(game.botSide.keys); return; }
    if (Math.hypot(dx, dz) > stop) {
      if (dx > 0.15) keys.push('KeyD'); if (dx < -0.15) keys.push('KeyA');
      if (dz > 0.15) keys.push('KeyS'); if (dz < -0.15) keys.push('KeyW');
    }
    setHold(keys);
  };
  const aimAt = (x, z) => {
    const s = game.rig.worldToScreen(x, 0, z);
    Input.mouse.x = s.x; Input.mouse.y = s.y; Input.mouse.inside = true; Input.usingPad = false;
  };
  const tick = (dt = 1 / 60) => {
    for (let i = releases.length - 1; i >= 0; i--) if (--releases[i].f <= 0) { Input._release(releases[i].code); releases.splice(i, 1); }
    if (!on) return;
    const W = game.world, p = W.player;
    atkT -= dt; confT -= dt;
    if (game.ui.blocking) { setHold([]); if (confT <= 0) { confT = 0.3; game.botFlip = !game.botFlip; tap(game.botFlip ? (Math.random() < 0.5 ? 'ArrowLeft' : 'ArrowRight') : 'Enter'); } return; }
    if (!p || !p.alive || p.locked) { setHold([]); return; }
    const foes = W.enemies.filter((e) => e.alive && !e.untargetable);
    if (foes.length) {
      foes.sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
      const e = foes[0];
      aimAt(e.x, e.z);
      const d = Math.hypot(e.x - p.x, e.z - p.z);
      moveTo(p, e.x, e.z, 1.4);
      if (d < 2.6 && atkT <= 0) { atkT = 0.22; tap(Math.random() < 0.12 ? 'Mouse2' : 'Mouse0', Math.random() < 0.12 ? 25 : 3); }
      if (p.fervor > 40 && Math.random() < 0.01) tap('KeyQ');
      if (Math.random() < 0.004) tap('Space');
      return;
    }
    const it = W.interactables.filter((i) => i.active !== false && !i.used && i.constructor.name !== 'Door' && (i.constructor.name !== 'NPC' || i.prompt === 'Escuchar'));
    const shrine = it.find((i) => i.constructor.name === 'RewardShrine') || it.find((i) => i.prompt === 'Escuchar') || it.find((i) => ['Rezar', 'Ofrecer sangre', 'Examinar', 'Beber de la fuente'].includes(i.prompt));
    if (shrine) {
      moveTo(p, shrine.x, shrine.z + 1, 0.6);
      if (Math.hypot(shrine.x - p.x, shrine.z + 1 - p.z) < 1.4 && confT <= 0) { confT = 0.5; tap('KeyE'); }
      return;
    }
    const doors = W.interactables.filter((i) => i.constructor.name === 'Door' && i.state === 'open');
    const door = doors[Math.floor((game.run?.roomsCleared || 0) % Math.max(1, doors.length))];
    if (door) { moveTo(p, door.x, door.z, 0.1); return; }
    setHold([]);
  };
  game.botTick = tick;
  const loop = () => { if (!on) { setHold([]); return; } requestAnimationFrame(loop); if (!game.simming) tick(); };
  window.__bot = (v = true) => { on = v; if (on) loop(); return on; };
  window.__god = (v = true) => { game.godMode = v; return 'god ' + v; };
  window.__power = (m = 10) => { game.debugDmg = m; return m; };
  // step the game synchronously for `sec` seconds (yielding microtasks so async flows advance)
  window.__sim = async (sec = 5, opts = {}) => {
    game.simming = true;
    const n = Math.round(sec * 60);
    for (let i = 0; i < n; i++) {
      tick();
      game.realTime += 0; game.frame(1 / 60, opts.render === false);
      if (opts.until && opts.until()) break;
      await Promise.resolve();
    }
    game.simming = false;
    const g = game, r = g.run;
    return [g.stateName, r?.circleIndex, r?.nodeId, r?.map?.nodes[r.nodeId]?.type, g.world.enemies.filter((e) => e.alive).length, r?.kills, r?.roomsCleared, g.ui.blocking, g.world.player?.hp | 0].join('|');
  };
}
