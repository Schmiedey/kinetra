import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { rename, stat } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Encode the original floating-point geometry without quantizing or simplifying it.
const input = process.argv[2] ?? 'public/models/kinetra-anatomy.glb';
const output = `${input}.compressed.glb`;
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression])
  .registerDependencies({
    'meshopt.encoder': MeshoptEncoder,
    'meshopt.decoder': MeshoptDecoder,
  });
const document = await io.read(input);
const original = await io.read(input);
document.getRoot().getAsset().generator =
  'Kinetra anatomical extraction; lossless Meshopt encoding';
document
  .createExtension(EXTMeshoptCompression)
  .setRequired(true)
  .setEncoderOptions({
    method: EXTMeshoptCompression.EncoderMethod.QUANTIZE,
  });
await io.write(output, document);
const decoded = await io.read(output);
const meshes = decoded.getRoot().listMeshes();
for (const source of original.getRoot().listMeshes()) {
  const target = meshes.find((mesh) => mesh.getName() === source.getName());
  assert.ok(target, `Missing anatomical mesh ${source.getName()}`);
  for (const [index, primitive] of source.listPrimitives().entries()) {
    const other = target.listPrimitives()[index];
    for (const semantic of primitive.listSemantics()) {
      const before = primitive.getAttribute(semantic).getArray();
      const after = other.getAttribute(semantic).getArray();
      assert.equal(before.length, after.length);
      for (let i = 0; i < before.length; i++) assert.equal(before[i], after[i]);
    }
    const before = primitive.getIndices().getArray();
    const after = other.getIndices().getArray();
    assert.equal(before.length, after.length);
    for (let i = 0; i < before.length; i += 3) {
      // Index encoding can rotate a triangle's corners, preserving its winding.
      const a = [before[i], before[i + 1], before[i + 2]];
      const b = [after[i], after[i + 1], after[i + 2]];
      assert.ok(
        [0, 1, 2].some((offset) =>
          a.every((value, j) => value === b[(offset + j) % 3]),
        ),
        `Triangle mismatch in ${source.getName()} at ${i}: ${a} / ${b}`,
      );
    }
  }
}
const beforeNodes = original.getRoot().listNodes();
for (const node of beforeNodes) {
  const other = decoded
    .getRoot()
    .listNodes()
    .find((n) => n.getName() === node.getName());
  assert.deepEqual(other?.getExtras(), node.getExtras());
  assert.deepEqual(other?.getMatrix(), node.getMatrix());
}
const size = (await stat(output)).size;
assert.ok(size < 25 * 1024 * 1024, 'Anatomy asset must fit the hosting limit.');
await rename(output, input);
console.log(
  `Lossless anatomy encoding verified: ${meshes.length} meshes, ${(size / 1024 / 1024).toFixed(1)} MiB.`,
);
