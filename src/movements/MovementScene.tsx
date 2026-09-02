import {
  Component,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, useGLTF, Line } from '@react-three/drei';
import { Color, MeshStandardMaterial, Vector3, Quaternion } from 'three';
import { buildAnatomy } from '../components/three/AnatomicalBody';
import { applyPose } from '../components/three/anatomyRig';
import { movementPose, emphasis } from './motion';
import type { Movement, GroupId } from './catalog';
function updateMovementRig(
  rig: ReturnType<typeof buildAnatomy>,
  movement: Movement,
  progress: number,
  bones: boolean,
  selected: GroupId | null,
) {
  applyPose(rig.bones, movementPose(movement, progress).matrices);
  rig.group.updateMatrixWorld(true);
  rig.skeleton.update();
  for (const t of rig.tissues) {
    const mat = t.mesh.material as MeshStandardMaterial,
      g = t.movementGroup;
    if (!g) {
      t.mesh.visible = bones;
      continue;
    }
    const value = emphasis(movement, g, progress),
      active =
        movement.primary.includes(g as GroupId) ||
        movement.secondary.includes(g as GroupId);
    mat.color.copy(new Color('#54675a').lerp(new Color('#d3f174'), value));
    mat.emissive.copy(mat.color);
    mat.emissiveIntensity = active ? 0.15 : 0;
    mat.transparent = true;
    mat.depthWrite = false;
    mat.opacity =
      (active ? 0.86 : 0.12) * (selected && selected !== g ? 0.22 : 1);
    t.mesh.visible = true;
    t.mesh.renderOrder = 2;
  }
}
function Body({
  movement,
  progress,
  bones,
  selected,
}: {
  movement: Movement;
  progress: number;
  bones: boolean;
  selected: GroupId | null;
}) {
  const gltf = useGLTF('/models/liftlab-anatomy.glb?v=5');
  const rig = useMemo(() => buildAnatomy(gltf.scene), [gltf.scene]);
  useLayoutEffect(() => {
    updateMovementRig(rig, movement, progress, bones, selected);
  }, [rig, movement, progress, bones, selected]);
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
  return <primitive object={rig.group} dispose={null} />;
}
function Rod({
  a,
  b,
  r = 0.015,
  color = '#adb6af',
}: {
  a: number[];
  b: number[];
  r?: number;
  color?: string;
}) {
  const start = new Vector3(...a),
    end = new Vector3(...b),
    delta = end.clone().sub(start);
  return (
    <mesh
      position={start.add(end).multiplyScalar(0.5)}
      quaternion={new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        delta.clone().normalize(),
      )}
    >
      <cylinderGeometry args={[r, r, delta.length(), 12]} />
      <meshStandardMaterial color={color} metalness={0.65} roughness={0.3} />
    </mesh>
  );
}
function Equipment({
  movement,
  progress,
}: {
  movement: Movement;
  progress: number;
}) {
  const pose = movementPose(movement, progress);
  const [a, b] = pose.hands;
  const equipment = movement.equipment;
  const bar =
    equipment === 'Barbell' ||
    (equipment === 'Bodyweight' && movement.pattern === 'Vertical pull');
  return (
    <>
      {bar && (
        <>
          <Rod
            a={[Math.min(a[0], b[0]) - 0.43, a[1], a[2]]}
            b={[Math.max(a[0], b[0]) + 0.43, b[1], b[2]]}
          />
          {equipment === 'Barbell' &&
            [-1, 1].map((side) => (
              <Rod
                key={side}
                a={[side * (Math.abs(a[0]) + 0.25), a[1], a[2]]}
                b={[side * (Math.abs(a[0]) + 0.34), a[1], a[2]]}
                r={0.15}
                color="#293a31"
              />
            ))}
        </>
      )}
      {equipment === 'Dumbbells' &&
        pose.hands.map((p, i) => (
          <group key={i}>
            <Rod
              a={[p[0] - 0.075, p[1], p[2]]}
              b={[p[0] + 0.075, p[1], p[2]]}
            />
            {[-1, 1].map((s) => (
              <Rod
                key={s}
                a={[p[0] + s * 0.075, p[1], p[2]]}
                b={[p[0] + s * 0.115, p[1], p[2]]}
                r={0.065}
                color="#33463b"
              />
            ))}
          </group>
        ))}
      {equipment === 'Kettlebell' &&
        pose.hands
          .filter((_, i) => movement.pattern !== 'Carry' || i === 0)
          .map((p, i) => (
            <group key={i}>
              <Rod
                a={[p[0] - 0.065, p[1], p[2]]}
                b={[p[0] + 0.065, p[1], p[2]]}
              />
              <mesh position={[p[0], p[1] - 0.09, p[2]]}>
                <sphereGeometry args={[0.065, 16, 12]} />
                <meshStandardMaterial color="#485f4a" />
              </mesh>
            </group>
          ))}
      {['Cable', 'Band', 'Machine'].includes(equipment) &&
        pose.hands.map((p, i) => (
          <group key={i}>
            <Rod a={[p[0] - 0.06, p[1], p[2]]} b={[p[0] + 0.06, p[1], p[2]]} />
            <Line
              points={[
                p,
                [
                  p[0],
                  movement.pattern === 'Vertical pull'
                    ? 2.3
                    : movement.pattern === 'Elbow extension'
                      ? 2.1
                      : 0.15,
                  0.9,
                ],
              ]}
              color={equipment === 'Band' ? '#b0ce61' : '#708478'}
              lineWidth={1}
            />
          </group>
        ))}
      {(pose.bench || pose.seated) && (
        <mesh
          position={[0, pose.seated ? 0.52 : 0.46, pose.seated ? 0 : 0.1]}
          rotation={[
            movement.pattern === 'Horizontal press'
              ? (-movement.angle * Math.PI) / 180
              : 0,
            0,
            0,
          ]}
        >
          <boxGeometry args={[0.3, 0.08, pose.seated ? 0.42 : 1.15]} />
          <meshStandardMaterial color="#293f32" roughness={0.9} />
        </mesh>
      )}
    </>
  );
}
function Camera({ view }: { view: string }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(
      ...((view === 'Front'
        ? [0, 1.25, 3.6]
        : view === 'Side'
          ? [3.6, 1.3, 0]
          : view === 'Back'
            ? [0, 1.3, -3.6]
            : [2.5, 1.9, 2.9]) as [number, number, number]),
    );
    camera.lookAt(0, 0.95, 0);
  }, [camera, view]);
  return null;
}
class Boundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="page-loading">
        3D preview unavailable. The movement details and workout tools remain
        available.
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function MovementScene(props: {
  movement: Movement;
  progress: number;
  bones: boolean;
  selected: GroupId | null;
  view: string;
}) {
  return (
    <Boundary>
      <Canvas camera={{ position: [2.5, 1.9, 2.9], fov: 40 }} dpr={[1, 1.5]}>
        <color attach="background" args={['#101d16']} />
        <ambientLight intensity={1.7} />
        <directionalLight position={[3, 5, 2]} intensity={2.4} />
        <directionalLight position={[-3, 2, -2]} intensity={1} />
        <Camera view={props.view} />
        <Suspense fallback={null}>
          <Body {...props} />
          <Equipment movement={props.movement} progress={props.progress} />
        </Suspense>
        <Grid
          args={[8, 8]}
          position={[0, 0.015, 0]}
          cellSize={0.25}
          cellThickness={0.4}
          cellColor="#2a3a2f"
          sectionColor="#3a5140"
          fadeDistance={6}
        />
        <OrbitControls
          makeDefault
          target={[0, 0.95, 0]}
          minDistance={0.7}
          maxDistance={6}
        />
      </Canvas>
    </Boundary>
  );
}
