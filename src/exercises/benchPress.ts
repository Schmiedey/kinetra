import type { BenchConfig } from '../engine/types';
export const defaultConfig: BenchConfig = {
  benchAngleDeg: 0,
  gripWidthRatio: 1.6,
  elbowFlareDeg: 60,
  romPercent: 100,
  touchPoint: 0.55,
  barPathCurve: 0.7,
  loadKg: 80,
  reps: 8,
  rir: 2,
};
export const presets = [
  { id: 'flat', label: 'Flat', name: 'Flat barbell bench', angle: 0 },
  { id: 'incline', label: 'Incline', name: 'Incline barbell bench', angle: 30 },
  {
    id: 'decline',
    label: 'Decline',
    name: 'Decline barbell bench',
    angle: -15,
  },
];
export const exerciseName = (angle: number) =>
  angle > 0
    ? 'Incline barbell bench'
    : angle < 0
      ? 'Decline barbell bench'
      : 'Flat barbell bench';
