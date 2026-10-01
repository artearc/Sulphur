export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (v - a) / (b - a);
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t) => t * t * t;
export const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
// Frame-rate independent exponential approach.
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const dist2 = (ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az; return dx * dx + dz * dz; };
export const dist = (ax, az, bx, bz) => Math.sqrt(dist2(ax, az, bx, bz));
export const angleTo = (ax, az, bx, bz) => Math.atan2(bz - az, bx - ax);
export const angleDiff = (a, b) => {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};
export const rotateTowards = (a, b, maxStep) => {
  const d = angleDiff(a, b);
  return a + clamp(d, -maxStep, maxStep);
};
export const len = (x, z) => Math.sqrt(x * x + z * z);
export const norm = (x, z) => {
  const l = Math.sqrt(x * x + z * z) || 1;
  return [x / l, z / l];
};
export const sign = (v) => (v < 0 ? -1 : 1);
export const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));

// Segment-circle overlap test (for beams / lunges).
export function segCircle(ax, az, bx, bz, cx, cz, r) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz || 1e-6;
  let t = ((cx - ax) * dx + (cz - az) * dz) / l2;
  t = clamp(t, 0, 1);
  const px = ax + dx * t, pz = az + dz * t;
  return dist2(px, pz, cx, cz) <= r * r;
}
