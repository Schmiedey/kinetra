import type { BenchConfig, SimulationFrame, MuscleResult } from './types';
import { calibration } from '../data/calibration';
import { muscles } from '../data/muscles';
import { clamp } from './vector';
/** Trapezoidal mean across the concentric ROM, not an arbitrary frame-count sum. */
export const integrate = (values: number[]) =>
  values.length < 2
    ? (values[0] ?? 0)
    : values.reduce(
        (sum, v, i) => sum + v * (i === 0 || i === values.length - 1 ? 0.5 : 1),
        0,
      ) /
      (values.length - 1);
export function estimateStimulus(
  frames: SimulationFrame[],
  config: BenchConfig,
): MuscleResult[] {
  const c = calibration.stimulus,
    effortFactor = c.rirFactors[Math.round(config.rir)],
    loadedRom = clamp(config.romPercent / 100);
  return muscles.map(({ id }) => {
    const mechanicalDemand = integrate(frames.map((f) => f.muscleDemand[id]));
    const lengthenedExposure = integrate(
      frames.map((f) => f.muscleDemand[id] * f.muscleLengths[id]),
    );
    const weighted = integrate(
      frames.map(
        (f) =>
          f.muscleDemand[id] *
          (c.lengthBase + c.lengthGain * f.muscleLengths[id]),
      ),
    );
    return {
      id,
      mechanicalDemand,
      lengthenedExposure,
      loadedRom,
      estimatedStimulus:
        100 * clamp(weighted * effortFactor * loadedRom ** c.romExponent),
      effortFactor,
      lengthenedExposureFactor:
        mechanicalDemand > 0 ? weighted / mechanicalDemand : 0,
      confidence: 'low',
    };
  });
}
