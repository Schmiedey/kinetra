import { Matrix4, Vector3 } from 'three';
import type { Vec3 } from '../engine/types';
import type { PoseLandmarks, SideJoints } from '../engine/tissueLoad';
import { bindMatrices, sourceLandmarks } from '../components/three/anatomyRig';
import { movementPose } from './motion';
import type { Movement } from './catalog';

const point = (local: [number, number, number], matrix: Matrix4) =>
  new Vector3(...local).applyMatrix4(matrix).toArray() as Vec3;

export function extractLandmarks(
  movement: Movement,
  progress: number,
): PoseLandmarks {
  const pose = movementPose(movement, progress);
  const inverse = bindMatrices().map((matrix) => matrix.clone().invert());
  const world = (local: [number, number, number], index: number) =>
    point(local, inverse[index].clone().multiply(pose.matrices[index]));
  const side = (
    sign: 1 | -1,
    upper: number,
    forearm: number,
    thigh: number,
    shin: number,
  ): SideJoints => {
    const source = sourceLandmarks(sign);
    return {
      shoulder: world(source.shoulder, upper),
      elbow: world(source.elbow, upper),
      wrist: world(source.wrist, forearm),
      hip: world(source.hip, thigh),
      knee: world(source.knee, thigh),
      ankle: world(source.ankle, shin),
    };
  };
  return {
    left: side(1, 1, 2, 4, 5),
    right: side(-1, 7, 8, 10, 11),
  };
}
