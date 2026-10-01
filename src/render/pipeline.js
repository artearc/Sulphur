// Low-resolution pixel pipeline:
//   scene -> low-res target (with 1px margin for sub-pixel camera scroll)
//         -> pixel bloom (bright pass + separable blur at quarter res)
//         -> composite (nearest upscale, grading, vignette, flashes, aberration, grain, zoom)
import * as THREE from 'three';
import { Save } from '../core/save.js';

const FULLSCREEN_VS = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export class PixelPipeline {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.autoClear = true;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // palette is authored directly in display space
    this.renderer.setClearColor(0x050304, 1);

    this.targetHeight = 270;
    this.lowW = 480; this.lowH = 270; this.scale = 4;
    this.margin = 1;

    this.rtScene = new THREE.WebGLRenderTarget(4, 4, {
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true,
      type: THREE.HalfFloatType,
    });
    const bloomOpts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, type: THREE.HalfFloatType };
    this.rtBloomA = new THREE.WebGLRenderTarget(4, 4, bloomOpts);
    this.rtBloomB = new THREE.WebGLRenderTarget(4, 4, bloomOpts);

    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadGeo = new THREE.PlaneGeometry(2, 2);

    this.brightMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uThreshold: { value: 0.72 } },
      vertexShader: FULLSCREEN_VS,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse; uniform float uThreshold; varying vec2 vUv;
        void main() {
          vec3 c = texture2D(tDiffuse, vUv).rgb;
          float l = max(max(c.r, c.g), c.b);
          gl_FragColor = vec4(c * smoothstep(uThreshold, uThreshold + 0.35, l), 1.0);
        }`,
    });
    this.blurMat = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2(1, 0) } },
      vertexShader: FULLSCREEN_VS,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse; uniform vec2 uDir; varying vec2 vUv;
        void main() {
          vec3 s = texture2D(tDiffuse, vUv).rgb * 0.227;
          s += texture2D(tDiffuse, vUv + uDir * 1.38).rgb * 0.316;
          s += texture2D(tDiffuse, vUv - uDir * 1.38).rgb * 0.316;
          s += texture2D(tDiffuse, vUv + uDir * 3.23).rgb * 0.070;
          s += texture2D(tDiffuse, vUv - uDir * 3.23).rgb * 0.070;
          gl_FragColor = vec4(s, 1.0);
        }`,
    });

    this.post = {
      uScene: { value: this.rtScene.texture },
      uBloom: { value: this.rtBloomA.texture },
      uLowSize: { value: new THREE.Vector2(480, 270) },
      uScale: { value: 4 },
      uMargin: { value: 1 },
      uSub: { value: new THREE.Vector2(0, 0) },       // sub-pixel offset in low-res pixels
      uShake: { value: new THREE.Vector2(0, 0) },     // in screen pixels
      uZoom: { value: 1 },
      uZoomCenter: { value: new THREE.Vector2(0.5, 0.5) },
      uBloomStrength: { value: 0.85 },
      uTime: { value: 0 },
      uFlash: { value: new THREE.Vector4(1, 1, 1, 0) },
      uFade: { value: new THREE.Vector4(0, 0, 0, 0) },
      uVignette: { value: 0.55 },
      uAberration: { value: 0 },
      uGrade: {
        value: {
          shadows: new THREE.Vector3(1, 1, 1), mids: new THREE.Vector3(1, 1, 1), highs: new THREE.Vector3(1, 1, 1),
        },
      },
      uShadowTint: { value: new THREE.Color(0.9, 0.85, 1.0) },
      uHighTint: { value: new THREE.Color(1.05, 1.0, 0.92) },
      uSaturation: { value: 1.0 },
      uContrast: { value: 1.08 },
      uCorruption: { value: 0 },  // screen-edge corruption veins
      uVirtue: { value: 0 },      // soft golden edge light
      uLowHp: { value: 0 },
      uDesat: { value: 0 },
      uColorblind: { value: 0 },
      uGrain: { value: 0.035 },
    };
    this.compositeMat = new THREE.ShaderMaterial({
      uniforms: this.post,
      vertexShader: FULLSCREEN_VS,
      fragmentShader: /* glsl */ `
        uniform sampler2D uScene; uniform sampler2D uBloom;
        uniform vec2 uLowSize; uniform float uScale; uniform float uMargin; uniform vec2 uSub; uniform vec2 uShake;
        uniform float uZoom; uniform vec2 uZoomCenter; uniform float uBloomStrength; uniform float uTime;
        uniform vec4 uFlash; uniform vec4 uFade; uniform float uVignette; uniform float uAberration;
        uniform vec3 uShadowTint; uniform vec3 uHighTint; uniform float uSaturation; uniform float uContrast;
        uniform float uCorruption; uniform float uVirtue; uniform float uLowHp; uniform float uDesat;
        uniform float uColorblind; uniform float uGrain;
        varying vec2 vUv;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        float vnoise(vec2 p) {
          vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
        }

        vec3 sampleScene(vec2 lowPx) {
          vec2 total = uLowSize + 2.0 * uMargin;
          vec2 uv = (floor(lowPx) + 0.5 + uMargin) / total;
          return texture2D(uScene, uv).rgb;
        }

        void main() {
          // screen pixel -> low-res pixel (nearest), with zoom about a focus point and sub-pixel scroll
          vec2 screenPx = gl_FragCoord.xy + uShake;
          vec2 lowPx = screenPx / uScale;
          vec2 c = uZoomCenter * uLowSize;
          lowPx = (lowPx - c) / uZoom + c;
          lowPx += uSub;
          vec2 lowUvN = lowPx / uLowSize;

          vec3 col = sampleScene(lowPx);
          if (uAberration > 0.001) {
            vec2 dir = (lowUvN - 0.5);
            float amt = uAberration * length(dir) * 6.0;
            col.r = sampleScene(lowPx + dir * amt).r;
            col.b = sampleScene(lowPx - dir * amt).b;
          }
          vec2 total = uLowSize + 2.0 * uMargin;
          vec3 bloom = texture2D(uBloom, (lowPx + uMargin) / total).rgb;
          col += bloom * uBloomStrength;

          // grading
          float lum = dot(col, vec3(0.299, 0.587, 0.114));
          col = mix(vec3(lum), col, uSaturation * (1.0 - uDesat));
          col = mix(col * uShadowTint, col * uHighTint, smoothstep(0.05, 0.7, lum));
          col = (col - 0.5) * uContrast + 0.5;

          // vignette (pixel-stepped so it stays in style)
          vec2 q = floor(lowUvN * uLowSize / 2.0) * 2.0 / uLowSize;
          vec2 vq = q - 0.5;
          float v = 1.0 - dot(vq * vec2(1.0, 1.25), vq * vec2(1.0, 1.25)) * 1.6;
          col *= mix(1.0, clamp(v, 0.0, 1.0), uVignette);

          // corruption: dark veins crawling in from the screen edges
          if (uCorruption > 0.01) {
            float edgeD = min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y));
            float n = vnoise(q * vec2(28.0, 16.0) + vec2(0.0, uTime * 0.25)) * 0.6 + vnoise(q * 70.0 - uTime * 0.1) * 0.4;
            float reach = uCorruption * 0.22;
            float vein = smoothstep(reach, reach * 0.2, edgeD + n * 0.08);
            col = mix(col, col * vec3(0.35, 0.06, 0.08), vein * 0.85);
            col += vec3(0.25, 0.0, 0.02) * vein * (0.5 + 0.5 * sin(uTime * 2.0)) * uCorruption * 0.4;
          }
          if (uVirtue > 0.01) {
            float top = smoothstep(0.55, 1.0, q.y);
            col += vec3(1.0, 0.82, 0.45) * top * uVirtue * 0.08;
          }
          // low health: crimson pulse at the rim
          if (uLowHp > 0.01) {
            float rim = smoothstep(0.25, 0.75, length(vq) * 1.4);
            float pulse = 0.5 + 0.5 * sin(uTime * 7.0);
            col = mix(col, vec3(0.5, 0.0, 0.03), rim * uLowHp * (0.35 + 0.25 * pulse));
          }

          // grain, applied per low-res pixel so it reads as film/dither, not noise
          float g = hash(floor(lowPx) + floor(uTime * 12.0)) - 0.5;
          col += g * uGrain;

          col = mix(col, uFlash.rgb, uFlash.a);
          col = mix(col, uFade.rgb, uFade.a);

          // simple daltonization helpers
          if (uColorblind > 0.5) {
            mat3 m = uColorblind < 1.5 ? mat3(0.8,0.2,0.0, 0.258,0.742,0.0, 0.0,0.142,0.858)
                   : uColorblind < 2.5 ? mat3(0.567,0.433,0.0, 0.558,0.442,0.0, 0.0,0.242,0.758)
                   : mat3(0.95,0.05,0.0, 0.0,0.433,0.567, 0.0,0.475,0.525);
            col = col * m;
          }
          gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }`,
    });

    this.quad = new THREE.Mesh(this.quadGeo, this.compositeMat);
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!window.innerWidth || !window.innerHeight) return; // hidden/collapsed pane: keep last size
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.floor(window.innerWidth * dpr);
    const H = Math.floor(window.innerHeight * dpr);
    let scale;
    const pref = Save.settings.pixelScale;
    if (pref !== 'auto' && Number(pref) > 0) scale = Number(pref) * dpr;
    else scale = Math.max(1, Math.round(H / this.targetHeight));
    scale = Math.max(1, Math.round(scale));
    this.scale = scale;
    this.lowW = Math.ceil(W / scale);
    this.lowH = Math.ceil(H / scale);
    this.W = W; this.H = H;
    this.renderer.setSize(W, H, false);
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    const m = this.margin;
    this.rtScene.setSize(this.lowW + 2 * m, this.lowH + 2 * m);
    const bw = Math.max(1, Math.floor((this.lowW + 2 * m) / 2));
    const bh = Math.max(1, Math.floor((this.lowH + 2 * m) / 2));
    this.rtBloomA.setSize(bw, bh);
    this.rtBloomB.setSize(bw, bh);
    this.post.uLowSize.value.set(this.lowW, this.lowH);
    this.post.uScale.value = scale;
    this.post.uMargin.value = m;
    this.onResize?.(this.lowW, this.lowH, scale);
  }

  _fs(mat, target) {
    this.quad.material = mat;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCam);
  }

  render(scene, camera, time) {
    const r = this.renderer;
    r.setRenderTarget(this.rtScene);
    r.render(scene, camera);

    const bloomOn = Save.settings.bloom;
    if (bloomOn) {
      this.brightMat.uniforms.tDiffuse.value = this.rtScene.texture;
      this._fs(this.brightMat, this.rtBloomA);
      const bw = this.rtBloomA.width, bh = this.rtBloomA.height;
      for (let i = 0; i < 2; i++) {
        this.blurMat.uniforms.tDiffuse.value = this.rtBloomA.texture;
        this.blurMat.uniforms.uDir.value.set(1 / bw, 0);
        this._fs(this.blurMat, this.rtBloomB);
        this.blurMat.uniforms.tDiffuse.value = this.rtBloomB.texture;
        this.blurMat.uniforms.uDir.value.set(0, 1 / bh);
        this._fs(this.blurMat, this.rtBloomA);
      }
      this.post.uBloomStrength.value = this.bloomStrength ?? 0.85;
    } else {
      this.post.uBloomStrength.value = 0;
    }
    this.post.uTime.value = time;
    this.post.uColorblind.value = { none: 0, deuter: 1, protan: 2, tritan: 3 }[Save.settings.colorblind] || 0;
    this.quad.material = this.compositeMat;
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCam);
  }

  // Map a CSS-pixel point on screen to normalized low-res coordinates (0..1), accounting for zoom/shake.
  screenToLowNdc(cssX, cssY) {
    const iw = window.innerWidth || this.W, ih = window.innerHeight || this.H;
    const dpr = this.W / iw;
    const sx = cssX * dpr, sy = (ih - cssY) * dpr;
    let lx = sx / this.scale, ly = sy / this.scale;
    const z = this.post.uZoom.value, c = this.post.uZoomCenter.value;
    lx = (lx - c.x * this.lowW) / z + c.x * this.lowW;
    ly = (ly - c.y * this.lowH) / z + c.y * this.lowH;
    lx += this.post.uSub.value.x; ly += this.post.uSub.value.y;
    // into camera NDC of the scene target (which includes the margin)
    const tw = this.lowW + 2 * this.margin, th = this.lowH + 2 * this.margin;
    return { x: ((lx + this.margin) / tw) * 2 - 1, y: ((ly + this.margin) / th) * 2 - 1 };
  }
}
