import type { MeshStandardMaterial, SkinnedMesh } from 'three';

const shellColor = '#8f6a5c';
const boneColor = '#9a9588';

/** Bone meshes fill gaps the muscle atlas does not cover (skull, hands, feet). */
export function applyBoneVisibility(
  mesh: SkinnedMesh,
  material: MeshStandardMaterial,
  bonesVisible: boolean,
) {
  const showShell = !bonesVisible;

  material.color.set(showShell ? shellColor : boneColor);
  material.emissive.set('#000000');
  material.emissiveIntensity = 0;
  material.transparent = true;
  material.opacity = showShell ? 0.94 : 0.22;
  material.depthWrite = showShell;
  mesh.visible = true;
  mesh.renderOrder = showShell ? 1 : 0;
}
