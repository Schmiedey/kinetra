import type { Equipment, GroupId, Pattern } from '../movements/catalog';
import { muscleGroups } from '../movements/catalog';
import type { Vec3 } from './types';
import { add, clamp, cross, deg, dot, norm, scale, sub, unit } from './vector';

/** Transparent v0.2 choices for the whole-library load model. Not fitted EMG. */
export const tissueCalibration = {
  gravity: 9.81,
  frameCount: 33,
  bodyMassKg: 78,
  muscleMomentArmM: 0.05,
  pushupHandShare: 0.64,
  lungeFrontShare: 0.68,
  forefootOffsetM: 0.06,
  bandSlack: 0.38,
  referenceNm: {
    shoulder: 70,
    elbow: 38,
    hip: 180,
    knee: 155,
    ankle: 90,
  },
} as const;

export const tissueIds = Object.keys(muscleGroups) as GroupId[];
export type JointId = keyof typeof tissueCalibration.referenceNm;
export const jointIds = Object.keys(
  tissueCalibration.referenceNm,
) as JointId[];

export interface SideJoints {
  shoulder: Vec3;
  elbow: Vec3;
  wrist: Vec3;
  hip: Vec3;
  knee: Vec3;
  ankle: Vec3;
}

export interface PoseLandmarks {
  left: SideJoints;
  right: SideJoints;
}

export interface ForceApplication {
  at: Vec3;
  force: Vec3;
  kind: 'load' | 'reaction';
  side: 'left' | 'right';
  chain: 'arm' | 'leg' | 'torso';
}

export interface LoadInputs {
  pattern: Pattern;
  equipment: Equipment;
  angleDeg: number;
  loadKg: number;
  bodyMassKg: number;
  progress: number;
  unilateral?: boolean;
}

export type JointMoments = Record<JointId, number>;
export type TissueMap = Record<GroupId, number>;

export interface TissueFrame {
  progress: number;
  moments: { left: JointMoments; right: JointMoments; peak: JointMoments };
  demand: TissueMap;
  length: TissueMap;
  forces: ForceApplication[];
  groundReactionN: number;
  peakMomentNm: number;
  peakMomentJoint: JointId;
  compressionN: Record<JointId, number>;
  impactN: number;
  impactBw: number;
  elbowFlexionDeg: number;
  kneeFlexionDeg: number;
  hipFlexionDeg: number;
  stanceWidthCm: number;
}

const down: Vec3 = [0, -1, 0];
const up: Vec3 = [0, 1, 0];
const emptyTissue = (): TissueMap =>
  Object.fromEntries(tissueIds.map((id) => [id, 0])) as TissueMap;
const mid = (a: Vec3, b: Vec3): Vec3 => scale(add(a, b), 0.5);
const clamp01 = (x: number) => clamp(x, 0, 1);
const angleAt = (a: Vec3, b: Vec3, c: Vec3) => {
  const first = sub(a, b),
    second = sub(c, b);
  const n = norm(first) * norm(second);
  return n ? deg(Math.acos(clamp(dot(first, second) / n, -1, 1))) : 0;
};
const saturate = (momentNm: number, referenceNm: number) =>
  1 - Math.exp(-Math.max(0, momentNm) / referenceNm);

function split(
  points: [Vec3, Vec3],
  force: Vec3,
  kind: ForceApplication['kind'],
  chain: ForceApplication['chain'],
): ForceApplication[] {
  const half = scale(force, 0.5);
  return [
    { at: points[0], force: half, kind, side: 'left', chain },
    { at: points[1], force: half, kind, side: 'right', chain },
  ];
}

function bandScale(progress: number, equipment: Equipment) {
  if (equipment !== 'Band') return 1;
  return (
    tissueCalibration.bandSlack + (1 - tissueCalibration.bandSlack) * progress
  );
}

