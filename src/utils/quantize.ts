// ============================================================================
// src/utils/quantize.ts
// Pure, framework-agnostic helpers for Hobbit CameraPath quantization + paths.
// ============================================================================
import { Keyframe } from '@/types/cinema';

export const POS_MAX = 32767;   // position keyframes are UNSIGNED [0, 32767]
export const ORI_DIV = 32768;   // orientation component = int / 32768
export const ORI_MAX = 32767;   // signed quant upper clamp
export const ORI_MIN = -32768;  // signed quant lower clamp

export const IDENTITY_QUAT = { oriX: 0, oriY: 0, oriZ: 0, oriW: POS_MAX }; // w=1

export type Vec3 = { x: number; y: number; z: number };
export type Quat = { x: number; y: number; z: number; w: number };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ---- Position quantization (UNSIGNED) --------------------------------------
// world -> keyframe int [0,32767]; zero-range axis collapses to 0.
export function quantizePos(world: number, minVal: number, rangeVal: number): number {
  if (rangeVal === 0) return 0;
  return clamp(Math.round((world - minVal) / rangeVal * POS_MAX), 0, POS_MAX);
}
// keyframe int -> world.
export function dequantizePos(kf: number, minVal: number, rangeVal: number): number {
  return minVal + (kf / POS_MAX) * rangeVal;
}
export function keyframeToWorld(
  kf: Keyframe,
  min: [number, number, number],
  range: [number, number, number]
): Vec3 {
  return {
    x: dequantizePos(Number(kf.posX) || 0, min[0], range[0]),
    y: dequantizePos(Number(kf.posY) || 0, min[1], range[1]),
    z: dequantizePos(Number(kf.posZ) || 0, min[2], range[2]),
  };
}

// ---- Orientation quantization (SIGNED, unit quaternion) --------------------
// Normalizes first; never emits (0,0,0,0). Returns {oriX,oriY,oriZ,oriW} ints.
export function quantizeQuat(q: Quat): Pick<Keyframe, 'oriX' | 'oriY' | 'oriZ' | 'oriW'> {
  let { x, y, z, w } = q;
  let n = Math.hypot(x, y, z, w);
  if (!isFinite(n) || n < 1e-8) { x = 0; y = 0; z = 0; w = 1; n = 1; } // fallback identity
  x /= n; y /= n; z /= n; w /= n;
  const q2i = (c: number) => clamp(Math.round(clamp(c, -1, 1) * ORI_DIV), ORI_MIN, ORI_MAX);
  return { oriX: q2i(x), oriY: q2i(y), oriZ: q2i(z), oriW: q2i(w) };
}
// keyframe ints -> normalized unit quaternion (x,y,z,w).
export function dequantizeQuat(kf: Keyframe): Quat {
  const x = (Number(kf.oriX) || 0) / ORI_DIV;
  const y = (Number(kf.oriY) || 0) / ORI_DIV;
  const z = (Number(kf.oriZ) || 0) / ORI_DIV;
  const w = (Number(kf.oriW) || 0) / ORI_DIV;
  const n = Math.hypot(x, y, z, w);
  if (n < 1e-8) return { x: 0, y: 0, z: 0, w: 1 };
  return { x: x / n, y: y / n, z: z / n, w: w / n };
}

// ---- AABB + Min/Range/BBox derivation from WORLD points --------------------
export function computeBBoxFromWorldPoints(points: Vec3[]): {
  min: [number, number, number];
  max: [number, number, number];
} {
  if (points.length === 0) return { min: [0, 0, 0], max: [0, 0, 0] };
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    const c = [p.x, p.y, p.z];
    for (let a = 0; a < 3; a++) {
      if (c[a] < min[a]) min[a] = c[a];
      if (c[a] > max[a]) max[a] = c[a];
    }
  }
  return { min, max };
}
// Returns Min, Range (max-min, zero-axis stays 0), and BBox = [min..., max...].
export function deriveBoxFromPoints(points: Vec3[]): {
  min: [number, number, number];
  range: [number, number, number];
  bBox: [number, number, number, number, number, number];
} {
  const { min, max } = computeBBoxFromWorldPoints(points);
  const range: [number, number, number] = [
    max[0] - min[0], max[1] - min[1], max[2] - min[2],
  ];
  return { min, range, bBox: [min[0], min[1], min[2], max[0], max[1], max[2]] };
}

