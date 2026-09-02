import type { BenchConfig, MuscleValues, SimulationFrame } from './types';
import { calibration } from '../data/calibration';
import { clamp } from './vector';
export function muscleLengths(
  angles: SimulationFrame['angles'],
  config: BenchConfig,
): MuscleValues {
  const c = calibration.lengths,
    abduction = clamp(angles.shoulderHorizontalAbduction / 90),
    extension = clamp((90 - angles.shoulderFlexion) / 180),
    incline = config.benchAngleDeg / 60;
  return {
    pecClavicular: clamp(
      c.pecBase +
        c.pecAbduction * abduction +
        c.pecExtension * extension +
        c.clavicularIncline * incline,
    ),
    pecSternal: clamp(
      c.pecBase + c.pecAbduction * abduction + c.pecExtension * extension,
    ),
    anteriorDelt: clamp(
      c.deltBase + c.deltExtension * extension + c.deltAbduction * abduction,
    ),
    triceps: clamp(
      c.tricepsBase +
        (c.tricepsFlexion * angles.elbowFlexion) / 150 +
        c.tricepsShoulder * clamp(angles.shoulderFlexion / 180),
    ),
  };
}
