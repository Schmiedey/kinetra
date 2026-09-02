import type { BodyProfile, Vec3 } from './types';
import { add, rotateX, rad } from './vector';
import { calibration } from '../data/calibration';
export const genericBody: BodyProfile = {
  heightCm: 178,
  shoulderWidthCm: 42,
  upperArmLengthCm: 32,
  forearmLengthCm: 29,
};
export const benchOrigin: Vec3 = [0, calibration.kinematics.benchHeight, 0.35];
export const bodyToWorld = (point: Vec3, angle: number): Vec3 =>
  add(benchOrigin, rotateX(point, rad(angle)));
