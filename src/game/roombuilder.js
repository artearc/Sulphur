// Turns a room layout into merged pixel-textured geometry (one draw call for architecture),
// a scrolling liquid layer, an abyss below, animated prop sprites, lights and ambient emitters.
import * as THREE from 'three';
import { C, TZ } from './room.js';
import { NORTH_BAND } from './roomgen.js';
import { circleAtlas } from '../art/tiles.js';
import { createWorldMaterial, Y_STRETCH } from '../render/materials.js';
import { SharedUniforms } from '../render/lighting.js';
import { Sprite } from '../render/sprite.js';
import { propSheet, PROPS } from '../art/props.js';
import { CIRCLE_PALETTES } from '../art/palette.js';
import { hash2 } from '../core/rng.js';

const ROW = Y_STRETCH;           // one 16px tile row of vertical face, in world units
export const WALL_H = ROW * 3;
const LOW_H = ROW * 0.75;
const BOX_H = ROW;

class GeoBuilder {
  constructor() { this.pos = []; this.uv = []; this.col = []; this.nrm = []; this.idx = []; }
  // quad from 4 corners (counter-clockwise as seen from the front), uv rect [u0,v0,u1,v1], per-vertex shade
  quad(a, b, c, d, uvr, n, shade = [1, 1, 1, 1], tint = [1, 1, 1]) {
    const base = this.pos.length / 3;
    for (const p of [a, b, c, d]) this.pos.push(p[0], p[1], p[2]);
    const [u0, v0, u1, v1] = uvr;
    this.uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
    for (let k = 0; k < 4; k++) { this.col.push(shade[k] * tint[0], shade[k] * tint[1], shade[k] * tint[2]); this.nrm.push(n[0], n[1], n[2]); }
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

export function buildRoom(layout, room, circle, world) {
  const atlas = circleAtlas(circle.id === 'hub' ? 'hub' : circle.id);
  const pal = CIRCLE_PALETTES[atlas.id];
  const group = new THREE.Group();
  const { w, h } = layout;
  const get = (i, j) => room.get(i, j);
  const solidForAO = (t) => t === C.WALL || t === C.PILLAR || t === C.BOX || t === C.LOW;
  const seed = layout.seed || 7;

  const G = new GeoBuilder();
  const LQ = new GeoBuilder();

  const tintFor = (i, j) => {
    const n = hash2(i, j, seed);
    const k = 0.9 + n * 0.1;
    return [k, k, k];
  };
  const aoCorner = (ci, cj) => {
    // corner (ci,cj) is shared by cells (ci-1..ci, cj-1..cj)
    let s = 0;
    for (const [di, dj] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) if (solidForAO(get(ci + di, cj + dj))) s++;
    return 1 - s * 0.16;
  };

  // ------------------------------------------------ floors ------------------------------------------------
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const t = get(i, j);
    const z0 = j * TZ, z1 = (j + 1) * TZ;
    if (t === C.FLOOR || t === C.DOOR) {
      let v = layout.floorVar ? layout.floorVar[j * w + i] : 0;
      if (t === C.DOOR) v = 3;
      // rubble tiles near walls
      if (v < 12 && hash2(i, j, seed + 5) > 0.86 && (solidForAO(get(i, j - 1)) || solidForAO(get(i - 1, j)) || solidForAO(get(i + 1, j)))) {
        const uvr = atlas.uv(8 + Math.floor(hash2(i, j, 3) * 4), 3);
        G.quad([i, 0, z1], [i + 1, 0, z1], [i + 1, 0, z0], [i, 0, z0], uvr, [0, 1, 0],
          [aoCorner(i, j + 1), aoCorner(i + 1, j + 1), aoCorner(i + 1, j), aoCorner(i, j)], tintFor(i, j));
        continue;
      }
      const uvr = atlas.uv(v, 0);
      G.quad([i, 0, z1], [i + 1, 0, z1], [i + 1, 0, z0], [i, 0, z0], uvr, [0, 1, 0],
        [aoCorner(i, j + 1), aoCorner(i + 1, j + 1), aoCorner(i + 1, j), aoCorner(i, j)], tintFor(i, j));
    } else if (t === C.LIQUID) {
      const ly = layout.liquid.kind === 'ice' ? -0.02 : -0.16;
      const north = get(i, j - 1);
      const edge = north === C.FLOOR || north === C.DOOR;
      const uvr = atlas.uv(edge ? 4 + ((i + j) % 4) : (i * 3 + j) % 4, 3);
      LQ.quad([i, ly, z1], [i + 1, ly, z1], [i + 1, ly, z0], [i, ly, z0], uvr, [0, 1, 0], [1, 1, 1, 1]);
    }
  }
  // drop faces: floor edges facing south into void or liquid
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const t = get(i, j);
    if (t !== C.FLOOR && t !== C.DOOR && t !== C.LOW) continue;
    const s = get(i, j + 1);
    const z = (j + 1) * TZ;
    if (s === C.VOID || (j === h - 1)) {
      for (let r = 0; r < 4; r++) {
        const y0 = -r * ROW, y1 = -(r + 1) * ROW;
        const uvr = atlas.uv(10 + ((i + r) % 4), 2);
        const sh = 1 - r * 0.2;
        G.quad([i, y1, z], [i + 1, y1, z], [i + 1, y0, z], [i, y0, z], uvr, [0, 0, 1], [sh * 0.8, sh * 0.8, sh, sh]);
      }
    } else if (s === C.LIQUID) {
      const ly = layout.liquid.kind === 'ice' ? -0.02 : -0.16;
      const uvr = atlas.uv(10 + (i % 4), 2);
      G.quad([i, ly, z], [i + 1, ly, z], [i + 1, 0, z], [i, 0, z], [uvr[0], uvr[3] - (uvr[3] - uvr[1]) * 0.15, uvr[2], uvr[3]], [0, 0, 1], [0.6, 0.6, 0.9, 0.9]);
    }
  }

