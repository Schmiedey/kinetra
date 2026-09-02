import type { BenchConfig, BodyProfile, SimulationFrame, Vec3 } from './types';
import { calibration } from '../data/calibration';
import { genericBody, bodyToWorld } from './anthropometry';
import { solveTwoLink } from './inverseKinematics';
import { sub, norm, rad, deg, clamp, rotateX, dot, unit } from './vector';
export function getKinematics(
  config: BenchConfig,
  progress: number,
  body: BodyProfile = genericBody,
) {
  const c = calibration.kinematics,
    half = body.shoulderWidthCm / 200,
    upper = body.upperArmLengthCm / 100,
    fore = body.forearmLengthCm / 100;
  const center = bodyToWorld(
    [0, c.shoulderY, c.shoulderZ],
    config.benchAngleDeg,
  );
  const halfGrip = half * config.gripWidthRatio;
  const bottom = bodyToWorld(
    [
      0,
      c.shoulderY + c.barClearance,
      c.shoulderZ + c.touchMin + (c.touchMax - c.touchMin) * config.touchPoint,
    ],
    config.benchAngleDeg,
  );
  const topZ = bottom[2] + (center[2] - bottom[2]) * config.barPathCurve;
  const maxY = Math.sqrt(
    Math.max(
      0.01,
      (upper + fore - c.lockoutClearance) ** 2 -
        (halfGrip - half) ** 2 -
        (topZ - center[2]) ** 2,
    ),
  );
  const t =
    1 - config.romPercent / 100 + (config.romPercent / 100) * clamp(progress);
  const pathT = t < 0 ? t : Math.pow(t, c.curvePower);
  const bar: Vec3 = [
    0,
    bottom[1] + (center[1] + maxY - bottom[1]) * t,
    bottom[2] + (topZ - bottom[2]) * pathT,
  ];
  // Clamp the complete bar symmetrically, never detach a hand to conceal unreachable geometry.
  const relative: Vec3 = [
    halfGrip - half,
    bar[1] - center[1],
    bar[2] - center[2],
  ];
  const maxReach = upper + fore - c.reachMargin;
  let reachLimited = false;
  if (norm(relative) > maxReach) {
    const planar = Math.hypot(relative[1], relative[2]);
    const allowed = Math.sqrt(Math.max(0, maxReach ** 2 - relative[0] ** 2));
    bar[1] = center[1] + (relative[1] * allowed) / planar;
    bar[2] = center[2] + (relative[2] * allowed) / planar;
    reachLimited = true;
  }
  const arm = (side: number) => {
    const shoulder = bodyToWorld(
      [side * half, c.shoulderY, c.shoulderZ],
      config.benchAngleDeg,
    );
    const hand: Vec3 = [side * halfGrip, bar[1], bar[2]];
    const pole = rotateX(
      [
        side * Math.sin(rad(config.elbowFlareDeg)),
        -c.poleDown,
        Math.cos(rad(config.elbowFlareDeg)),
      ],
      rad(config.benchAngleDeg),
    );
    return { shoulder, ...solveTwoLink(shoulder, hand, upper, fore, pole) };
  };
  const left = arm(-1),
    right = arm(1);
  const upperLocal = rotateX(
    sub(right.elbow, right.shoulder),
    -rad(config.benchAngleDeg),
  );
  const elbowFlexion =
    180 -
    deg(
      Math.acos(
        clamp(
          dot(
            unit(sub(right.shoulder, right.elbow)),
            unit(sub(right.hand, right.elbow)),
          ),
          -1,
          1,
        ),
      ),
    );
  const shoulderFlexion = deg(Math.atan2(upperLocal[1], upperLocal[2]));
  const shoulderHorizontalAbduction = deg(
    Math.atan2(Math.abs(upperLocal[0]), Math.max(0.001, upperLocal[1])),
  );
  return {
    progress: clamp(progress),
    joints: {
      leftShoulder: left.shoulder,
      rightShoulder: right.shoulder,
      leftElbow: left.elbow,
      rightElbow: right.elbow,
      leftHand: left.hand,
      rightHand: right.hand,
    },
    barPosition: bar,
    angles: { elbowFlexion, shoulderFlexion, shoulderHorizontalAbduction },
    reachLimited: reachLimited || left.reachLimited || right.reachLimited,
  } satisfies Pick<
    SimulationFrame,
    'progress' | 'joints' | 'barPosition' | 'angles' | 'reachLimited'
  >;
}
