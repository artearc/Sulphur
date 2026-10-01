// Shared lighting state used by every SULPHUR material.
// A fixed-size pool keeps shader permutations stable: lights never trigger recompiles.
import * as THREE from 'three';

export const MAX_LIGHTS = 20;

const lightPos = [];
const lightCol = [];
for (let i = 0; i < MAX_LIGHTS; i++) {
  lightPos.push(new THREE.Vector4(0, -100, 0, 1));
  lightCol.push(new THREE.Vector4(0, 0, 0, 0));
}

export const SharedUniforms = {
  uLightPos: { value: lightPos },
  uLightCol: { value: lightCol },
  uAmbient: { value: new THREE.Color(0.08, 0.07, 0.09) },
  uSkyLight: { value: new THREE.Color(0.10, 0.09, 0.12) }, // light from above (hemisphere-ish)
  uKeyDir: { value: new THREE.Vector3(-0.4, 1, 0.5).normalize() },
  uKeyCol: { value: new THREE.Color(0.18, 0.14, 0.16) },
  uFogColor: { value: new THREE.Color(0.02, 0.015, 0.02) },
  uAbyssColor: { value: new THREE.Color(0.12, 0.03, 0.02) },
  uTime: { value: 0 },
  uBands: { value: 6.0 },
  uVision: { value: new THREE.Vector4(0, 0, 9999, 0) }, // player x, z, radius, strength (Fraude darkness)
  uMoral: { value: new THREE.Vector2(0, 0) },            // virtue01, corruption01 (world tint reactions)
};

// GLSL shared by all lit materials. Produces a quantized + Bayer-dithered light value
// so lighting reads like hand-placed pixel shading instead of smooth gradients.
export const LIGHTING_GLSL = /* glsl */ `
  #define MAX_LIGHTS ${MAX_LIGHTS}
  uniform vec4 uLightPos[MAX_LIGHTS];
  uniform vec4 uLightCol[MAX_LIGHTS];
  uniform vec3 uAmbient;
  uniform vec3 uSkyLight;
  uniform vec3 uKeyDir;
  uniform vec3 uKeyCol;
  uniform vec3 uFogColor;
  uniform vec3 uAbyssColor;
  uniform float uTime;
  uniform float uBands;
  uniform vec4 uVision;
  uniform vec2 uMoral;

  float bayer4(vec2 p) {
    ivec2 ip = ivec2(mod(p, 4.0));
    int i = ip.x + ip.y * 4;
    float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
    return m[i] / 16.0;
  }

  // Returns rgb light arriving at a point.
  vec3 gatherLight(vec3 wp, vec3 n, float wrap) {
    vec3 sum = uAmbient + uSkyLight * clamp(n.y * 0.5 + 0.5, 0.0, 1.0);
    sum += uKeyCol * clamp((dot(n, uKeyDir) + wrap) / (1.0 + wrap), 0.0, 1.0);
    for (int i = 0; i < MAX_LIGHTS; i++) {
      vec4 lp = uLightPos[i];
      vec4 lc = uLightCol[i];
      if (lc.w <= 0.0) continue;
      vec3 d = lp.xyz - wp;
      float dist = length(d);
      float att = clamp(1.0 - dist / lp.w, 0.0, 1.0);
      att *= att;
      float ndl = clamp((dot(n, d / max(dist, 0.001)) + wrap) / (1.0 + wrap), 0.0, 1.0);
      sum += lc.rgb * lc.w * att * ndl;
    }
    return sum;
  }

  vec3 quantizeLight(vec3 l, vec2 ditherCoord) {
    float lum = max(max(l.r, l.g), l.b);
    float d = bayer4(ditherCoord) - 0.5;
    float q = floor(lum * uBands + d * 0.9 + 0.5) / uBands;
    q = max(q, 0.0);
    return lum > 0.0001 ? l * (q / lum) : vec3(0.0);
  }

  float visionMask(vec3 wp) {
    if (uVision.w <= 0.0) return 1.0;
    float dd = length(wp.xz - uVision.xy);
    float m = 1.0 - smoothstep(uVision.z * 0.55, uVision.z, dd);
    return mix(1.0, m, uVision.w);
  }
`;
