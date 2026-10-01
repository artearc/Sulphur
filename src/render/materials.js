// SULPHUR material library: every surface shares the same quantized, dithered light model,
// which is what makes geometry, sprites and props read as one pixel-art world.
import * as THREE from 'three';
import { SharedUniforms, LIGHTING_GLSL } from './lighting.js';

export const PPU = 16;                       // texels per world unit
export const PITCH = THREE.MathUtils.degToRad(50);
export const Y_STRETCH = 1 / Math.cos(PITCH); // upright sprites are stretched to read 1:1 on screen
export const Z_SCALE = 1 / Math.sin(PITCH);   // floor tiles are stretched so texels read 1:1

const shared = () => ({ ...SharedUniforms });

// ---------------------------------------------------------------------------------------------
// World (architecture / floors / props) material
// ---------------------------------------------------------------------------------------------
export function createWorldMaterial(atlas, opts = {}) {
  const uniforms = {
    ...shared(),
    uMap: { value: atlas },
    uEmissiveMap: { value: opts.emissive || null },
    uHasEmissive: { value: opts.emissive ? 1 : 0 },
    uEmissiveStrength: { value: opts.emissiveStrength ?? 1.0 },
    uAtlasSize: { value: new THREE.Vector2(atlas.image.width, atlas.image.height) },
    uScroll: { value: new THREE.Vector2(opts.scrollX || 0, opts.scrollY || 0) },
    uWrap: { value: opts.wrap ?? 0.35 },
    uTint: { value: new THREE.Vector4(1, 1, 1, 0) },
    uAlpha: { value: opts.alpha ?? 1 },
    uUnlit: { value: opts.unlit ? 1 : 0 },
  };
  return new THREE.ShaderMaterial({
    uniforms,
    vertexColors: true,
    side: opts.side ?? THREE.FrontSide,
    transparent: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWp;
      varying vec3 vN;
      varying vec3 vColor;
      void main() {
        vUv = uv;
        vColor = color;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWp = wp.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      ${LIGHTING_GLSL}
      uniform sampler2D uMap;
      uniform sampler2D uEmissiveMap;
      uniform float uHasEmissive;
      uniform float uEmissiveStrength;
      uniform vec2 uAtlasSize;
      uniform vec2 uScroll;
      uniform float uWrap;
      uniform vec4 uTint;
      uniform float uAlpha;
      uniform float uUnlit;
      varying vec2 vUv;
      varying vec3 vWp;
      varying vec3 vN;
      varying vec3 vColor;
      void main() {
        vec2 uv = vUv;
        if (uScroll.x != 0.0 || uScroll.y != 0.0) {
          // scroll within a 16px tile cell (uv attribute stores cell origin in .zw via fract trick)
          vec2 cell = floor(uv * uAtlasSize / 16.0) * 16.0 / uAtlasSize;
          vec2 local = (uv - cell) * uAtlasSize / 16.0;
          local = fract(local + uScroll * uTime);
          uv = cell + local * 16.0 / uAtlasSize;
        }
        vec4 tex = texture2D(uMap, uv);
        if (tex.a < 0.5) discard;
        vec2 texel = floor(vUv * uAtlasSize);
        if (uAlpha < 0.999 && bayer4(texel) > uAlpha) discard;
        vec3 albedo = tex.rgb * vColor;
        albedo = mix(albedo, albedo * uTint.rgb, uTint.a);
        vec3 col;
        if (uUnlit > 0.5) {
          col = albedo;
        } else {
          vec3 light = gatherLight(vWp, normalize(vN), uWrap);
          light = quantizeLight(light, texel);
          col = albedo * light;
        }
        if (uHasEmissive > 0.5) {
          vec3 e = texture2D(uEmissiveMap, uv).rgb;
          col += e * uEmissiveStrength * (0.85 + 0.15 * sin(uTime * 3.0 + vWp.x * 0.7 + vWp.z));
        }
        // abyss: anything below floor level sinks into the circle's glow/darkness
        float abyss = clamp(-vWp.y / 5.0, 0.0, 1.0);
        col = mix(col, uAbyssColor, abyss * abyss);
        col *= visionMask(vWp);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

// ---------------------------------------------------------------------------------------------
// Sprite (billboard character) material
// ---------------------------------------------------------------------------------------------
export function createSpriteMaterial(sheet, opts = {}) {
  const uniforms = {
    ...shared(),
    uMap: { value: sheet.texture },
    uEmissiveMap: { value: sheet.emissive || sheet.texture },
    uHasEmissive: { value: sheet.emissive ? 1 : 0 },
    uAtlasSize: { value: new THREE.Vector2(sheet.width, sheet.height) },
    uFrame: { value: new THREE.Vector4(0, 0, 1, 1) },
    uFlip: { value: 0 },
    uFlash: { value: new THREE.Vector4(1, 1, 1, 0) },
    uTint: { value: new THREE.Vector4(1, 1, 1, 0) },
    uOutline: { value: new THREE.Vector4(1, 0.2, 0.1, 0) },
    uDissolve: { value: 0 },
    uDissolveColor: { value: new THREE.Color(1.0, 0.45, 0.1) },
    uAlpha: { value: 1 },
    uEmissiveStrength: { value: opts.emissiveStrength ?? 1.2 },
    uMinLight: { value: opts.minLight ?? 0.42 },
    uRim: { value: opts.rim ?? 0.55 },
    uUnlit: { value: opts.unlit ? 1 : 0 },
    uFlat: { value: opts.flat ? 1 : 0 },
  };
  return new THREE.ShaderMaterial({
    uniforms,
    side: THREE.DoubleSide,
    transparent: !!opts.additive,
    blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: !opts.additive,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWp;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWp = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      ${LIGHTING_GLSL}
      uniform sampler2D uMap;
      uniform sampler2D uEmissiveMap;
      uniform float uHasEmissive;
      uniform vec2 uAtlasSize;
      uniform vec4 uFrame;
      uniform float uFlip;
      uniform vec4 uFlash;
      uniform vec4 uTint;
      uniform vec4 uOutline;
      uniform float uDissolve;
      uniform vec3 uDissolveColor;
      uniform float uAlpha;
      uniform float uEmissiveStrength;
      uniform float uMinLight;
      uniform float uUnlit;
      uniform float uFlat;
      uniform float uRim;
      varying vec2 vUv;
      varying vec3 vWp;

      float h21(vec2 p) { return fract(sin(dot(p, vec2(41.31, 289.17))) * 43758.5453); }

      void main() {
        vec2 local = vec2(uFlip > 0.5 ? 1.0 - vUv.x : vUv.x, vUv.y);
        vec2 uv = uFrame.xy + local * uFrame.zw;
        vec2 texel = floor(uv * uAtlasSize);
        uv = (texel + 0.5) / uAtlasSize;
        vec4 tex = texture2D(uMap, uv);
        vec2 frameTexel = floor(local * uFrame.zw * uAtlasSize);

        // Colored outline (elites, interactables, possessed enemies)
        if (tex.a < 0.5) {
          if (uOutline.a > 0.0) {
            vec2 px = 1.0 / uAtlasSize;
            float n = texture2D(uMap, uv + vec2(px.x, 0.0)).a + texture2D(uMap, uv - vec2(px.x, 0.0)).a
                    + texture2D(uMap, uv + vec2(0.0, px.y)).a + texture2D(uMap, uv - vec2(0.0, px.y)).a;
            if (n > 0.5) {
              gl_FragColor = vec4(uOutline.rgb * (0.75 + 0.25 * sin(uTime * 8.0)), 1.0);
              return;
            }
          }
          discard;
        }
        if (uAlpha < 0.999 && bayer4(frameTexel) >= uAlpha) discard;

        // pixel dissolve with burning edge
        float edge = 0.0;
        if (uDissolve > 0.0) {
          float n = h21(frameTexel);
          n = n * 0.6 + (1.0 - local.y) * 0.4;
          if (n < uDissolve) discard;
          if (n < uDissolve + 0.12) edge = 1.0;
        }

        vec3 albedo = tex.rgb;
        albedo = mix(albedo, uTint.rgb * dot(albedo, vec3(0.35, 0.5, 0.15)) * 1.6, uTint.a);
        vec3 col;
        if (uUnlit > 0.5) {
          col = albedo;
        } else {
          vec3 n = normalize(vec3(0.0, 0.55, 0.85));
          vec3 light = gatherLight(vWp + vec3(0.0, 0.0, 0.25), n, 0.8);
          light = quantizeLight(light, frameTexel);
          light = max(light, vec3(uMinLight));
          col = albedo * light;
          // rim light on top/left silhouette edges keeps characters readable in the dark
          vec2 px = 1.0 / uAtlasSize;
          float up = texture2D(uMap, uv + vec2(0.0, px.y)).a;
          float lf = texture2D(uMap, uv + vec2(uFlip > 0.5 ? px.x : -px.x, 0.0)).a;
          float rim = (1.0 - step(0.5, up)) * 0.8 + (1.0 - step(0.5, lf)) * 0.45;
          col += albedo * rim * uRim * (0.6 + uKeyCol * 3.0);
        }
        if (uHasEmissive > 0.5) {
          vec4 e = texture2D(uEmissiveMap, uv);
          col += e.rgb * e.a * uEmissiveStrength;
        }
        col = mix(col, uFlash.rgb, uFlash.a);
        if (edge > 0.5) col = uDissolveColor * 1.6;
        col *= mix(1.0, visionMask(vWp), 0.85);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

// ---------------------------------------------------------------------------------------------
// Ground decal material (blood, scorch, sigils) — flat, lit, dithered alpha
// ---------------------------------------------------------------------------------------------
export function createDecalMaterial(texture, opts = {}) {
  const uniforms = {
    ...shared(),
    uMap: { value: texture },
    uAtlasSize: { value: new THREE.Vector2(texture.image.width, texture.image.height) },
    uFrame: { value: new THREE.Vector4(0, 0, 1, 1) },
    uColor: { value: new THREE.Color(opts.color ?? 0xffffff) },
    uAlpha: { value: opts.alpha ?? 1 },
    uUnlit: { value: opts.unlit ? 1 : 0 },
    uGlow: { value: opts.glow ?? 0 },
  };
  return new THREE.ShaderMaterial({
    uniforms,
    transparent: !!opts.additive,
    blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWp;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWp = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      ${LIGHTING_GLSL}
      uniform sampler2D uMap;
      uniform vec2 uAtlasSize;
      uniform vec4 uFrame;
      uniform vec3 uColor;
      uniform float uAlpha;
      uniform float uUnlit;
      uniform float uGlow;
      varying vec2 vUv;
      varying vec3 vWp;
      void main() {
        vec2 uv = uFrame.xy + vUv * uFrame.zw;
        vec2 texel = floor(uv * uAtlasSize);
        vec4 tex = texture2D(uMap, (texel + 0.5) / uAtlasSize);
        float a = tex.a * uAlpha;
        if (a <= 0.01 || bayer4(floor(vWp.xz * 16.0)) >= a) discard;
        vec3 col = tex.rgb * uColor;
        if (uUnlit < 0.5) {
          vec3 light = gatherLight(vWp, vec3(0.0, 1.0, 0.0), 0.3);
          light = quantizeLight(light, texel);
          col = col * light + col * uGlow;
        }
        col *= visionMask(vWp);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}