// ---- Level look-at quaternion (forward = +Z toward target, zero roll) ------
export function lookAtQuaternion(
  eye: Vec3,
  target: Vec3,
  worldUp: Vec3 = { x: 0, y: 1, z: 0 }
): Quat {
  const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
  const cross = (a: Vec3, b: Vec3): Vec3 => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  });
  const norm = (v: Vec3): Vec3 => {
    const n = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / n, y: v.y / n, z: v.z / n };
  };
  const f = norm(sub(target, eye)); // forward = local +Z
  let r = cross(worldUp, f);        // right = local +X
  if (Math.hypot(r.x, r.y, r.z) < 1e-6) r = cross({ x: 0, y: 0, z: 1 }, f); // straight up/down fallback
  r = norm(r);
  const u = cross(f, r);            // up = local +Y (unit, right-handed)
  // Rotation matrix columns = r,u,f (local->world); convert to quat (x,y,z,w).
  const m00 = r.x, m10 = r.y, m20 = r.z;
  const m01 = u.x, m11 = u.y, m21 = u.z;
  const m02 = f.x, m12 = f.y, m22 = f.z;
  const tr = m00 + m11 + m22;
  let x: number, y: number, z: number, w: number;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; w = 0.25 * s; x = (m21 - m12) / s; y = (m02 - m20) / s; z = (m10 - m01) / s; }
  else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; x = 0.25 * s; y = (m01 + m10) / s; z = (m02 + m20) / s; w = (m21 - m12) / s; }
  else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; y = 0.25 * s; x = (m01 + m10) / s; z = (m12 + m21) / s; w = (m02 - m20) / s; }
  else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; z = 0.25 * s; x = (m02 + m20) / s; y = (m12 + m21) / s; w = (m10 - m01) / s; }
  const n = Math.hypot(x, y, z, w) || 1;
  return { x: x / n, y: y / n, z: z / n, w: w / n };
}

// ---- WORLD-space path generators -------------------------------------------
// All return Vec3[] in WORLD coordinates. Orientation is applied separately.
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => ({
  x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t,
});

// Straight line A->B, n samples (n>=2, endpoints inclusive).
export function genLine(a: Vec3, b: Vec3, n: number): Vec3[] {
  const out: Vec3[] = [];
  const N = Math.max(2, n);
  for (let i = 0; i < N; i++) out.push(lerp(a, b, i / (N - 1)));
  return out;
}

// Orbit/circle around center in a plane. plane: 'XZ' (default, level orbit, varies Y by 0),
// 'XY', or 'YZ'. radius world units; n samples; full 360 by default (closed=true repeats start spacing).
export function genOrbit(
  center: Vec3, radius: number, n: number,
  plane: 'XZ' | 'XY' | 'YZ' = 'XZ',
  startAngle = 0, sweep = Math.PI * 2
): Vec3[] {
  const out: Vec3[] = [];
  const N = Math.max(2, n);
  for (let i = 0; i < N; i++) {
    const ang = startAngle + sweep * (i / N); // i/N so a full sweep does not duplicate start
    const c = Math.cos(ang) * radius, s = Math.sin(ang) * radius;
    if (plane === 'XZ') out.push({ x: center.x + c, y: center.y, z: center.z + s });
    else if (plane === 'XY') out.push({ x: center.x + c, y: center.y + s, z: center.z });
    else out.push({ x: center.x, y: center.y + c, z: center.z + s });
  }
  return out;
}

// Arc: partial orbit (default 90 deg) — convenience wrapper.
export function genArc(
  center: Vec3, radius: number, n: number,
  plane: 'XZ' | 'XY' | 'YZ' = 'XZ', startAngle = 0, sweep = Math.PI / 2
): Vec3[] {
  // endpoints inclusive for an open arc:
  const out: Vec3[] = [];
  const N = Math.max(2, n);
  for (let i = 0; i < N; i++) {
    const ang = startAngle + sweep * (i / (N - 1));
    const c = Math.cos(ang) * radius, s = Math.sin(ang) * radius;
    if (plane === 'XZ') out.push({ x: center.x + c, y: center.y, z: center.z + s });
    else if (plane === 'XY') out.push({ x: center.x + c, y: center.y + s, z: center.z });
    else out.push({ x: center.x, y: center.y + c, z: center.z + s });
  }
  return out;
}

// Figure-8 (lemniscate) in XZ plane around center; size in world units.
export function genFigure8(center: Vec3, size: number, n: number, heightSpan = 0): Vec3[] {
  const out: Vec3[] = [];
  const N = Math.max(2, n);
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const a = t * Math.PI * 2;
    out.push({
      x: center.x + Math.sin(a) * size,
      y: center.y + (heightSpan ? (t - 0.5) * heightSpan : 0),
      z: center.z + Math.sin(a * 2) * size * 0.5,
    });
  }
  return out;
}

// Bezier (de Casteljau) through control points in WORLD space, n samples inclusive.
// NOTE: a Bezier passes through ONLY the first and last control points; the
// interior points just "pull" the curve. For a curve that flows through every
// point, use genCatmullRom (interpolating spline) instead.
export function genBezier(control: Vec3[], n: number): Vec3[] {
  if (control.length < 2) return control.slice();
  const N = Math.max(2, n);
  const de = (t: number, pts: Vec3[]): Vec3 => {
    if (pts.length === 1) return pts[0];
    const next: Vec3[] = [];
    for (let i = 0; i < pts.length - 1; i++) next.push(lerp(pts[i], pts[i + 1], t));
    return de(t, next);
  };
  const out: Vec3[] = [];
  for (let i = 0; i < N; i++) out.push(de(i / (N - 1), control));
  return out;
}

