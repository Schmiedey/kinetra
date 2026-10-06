import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { Vector3 } from 'three';
import { buildAnatomy } from './AnatomicalBody';
import {
  bindMatrices,
  poseMatrices,
  sourceLandmarks,
  muscleAppearance,
  applyPose,
  gripCenter,
} from './anatomyRig';
import { simulate } from '../../engine/simulate';
import { defaultConfig } from '../../exercises/benchPress';
import { muscles } from '../../data/muscles';
const manifest = JSON.parse(
  readFileSync('public/models/manifest.json', 'utf8'),
);
const raw = readFileSync('public/models/kinetra-anatomy.glb');
const gltf = await new GLTFLoader()
  .setMeshoptDecoder(MeshoptDecoder)
  .parseAsync(
    raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength),
    '',
  );
describe('sourced anatomical geometry and live rig', () => {
  it('ships the claimed sourced meshes with licensed provenance', () => {
    expect(manifest.counts.bones).toBe(200);
    expect(manifest.counts.muscles).toBeGreaterThan(200);
    expect(manifest.groups.length).toBeGreaterThan(50);
    expect(manifest.componentLicenses).toEqual({
      bp3d: 'CC BY-SA 2.1 Japan',
      'z-anatomy': 'CC BY-SA 4.0',
    });
    for (const group of manifest.groups) {
      expect(group.sourceVertexCount).toBeGreaterThan(80);
      for (const mapping of group.sourceMappings)
        expect(['bp3d', 'z-anatomy']).toContain(mapping.source);
    }
  });
  it('binds real vertex geometry to normalized anatomical skin weights', () => {
    const rig = buildAnatomy(gltf.scene);
    expect(rig.tissues.filter((t) => t.id)).toHaveLength(8);
    expect(new Set(rig.tissues.map((t) => t.id).filter(Boolean))).toEqual(
      new Set(muscles.map((m) => m.id)),
    );
    for (const t of rig.tissues) {
      const w = t.mesh.geometry.getAttribute('skinWeight');
      for (let i = 0; i < w.count; i += 13)
        expect(w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i)).toBeCloseTo(1, 5);
    }
  });
  it('keeps anatomical shoulder and elbow joints coincident with the engine under different angles and grips', () => {
    const inverse = bindMatrices().map((m) => m.clone().invert());
    for (const benchAngleDeg of [-20, 0, 60])
      for (const gripWidthRatio of [1, 2.2]) {
        const result = simulate({
          ...defaultConfig,
          benchAngleDeg,
          gripWidthRatio,
        });
        for (const frame of [
          result.frames[0],
          result.frames[50],
          result.frames[100],
        ]) {
          const pose = poseMatrices(result.config, frame);
          for (const side of [1, -1] as const) {
            const s = sourceLandmarks(side),
              u = side === 1 ? 1 : 7,
              f = u + 1;
            const shoulder = new Vector3(...s.shoulder)
              .applyMatrix4(inverse[u])
              .applyMatrix4(pose[u]);
            const elbow1 = new Vector3(...s.elbow)
              .applyMatrix4(inverse[u])
              .applyMatrix4(pose[u]);
            const elbow2 = new Vector3(...s.elbow)
              .applyMatrix4(inverse[f])
              .applyMatrix4(pose[f]);
            const contact = new Vector3(...s.wrist)
              .add(gripCenter)
              .applyMatrix4(inverse[f + 1])
              .applyMatrix4(pose[f + 1]);
            expect(
              contact.distanceTo(
                new Vector3(
                  ...(side === 1
                    ? frame.joints.rightHand
                    : frame.joints.leftHand),
                ),
              ),
            ).toBeLessThan(1e-6);
            expect(
              shoulder.distanceTo(
                new Vector3(
                  ...(side === 1
                    ? frame.joints.rightShoulder
                    : frame.joints.leftShoulder),
                ),
              ),
            ).toBeLessThan(1e-6);
            expect(elbow1.distanceTo(elbow2)).toBeLessThan(1e-6);
            expect(
              elbow1.distanceTo(
                new Vector3(
                  ...(side === 1
                    ? frame.joints.rightElbow
                    : frame.joints.leftElbow),
                ),
              ),
            ).toBeLessThan(1e-6);
          }
        }
      }
  });
  it('produces finite skinned surfaces in the bench viewport at extreme poses', () => {
    const rig = buildAnatomy(gltf.scene);
    for (const benchAngleDeg of [-20, 60])
      for (const gripWidthRatio of [1, 2.2]) {
        const result = simulate({
          ...defaultConfig,
          benchAngleDeg,
          gripWidthRatio,
        });
        for (const frame of [result.frames[0], result.frames[100]]) {
          applyPose(rig.bones, poseMatrices(result.config, frame));
          rig.group.updateMatrixWorld(true);
          rig.skeleton.update();
          for (const t of rig.tissues) {
            const p = t.mesh.geometry.getAttribute('position');
            for (let i = 0; i < p.count; i += 127) {
              const v = new Vector3().fromBufferAttribute(p, i);
              t.mesh.applyBoneTransform(i, v);
              expect(v.toArray().every(Number.isFinite)).toBe(true);
              expect(Math.abs(v.x)).toBeLessThan(1.4);
              expect(v.y).toBeGreaterThan(-0.1);
              expect(v.y).toBeLessThan(2.5);
              expect(Math.abs(v.z)).toBeLessThan(1.8);
            }
          }
        }
      }
  });
  it('changes live highlights with rep position and incline; zero load has zero modeled demand', () => {
    const flat = simulate(defaultConfig),
      incline = simulate({ ...defaultConfig, benchAngleDeg: 45 }),
      zero = simulate({ ...defaultConfig, loadKg: 0 });
    const bottom = muscleAppearance(
      'pecSternal',
      'demand',
      flat.frames[0],
      flat,
    );
    const top = muscleAppearance(
      'pecSternal',
      'demand',
      flat.frames[100],
      flat,
    );
    expect(bottom.color.getHex()).not.toBe(top.color.getHex());
    expect(
      muscleAppearance(
        'pecClavicular',
        'demand',
        incline.frames[30],
        incline,
      ).color.getHex(),
    ).not.toBe(
      muscleAppearance(
        'pecClavicular',
        'demand',
        flat.frames[30],
        flat,
      ).color.getHex(),
    );
    muscles.forEach((m) =>
      expect(muscleAppearance(m.id, 'demand', zero.frames[0], zero).value).toBe(
        0,
      ),
    );
  });
});
