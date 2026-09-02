import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Grid, OrbitControls, Line, Html } from '@react-three/drei';
import { Color, Quaternion, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type {
  BenchConfig,
  SimulationResult,
  VisualizationMode,
  CameraMode,
  Vec3,
} from '../../engine/types';
import { benchOrigin } from '../../engine/anthropometry';
import { frameAt } from '../../engine/simulate';
import { add, lerp, rad } from '../../engine/vector';
import { calibration } from '../../data/calibration';
import AnatomicalBody from './AnatomicalBody';
const neutral = '#737f76';
function Segment({
  a,
  b,
  r = 0.04,
  color = neutral,
  metalness = 0.1,
}: {
  a: Vec3;
  b: Vec3;
  r?: number;
  color?: string;
  metalness?: number;
}) {
  const delta = new Vector3(...b).sub(new Vector3(...a));
  const length = delta.length();
  const direction = delta.clone().normalize();
  const q = new Quaternion().setFromUnitVectors(
    new Vector3(0, 1, 0),
    direction,
  );
  const cylinderLength = Math.max(0.001, length - r * 2);
  return (
    <mesh position={lerp(a, b, 0.5)} quaternion={q} castShadow>
      <capsuleGeometry args={[r, cylinderLength, 6, 16]} />
      <meshStandardMaterial
        color={color}
        roughness={0.55}
        metalness={metalness}
      />
    </mesh>
  );
}
function Force({
  origin,
  length,
  color,
  direction = [0, -1, 0],
}: {
  origin: Vec3;
  length: number;
  color: string;
  direction?: Vec3;
}) {
  const arrow = useMemo(
    () => ({
      dir: new Vector3(...direction),
      origin: new Vector3(...origin),
      color: new Color(color),
    }),
    [direction, origin, color],
  );
  return length > 0.001 ? (
    <arrowHelper
      args={[arrow.dir, arrow.origin, length, arrow.color, 0.06, 0.034]}
    />
  ) : null;
}
function Moment({
  at,
  value,
  color,
}: {
  at: Vec3;
  value: number;
  color: string;
}) {
  const radius = 0.105 + Math.min(value / 400, 0.12),
    sweep = Math.PI * 1.6;
  const points = Array.from({ length: 32 }, (_, i) =>
    add(at, [
      0.02,
      Math.cos((i / 31) * sweep) * radius,
      Math.sin((i / 31) * sweep) * radius,
    ]),
  );
  return value > 0.001 ? (
    <group>
      <Line points={points} color={color} lineWidth={2} />
      <Force
        origin={points[30]}
        length={0.06}
        direction={[0, -Math.sin(sweep), Math.cos(sweep)]}
        color={color}
      />
    </group>
  ) : null;
}
function Bench({ angle }: { angle: number }) {
  return (
    <group>
      <group position={benchOrigin} rotation={[rad(angle), 0, 0]}>
        <mesh position={[0, -0.02, -0.38]} castShadow>
          <boxGeometry args={[0.34, 0.095, 1.12]} />
          <meshStandardMaterial color="#3b443e" roughness={0.92} />
        </mesh>
        <mesh position={[0, -0.072, -0.38]}>
          <boxGeometry args={[0.29, 0.025, 1.08]} />
          <meshStandardMaterial
            color="#6c7970"
            metalness={0.75}
            roughness={0.35}
          />
        </mesh>
      </group>
      <mesh position={[0, 0.5, 0.48]} castShadow>
        <boxGeometry args={[0.35, 0.09, 0.33]} />
        <meshStandardMaterial color="#3b443e" roughness={0.9} />
      </mesh>
      {[-0.3, 0.45].map((z) => (
        <group key={z}>
          <Segment
            a={[0, 0.05, z]}
            b={[0, 0.48, z]}
            r={0.027}
            color="#59645c"
            metalness={0.7}
          />
          <Segment
            a={[-0.29, 0.04, z]}
            b={[0.29, 0.04, z]}
            r={0.026}
            color="#59645c"
            metalness={0.7}
          />
          {[-0.29, 0.29].map((x) => (
            <mesh key={x} position={[x, 0.035, z]}>
              <boxGeometry args={[0.1, 0.06, 0.12]} />
              <meshStandardMaterial color="#222a24" />
            </mesh>
          ))}
        </group>
      ))}
      <Segment
        a={[0, 0.2, -0.3]}
        b={[0, 0.2, 0.45]}
        r={0.03}
        color="#4a574d"
        metalness={0.7}
      />
    </group>
  );
}
function Barbell({ position, load }: { position: Vec3; load: number }) {
  const plates = Math.min(6, Math.ceil(Math.max(0, load - 20) / 40));
  return (
    <group position={position}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.013, 0.013, 2.2, 20]} />
        <meshStandardMaterial
          color="#bec6bd"
          roughness={0.25}
          metalness={0.9}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.78, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.028, 0.028, 0.45, 20]} />
            <meshStandardMaterial
              color="#89998a"
              metalness={0.85}
              roughness={0.3}
            />
          </mesh>
          {Array.from({ length: plates }, (_, i) => (
            <group key={i} position={[side * (0.77 + i * 0.045), 0, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry
                  args={[0.21 - i * 0.006, 0.21 - i * 0.006, 0.039, 48]}
                />
                <meshStandardMaterial
                  color="#29362b"
                  metalness={0.25}
                  roughness={0.65}
                />
              </mesh>
              <mesh
                rotation={[0, Math.PI / 2, 0]}
                position={[side * 0.021, 0, 0]}
              >
                <torusGeometry args={[0.17 - i * 0.006, 0.004, 8, 48]} />
                <meshStandardMaterial color="#9fb784" roughness={0.6} />
              </mesh>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.041, 0.041, 0.048, 20]} />
                <meshStandardMaterial
                  color="#939f8e"
                  metalness={0.8}
                  roughness={0.25}
                />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}
function Human({
  config,
  result,
  progress,
  mode,
  jointsVisible,
  compact,
}: {
  config: BenchConfig;
  result: SimulationResult;
  progress: number;
  mode: VisualizationMode;
  jointsVisible: boolean;
  compact: boolean;
}) {
  const frame = frameAt(result, progress);
  return (
    <group>
      <Bench angle={config.benchAngleDeg} />
      <Suspense
        fallback={
          <Html center>
            <span className="three-label">Loading anatomical meshes…</span>
          </Html>
        }
      >
        <AnatomicalBody
          config={config}
          result={result}
          frame={frame}
          mode={mode}
        />
      </Suspense>
      <Barbell position={frame.barPosition} load={config.loadKg} />
      {[-1, 1].map((side) => {
        const s =
            side < 0 ? frame.joints.leftShoulder : frame.joints.rightShoulder,
          e = side < 0 ? frame.joints.leftElbow : frame.joints.rightElbow,
          h = side < 0 ? frame.joints.leftHand : frame.joints.rightHand;
        return (
          <group key={side}>
            {jointsVisible &&
              [s, e, h].map((p, i) => (
                <mesh position={p} key={i}>
                  <sphereGeometry args={[0.009, 12, 12]} />
                  <meshBasicMaterial
                    color="#d0f991"
                    transparent
                    opacity={0.8}
                    depthTest={false}
                  />
                </mesh>
              ))}
            {mode === 'forces' && (
              <Force
                origin={add(h, [0, 0.3, 0])}
                length={(config.loadKg * calibration.gravity) / 2 / 1500}
                color="#e4b478"
              />
            )}
            {mode === 'moments' && (
              <>
                <Moment at={s} value={frame.moments.shoulder} color="#d0f991" />
                <Moment at={e} value={frame.moments.elbow} color="#a6b9ee" />
              </>
            )}
          </group>
        );
      })}
      {mode === 'forces' && !compact && (
        <Html position={add(frame.barPosition, [0, 0.5, 0])} center>
          <span className="three-label">
            ↓ {Math.round((config.loadKg * calibration.gravity) / 2)} N / arm
          </span>
        </Html>
      )}
      <Line
        points={result.frames
          .filter((_, i) => i % 5 === 0)
          .map((f) => f.barPosition)}
        color="#d0f991"
        transparent
        opacity={0.18}
        dashed
        dashSize={0.025}
        gapSize={0.025}
        lineWidth={1}
      />
    </group>
  );
}
function CameraRig({
  mode,
  config,
  result,
}: {
  mode: CameraMode;
  config: BenchConfig;
  result: SimulationResult;
}) {
  const { camera } = useThree();
  const ref = useRef<OrbitControlsImpl>(null);
  useEffect(() => {
    let target: Vec3 = [0, 0.65, 0.2],
      position: Vec3 = [2.35, 1.95, 2.6];
    if (mode === 'Front') position = [0, 1.25, 3.8];
    if (mode === 'Side') position = [3.7, 1.15, 0.2];
    if (mode === 'Top') position = [0, 4, 0.201];
    if (mode === 'Shoulder') {
      target = result.frames[35].joints.rightShoulder;
      position = add(target, [1, 0.65, 0.8]);
    }
    if (mode === 'Elbow') {
      target = result.frames[35].joints.rightElbow;
      position = add(target, [0.85, 0.4, 0.65]);
    }
    camera.position.set(...position);
    camera.lookAt(...target);
    ref.current?.target.set(...target);
    ref.current?.update();
  }, [mode, config.benchAngleDeg, result, camera]);
  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enableDamping
      dampingFactor={0.1}
      minDistance={0.5}
      maxDistance={7}
      maxPolarAngle={Math.PI * 0.49}
      target={[0, 0.65, 0.2]}
    />
  );
}
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="scene-fallback">
        <b>3D rendering is unavailable.</b>
        <p>
          Enable WebGL in your browser to explore the model. All controls and
          calculations remain available.
        </p>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function BenchScene({
  config,
  result,
  progress,
  mode = 'demand',
  camera = '3D',
  jointsVisible = true,
  compact = false,
}: {
  config: BenchConfig;
  result: SimulationResult;
  progress: number;
  mode?: VisualizationMode;
  camera?: CameraMode;
  jointsVisible?: boolean;
  compact?: boolean;
}) {
  return (
    <SceneBoundary>
      <Canvas
        shadows
        dpr={[1, 1.6]}
        camera={{ position: [0, 1.25, 3.8], fov: compact ? 42 : 38 }}
        gl={{ antialias: true }}
        fallback={
          <div className="scene-fallback">
            Enable WebGL to view the articulated model. The simulation and
            charts work without it.
          </div>
        }
      >
        <color attach="background" args={['#141916']} />
        <fog attach="fog" args={['#141916', 5, 11]} />
        <ambientLight intensity={0.5} />
        <hemisphereLight args={['#e8eedb', '#24352b', 1.1]} />
        <directionalLight
          position={[2, 4, 3]}
          intensity={2.3}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight
          position={[-3, 2, -2]}
          intensity={1.2}
          color="#b9d6b4"
        />
        <Grid
          infiniteGrid
          cellSize={0.25}
          sectionSize={1}
          cellColor="#29352c"
          sectionColor="#394a38"
          cellThickness={0.4}
          sectionThickness={0.6}
          fadeDistance={9}
          fadeStrength={1.6}
          position={[0, 0.001, 0]}
        />
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
          position={[0, -0.005, 0]}
        >
          <planeGeometry args={[200, 200]} />
          <shadowMaterial transparent opacity={0.2} />
        </mesh>
        <Human
          {...{ config, result, progress, mode, jointsVisible, compact }}
        />
        <CameraRig mode={camera} config={config} result={result} />
      </Canvas>
    </SceneBoundary>
  );
}