  // ------------------------------------------------ walls / pillars / boxes ------------------------------------------------
  const faceVariant = (i, j) => {
    const n = hash2(i, j, seed + 11);
    if (n < 0.45) return 0;
    if (n < 0.55) return 5;
    return 1 + Math.floor(((n - 0.55) / 0.45) * 7) % 7;
  };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const t = get(i, j);
    if (t !== C.WALL && t !== C.PILLAR && t !== C.BOX && t !== C.LOW) continue;
    const z0 = j * TZ, z1 = (j + 1) * TZ;
    const H = t === C.LOW ? LOW_H : t === C.BOX ? BOX_H : WALL_H;
    // top
    let topUv = atlas.uv(hash2(i, j, 9) * 4 | 0, 2);
    if (t === C.BOX) topUv = atlas.uv(1, 4);
    const topShade = t === C.WALL ? 0.85 : 1;
    G.quad([i, H, z1], [i + 1, H, z1], [i + 1, H, z0], [i, H, z0], topUv, [0, 1, 0], [topShade, topShade, topShade, topShade]);
    // south face if exposed
    const s = get(i, j + 1);
    const exposed = !(s === C.WALL || (t === C.LOW && s === C.LOW)) || j === h - 1;
    if (!exposed) continue;
    if (t === C.LOW) {
      const uvr = atlas.uv(14 + (i % 2), 2);
      G.quad([i, 0, z1], [i + 1, 0, z1], [i + 1, H, z1], [i, H, z1], [uvr[0], uvr[1] + (uvr[3] - uvr[1]) * 0.25, uvr[2], uvr[3]], [0, 0, 1], [0.6, 0.6, 1, 1]);
      continue;
    }
    if (t === C.BOX) {
      const uvr = atlas.uv(0, 4);
      G.quad([i, 0, z1], [i + 1, 0, z1], [i + 1, H, z1], [i, H, z1], uvr, [0, 0, 1], [0.6, 0.6, 1, 1]);
      continue;
    }
    const rows = 3;
    for (let r = 0; r < rows; r++) {
      const y0 = r * ROW, y1 = (r + 1) * ROW;
      let uvr;
      if (t === C.PILLAR) uvr = r === rows - 1 ? atlas.uv(8, 2) : r === 0 ? atlas.uv(8 + (i % 4), 1) : atlas.uv(4 + ((i + j) % 4), 2);
      else if (r === 0) uvr = atlas.uv(8 + ((i + j) % 4), 1);
      else if (r === rows - 1) uvr = atlas.uv(12 + (i % 4), 1);
      else uvr = atlas.uv(faceVariant(i, j), 1);
      const b = r === 0 ? 0.55 : 0.85 + r * 0.05, tp = r === 0 ? 0.85 : 1;
      G.quad([i, y0, z1], [i + 1, y0, z1], [i + 1, y1, z1], [i, y1, z1], uvr, [0, 0, 1], [b, b, tp, tp]);
    }
  }

  const mat = createWorldMaterial(atlas.texture, { emissive: atlas.emissive, emissiveStrength: 1.0 });
  const archMesh = new THREE.Mesh(G.build(), mat);
  archMesh.frustumCulled = false;
  group.add(archMesh);

  let liquidMesh = null;
  if (LQ.pos.length) {
    const glow = atlas.style.liquidGlow;
    const lmat = createWorldMaterial(atlas.texture, { emissive: glow ? atlas.emissive : null, emissiveStrength: 0.9, scrollX: layout.liquid.kind === 'ice' ? 0 : 0.18, scrollY: layout.liquid.kind === 'ice' ? 0 : 0.05, wrap: 0.6 });
    liquidMesh = new THREE.Mesh(LQ.build(), lmat);
    liquidMesh.frustumCulled = false;
    group.add(liquidMesh);
  }

  // ------------------------------------------------ abyss ------------------------------------------------
  const abyssGeo = new THREE.PlaneGeometry(w + 60, h * TZ + 60);
  abyssGeo.rotateX(-Math.PI / 2);
  const abyss = new THREE.Mesh(abyssGeo, new THREE.ShaderMaterial({
    uniforms: { uAbyssColor: SharedUniforms.uAbyssColor, uTime: SharedUniforms.uTime },
    vertexShader: `varying vec3 vWp; void main(){ vec4 wp = modelMatrix*vec4(position,1.); vWp = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform vec3 uAbyssColor; uniform float uTime; varying vec3 vWp;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      void main(){
        vec2 p = floor(vWp.xz*4.)/4.;
        float v = n(p*0.18 + vec2(uTime*0.03, -uTime*0.02))*0.6 + n(p*0.5 - uTime*0.05)*0.4;
        gl_FragColor = vec4(uAbyssColor*(0.45 + v*0.9), 1.);
      }`,
  }));
  abyss.position.set(w / 2, -9, (h * TZ) / 2);
  group.add(abyss);

  // ------------------------------------------------ props ------------------------------------------------
  const props = [];
  for (const p of layout.props) {
    const def = PROPS[p.name];
    if (!def) continue;
    const ctx = {};
    if (p.name === 'brazier' && circle.props?.fireRamp) ctx.fire = circle.props.fireRamp;
    if (['brokenColumn', 'column', 'mourner', 'graveCross'].includes(p.name)) ctx.stone = pal.wall;
    if (p.name === 'mourner' && circle.id === 'limbo') ctx.weep = true;
    const sheet = propSheet(p.name, ctx);
    const spr = new Sprite(sheet, { anim: 'idle', pivot: 2, minLight: 0.18 });
    spr.time = Math.random() * 3;
    spr.place(p.x, 0, p.z);
    group.add(spr.mesh);
    const entry = { def, sprite: spr, x: p.x, z: p.z, name: p.name, emitT: Math.random() };
    if (def.light) {
      const lc = def.light.color ?? (circle.props?.fireRamp ? circle.props.fireRamp[3] : pal.light);
      entry.light = world.lights.add({ x: p.x, y: def.light.y, z: p.z + 0.2, color: lc, intensity: (def.light.intensity) * (pal.lightIntensity || 1) * 0.75, radius: def.light.radius, flicker: def.light.flicker || 0 });
    }
    if (def.solid) world.addObstacle(p.x, p.z, def.solid);
    props.push(entry);
  }

  // floor debris decals
  for (const d of layout.debris || []) {
    if (d.kind === 'crack') world.fx.decal('crack', d.x, d.z, 0.5 + Math.random() * 0.4, { alpha: 0.8 });
    else if (d.kind === 'stain') world.fx.decal(circle.id === 'gula' ? 'bile' : 'blood' + (Math.random() * 4 | 0), d.x, d.z, 0.4 + Math.random() * 0.4, { alpha: 0.7, color: circle.id === 'violencia' ? 0xffffff : 0x9a8a8a });
  }

  const fireFor = circle.props?.fireRamp;
  return {
    group, props, archMesh, liquidMesh,
    update(dt, fx) {
      for (const p of props) {
        p.sprite.update(dt);
        const em = p.def.emit;
        if (em) {
          p.emitT -= dt;
          if (p.emitT <= 0) {
            p.emitT = 1 / em.rate;
            fx.emit(em.preset, p.x, em.y, p.z, 1, { radius: em.radius || 0.15, ...(em.preset === 'ember' && fireFor ? { c0: fireFor[4], c1: fireFor[1] } : {}) });
          }
        }
      }
    },
    dispose() {
      archMesh.geometry.dispose(); mat.dispose();
      if (liquidMesh) { liquidMesh.geometry.dispose(); liquidMesh.material.dispose(); }
      abyssGeo.dispose(); abyss.material.dispose();
      for (const p of props) { p.sprite.dispose(); if (p.light) world.lights.remove(p.light); }
      group.removeFromParent();
    },
  };
}
