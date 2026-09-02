import { describe, it, expect } from 'vitest';
import { simulate, frameAt, sanitizeConfig } from './simulate';
import { defaultConfig as c } from '../exercises/benchPress';
import { genericBody } from './anthropometry';
import { norm, sub } from './vector';
import { externalMoment } from './jointMoments';
const base = simulate(c);
describe('bench mechanics', () => {
  it('uses 101 synchronized frames', () => {
    expect(base.frames).toHaveLength(101);
    expect(frameAt(base, 0.32)).toBe(base.frames[32]);
  });
  it('computes known vector cross products in Nm', () => {
    expect(externalMoment([0, 0, 0], [0.3, 0.5, 0], [0, -100, 0])).toBeCloseTo(
      30,
    );
  });
  it('doubles external moments when load doubles', () => {
    const heavy = simulate({ ...c, loadKg: c.loadKg * 2 });
    expect(heavy.peakShoulderMomentNm).toBeCloseTo(
      base.peakShoulderMomentNm * 2,
    );
    expect(heavy.peakElbowMomentNm).toBeCloseTo(base.peakElbowMomentNm * 2);
  });
  it('narrow grip raises relative elbow demand and wide grip raises shoulder demand', () => {
    const narrow = simulate({ ...c, gripWidthRatio: 1 }),
      wide = simulate({ ...c, gripWidthRatio: 2.2 });
    expect(
      narrow.averageElbowMomentNm / narrow.averageShoulderMomentNm,
    ).toBeGreaterThan(wide.averageElbowMomentNm / wide.averageShoulderMomentNm);
    expect(wide.averageShoulderMomentNm).toBeGreaterThan(
      narrow.averageShoulderMomentNm,
    );
    expect(
      narrow.muscles.find((m) => m.id === 'triceps')!.mechanicalDemand,
    ).toBeGreaterThan(
      wide.muscles.find((m) => m.id === 'triceps')!.mechanicalDemand,
    );
  });
  it('incline shifts relative pec emphasis clavicularly and increases relative delt contribution', () => {
    const incl = simulate({ ...c, benchAngleDeg: 45 });
    const ratio = (r: typeof base, a: string, b: string) =>
      r.muscles.find((m) => m.id === a)!.mechanicalDemand /
      r.muscles.find((m) => m.id === b)!.mechanicalDemand;
    expect(ratio(incl, 'pecClavicular', 'pecSternal')).toBeGreaterThan(
      ratio(base, 'pecClavicular', 'pecSternal'),
    );
    expect(ratio(incl, 'anteriorDelt', 'pecSternal')).toBeGreaterThan(
      ratio(base, 'anteriorDelt', 'pecSternal'),
    );
  });
  it('reducing ROM reduces loaded excursion', () =>
    expect(simulate({ ...c, romPercent: 40 }).loadedExcursionM).toBeLessThan(
      base.loadedExcursionM,
    ));
  it('zero external load creates no external demand or stimulus', () => {
    const r = simulate({ ...c, loadKg: 0 });
    expect(r.peakElbowMomentNm).toBe(0);
    r.muscles.forEach((m) => expect(m.estimatedStimulus).toBe(0));
  });
  it('effort changes stimulus without changing mechanics', () => {
    const easy = simulate({ ...c, rir: 5 });
    expect(easy.frames).toEqual(base.frames);
    expect(easy.muscles[0].estimatedStimulus).toBeLessThan(
      base.muscles[0].estimatedStimulus,
    );
  });
  it('repetitions are set context, never an unsupported stimulus multiplier', () =>
    expect(simulate({ ...c, reps: 20 }).muscles).toEqual(base.muscles));
  it('validates nonfinite and out-of-range input', () => {
    expect(
      sanitizeConfig({ ...c, loadKg: Infinity, benchAngleDeg: 800 }).loadKg,
    ).toBe(c.loadKg);
    expect(sanitizeConfig({ ...c, benchAngleDeg: 800 }).benchAngleDeg).toBe(60);
  });
  it('preserves bone lengths, symmetry, hand attachment and finite bounded outputs throughout extreme combinations', () => {
    for (const benchAngleDeg of [-20, 0, 60])
      for (const gripWidthRatio of [1, 1.6, 2.2])
        for (const elbowFlareDeg of [20, 90])
          for (const romPercent of [40, 110])
            for (const barPathCurve of [0, 1]) {
              const r = simulate({
                ...c,
                benchAngleDeg,
                gripWidthRatio,
                elbowFlareDeg,
                romPercent,
                barPathCurve,
              });
              const check = (v: unknown): void => {
                if (typeof v === 'number')
                  expect(Number.isFinite(v)).toBe(true);
                else if (v && typeof v === 'object')
                  Object.values(v).forEach(check);
              };
              check(r);
              for (const f of r.frames) {
                expect(
                  norm(sub(f.joints.rightElbow, f.joints.rightShoulder)),
                ).toBeCloseTo(genericBody.upperArmLengthCm / 100, 5);
                expect(
                  norm(sub(f.joints.rightHand, f.joints.rightElbow)),
                ).toBeCloseTo(genericBody.forearmLengthCm / 100, 5);
                expect(f.joints.rightHand[1]).toBeCloseTo(f.barPosition[1], 5);
                expect(f.joints.leftHand[0]).toBeCloseTo(
                  -f.joints.rightHand[0],
                  5,
                );
                for (const x of [
                  ...Object.values(f.muscleLengths),
                  ...Object.values(f.muscleDemand),
                ]) {
                  expect(x).toBeGreaterThanOrEqual(0);
                  expect(x).toBeLessThanOrEqual(1);
                }
              }
              r.muscles.forEach((m) => {
                expect(m.estimatedStimulus).toBeGreaterThanOrEqual(0);
                expect(m.estimatedStimulus).toBeLessThanOrEqual(100);
              });
            }
  });
});
