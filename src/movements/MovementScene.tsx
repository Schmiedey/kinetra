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
import { applyBoneVisibility } from '../components/three/anatomyVisibility';
import { movementPose } from './motion';
import type { Movement, GroupId } from './catalog';
import { muscleGroups } from './catalog';
import { benchOrigin } from '../engine/anthropometry';
import type { ForceApplication, TissueMap } from '../engine/tissueLoad';
import { norm } from '../engine/vector';

const cold = new Color('#a56b58');
const hot = new Color('#ff4e12');

function updateMovementRig(
  rig: ReturnType<typeof buildAnatomy>,
  movement: Movement,
  progress: number,
  bones: boolean,
  selected: GroupId | null,
  demand: TissueMap,
) {
  applyPose(rig.bones, movementPose(movement, progress).matrices);
  rig.group.updateMatrixWorld(true);
  rig.skeleton.update();
  for (const t of rig.tissues) {
    const mat = t.mesh.material as MeshStandardMaterial,
      g = t.movementGroup;
    if (!g) {
      applyBoneVisibility(t.mesh, mat, bones);
      continue;
    }
    const value = demand[g as GroupId] ?? 0;
    if (!(g in muscleGroups)) {
      mat.color.set('#c48972');
      mat.emissive.set('#3a241c');
      mat.emissiveIntensity = 0.12;
      mat.transparent = false;
      mat.depthWrite = true;
      mat.opacity = 1;
      t.mesh.visible = true;
      t.mesh.renderOrder = 2;
      continue;
    }
    mat.color.copy(cold.clone().lerp(hot, value));
    mat.emissive.copy(mat.color);
    mat.emissiveIntensity = 0.04 + value * 0.42;
    mat.transparent = true;
    mat.depthWrite = true;
    mat.opacity = selected && selected !== g ? 0.12 : 0.96;
    t.mesh.visible = true;
    t.mesh.renderOrder = 2;
  }
}

function Body({
  movement,
  progress,
  bones,
  selected,
  demand,
}: {
  movement: Movement;
  progress: number;
  bones: boolean;
  selected: GroupId | null;
  demand: TissueMap;
}) {
  const gltf = useGLTF('/models/liftlab-anatomy.glb?v=7');
  const rig = useMemo(() => buildAnatomy(gltf.scene), [gltf.scene]);
  useLayoutEffect(() => {
    updateMovementRig(rig, movement, progress, bones, selected, demand);
  }, [rig, movement, progress, bones, selected, demand]);
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
  r = 0.014,
  color = '#6d7170',
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
      <meshStandardMaterial color={color} metalness={0.72} roughness={0.28} />
    </mesh>
  );
}

