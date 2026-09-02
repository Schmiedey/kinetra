import type { Vec3 } from './types';
export const add = (a: Vec3, b: Vec3): Vec3 => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
export const sub = (a: Vec3, b: Vec3): Vec3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
export const scale = (a: Vec3, s: number): Vec3 => [
  a[0] * s,
  a[1] * s,
  a[2] * s,
];
export const dot = (a: Vec3, b: Vec3) =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const norm = (a: Vec3) => Math.hypot(...a);
export const unit = (a: Vec3): Vec3 => scale(a, 1 / (norm(a) || 1));
export const lerp = (a: Vec3, b: Vec3, t: number): Vec3 =>
  add(a, scale(sub(b, a), t));
export const clamp = (x: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, x));
export const rad = (d: number) => (d * Math.PI) / 180;
export const deg = (r: number) => (r * 180) / Math.PI;
export const rotateX = (a: Vec3, t: number): Vec3 => [
  a[0],
  a[1] * Math.cos(t) - a[2] * Math.sin(t),
  a[1] * Math.sin(t) + a[2] * Math.cos(t),
];