export function suggestedLoadKg(
  pattern: Pattern,
  equipment: Equipment,
): number {
  if (equipment === 'Bodyweight') return 0;
  const barbell: Record<Pattern, number> = {
    'Horizontal press': 60,
    'Vertical press': 50,
    'Horizontal pull': 55,
    'Vertical pull': 45,
    Squat: 80,
    Hinge: 100,
    Lunge: 40,
    'Elbow flexion': 22,
    'Elbow extension': 18,
    'Shoulder raise': 10,
    'Knee extension': 40,
    'Knee flexion': 32,
    'Calf raise': 60,
    'Hip extension': 80,
    Core: 0,
    Carry: 32,
  };
  const load = barbell[pattern];
  if (equipment === 'Dumbbells' || equipment === 'Kettlebell')
    return Math.round(load * 0.7);
  if (equipment === 'Cable' || equipment === 'Band')
    return Math.round(load * 0.55);
  if (equipment === 'Machine') return Math.round(load * 0.85);
  return load;
}

export function externalForces(
  landmarks: PoseLandmarks,
  input: LoadInputs,
): ForceApplication[] {
  const g = tissueCalibration.gravity;
  const loadN =
    Math.max(0, input.loadKg) * g * bandScale(input.progress, input.equipment);
  const bodyN = Math.max(20, input.bodyMassKg) * g;
  const hands: [Vec3, Vec3] = [landmarks.left.wrist, landmarks.right.wrist];
  const hips: [Vec3, Vec3] = [landmarks.left.hip, landmarks.right.hip];
  const forefoot = (side: SideJoints): Vec3 =>
    add(side.ankle, [0, 0, tissueCalibration.forefootOffsetM]);
  const feet: [Vec3, Vec3] = [forefoot(landmarks.left), forefoot(landmarks.right)];
  const standing = split(feet, scale(up, loadN + bodyN), 'reaction', 'leg');
  const hang = split(hands, scale(up, bodyN + loadN), 'reaction', 'arm');

  switch (input.pattern) {
    case 'Horizontal press':
      if (input.equipment === 'Bodyweight')
        return [
          ...split(
            hands,
            scale(down, tissueCalibration.pushupHandShare * bodyN),
            'load',
            'arm',
          ),
          ...split(
            feet,
            scale(up, (1 - tissueCalibration.pushupHandShare) * bodyN),
            'reaction',
            'leg',
          ),
        ];
      return split(hands, scale(down, loadN), 'load', 'arm');
    case 'Vertical press':
      return split(hands, scale(down, loadN), 'load', 'arm');
    case 'Vertical pull':
      return input.equipment === 'Bodyweight' || input.equipment === 'Barbell'
        ? hang
        : split(hands, scale(up, loadN), 'load', 'arm');
    case 'Horizontal pull':
      if (input.equipment === 'Cable' || input.equipment === 'Machine')
        return split(hands, [0, loadN * 0.15, loadN], 'load', 'arm');
      return split(hands, scale(down, loadN), 'load', 'arm');
    case 'Squat':
    case 'Calf raise':
      return standing;
    case 'Hinge':
      return standing;
    case 'Lunge': {
      const frontIsLeft = landmarks.left.ankle[2] > landmarks.right.ankle[2];
      const total = loadN + bodyN;
      const front = tissueCalibration.lungeFrontShare;
      return [
        {
          at: frontIsLeft ? feet[0] : feet[1],
          force: scale(up, total * front),
          kind: 'reaction',
          side: frontIsLeft ? 'left' : 'right',
          chain: 'leg',
        },
        {
          at: frontIsLeft ? feet[1] : feet[0],
          force: scale(up, total * (1 - front)),
          kind: 'reaction',
          side: frontIsLeft ? 'right' : 'left',
          chain: 'leg',
        },
      ];
    }
    case 'Hip extension':
      return [
        {
          at: add(mid(hips[0], hips[1]), [0, 0.05, 0.08]),
          force: scale(down, loadN * 0.5),
          kind: 'load',
          side: 'left',
          chain: 'torso',
        },
        {
          at: add(mid(hips[0], hips[1]), [0, 0.05, 0.08]),
          force: scale(down, loadN * 0.5),
          kind: 'load',
          side: 'right',
          chain: 'torso',
        },
        ...split(feet, scale(up, bodyN), 'reaction', 'leg'),
      ];
    case 'Elbow flexion':
    case 'Elbow extension':
    case 'Shoulder raise':
      return split(hands, scale(down, loadN), 'load', 'arm');
    case 'Knee extension':
    case 'Knee flexion':
      return split(
        [landmarks.left.ankle, landmarks.right.ankle],
        scale(down, loadN),
        'load',
        'leg',
      );
    case 'Core':
      return [
        {
          at: mid(hips[0], hips[1]),
          force: scale(down, bodyN * 0.5),
          kind: 'load',
          side: 'left',
          chain: 'torso',
        },
        {
          at: mid(hips[0], hips[1]),
          force: scale(down, bodyN * 0.5),
          kind: 'load',
          side: 'right',
          chain: 'torso',
        },
        ...split(hands, scale(up, bodyN * 0.55), 'reaction', 'arm'),
        ...split(feet, scale(up, bodyN * 0.45), 'reaction', 'leg'),
      ];
    case 'Carry': {
      const total = loadN + bodyN;
      if (input.unilateral || input.equipment === 'Kettlebell')
        return [
          {
            at: landmarks.right.wrist,
            force: scale(down, loadN),
            kind: 'load',
            side: 'right',
            chain: 'arm',
          },
          ...split(feet, scale(up, total), 'reaction', 'leg'),
        ];
      return [
        ...split(hands, scale(down, loadN), 'load', 'arm'),
        ...split(feet, scale(up, total), 'reaction', 'leg'),
      ];
    }
  }
}

