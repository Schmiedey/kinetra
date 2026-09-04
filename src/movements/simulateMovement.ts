import type { Movement, WorkoutItem, GroupId } from './catalog';
import { muscleGroups } from './catalog';
import { extractLandmarks } from './landmarks';
import {
  hottestTissue,
  meanMap,
  solveTissue,
  suggestedLoadKg,
  tissueCalibration,
  tissueIds,
  type JointId,
  type JointMoments,
  type LoadInputs,
  type TissueFrame,
  type TissueMap,
} from '../engine/tissueLoad';
import { clamp } from '../engine/vector';

export interface MovementSim {
  movement: Movement;
  loadKg: number;
  bodyMassKg: number;
  frames: TissueFrame[];
  meanDemand: TissueMap;
  peakDemand: TissueMap;
  meanLength: TissueMap;
  peakMoments: JointMoments;
  hottest: GroupId;
  peakImpactN: number;
  peakImpactBw: number;
  peakGroundReactionN: number;
  strongestRegion: 'bottom' | 'mid' | 'top';
}

export interface SessionTissue {
  items: {
    name: string;
    loadKg: number;
    hottest: GroupId;
    peakMomentNm: number;
    impactBw: number;
    volume: number;
  }[];
  demand: TissueMap;
  hottest: GroupId;
  peakImpactBw: number;
  volumeKg: number;
}

const inputsFor = (
  movement: Movement,
  loadKg: number,
  bodyMassKg: number,
  progress: number,
): LoadInputs => ({
  pattern: movement.pattern,
  equipment: movement.equipment,
  angleDeg: movement.angle,
  loadKg,
  bodyMassKg,
  progress,
  unilateral: movement.id === 'suitcase',
});

export function solveMovementFrame(
  movement: Movement,
  progress: number,
  loadKg: number,
  bodyMassKg: number = tissueCalibration.bodyMassKg,
): TissueFrame {
  return solveTissue(
    extractLandmarks(movement, progress),
    inputsFor(movement, loadKg, bodyMassKg, progress),
  );
}

export function simulateMovement(
  movement: Movement,
  loadKg: number,
  bodyMassKg: number = tissueCalibration.bodyMassKg,
): MovementSim {
  const n = tissueCalibration.frameCount;
  const frames = Array.from({ length: n }, (_, i) =>
    solveMovementFrame(movement, i / (n - 1), loadKg, bodyMassKg),
  );
  const meanDemand = meanMap(frames, 'demand');
  const peakDemand = Object.fromEntries(
    tissueIds.map((id) => [id, Math.max(...frames.map((f) => f.demand[id]))]),
  ) as TissueMap;
  const hottest = hottestTissue(meanDemand);
  const peakFrame = frames.reduce((a, b) =>
    a.demand[hottest] >= b.demand[hottest] ? a : b,
  );
  const peakMoments = Object.fromEntries(
    (Object.keys(frames[0].moments.peak) as JointId[]).map((j) => [
      j,
      Math.max(...frames.map((f) => f.moments.peak[j])),
    ]),
  ) as JointMoments;
  return {
    movement,
    loadKg,
    bodyMassKg,
    frames,
    meanDemand,
    peakDemand,
    meanLength: meanMap(frames, 'length'),
    peakMoments,
    hottest,
    peakImpactN: Math.max(...frames.map((f) => f.impactN)),
    peakImpactBw: Math.max(...frames.map((f) => f.impactBw)),
    peakGroundReactionN: Math.max(...frames.map((f) => f.groundReactionN)),
    strongestRegion:
      peakFrame.progress < 1 / 3
        ? 'bottom'
        : peakFrame.progress < 2 / 3
          ? 'mid'
          : 'top',
  };
}

export function frameAt(sim: MovementSim, progress: number): TissueFrame {
  const n = sim.frames.length;
  return sim.frames[Math.round(clamp(progress) * (n - 1))]!;
}

export function simulateSession(
  items: WorkoutItem[],
  bodyMassKg: number = tissueCalibration.bodyMassKg,
): SessionTissue {
  const demand = Object.fromEntries(tissueIds.map((id) => [id, 0])) as TissueMap;
  let volumeKg = 0;
  let peakImpactBw = 0;
  const rows = items.map((item) => {
    const sim = simulateMovement(item.movement, item.load, bodyMassKg);
    const volume = item.sets * item.reps;
    const loadTerm =
      item.movement.equipment === 'Bodyweight'
        ? bodyMassKg * volume
        : item.load * volume;
    volumeKg += loadTerm;
    peakImpactBw = Math.max(peakImpactBw, sim.peakImpactBw);
    for (const id of tissueIds) demand[id] += sim.meanDemand[id] * volume;
    return {
      name: item.movement.name,
      loadKg: item.load,
      hottest: sim.hottest,
      peakMomentNm: Math.max(...Object.values(sim.peakMoments)),
      impactBw: sim.peakImpactBw,
      volume,
    };
  });
  const maxDemand = Math.max(...tissueIds.map((id) => demand[id]), 1);
  for (const id of tissueIds) demand[id] /= maxDemand;
  return {
    items: rows,
    demand,
    hottest: hottestTissue(demand),
    peakImpactBw,
    volumeKg,
  };
}

export { suggestedLoadKg, tissueCalibration, muscleGroups };
export type { GroupId, TissueFrame, TissueMap, JointId };
