// Ground telegraphs: procedural shapes that fill up before an attack lands.
// Readability rule: the outline appears instantly, the interior fills toward the impact moment.
import * as THREE from 'three';
import { Z_SCALE } from './materials.js';

const SHAPES = { circle: 0, ring: 1, cone: 2, rect: 3 };

function makeMat() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uShape: { value: 0 },
      uFill: { value: 0 },
      uColor: { value: new THREE.Color(0xc8243a) },
      uEdge: { value: new THREE.Color(0xff6a4a) },
      uInner: { value: 0 },        // ring inner radius (0..1)
      uAngle: { value: 1 },        // cone half-angle
      uSize: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uAlpha: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vWp;
      void main() { vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vWp = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */ `
      uniform float uShape; uniform float uFill; uniform vec3 uColor; uniform vec3 uEdge;
      uniform float uInner; uniform float uAngle; uniform vec2 uSize; uniform float uTime; uniform float uAlpha;
      varying vec2 vUv; varying vec3 vWp;
      float bayer4(vec2 p) {
        ivec2 ip = ivec2(mod(p, 4.0)); int i = ip.x + ip.y * 4;
        float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
        return m[i] / 16.0;
      }
      void main() {
        vec2 p = vUv * 2.0 - 1.0;           // -1..1
        vec2 px = floor(vWp.xz * 16.0);
        float inside = 0.0, edge = 0.0, prog = 0.0;
        float edgeW = 1.6 / (max(uSize.x, uSize.y) * 8.0);
        if (uShape < 0.5) {               // circle
          float d = length(p);
          inside = step(d, 1.0);
          edge = step(1.0 - edgeW * 1.5, d) * inside;
          prog = d;
        } else if (uShape < 1.5) {        // ring
          float d = length(p);
          inside = step(d, 1.0) * step(uInner, d);
          edge = (step(1.0 - edgeW * 1.5, d) + step(d, uInner + edgeW * 1.5)) * inside;
          prog = (d - uInner) / max(0.001, 1.0 - uInner);
        } else if (uShape < 2.5) {        // cone (apex at center, facing +x in local space)
          float d = length(p);
          float a = abs(atan(p.y, p.x));
          inside = step(d, 1.0) * step(a, uAngle);
          edge = inside * max(step(1.0 - edgeW * 1.5, d), step(uAngle - edgeW * 1.5 / max(d, 0.05), a));
          prog = d;
        } else {                          // rect (origin at left edge, extends +x)
          vec2 q = vUv;
          inside = 1.0;
          float ex = edgeW * uSize.y / uSize.x;
          edge = max(step(q.y, edgeW * 1.2) + step(1.0 - edgeW * 1.2, q.y), step(q.x, ex * 1.5) + step(1.0 - ex * 1.5, q.x));
          prog = q.x;
        }
        if (inside < 0.5) discard;
        float filled = step(prog, uFill);
        float a = 0.0;
        vec3 col = uColor;
        if (edge > 0.5) { a = 0.95; col = uEdge; }
        else if (filled > 0.5) { a = 0.55 + 0.25 * step(uFill - 0.06, prog); col = mix(uColor, uEdge, step(uFill - 0.06, prog)); }
        else { a = 0.18 + 0.06 * sin(uTime * 14.0); }
        a *= uAlpha;
        if (bayer4(px) >= a) discard;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

export class Telegraphs {
  constructor(scene) {
    this.root = new THREE.Group();
    scene.add(this.root);
    this.list = [];
    this.pool = [];
    this.time = 0;
  }
  clear() { for (const t of this.list) this._release(t); this.list.length = 0; }

  _get() {
    let t = this.pool.pop();
    if (!t) {
      const geo = new THREE.PlaneGeometry(1, 1);
      geo.rotateX(-Math.PI / 2);
      t = { mesh: new THREE.Mesh(geo, makeMat()) };
      t.mesh.frustumCulled = false;
      t.mesh.renderOrder = 5;
    }
    this.root.add(t.mesh);
    return t;
  }
  _release(t) { t.mesh.removeFromParent(); this.pool.push(t); }

  /**
   * o: { shape: 'circle'|'ring'|'cone'|'rect', x, z, radius, inner, angle (facing), halfAngle,
   *      length, width, duration, color, edge, follow: entity, linger }
   */
  add(o) {
    const t = this._get();
    const m = t.mesh.material.uniforms;
    m.uShape.value = SHAPES[o.shape] ?? 0;
    m.uFill.value = 0;
    m.uColor.value.set(o.color ?? 0xa01020);
    m.uEdge.value.set(o.edge ?? 0xff5a3a);
    m.uInner.value = o.inner ? o.inner / o.radius : 0;
    m.uAngle.value = o.halfAngle ?? 0.6;
    m.uAlpha.value = 1;
    const mesh = t.mesh;
    mesh.rotation.set(0, 0, 0);
    if (o.shape === 'rect') {
      const L = o.length, W = o.width;
      mesh.geometry.dispose();
      const geo = new THREE.PlaneGeometry(L, W * Z_SCALE * 0 + W);
      geo.translate(L / 2, 0, 0);
      geo.rotateX(-Math.PI / 2);
      mesh.geometry = geo;
      mesh.scale.set(1, 1, 1);
      m.uSize.value.set(L, W);
    } else {
      if (mesh.geometry.parameters?.width !== 1 || mesh.geometry.parameters?.height !== 1) {
        mesh.geometry.dispose();
        const geo = new THREE.PlaneGeometry(1, 1);
        geo.rotateX(-Math.PI / 2);
        mesh.geometry = geo;
      }
      mesh.scale.set(o.radius * 2, 1, o.radius * 2);
      m.uSize.value.set(o.radius * 2, o.radius * 2);
    }
    mesh.rotation.y = -(o.angle ?? 0);
    mesh.position.set(o.x, (o.y ?? 0) + 0.03, o.z);
    Object.assign(t, { o, time: 0, duration: o.duration ?? 0.8, linger: o.linger ?? 0.12, done: false });
    this.list.push(t);
    return t;
  }

  update(dt) {
    this.time += dt;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const t = this.list[i];
      t.time += dt;
      const u = t.mesh.material.uniforms;
      u.uTime.value = this.time;
      if (t.o.follow && !t.o.follow.dead) {
        t.mesh.position.x = t.o.follow.x; t.mesh.position.z = t.o.follow.z;
        if (t.o.followAngle) t.mesh.rotation.y = -t.o.follow.angle;
      }
      const f = Math.min(1, t.time / t.duration);
      u.uFill.value = f;
      if (t.time > t.duration) {
        u.uAlpha.value = Math.max(0, 1 - (t.time - t.duration) / t.linger);
        if (t.time > t.duration + t.linger || t.cancel) { this._release(t); this.list.splice(i, 1); }
      }
    }
  }
}
