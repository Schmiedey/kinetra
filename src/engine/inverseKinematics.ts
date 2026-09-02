import type { Vec3 } from './types';
import { add, sub, scale, norm, unit, dot, cross, clamp } from './vector';
/** Law-of-cosines two-link IK. The pole picks the elbow from the solution circle. */
export function solveTwoLink(
  shoulder: Vec3,
  target: Vec3,
  upper: number,
  forearm: number,
  pole: Vec3,
) {
  const delta = sub(target, shoulder),
    rawDistance = norm(delta),
    direction = rawDistance > 1e-8 ? unit(delta) : ([0, 1, 0] as Vec3);
  const distance = clamp(
    rawDistance,
    Math.abs(upper - forearm) + 1e-6,
    upper + forearm - 1e-6,
  );
  const hand = add(shoulder, scale(direction, distance));
  const along =
    (upper * upper - forearm * forearm + distance * distance) / (2 * distance);
  const height = Math.sqrt(Math.max(0, upper * upper - along * along));
  let outward = sub(pole, scale(direction, dot(pole, direction)));
  if (norm(outward) < 1e-8)
    outward = cross(
      direction,
      Math.abs(direction[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1],
    );
  return {
    elbow: add(
      add(shoulder, scale(direction, along)),
      scale(unit(outward), height),
    ),
    hand,
    reachLimited: Math.abs(distance - rawDistance) > 1e-5,
  };
}
