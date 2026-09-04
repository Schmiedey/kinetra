import { Bone, Matrix4, Quaternion, Vector3, Color } from 'three';
import type {
  BenchConfig,
  SimulationFrame,
  MuscleId,
  VisualizationMode,
  SimulationResult,
  Vec3,
} from '../../engine/types';
import { bodyToWorld, benchOrigin } from '../../engine/anthropometry';
import { rad, clamp } from '../../engine/vector';
import { muscles } from '../../data/muscles';
// These are visual registration landmarks measured from the source mesh bounds.
// They fit the source atlas to the generic simulation; they are not physiological calibration.
const fit = (x: number, y: number, z: number): Vec3 => [
  x * (0.21 / 160),
  -(y + 75) * 0.001 + 0.145,
  -(z - 1310) * (0.52 / 480) - 0.52,
];
export const rigNames = [
  'torso',
  'leftUpperArm',
  'leftForearm',
  'leftHand',
  'leftThigh',
  'leftShin',
  'leftFoot',
  'rightUpperArm',
  'rightForearm',
  'rightHand',
  'rightThigh',
  'rightShin',
  'rightFoot',
] as const;
export type RigName = (typeof rigNames)[number];
export const sourceLandmarks = (side: 1 | -1) => ({
  shoulder: fit(side * 160, -75, 1310),
  elbow: fit(side * 216, -67, 1040),
  wrist: fit(side * 253, -118, 805),
  hip: fit(side * 80, -85, 810),
  knee: fit(side * 80, -80, 380),
  ankle: fit(side * 75, -80, 0),
});
const vector = (p: Vec3) => new Vector3(...p);
// The source hand mesh's wrist landmark is proximal to the palm center. Keep
// that registration distance when attaching it to the simulated bar target.
export const gripCenter = new Vector3(0, 0.055, 0.03);
export function gripMatrix(
  hand: Vec3,
  elbow: Vec3,
  axis = new Vector3(1, 0, 0),
  twistRad = 0,
) {
  const y = vector(hand).sub(vector(elbow));
  y.addScaledVector(axis, -y.dot(axis));
  if (y.lengthSq() < 0.001) y.set(0, 1, 0);
  y.normalize();
  const z = new Vector3().crossVectors(axis, y).normalize();
  const matrix = new Matrix4().makeBasis(axis, y, z);
  if (twistRad)
    matrix.multiply(new Matrix4().makeRotationX(twistRad));
  const offset = gripCenter.clone().applyMatrix4(matrix);
  return matrix.setPosition(vector(hand).sub(offset));
}
export function segmentMatrix(a: Vec3, b: Vec3, scale = 1) {
  const direction = vector(b).sub(vector(a)).normalize();
  return new Matrix4().compose(
    vector(a),
    new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction),
    new Vector3(1, scale, 1),
  );
}
export function bindMatrices(): Matrix4[] {
  return rigNames.map((name) => {
    if (name === 'torso') return new Matrix4();
    const s = sourceLandmarks(name.startsWith('left') ? 1 : -1);
    if (name.endsWith('UpperArm')) return segmentMatrix(s.shoulder, s.elbow);
    if (name.endsWith('Forearm')) return segmentMatrix(s.elbow, s.wrist);
    if (name.endsWith('Hand')) return new Matrix4().makeTranslation(...s.wrist);
    if (name.endsWith('Thigh')) return segmentMatrix(s.hip, s.knee);
    if (name.endsWith('Shin')) return segmentMatrix(s.knee, s.ankle);
    return new Matrix4().makeTranslation(...s.ankle);
  });
}
export function poseMatrices(
  config: BenchConfig,
  frame: SimulationFrame,
  twistRad = 0,
): Matrix4[] {
  const torso = new Matrix4().compose(
    vector(benchOrigin),
    new Quaternion().setFromAxisAngle(
      new Vector3(1, 0, 0),
      rad(config.benchAngleDeg),
    ),
    new Vector3(1, 1, 1),
  );
  return rigNames.map((name) => {
    if (name === 'torso') return torso;
    const positive = name.startsWith('left'),
      side = positive ? 1 : -1,
      s = sourceLandmarks(side),
      j = frame.joints;
    const shoulder = positive ? j.rightShoulder : j.leftShoulder,
      elbow = positive ? j.rightElbow : j.leftElbow,
      hand = positive ? j.rightHand : j.leftHand;
    const handPose = gripMatrix(hand, elbow, new Vector3(1, 0, 0), twistRad);
    const wrist = new Vector3()
      .setFromMatrixPosition(handPose)
      .toArray() as Vec3;
    const hip = bodyToWorld(s.hip, config.benchAngleDeg),
      knee: Vec3 = [side * 0.195, 0.445, 0.83],
      ankle: Vec3 = [side * 0.23, 0.09, 1.1];
    const segment = (a: Vec3, b: Vec3, sa: Vec3, sb: Vec3) =>
      segmentMatrix(
        a,
        b,
        vector(a).distanceTo(vector(b)) / vector(sa).distanceTo(vector(sb)),
      );
    if (name.endsWith('UpperArm'))
      return segment(shoulder, elbow, s.shoulder, s.elbow);
    if (name.endsWith('Forearm'))
      return segment(elbow, wrist, s.elbow, s.wrist);
    if (name.endsWith('Hand')) return handPose;
    if (name.endsWith('Thigh')) return segment(hip, knee, s.hip, s.knee);
    if (name.endsWith('Shin')) return segment(knee, ankle, s.knee, s.ankle);
    return new Matrix4().compose(
      vector(ankle),
      new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2),
      new Vector3(1, 1, 1),
    );
  });
}
export function applyPose(bones: Bone[], matrices: Matrix4[]) {
  bones.forEach((bone, i) => {
    bone.matrixAutoUpdate = false;
    bone.matrix.copy(matrices[i]);
    bone.matrixWorldNeedsUpdate = true;
  });
}
export function vertexWeights(
  position: Vec3,
  id: MuscleId,
  positive: boolean,
): {
  indices: [number, number, number, number];
  weights: [number, number, number, number];
} {
  const upper = positive ? 1 : 7,
    fore = upper + 1,
    source = sourceLandmarks(positive ? 1 : -1);
  const smooth = (x: number) => {
    const t = clamp(x);
    return t * t * (3 - 2 * t);
  };
  if (id === 'pecClavicular' || id === 'pecSternal') {
    const arm = smooth((Math.abs(position[0]) - 0.1) / 0.145);
    return { indices: [0, upper, 0, 0], weights: [1 - arm, arm, 0, 0] };
  }
  if (id === 'anteriorDelt') {
    const arm = smooth((position[2] + 0.565) / 0.18) * 0.85 + 0.15;
    return { indices: [0, upper, 0, 0], weights: [1 - arm, arm, 0, 0] };
  }
  const distal =
    smooth((position[2] - (source.elbow[2] - 0.035)) / 0.055) * 0.3;
  return { indices: [upper, fore, 0, 0], weights: [1 - distal, distal, 0, 0] };
}
export function muscleAppearance(
  id: MuscleId,
  mode: VisualizationMode,
  frame: SimulationFrame,
  result: SimulationResult,
) {
  const region = muscles.find((m) => m.id === id)!;
  const value =
    mode === 'length'
      ? frame.muscleLengths[id]
      : mode === 'stimulus'
        ? result.muscles.find((m) => m.id === id)!.estimatedStimulus / 100
        : frame.muscleDemand[id];
  if (mode === 'anatomy') return { color: new Color(region.color), value: 1 };
  if (mode === 'length')
    return {
      color:
        value < 0.5
          ? new Color('#5a8cda').lerp(new Color('#e8e4d9'), value * 2)
          : new Color('#e8e4d9').lerp(new Color('#e5915e'), (value - 0.5) * 2),
      value,
    };
  // Color encodes model magnitude; the legend uses the same stops. No EMG claim.
  const color =
    value < 0.33
      ? new Color('#354c53').lerp(new Color('#52a7ad'), value / 0.33)
      : value < 0.66
        ? new Color('#52a7ad').lerp(new Color('#efc66c'), (value - 0.33) / 0.33)
        : new Color('#efc66c').lerp(
            new Color('#eb684d'),
            (value - 0.66) / 0.34,
          );
  return { color, value };
}