function sideMoments(side: SideJoints, apps: ForceApplication[]): JointMoments {
  const moment = (joint: Vec3, chain: ForceApplication['chain']) =>
    apps
      .filter((app) => app.chain === chain)
      .reduce((sum, app) => sum + norm(cross(sub(app.at, joint), app.force)), 0);
  return {
    shoulder: moment(side.shoulder, 'arm'),
    elbow: moment(side.elbow, 'arm'),
    hip: moment(side.hip, 'leg') + moment(side.hip, 'torso'),
    knee: moment(side.knee, 'leg'),
    ankle: moment(side.ankle, 'leg'),
  };
}

export function jointAngles(side: SideJoints) {
  const torso = sub(side.shoulder, side.hip);
  const thigh = sub(side.knee, side.hip);
  const shin = sub(side.ankle, side.knee);
  return {
    elbowFlexion: 180 - angleAt(side.shoulder, side.elbow, side.wrist),
    kneeFlexion: 180 - angleAt(side.hip, side.knee, side.ankle),
    hipFlexion: Math.max(0, 90 - deg(Math.acos(clamp(dot(unit(torso), unit(thigh)), -1, 1)))),
    ankleDorsi: Math.max(0, 90 - deg(Math.acos(clamp(dot(unit(shin), [0, 1, 0]), -1, 1)))),
    armElevation: deg(Math.acos(clamp(dot(unit(sub(side.elbow, side.shoulder)), [0, -1, 0]), -1, 1))),
  };
}

function tissueLength(input: LoadInputs, angles: ReturnType<typeof jointAngles>): TissueMap {
  const k = clamp01(angles.kneeFlexion / 135);
  const h = clamp01(angles.hipFlexion / 95);
  const e = clamp01(angles.elbowFlexion / 145);
  const elev = clamp01(angles.armElevation / 160);
  const dorsi = clamp01(angles.ankleDorsi / 35);
  const incline = clamp(input.angleDeg / 60, -0.4, 1);
  return {
    chest: clamp01(0.2 + 0.75 * e * (1 - Math.max(0, incline) * 0.35)),
    frontDelts: clamp01(0.15 + 0.7 * (1 - elev) + Math.max(0, incline) * 0.2),
    sideDelts: clamp01(0.2 + 0.7 * elev),
    rearDelts: clamp01(0.25 + 0.55 * (1 - e)),
    triceps: clamp01(0.12 + 0.82 * e),
    biceps: clamp01(0.15 + 0.8 * (1 - e)),
    lats: clamp01(0.18 + 0.75 * elev),
    upperBack: clamp01(0.25 + 0.5 * (1 - e)),
    core: clamp01(0.3 + 0.5 * h),
    glutes: clamp01(0.12 + 0.82 * h),
    quads: clamp01(0.1 + 0.85 * k),
    hamstrings: clamp01(0.12 + 0.7 * h * (1 - 0.45 * k)),
    calves: clamp01(0.2 + 0.7 * dorsi),
  };
}

