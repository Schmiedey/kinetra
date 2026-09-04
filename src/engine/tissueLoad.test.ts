import { describe, expect, it } from 'vitest';
import {
  externalForces,
  solveTissue,
  suggestedLoadKg,
  type PoseLandmarks,
} from './tissueLoad';
import { catalog } from '../movements/catalog';
import { simulateMovement } from '../movements/simulateMovement';

const side = (
  x: number,
  hipZ = -0.08,
  kneeZ = 0.18,
  wrist: [number, number, number] = [x * 0.22, 1.12, 0.32],
) => ({
  shoulder: [x * 0.2, 1.42, 0] as [number, number, number],
  elbow: [x * 0.22, 1.12, 0.04] as [number, number, number],
  wrist,
  hip: [x * 0.09, 0.94, hipZ] as [number, number, number],
  knee: [x * 0.1, 0.5, kneeZ] as [number, number, number],
  ankle: [x * 0.1, 0.08, 0] as [number, number, number],
});
const pose = (hipZ = -0.08, kneeZ = 0.18, wristY = 1.12): PoseLandmarks => ({
  left: side(1, hipZ, kneeZ, [0.22, wristY, 0.32]),
  right: side(-1, hipZ, kneeZ, [-0.22, wristY, 0.32]),
});

describe('load / impact model', () => {
  it('computes elbow moment from r × F and scales with load', () => {
    const light = solveTissue(pose(), {
      pattern: 'Elbow flexion',
      equipment: 'Dumbbells',
      angleDeg: 0,
      loadKg: 20,
      bodyMassKg: 78,
      progress: 0.5,
    });
    const heavy = solveTissue(pose(), {
      pattern: 'Elbow flexion',
      equipment: 'Dumbbells',
      angleDeg: 0,
      loadKg: 40,
      bodyMassKg: 78,
      progress: 0.5,
    });
    expect(light.moments.peak.elbow).toBeGreaterThan(10);
    expect(heavy.moments.peak.elbow / light.moments.peak.elbow).toBeCloseTo(2, 1);
    expect(heavy.demand.biceps).toBeGreaterThan(light.demand.biceps);
  });

  it('puts zero external moment on a curl with no load', () => {
    const empty = solveTissue(pose(), {
      pattern: 'Elbow flexion',
      equipment: 'Dumbbells',
      angleDeg: 0,
      loadKg: 0,
      bodyMassKg: 78,
      progress: 0.5,
    });
    expect(empty.moments.peak.elbow).toBeLessThan(1);
    expect(empty.demand.biceps).toBeLessThan(0.05);
  });

  it('uses ground reaction for squats so body mass still loads the legs', () => {
    const bw = solveTissue(pose(-0.12, 0.22), {
      pattern: 'Squat',
      equipment: 'Barbell',
      angleDeg: 0,
      loadKg: 0,
      bodyMassKg: 78,
      progress: 0.5,
    });
    const loaded = solveTissue(pose(-0.12, 0.22), {
      pattern: 'Squat',
      equipment: 'Barbell',
      angleDeg: 0,
      loadKg: 80,
      bodyMassKg: 78,
      progress: 0.5,
    });
    expect(bw.groundReactionN).toBeCloseTo(78 * 9.81, 0);
    expect(loaded.groundReactionN).toBeGreaterThan(bw.groundReactionN);
    expect(loaded.moments.peak.knee).toBeGreaterThan(bw.moments.peak.knee);
    expect(loaded.impactBw).toBeGreaterThan(bw.impactBw);
    expect(loaded.demand.quads).toBeGreaterThan(loaded.demand.biceps);
  });

  it('loads the hip more than the knee when the hip sits behind the midfoot', () => {
    const hinge = solveTissue(pose(-0.28, 0.04), {
      pattern: 'Hinge',
      equipment: 'Barbell',
      angleDeg: 0,
      loadKg: 100,
      bodyMassKg: 78,
      progress: 0.5,
    });
    expect(hinge.moments.peak.hip).toBeGreaterThan(hinge.moments.peak.knee);
    expect(hinge.demand.hamstrings + hinge.demand.glutes).toBeGreaterThan(
      hinge.demand.quads,
    );
  });

  it('applies vertical load at the hands for a press, not a ground reaction', () => {
    const forces = externalForces(pose(0, 0.05, 1.35), {
      pattern: 'Horizontal press',
      equipment: 'Barbell',
      angleDeg: 0,
      loadKg: 60,
      bodyMassKg: 78,
      progress: 0.2,
    });
    expect(forces.every((f) => f.kind === 'load')).toBe(true);
    expect(forces.reduce((s, f) => s + f.force[1], 0)).toBeCloseTo(-60 * 9.81, 5);
  });
});

describe('catalog movement simulation', () => {
  it('returns finite load, moment and muscle demand for every template', () => {
    for (const movement of catalog) {
      const sim = simulateMovement(
        movement,
        suggestedLoadKg(movement.pattern, movement.equipment),
        78,
      );
      expect(sim.frames).toHaveLength(33);
      expect(Number.isFinite(sim.peakImpactN), movement.name).toBe(true);
      expect(Number.isFinite(sim.peakImpactBw), movement.name).toBe(true);
      expect(sim.hottest, movement.name).toBeTruthy();
      for (const frame of sim.frames) {
        expect(Number.isFinite(frame.peakMomentNm), movement.name).toBe(true);
        expect(frame.forces.length, movement.name).toBeGreaterThan(0);
      }
    }
  });

  it('puts chest on a bench press, quads on a squat, lats on a pulldown, biceps on a curl', () => {
    const bench = catalog.find((m) => m.id === 'bench')!;
    const squat = catalog.find((m) => m.id === 'back-squat')!;
    const pull = catalog.find((m) => m.id === 'pulldown')!;
    const curl = catalog.find((m) => m.pattern === 'Elbow flexion')!;
    expect(simulateMovement(bench, 60).hottest).toBe('chest');
    expect(['quads', 'glutes']).toContain(simulateMovement(squat, 80).hottest);
    expect(['lats', 'biceps']).toContain(simulateMovement(pull, 45).hottest);
    expect(simulateMovement(curl, 22).hottest).toBe('biceps');
    const benchFrame = simulateMovement(bench, 60).frames[10]!;
    expect(benchFrame.moments.peak.ankle).toBe(0);
    expect(benchFrame.moments.peak.knee).toBe(0);
    expect(['shoulder', 'elbow']).toContain(benchFrame.peakMomentJoint);
  });
});
