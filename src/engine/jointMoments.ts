import type { Vec3, SimulationFrame } from './types';
import { sub, cross, norm } from './vector';
import { calibration } from '../data/calibration';
export const externalMoment = (joint: Vec3, hand: Vec3, force: Vec3) =>
  norm(cross(sub(hand, joint), force));
export function jointMoments(
  joints: SimulationFrame['joints'],
  loadKg: number,
) {
  const force: Vec3 = [0, (-loadKg * calibration.gravity) / 2, 0];
  return {
    shoulder: externalMoment(joints.rightShoulder, joints.rightHand, force),
    elbow: externalMoment(joints.rightElbow, joints.rightHand, force),
  };
}
