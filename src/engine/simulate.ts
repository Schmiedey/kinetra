import type { BenchConfig, SimulationResult } from './types';
import { calibration, configBounds } from '../data/calibration';
import { defaultConfig, exerciseName } from '../exercises/benchPress';
import { getKinematics } from './kinematics';
import { jointMoments } from './jointMoments';
import { muscleLengths } from './muscleLengths';
import { muscleDemand } from './muscleDemand';
import { estimateStimulus, integrate } from './stimulus';
import { clamp, sub, norm } from './vector';
export function sanitizeConfig(input: Partial<BenchConfig>): BenchConfig {
  const config = { ...defaultConfig };
  for (const key of Object.keys(configBounds) as (keyof BenchConfig)[]) {
    const value = input[key];
    if (typeof value === 'number' && Number.isFinite(value))
      config[key] = clamp(value, ...configBounds[key]);
  }
  config.reps = Math.round(config.reps);
  config.rir = Math.round(config.rir);
  return config;
}
export function simulate(input: BenchConfig): SimulationResult {
  const config = sanitizeConfig(input);
  const frames = Array.from({ length: calibration.frameCount }, (_, i) => {
    const geometry = getKinematics(config, i / (calibration.frameCount - 1));
    const moments = jointMoments(geometry.joints, config.loadKg);
    return {
      ...geometry,
      moments,
      muscleLengths: muscleLengths(geometry.angles, config),
      muscleDemand: muscleDemand(moments, config),
    };
  });
  const muscles = estimateStimulus(frames, config),
    shoulder = frames.map((f) => f.moments.shoulder),
    elbow = frames.map((f) => f.moments.elbow);
  const best = muscles.reduce((a, b) =>
    a.estimatedStimulus >= b.estimatedStimulus ? a : b,
  );
  const peak = frames.reduce((a, b) =>
    a.muscleDemand[best.id] >= b.muscleDemand[best.id] ? a : b,
  );
  const loadedExcursionM = frames
    .slice(1)
    .reduce(
      (sum, f, i) => sum + norm(sub(f.barPosition, frames[i].barPosition)),
      0,
    );
  const averageShoulderMomentNm = integrate(shoulder),
    averageElbowMomentNm = integrate(elbow);
  return {
    exercise: exerciseName(config.benchAngleDeg),
    config,
    frames,
    muscles,
    peakShoulderMomentNm: Math.max(...shoulder),
    peakElbowMomentNm: Math.max(...elbow),
    averageShoulderMomentNm,
    averageElbowMomentNm,
    loadedExcursionM,
    reachLimited: frames.some((f) => f.reachLimited),
    summary: {
      primaryMuscle: best.id,
      strongestRegion:
        peak.progress < 1 / 3
          ? 'bottom'
          : peak.progress < 2 / 3
            ? 'mid'
            : 'top',
      shoulderDemand: averageShoulderMomentNm,
      elbowDemand: averageElbowMomentNm,
    },
  };
}
export const frameAt = (result: SimulationResult, progress: number) =>
  result.frames[
    Math.round(clamp(Number.isFinite(progress) ? progress : 0) * 100)
  ];
