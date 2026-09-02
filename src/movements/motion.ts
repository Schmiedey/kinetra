import { Matrix4, Quaternion, Vector3 } from 'three';
import type { Movement, GroupId } from './catalog';
import type { Vec3, SimulationFrame } from '../engine/types';
import {
  sourceLandmarks,
  rigNames,
  segmentMatrix,
  gripMatrix,
  poseMatrices,
} from '../components/three/anatomyRig';
import { getKinematics } from '../engine/kinematics';
import { solveTwoLink } from '../engine/inverseKinematics';
import { defaultConfig } from '../exercises/benchPress';
const v = (p: Vec3) => new Vector3(...p);
const point = (p: Vector3) => p.toArray() as Vec3;
const radians = (n: number) => (n * Math.PI) / 180;
export function movementPose(m: Movement, progress: number) {
  const t =
    1 - m.range / 100 + (m.range / 100) * Math.max(0, Math.min(1, progress));
  const pushup =
    m.pattern === 'Horizontal press' && m.equipment === 'Bodyweight';
  if (m.pattern === 'Horizontal press' && !pushup) {
    const config = {
      ...defaultConfig,
      benchAngleDeg: m.angle,
      gripWidthRatio: 1.6 * m.stance,
      romPercent: m.range,
    };
    const f = getKinematics(config, progress);
    return {
      matrices: poseMatrices(config, f as SimulationFrame),
      hands: [f.joints.leftHand, f.joints.rightHand] as Vec3[],
      bench: true,
      seated: false,
    };
  }
  const down = 1 - t;
  const prone = m.pattern === 'Core' || pushup;
  const seated =
    ['Knee extension', 'Knee flexion'].includes(m.pattern) ||
    (m.pattern === 'Horizontal pull' &&
      ['Cable', 'Machine'].includes(m.equipment)) ||
    (m.pattern === 'Vertical pull' && m.equipment === 'Cable');
  let hip: Vec3 = [0, seated ? 0.63 : 0.94, 0],
    tilt = 90;
  if (m.pattern === 'Squat') {
    hip = [0, 0.94 - 0.35 * down, -0.23 * down];
    tilt = 90 + 22 * down + m.angle * 0.15;
  }
  if (m.pattern === 'Hinge') {
    hip = [0, 0.94 - 0.14 * down, -0.25 * down];
    tilt = 90 + (62 + m.angle * 0.25) * down;
  }
  if (m.pattern === 'Lunge') {
    hip = [0, 0.94 - 0.34 * down, 0];
    tilt = 96;
  }
  if (m.pattern === 'Horizontal pull' && !seated)
    tilt = 90 + Math.max(20, m.angle);
  if (m.pattern === 'Hip extension') {
    hip = [0, 0.35 + 0.25 * t, 0];
    tilt = -20 * down;
  }
  if (m.pattern === 'Calf raise') hip[1] += 0.08 * t;
  if (m.pattern === 'Vertical pull' && m.equipment === 'Bodyweight')
    hip[1] += 0.22 * t;
  if (prone) {
    hip = [0, pushup ? 0.45 + 0.2 * t : 0.48, 0];
    tilt = 180;
  }
  const sourceHip = sourceLandmarks(1).hip;
  const rotation = new Quaternion().setFromAxisAngle(
    new Vector3(1, 0, 0),
    radians(tilt),
  );
  const hipCenter = new Vector3(0, sourceHip[1], sourceHip[2]);
  const torso = new Matrix4().compose(
    v(hip).sub(hipCenter.applyQuaternion(rotation)),
    rotation,
    new Vector3(1, 1, 1),
  );
  const matrices: Record<string, Matrix4> = { torso };
  const hands: Vec3[] = [];
  for (const side of [-1, 1] as const) {
    const s = sourceLandmarks(side),
      prefix = side === 1 ? 'left' : 'right';
    const shoulder = point(v(s.shoulder).applyMatrix4(torso));
    const hp = point(v(s.hip).applyMatrix4(torso));
    let knee: Vec3 = [side * 0.16 * m.stance, 0.5, 0.055],
      ankle: Vec3 = [side * 0.16 * m.stance, 0.085, 0.06];
    if (m.pattern === 'Squat')
      knee = [side * 0.17 * m.stance, 0.49 - 0.07 * down, 0.07 + 0.2 * down];
    if (m.pattern === 'Hinge') knee = [side * 0.16 * m.stance, 0.49, 0.08];
    if (m.pattern === 'Lunge') {
      ankle = [side * 0.16 * m.stance, 0.085, side === 1 ? 0.4 : -0.42];
      knee = [
        side * 0.16 * m.stance,
        side === 1 ? 0.5 - 0.03 * down : 0.5 - 0.32 * down,
        side === 1 ? 0.3 + 0.15 * down : -0.35,
      ];
    }
    if (seated) {
      knee = [side * 0.17 * m.stance, 0.61, 0.4];
      ankle = [side * 0.17 * m.stance, 0.18, 0.4];
    }
    if (['Knee extension', 'Knee flexion'].includes(m.pattern)) {
      const theta = radians(85 * (m.pattern === 'Knee extension' ? t : 1 - t));
      ankle = [
        side * 0.17 * m.stance,
        0.61 - 0.43 * Math.cos(theta),
        0.4 + 0.43 * Math.sin(theta),
      ];
    }
    if (m.pattern === 'Hip extension') {
      knee = [side * 0.18 * m.stance, 0.47, 0.4];
      ankle = [side * 0.18 * m.stance, 0.085, 0.56];
    }
    if (prone) {
      knee = [side * 0.12 * m.stance, 0.3, -0.45];
      ankle = [side * 0.12 * m.stance, 0.085, -0.9];
    }
    if (m.pattern === 'Carry') {
      const stride =
        (Math.sin(progress * Math.PI * 2 + (side * Math.PI) / 2) *
          0.14 *
          m.range) /
        100;
      knee[2] += stride;
      ankle[2] += stride;
      ankle[1] += Math.max(0, stride) * 0.2;
    }
    let target: Vec3 = [side * 0.26, shoulder[1] - 0.58, shoulder[2] + 0.04];
    let elbow: Vec3;
    if (m.pattern === 'Vertical press')
      target = [
        side * 0.28 * m.stance,
        shoulder[1] + 0.03 + 0.51 * t,
        shoulder[2] + 0.08,
      ];
    if (m.pattern === 'Vertical pull')
      target = [
        side * 0.32 * m.stance,
        m.equipment === 'Bodyweight' ? 2.04 : shoulder[1] + 0.56 - 0.5 * t,
        shoulder[2] + 0.08,
      ];
    if (m.pattern === 'Horizontal pull')
      target = [
        side * 0.26 * m.stance,
        shoulder[1] - 0.4 + 0.26 * t,
        shoulder[2] + 0.28 - 0.19 * t,
      ];
    if (m.pattern === 'Squat' || m.id === 'goodmorning')
      target =
        m.equipment === 'Barbell'
          ? [side * 0.38, shoulder[1] - 0.04, shoulder[2] - 0.05]
          : [side * 0.12, shoulder[1] - 0.2, shoulder[2] + 0.15];
    if (m.pattern === 'Hinge' && m.id !== 'goodmorning')
      target = [
        side * 0.28 * m.stance,
        hip[1] - 0.25 - 0.18 * down,
        0.23 + 0.05 * down,
      ];
    if (m.pattern === 'Hip extension')
      target = [side * 0.3, hip[1] + 0.07, hip[2]];
    if (seated && !['Horizontal pull', 'Vertical pull'].includes(m.pattern))
      target = [side * 0.25, hip[1] + 0.04, 0.21];
    if (prone) target = [side * 0.28 * m.stance, 0.105, shoulder[2]];
    if (m.pattern === 'Elbow flexion' || m.pattern === 'Elbow extension') {
      const upperAngle =
        m.pattern === 'Elbow extension' ? radians(m.angle * 2) : 0;
      elbow = [
        side * 0.24,
        shoulder[1] - 0.29 * Math.cos(upperAngle),
        shoulder[2] + 0.035 + 0.29 * Math.sin(upperAngle),
      ];
      const a =
        radians(m.pattern === 'Elbow flexion' ? 135 * t : 105 * (1 - t)) +
        upperAngle;
      target = [
        elbow[0],
        elbow[1] - 0.28 * Math.cos(a),
        elbow[2] + 0.28 * Math.sin(a),
      ];
    } else {
      if (m.pattern === 'Shoulder raise') {
        const a = radians(10 + 78 * t),
          front = radians(m.angle);
        target = [
          shoulder[0] + side * 0.57 * Math.sin(a) * Math.cos(front),
          shoulder[1] - 0.57 * Math.cos(a),
          shoulder[2] + 0.57 * Math.sin(a) * Math.sin(front),
        ];
      }
      const solved = solveTwoLink(shoulder, target, 0.32, 0.29, [
        side,
        -0.3,
        0.25,
      ]);
      target = solved.hand;
      elbow = solved.elbow;
    }
    const grip = gripMatrix(target, elbow);
    const wrist = point(new Vector3().setFromMatrixPosition(grip));
    const seg = (a: Vec3, b: Vec3, sa: Vec3, sb: Vec3) =>
      segmentMatrix(a, b, v(a).distanceTo(v(b)) / v(sa).distanceTo(v(sb)));
    matrices[prefix + 'UpperArm'] = seg(shoulder, elbow, s.shoulder, s.elbow);
    matrices[prefix + 'Forearm'] = seg(elbow, wrist, s.elbow, s.wrist);
    matrices[prefix + 'Hand'] = grip;
    matrices[prefix + 'Thigh'] = seg(hp, knee, s.hip, s.knee);
    matrices[prefix + 'Shin'] = seg(knee, ankle, s.knee, s.ankle);
    matrices[prefix + 'Foot'] = new Matrix4().compose(
      v(ankle),
      new Quaternion().setFromAxisAngle(
        new Vector3(1, 0, 0),
        Math.PI / 2 + (m.pattern === 'Calf raise' ? -t * 0.25 : 0),
      ),
      new Vector3(1, 1, 1),
    );
    hands.push(target);
  }
  return {
    matrices: rigNames.map((n) => matrices[n]),
    hands,
    bench: m.pattern === 'Hip extension',
    seated,
  };
}
export function emphasis(m: Movement, group: string, t: number): number {
  const primary = m.primary.includes(group as GroupId),
    secondary = m.secondary.includes(group as GroupId);
  let value = primary ? 0.82 : secondary ? 0.38 : 0.035;
  if (m.pattern === 'Horizontal press' && group === 'frontDelts')
    value += (Math.max(0, m.angle) / 90) * 0.3;
  if (m.pattern === 'Horizontal press' && group === 'chest')
    value -= (Math.max(0, m.angle) / 90) * 0.16;
  return Math.max(
    0.02,
    Math.min(1, value * (0.72 + 0.28 * Math.sin(t * Math.PI))),
  );
}