type Share = Partial<Record<JointId, number>>;
const shares: Record<Pattern, Partial<Record<GroupId, Share>>> = {
  'Horizontal press': {
    chest: { shoulder: 0.95 },
    frontDelts: { shoulder: 0.4 },
    triceps: { elbow: 0.48 },
    core: { shoulder: 0.08 },
  },
  'Vertical press': {
    frontDelts: { shoulder: 0.72 },
    triceps: { elbow: 0.95 },
    chest: { shoulder: 0.22 },
    sideDelts: { shoulder: 0.18 },
    core: { shoulder: 0.1 },
  },
  'Horizontal pull': {
    upperBack: { shoulder: 0.55 },
    lats: { shoulder: 0.42 },
    rearDelts: { shoulder: 0.28 },
    biceps: { elbow: 0.9 },
    core: { hip: 0.12 },
  },
  'Vertical pull': {
    lats: { shoulder: 0.92 },
    biceps: { elbow: 0.48 },
    upperBack: { shoulder: 0.34 },
    rearDelts: { shoulder: 0.16 },
    core: { hip: 0.1 },
  },
  Squat: {
    quads: { knee: 0.9 },
    glutes: { hip: 0.58 },
    hamstrings: { hip: 0.22, knee: 0.12 },
    calves: { ankle: 0.7 },
    core: { hip: 0.18 },
    upperBack: { shoulder: 0.12 },
  },
  Hinge: {
    hamstrings: { hip: 0.55, knee: 0.12 },
    glutes: { hip: 0.5 },
    core: { hip: 0.22 },
    upperBack: { shoulder: 0.2 },
    lats: { shoulder: 0.18 },
    quads: { knee: 0.18 },
  },
  Lunge: {
    quads: { knee: 0.88 },
    glutes: { hip: 0.5 },
    hamstrings: { hip: 0.2 },
    calves: { ankle: 0.45 },
    core: { hip: 0.16 },
  },
  'Elbow flexion': { biceps: { elbow: 1 }, frontDelts: { shoulder: 0.12 } },
  'Elbow extension': { triceps: { elbow: 1 }, chest: { shoulder: 0.08 } },
  'Shoulder raise': {
    sideDelts: { shoulder: 0.7 },
    frontDelts: { shoulder: 0.45 },
    upperBack: { shoulder: 0.12 },
  },
  'Knee extension': { quads: { knee: 1 } },
  'Knee flexion': { hamstrings: { knee: 1 }, calves: { ankle: 0.12 } },
  'Calf raise': { calves: { ankle: 1 }, glutes: { hip: 0.08 } },
  'Hip extension': {
    glutes: { hip: 0.78 },
    hamstrings: { hip: 0.35 },
    core: { hip: 0.16 },
  },
  Core: {
    core: { hip: 0.7, shoulder: 0.35 },
    glutes: { hip: 0.2 },
    frontDelts: { shoulder: 0.18 },
  },
  Carry: {
    core: { hip: 0.45, shoulder: 0.25 },
    upperBack: { shoulder: 0.4 },
    glutes: { hip: 0.28 },
    calves: { ankle: 0.35 },
    quads: { knee: 0.18 },
  },
};

function adjustShares(input: LoadInputs): Partial<Record<GroupId, Share>> {
  const base = shares[input.pattern];
  if (input.pattern === 'Horizontal press') {
    const incline = clamp(input.angleDeg / 60, -0.35, 1);
    return {
      ...base,
      chest: { shoulder: 0.95 - incline * 0.28 },
      frontDelts: { shoulder: 0.34 + incline * 0.42 },
    };
  }
  if (input.pattern === 'Shoulder raise') {
    const front = clamp01(input.angleDeg / 90);
    return {
      sideDelts: { shoulder: 0.75 - front * 0.4 },
      frontDelts: { shoulder: 0.28 + front * 0.5 },
      upperBack: { shoulder: 0.12 },
    };
  }
  return base;
}

function tissueDemand(
  input: LoadInputs,
  peak: JointMoments,
  length: TissueMap,
): TissueMap {
  const demand = emptyTissue();
  const table = adjustShares(input);
  for (const [group, share] of Object.entries(table) as [GroupId, Share][]) {
    let raw = 0;
    for (const joint of jointIds)
      raw += saturate(peak[joint], tissueCalibration.referenceNm[joint]) * (share[joint] ?? 0);
    demand[group] = clamp01(raw * (0.72 + 0.28 * length[group]));
  }
  if (input.pattern === 'Carry' && input.unilateral) demand.core = clamp01(demand.core * 1.25);
  return demand;
}

