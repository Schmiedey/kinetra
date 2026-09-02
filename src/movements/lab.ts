import { Vector3 } from 'three';
import type { Movement } from './catalog';
import { movementPose } from './motion';
import { bindMatrices, sourceLandmarks } from '../components/three/anatomyRig';

export interface MovementLabReading {
  phasePercent: number;
  elbowFlexionDeg: number;
  kneeFlexionDeg: number;
  stanceWidthCm: number;
  setup: string;
}

const clamp = (value: number) => Math.min(1, Math.max(-1, value));
const angleAt = (a: Vector3, b: Vector3, c: Vector3) => {
  const first = a.clone().sub(b),
    second = c.clone().sub(b);
  return (
    (Math.acos(clamp(first.dot(second) / (first.length() * second.length()))) *
      180) /
    Math.PI
  );
};

/** Geometry from the same generic articulated pose that drives the preview. */
export function analyzeMovement(
  movement: Movement,
  progress: number,
): MovementLabReading {
  const pose = movementPose(movement, progress);
  const inverse = bindMatrices().map((matrix) => matrix.clone().invert());
  const point = (local: [number, number, number], index: number) =>
    new Vector3(...local)
      .applyMatrix4(inverse[index])
      .applyMatrix4(pose.matrices[index]);
  const side = (
    sourceSide: 1 | -1,
    upper: number,
    forearm: number,
    thigh: number,
    shin: number,
  ) => {
    const source = sourceLandmarks(sourceSide);
    return {
      shoulder: point(source.shoulder, upper),
      elbow: point(source.elbow, upper),
      wrist: point(source.wrist, forearm),
      hip: point(source.hip, thigh),
      knee: point(source.knee, thigh),
      ankle: point(source.ankle, shin),
    };
  };
  const left = side(1, 1, 2, 4, 5),
    right = side(-1, 7, 8, 10, 11);
  const average = (read: (points: typeof left) => number) =>
    (read(left) + read(right)) / 2;
  return {
    phasePercent: Math.round(Math.min(1, Math.max(0, progress)) * 100),
    elbowFlexionDeg: Math.round(
      180 - average((p) => angleAt(p.shoulder, p.elbow, p.wrist)),
    ),
    kneeFlexionDeg: Math.round(
      180 - average((p) => angleAt(p.hip, p.knee, p.ankle)),
    ),
    stanceWidthCm: Math.round(Math.abs(left.ankle.x - right.ankle.x) * 100),
    setup: `${movement.equipment} · ${movement.pattern}`,
  };
}
