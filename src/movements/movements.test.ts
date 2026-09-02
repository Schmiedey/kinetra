import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import {
  catalog,
  patterns,
  validMovement,
  validLibrary,
  emptyLibrary,
} from './catalog';
import { movementPose } from './motion';
import { gripCenter } from '../components/three/anatomyRig';
describe('movement library', () => {
  it('covers every pattern with valid editable templates', () => {
    expect(new Set(catalog.map((m) => m.pattern))).toEqual(new Set(patterns));
    expect(catalog.every(validMovement)).toBe(true);
    expect(new Set(catalog.map((m) => m.id)).size).toBe(catalog.length);
  });
  it('keeps every bone matrix finite and both grip centers on their handles across the library', () => {
    for (const original of catalog)
      for (const p of [0, 0.5, 1])
        for (const stance of [0.6, 1.6]) {
          const m = { ...original, stance };
          const pose = movementPose(m, p);
          expect(pose.matrices).toHaveLength(13);
          for (const matrix of pose.matrices)
            expect(matrix.elements.every(Number.isFinite), m.name).toBe(true);
          const handMatrices =
            m.pattern === 'Horizontal press' && m.id !== 'pushup'
              ? [9, 3]
              : [9, 3];
          for (let i = 0; i < 2; i++)
            expect(
              gripCenter
                .clone()
                .applyMatrix4(pose.matrices[handMatrices[i]])
                .distanceTo(new Vector3(...pose.hands[i])),
              m.name,
            ).toBeLessThan(1e-6);
        }
  });
  it('rejects corrupt imports and preserves complete custom movement snapshots', () => {
    expect(
      validLibrary({
        ...emptyLibrary,
        custom: [{ ...catalog[0], id: 'custom', custom: true }],
      }),
    ).toBe(true);
    expect(
      validLibrary({
        ...emptyLibrary,
        custom: [{ ...catalog[0], primary: ['unknown'] }],
      }),
    ).toBe(false);
    expect(validLibrary({ ...emptyLibrary, history: [null] })).toBe(false);
    expect(validMovement({ ...catalog[0], range: NaN })).toBe(false);
  });
});
