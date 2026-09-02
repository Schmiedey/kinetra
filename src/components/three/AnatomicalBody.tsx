import { useMemo, useEffect, useLayoutEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import {
  Bone,
  Skeleton,
  SkinnedMesh,
  Group,
  Mesh,
  MeshStandardMaterial,
  Float32BufferAttribute,
  Uint16BufferAttribute,
  Matrix4,
  Sphere,
  Vector3,
  DoubleSide,
} from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type {
  BenchConfig,
  SimulationResult,
  SimulationFrame,
  VisualizationMode,
  MuscleId,
  Vec3,
} from '../../engine/types';
import { useSimulationStore } from '../../store/useSimulationStore';
import {
  rigNames,
  bindMatrices,
  poseMatrices,
  applyPose,
  vertexWeights,
  muscleAppearance,
} from './anatomyRig';
interface Tissue {
  mesh: SkinnedMesh;
  id: MuscleId | null;
  movementGroup: string | null;
  name: string;
}
export function buildAnatomy(source: Group) {
  const group = new Group();
  const bones = rigNames.map((name) => {
    const b = new Bone();
    b.name = name;
    return b;
  });
  const bind = bindMatrices();
  applyPose(bones, bind);
  bones.forEach((b) => group.add(b));
  group.updateMatrixWorld(true);
  const skeleton = new Skeleton(
    bones,
    bind.map((m) => m.clone().invert()),
  );
  const tissues: Tissue[] = [];
  source.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const meta = child.userData;
    const id = (meta.muscleId ?? null) as MuscleId | null;
    const geometry = child.geometry.clone();
    const positions = geometry.getAttribute('position');
    const indices: number[] = [],
      weights: number[] = [];
    for (let i = 0; i < positions.count; i++) {
      if (id) {
        const skin = vertexWeights(
          [positions.getX(i), positions.getY(i), positions.getZ(i)] as Vec3,
          id,
          meta.side === 'left',
        );
        indices.push(...skin.indices);
        weights.push(...skin.weights);
      } else if (meta.type === 'muscle') {
        const upper = meta.side === 'left' ? 1 : 7;
        const thigh = meta.side === 'left' ? 4 : 10;
        const group = meta.movementGroup;
        const index = ['biceps', 'sideDelts', 'rearDelts'].includes(group)
          ? upper
          : ['quads', 'hamstrings'].includes(group)
            ? thigh
            : group === 'calves'
              ? thigh + 1
              : 0;
        const blend = group === 'glutes' ? 0.35 : 0;
        indices.push(index, thigh, 0, 0);
        weights.push(1 - blend, blend, 0, 0);
      } else {
        const index = rigNames.indexOf(meta.rigId);
        if (index < 0)
          throw new Error(`Unmapped anatomical bone group ${meta.rigId}`);
        indices.push(index, 0, 0, 0);
        weights.push(1, 0, 0, 0);
      }
    }
    geometry.setAttribute('skinIndex', new Uint16BufferAttribute(indices, 4));
    geometry.setAttribute('skinWeight', new Float32BufferAttribute(weights, 4));
    geometry.computeVertexNormals();
    const material = new MeshStandardMaterial({
      color: id ? '#788077' : '#c9c9b5',
      roughness: id ? 0.52 : 0.7,
      metalness: 0,
      side: DoubleSide,
      transparent: !!id,
      opacity: id ? 0.76 : 1,
      depthWrite: !id,
    });
    const mesh = new SkinnedMesh(geometry, material);
    mesh.name = child.name;
    mesh.frustumCulled = false;
    // Conservative pose-independent bound keeps ray picking valid as the rig moves.
    mesh.boundingSphere = new Sphere(new Vector3(0, 0.8, 0.2), 2.7);
    if (!id) mesh.raycast = () => {};
    mesh.castShadow = !id;
    mesh.receiveShadow = true;
    mesh.bind(skeleton, new Matrix4());
    mesh.bindMode = 'detached';
    mesh.userData = { ...meta };
    mesh.renderOrder = id ? 2 : 0;
    group.add(mesh);
    tissues.push({
      mesh,
      id,
      movementGroup: meta.movementGroup ?? null,
      name: (meta.sourceNames as string[]).join('; '),
    });
  });
  return { group, bones, skeleton, tissues };
}
function updateAnatomy(
  rig: ReturnType<typeof buildAnatomy>,
  config: BenchConfig,
  frame: SimulationFrame,
  result: SimulationResult,
  mode: VisualizationMode,
  selected: MuscleId | null,
  opacity: number,
  bonesVisible: boolean,
) {
  applyPose(rig.bones, poseMatrices(config, frame));
  rig.group.updateMatrixWorld(true);
  rig.skeleton.update();
  for (const tissue of rig.tissues) {
    const material = tissue.mesh.material as MeshStandardMaterial;
    if (!tissue.id && tissue.movementGroup) {
      tissue.mesh.visible = false;
      continue;
    }
    if (!tissue.id) {
      tissue.mesh.visible = bonesVisible;
      continue;
    }
    const appearance = muscleAppearance(tissue.id, mode, frame, result);
    material.color.copy(appearance.color);
    material.emissive.copy(appearance.color);
    material.emissiveIntensity =
      selected === tissue.id ? 0.45 : 0.04 + appearance.value * 0.2;
    material.opacity = opacity * (selected && selected !== tissue.id ? 0.3 : 1);
    tissue.mesh.visible = opacity > 0.01;
  }
}
export default function AnatomicalBody({
  config,
  result,
  frame,
  mode,
}: {
  config: BenchConfig;
  result: SimulationResult;
  frame: SimulationFrame;
  mode: VisualizationMode;
}) {
  const gltf = useGLTF('/models/liftlab-anatomy.glb?v=5');
  const rig = useMemo(() => buildAnatomy(gltf.scene), [gltf.scene]);
  const selected = useSimulationStore((s) => s.selectedMuscle),
    opacity = useSimulationStore((s) => s.muscleOpacity),
    bonesVisible = useSimulationStore((s) => s.bonesVisible);
  useLayoutEffect(() => {
    updateAnatomy(
      rig,
      config,
      frame,
      result,
      mode,
      selected,
      opacity,
      bonesVisible,
    );
  }, [rig, config, frame, result, mode, selected, opacity, bonesVisible]);
  useEffect(
    () => () => {
      rig.tissues.forEach((t) => {
        t.mesh.geometry.dispose();
        (t.mesh.material as MeshStandardMaterial).dispose();
      });
      rig.skeleton.dispose();
    },
    [rig],
  );
  const pick = (event: ThreeEvent<MouseEvent>) => {
    const id = event.object.userData.muscleId as MuscleId | undefined;
    if (!id) return;
    event.stopPropagation();
    useSimulationStore.setState({
      selectedMuscle:
        useSimulationStore.getState().selectedMuscle === id ? null : id,
    });
  };
  return <primitive object={rig.group} onClick={pick} dispose={null} />;
}
if (typeof window !== 'undefined')
  useGLTF.preload('/models/liftlab-anatomy.glb?v=5');
