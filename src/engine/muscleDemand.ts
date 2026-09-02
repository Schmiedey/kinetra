import type { BenchConfig, MuscleValues, SimulationFrame } from './types';
import { calibration } from '../data/calibration';
import { clamp } from './vector';
export function muscleDemand(
  moments: SimulationFrame['moments'],
  config: BenchConfig,
): MuscleValues {
  const c = calibration.demand,
    incline = config.benchAngleDeg / 60,
    flare = (config.elbowFlareDeg - 60) / 30;
  const shoulder =
    (moments.shoulder / (moments.shoulder + c.shoulderReferenceNm)) *
    c.shoulderScale;
  const elbow =
    (moments.elbow / (moments.elbow + c.elbowReferenceNm)) * c.tricepsScale;
  return {
    pecClavicular: clamp(
      shoulder * (c.clavicularBase + c.clavicularIncline * incline),
    ),
    pecSternal: clamp(
      shoulder *
        (c.sternalBase + c.sternalIncline * incline + c.sternalFlare * flare),
    ),
    anteriorDelt: clamp(shoulder * (c.deltBase + c.deltIncline * incline)),
    triceps: clamp(elbow),
  };
}