// Piecewise-linear path through ALL waypoints (straight segments), n samples.
export function genPolyline(points: Vec3[], n: number): Vec3[] {
  if (points.length < 2) return points.slice();
  const N = Math.max(2, n);
  const segCount = points.length - 1;
  const per = Math.max(1, Math.round((N - 1) / segCount));
  const out: Vec3[] = [];
  for (let s = 0; s < segCount; s++) {
    for (let j = 0; j < per; j++) out.push(lerp(points[s], points[s + 1], j / per));
  }
  out.push(points[points.length - 1]); // exact final waypoint
  return out;
}

// Centripetal Catmull-Rom spline through ALL points (smooth + interpolating:
// the curve passes exactly through every waypoint, unlike a Bezier).
// alpha: 0 = uniform, 0.5 = centripetal (default; no cusps/self-loops),
// 1 = chordal. Endpoints use reflected phantom points for natural tangents.
export function genCatmullRom(points: Vec3[], n: number, alpha = 0.5): Vec3[] {
  if (points.length < 2) return points.slice();
  if (points.length === 2) return genLine(points[0], points[1], n);
  const N = Math.max(2, n);

  const first = points[0], second = points[1];
  const last = points[points.length - 1], penult = points[points.length - 2];
  const pre: Vec3 = { x: 2 * first.x - second.x, y: 2 * first.y - second.y, z: 2 * first.z - second.z };
  const post: Vec3 = { x: 2 * last.x - penult.x, y: 2 * last.y - penult.y, z: 2 * last.z - penult.z };
  const pts = [pre, ...points, post];

  // knot spacing: clamp each step away from 0 so coincident points cannot divide by zero.
  const tNext = (a: Vec3, b: Vec3) =>
    Math.max(1e-6, Math.pow(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z), alpha));

  const lp = (a: Vec3, b: Vec3, ta: number, tb: number, t: number): Vec3 => {
    const f1 = (tb - t) / (tb - ta), f2 = (t - ta) / (tb - ta);
    return { x: f1 * a.x + f2 * b.x, y: f1 * a.y + f2 * b.y, z: f1 * a.z + f2 * b.z };
  };
  const point = (p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t0: number, t1: number, t2: number, t3: number, t: number): Vec3 => {
    const A1 = lp(p0, p1, t0, t1, t), A2 = lp(p1, p2, t1, t2, t), A3 = lp(p2, p3, t2, t3, t);
    const B1 = lp(A1, A2, t0, t2, t), B2 = lp(A2, A3, t1, t3, t);
    return lp(B1, B2, t1, t2, t);
  };

  const segCount = points.length - 1;
  const per = Math.max(2, Math.round((N - 1) / segCount));
  const out: Vec3[] = [];
  for (let s = 0; s < segCount; s++) {
    const p0 = pts[s], p1 = pts[s + 1], p2 = pts[s + 2], p3 = pts[s + 3];
    const t0 = 0;
    const t1 = t0 + tNext(p0, p1);
    const t2 = t1 + tNext(p1, p2);
    const t3 = t2 + tNext(p2, p3);
    for (let j = 0; j < per; j++) {
      const t = t1 + (t2 - t1) * (j / per); // j/per: includes seg start (a waypoint), excludes its end
      out.push(point(p0, p1, p2, p3, t0, t1, t2, t3, t));
    }
  }
  out.push(last); // exact final waypoint
  return out;
}

// ---- Build full keyframes (positions + orientation per mode) ---------------
export type OrientMode = 'constant' | 'lookAt' | 'lookAlong';
export function buildKeyframes(
  worldPoints: Vec3[],
  opts: {
    mode: OrientMode;
    min: [number, number, number];
    range: [number, number, number];
    constantQuat?: Quat;                 // for 'constant' (default identity)
    lookTarget?: Vec3;                   // for 'lookAt'
    worldUp?: Vec3;                      // default +Y
  }
): Keyframe[] {
  const worldUp = opts.worldUp ?? { x: 0, y: 1, z: 0 };
  const constQ = opts.constantQuat ?? { x: 0, y: 0, z: 0, w: 1 };
  return worldPoints.map((p, i) => {
    const pos = {
      posX: quantizePos(p.x, opts.min[0], opts.range[0]),
      posY: quantizePos(p.y, opts.min[1], opts.range[1]),
      posZ: quantizePos(p.z, opts.min[2], opts.range[2]),
    };
    let q: Quat;
    if (opts.mode === 'lookAt' && opts.lookTarget) {
      q = lookAtQuaternion(p, opts.lookTarget, worldUp);
    } else if (opts.mode === 'lookAlong') {
      const nxt = worldPoints[i + 1] ?? worldPoints[i - 1] ?? p;
      // forward toward next point; for last sample reuse previous direction
      const tgt = (worldPoints[i + 1]) ? nxt
        : { x: p.x + (p.x - (worldPoints[i - 1]?.x ?? p.x)),
            y: p.y + (p.y - (worldPoints[i - 1]?.y ?? p.y)),
            z: p.z + (p.z - (worldPoints[i - 1]?.z ?? p.z)) };
      q = lookAtQuaternion(p, tgt, worldUp);
    } else {
      q = constQ;
    }
    return { ...pos, ...quantizeQuat(q) } as Keyframe;
  });
}