function ForceMark({ app }: { app: ForceApplication }) {
  const mag = norm(app.force);
  if (mag < 12) return null;
  const dir = new Vector3(...app.force).normalize();
  const len = Math.min(0.62, 0.1 + mag / 1600);
  const origin = new Vector3(...app.at);
  const mid = origin.clone().add(dir.clone().multiplyScalar(len * 0.45));
  const tip = origin.clone().add(dir.clone().multiplyScalar(len));
  const color = app.kind === 'load' ? '#ff6a1a' : '#9aa4a8';
  return (
    <group>
      <mesh
        position={mid}
        quaternion={new Quaternion().setFromUnitVectors(
          new Vector3(0, 1, 0),
          dir,
        )}
      >
        <cylinderGeometry args={[0.008, 0.008, len * 0.9, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh
        position={tip}
        quaternion={new Quaternion().setFromUnitVectors(
          new Vector3(0, 1, 0),
          dir,
        )}
      >
        <coneGeometry args={[0.022, 0.06, 10]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

function PressBench({ angle }: { angle: number }) {
  return (
    <group position={benchOrigin} rotation={[(angle * Math.PI) / 180, 0, 0]}>
      <mesh position={[0, -0.02, -0.38]}>
        <boxGeometry args={[0.34, 0.095, 1.12]} />
        <meshStandardMaterial color="#1c1e1b" roughness={0.92} />
      </mesh>
      {[-0.3, 0.45].map((z) => (
        <group key={z}>
          <Rod a={[0, -0.5, z]} b={[0, -0.08, z]} r={0.02} color="#4a4e4c" />
          <Rod
            a={[-0.27, -0.5, z]}
            b={[0.27, -0.5, z]}
            r={0.02}
            color="#4a4e4c"
          />
        </group>
      ))}
    </group>
  );
}

function HipThrustBench() {
  return (
    <group position={[0, 0.42, 0.28]}>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.36, 0.12, 0.54]} />
        <meshStandardMaterial color="#1c1e1b" roughness={0.92} />
      </mesh>
      {[-0.19, 0.19].map((x) => (
        <Rod key={x} a={[x, -0.42, 0]} b={[x, 0.02, 0]} r={0.02} color="#4a4e4c" />
      ))}
      <Rod a={[-0.23, -0.42, 0]} b={[0.23, -0.42, 0]} r={0.02} color="#4a4e4c" />
    </group>
  );
}

function MachineSeat() {
  return (
    <group position={[0, 0.5, 0.08]}>
      <mesh>
        <boxGeometry args={[0.42, 0.09, 0.42]} />
        <meshStandardMaterial color="#1c1e1b" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.27, -0.16]}>
        <boxGeometry args={[0.42, 0.58, 0.08]} />
        <meshStandardMaterial color="#1c1e1b" roughness={0.92} />
      </mesh>
      <Rod a={[0, -0.46, 0]} b={[0, -0.05, 0]} r={0.026} color="#4a4e4c" />
    </group>
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
            color="#8a8e8c"
          />
          {equipment === 'Barbell' &&
            [-1, 1].map((side) => (
              <Rod
                key={side}
                a={[side * (Math.abs(a[0]) + 0.25), a[1], a[2]]}
                b={[side * (Math.abs(a[0]) + 0.34), a[1], a[2]]}
                r={0.15}
                color="#2a2c2a"
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
              color="#8a8e8c"
            />
            {[-1, 1].map((s) => (
              <Rod
                key={s}
                a={[p[0] + s * 0.075, p[1], p[2]]}
                b={[p[0] + s * 0.115, p[1], p[2]]}
                r={0.065}
                color="#2f3230"
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
                color="#8a8e8c"
              />
              <mesh position={[p[0], p[1] - 0.09, p[2]]}>
                <sphereGeometry args={[0.065, 16, 12]} />
                <meshStandardMaterial color="#3a3d3a" metalness={0.6} />
              </mesh>
            </group>
          ))}
      {['Cable', 'Band', 'Machine'].includes(equipment) &&
        pose.hands.map((p, i) => (
          <group key={i}>
            <Rod
              a={[p[0] - 0.06, p[1], p[2]]}
              b={[p[0] + 0.06, p[1], p[2]]}
              color="#8a8e8c"
            />
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
              color={equipment === 'Band' ? '#ff6a1a' : '#6d7578'}
              lineWidth={1}
            />
          </group>
        ))}
      {movement.pattern === 'Horizontal press' &&
        movement.equipment !== 'Bodyweight' && (
          <PressBench angle={movement.angle} />
        )}
      {movement.pattern === 'Hip extension' && <HipThrustBench />}
      {pose.seated && <MachineSeat />}
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
            : [2.4, 1.7, 2.7]) as [number, number, number]),
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
        3D lab unavailable. Joint moments and tissue load still compute.
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
  demand: TissueMap;
  forces: ForceApplication[];
}) {
  return (
    <Boundary>
      <div className="lab-canvas">
      <Canvas camera={{ position: [2.4, 1.7, 2.7], fov: 38 }} dpr={[1, 1.5]}>
        <color attach="background" args={['#141511']} />
        <ambientLight intensity={1.15} />
        <directionalLight position={[3.2, 5.5, 2.4]} intensity={2.35} />
        <directionalLight position={[-2.5, 1.6, 1.4]} intensity={0.85} />
        <directionalLight position={[0, 2.2, -3]} intensity={0.55} />
        <Camera view={props.view} />
        <Suspense fallback={null}>
          <Body
            movement={props.movement}
            progress={props.progress}
            bones={props.bones}
            selected={props.selected}
            demand={props.demand}
          />
          <Equipment movement={props.movement} progress={props.progress} />
          {props.forces.map((app, i) => (
            <ForceMark key={i} app={app} />
          ))}
        </Suspense>
        <Grid
          args={[8, 8]}
          position={[0, 0.01, 0]}
          cellSize={0.25}
          cellThickness={0.35}
          cellColor="#1c1e1a"
          sectionColor="#2a2d28"
          fadeDistance={7}
        />
        <OrbitControls
          makeDefault
          target={[0, 0.95, 0]}
          minDistance={0.7}
          maxDistance={6}
        />
      </Canvas>
      </div>
    </Boundary>
  );
}