function compression(peak: JointMoments, reactionN: number): Record<JointId, number> {
  const out = {} as Record<JointId, number>;
  for (const joint of jointIds)
    out[joint] =
      reactionN + peak[joint] / tissueCalibration.muscleMomentArmM;
  return out;
}

export function solveTissue(
  landmarks: PoseLandmarks,
  input: LoadInputs,
): TissueFrame {
  const forces = externalForces(landmarks, {
    ...input,
    unilateral:
      input.unilateral ||
      (input.equipment === 'Kettlebell' && input.pattern === 'Carry'),
  });
  const leftApps = forces.filter((f) => f.side === 'left');
  const rightApps = forces.filter((f) => f.side === 'right');
  let left = sideMoments(landmarks.left, leftApps);
  let right = sideMoments(landmarks.right, rightApps);
  if (input.pattern === 'Hip extension') {
    const loadN = Math.max(0, input.loadKg) * tissueCalibration.gravity;
    const extra =
      loadN *
      norm(sub(landmarks.left.knee, landmarks.left.hip)) *
      Math.sin((jointAngles(landmarks.left).hipFlexion * Math.PI) / 180 + 0.35);
    left = { ...left, hip: left.hip + extra };
    right = { ...right, hip: right.hip + extra };
  }
  const peak = Object.fromEntries(
    jointIds.map((j) => [j, Math.max(left[j], right[j])]),
  ) as JointMoments;
  const angles = jointAngles(landmarks.left);
  const rightAngles = jointAngles(landmarks.right);
  const length = tissueLength(input, {
    elbowFlexion: (angles.elbowFlexion + rightAngles.elbowFlexion) / 2,
    kneeFlexion: (angles.kneeFlexion + rightAngles.kneeFlexion) / 2,
    hipFlexion: (angles.hipFlexion + rightAngles.hipFlexion) / 2,
    ankleDorsi: (angles.ankleDorsi + rightAngles.ankleDorsi) / 2,
    armElevation: (angles.armElevation + rightAngles.armElevation) / 2,
  });
  const demand = tissueDemand(input, peak, length);
  const groundReactionN = forces
    .filter((f) => f.kind === 'reaction')
    .reduce((s, f) => s + Math.abs(f.force[1]), 0);
  const loadN = forces
    .filter((f) => f.kind === 'load')
    .reduce((s, f) => s + norm(f.force), 0);
  const reactionN = Math.max(groundReactionN, loadN);
  const compressionN = compression(peak, reactionN);
  const peakMomentJoint = jointIds.reduce((best, j) =>
    peak[j] > peak[best] ? j : best,
  );
  const impactN = Math.max(...jointIds.map((j) => compressionN[j]));
  const bodyN = Math.max(20, input.bodyMassKg) * tissueCalibration.gravity;
  return {
    progress: input.progress,
    moments: { left, right, peak },
    demand,
    length,
    forces,
    groundReactionN,
    peakMomentNm: peak[peakMomentJoint],
    peakMomentJoint,
    compressionN,
    impactN,
    impactBw: impactN / bodyN,
    elbowFlexionDeg: Math.round((angles.elbowFlexion + rightAngles.elbowFlexion) / 2),
    kneeFlexionDeg: Math.round((angles.kneeFlexion + rightAngles.kneeFlexion) / 2),
    hipFlexionDeg: Math.round((angles.hipFlexion + rightAngles.hipFlexion) / 2),
    stanceWidthCm: Math.round(
      Math.abs(landmarks.left.ankle[0] - landmarks.right.ankle[0]) * 100,
    ),
  };
}

export function hottestTissue(demand: TissueMap): GroupId {
  return tissueIds.reduce((best, id) => (demand[id] > demand[best] ? id : best));
}

export function meanMap(frames: TissueFrame[], key: 'demand' | 'length'): TissueMap {
  const out = emptyTissue();
  for (const id of tissueIds)
    out[id] = frames.reduce((s, f) => s + f[key][id], 0) / frames.length;
  return out;
}
