import type { SimulationResult } from './types';
import { muscles } from '../data/muscles';
export function explainChanges(
  baseline: SimulationResult,
  current: SimulationResult,
) {
  const changes = muscles.map((m) => ({
    name: m.name,
    delta:
      current.muscles.find((x) => x.id === m.id)!.estimatedStimulus -
      baseline.muscles.find((x) => x.id === m.id)!.estimatedStimulus,
  }));
  const notes: string[] = [];
  if (current.config.benchAngleDeg !== baseline.config.benchAngleDeg)
    notes.push(
      `Bench angle changed from ${baseline.config.benchAngleDeg}° to ${current.config.benchAngleDeg}°. The model rotates the torso, changes shoulder geometry and reallocates shoulder demand between the two pec regions and front deltoid.`,
    );
  if (current.config.gripWidthRatio !== baseline.config.gripWidthRatio)
    notes.push(
      `Grip changed from ${baseline.config.gripWidthRatio.toFixed(2)}× to ${current.config.gripWidthRatio.toFixed(2)}× shoulder width. Moving the hands changes shoulder and elbow lever arms; the external moments come directly from the new joint positions.`,
    );
  if (current.config.loadKg !== baseline.config.loadKg)
    notes.push(
      `External load changed from ${baseline.config.loadKg.toFixed(1)} to ${current.config.loadKg.toFixed(1)} kg. With unchanged geometry, the vertical-load moments scale directly with load. This is not a measure of effort relative to your strength.`,
    );
  if (current.config.romPercent !== baseline.config.romPercent)
    notes.push(
      `ROM changed from ${baseline.config.romPercent}% to ${current.config.romPercent}%. Partial ROM removes the bottom portion of the modeled path. Exposure is recalculated over the resulting excursion.`,
    );
  if (current.config.rir !== baseline.config.rir)
    notes.push(
      `RIR changed from ${baseline.config.rir} to ${current.config.rir}. Only the heuristic effort factor changes; external mechanics do not depend on RIR.`,
    );
  if (
    ['touchPoint', 'barPathCurve', 'elbowFlareDeg'].some(
      (k) =>
        current.config[k as keyof typeof current.config] !==
        baseline.config[k as keyof typeof baseline.config],
    )
  )
    notes.push(
      'The changed touch point, path or elbow-flare control alters the inverse-kinematics solution. Lever arms and modeled muscle lengths are recalculated from that geometry.',
    );
  if (current.config.reps !== baseline.config.reps)
    notes.push(
      'Reps changed, updating the set context. Repetitions are not used as a multiplier for the comparative index; fatigue and volume are outside this model.',
    );
  if (!notes.length)
    notes.push(
      'This configuration matches your reference. Change a technique or set parameter to see its effect, or set a new reference before exploring.',
    );
  return {
    changes,
    notes,
    shoulderDelta:
      current.averageShoulderMomentNm - baseline.averageShoulderMomentNm,
    elbowDelta: current.averageElbowMomentNm - baseline.averageElbowMomentNm,
  };
}
