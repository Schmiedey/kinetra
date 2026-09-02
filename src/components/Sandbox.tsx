import { lazy, Suspense, useState } from 'react';
import {
  Box,
  Activity,
  Flame,
  Ruler,
  ArrowDown,
  Maximize2,
  Minimize2,
  Crosshair,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { muscles } from '../data/muscles';
import { useSimulationStore } from '../store/useSimulationStore';
import { frameAt } from '../engine/simulate';
import type { VisualizationMode, CameraMode } from '../engine/types';
import ConfigControls from './controls/ConfigControls';
import MuscleProfile from './MuscleProfile';
import Transport from './Transport';
import SimulationCharts from './charts/SimulationCharts';
const BenchScene = lazy(() => import('./three/BenchScene'));
const modes: { id: VisualizationMode; label: string; icon: typeof Box }[] = [
  { id: 'anatomy', label: 'Anatomy', icon: Box },
  { id: 'demand', label: 'Demand', icon: Activity },
  { id: 'moments', label: 'Moments', icon: Activity },
  { id: 'stimulus', label: 'Stimulus', icon: Flame },
  { id: 'length', label: 'Length', icon: Ruler },
  { id: 'forces', label: 'Forces', icon: ArrowDown },
];
const cameras: CameraMode[] = [
  '3D',
  'Front',
  'Side',
  'Top',
  'Shoulder',
  'Elbow',
];
export default function Sandbox({
  onMethodology,
  onExplain,
}: {
  onMethodology: () => void;
  onExplain: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const result = useSimulationStore((s) => s.result),
    config = useSimulationStore((s) => s.config),
    progress = useSimulationStore((s) => s.progress),
    mode = useSimulationStore((s) => s.mode),
    camera = useSimulationStore((s) => s.camera),
    jointsVisible = useSimulationStore((s) => s.jointsVisible),
    setMode = useSimulationStore((s) => s.setMode),
    setCamera = useSimulationStore((s) => s.setCamera);
  const selectedMuscle = useSimulationStore((s) => s.selectedMuscle),
    bonesVisible = useSimulationStore((s) => s.bonesVisible),
    muscleOpacity = useSimulationStore((s) => s.muscleOpacity);
  const frame = frameAt(result, progress);
  const selected = muscles.find((m) => m.id === selectedMuscle);
  return (
    <>
      <main className={`sandbox ${expanded ? 'expanded' : ''}`}>
        <ConfigControls />
        <section className="viewport-wrap">
          <div className="scene-toolbar">
            <fieldset className="view-modes" aria-label="Visualization mode">
              {modes.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={mode === id ? 'selected' : ''}
                  aria-pressed={mode === id}
                  onClick={() => setMode(id)}
                >
                  <Icon size={12} />
                  <span>{label}</span>
                </button>
              ))}
            </fieldset>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={expanded ? 'Collapse viewport' : 'Expand viewport'}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </Button>
          </div>
          <div className="scene">
            <Suspense
              fallback={
                <div className="scene-loading">
                  Preparing the articulated model…
                </div>
              }
            >
              <BenchScene
                {...{ config, result, progress, mode, camera, jointsVisible }}
              />
            </Suspense>
            <div className="viewport-title">
              <span className="eyebrow">
                BARBELL /{' '}
                {config.benchAngleDeg > 0
                  ? 'INCLINE'
                  : config.benchAngleDeg < 0
                    ? 'DECLINE'
                    : 'FLAT'}{' '}
                BENCH
              </span>
              <div>
                {config.benchAngleDeg}° <i /> {Math.round(config.loadKg)} kg{' '}
                <i /> {config.reps} reps
              </div>
            </div>
            <div className="live-telemetry">
              <div>
                <span>SHOULDER</span>
                <strong>
                  {Math.round(frame.moments.shoulder)}
                  <small> Nm</small>
                </strong>
              </div>
              <div>
                <span>ELBOW</span>
                <strong>
                  {Math.round(frame.moments.elbow)}
                  <small> Nm</small>
                </strong>
              </div>
              <button
                onClick={onMethodology}
                aria-label="About external moments"
              >
                <Info size={12} />
              </button>
            </div>
            <div className="camera-controls">
              {cameras.map((c) => (
                <button
                  key={c}
                  className={camera === c ? 'selected' : ''}
                  onClick={() => setCamera(c)}
                  aria-pressed={camera === c}
                >
                  {c}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              className="joints-toggle"
              aria-label="Toggle joint markers"
              aria-pressed={jointsVisible}
              onClick={() =>
                useSimulationStore.setState({ jointsVisible: !jointsVisible })
              }
            >
              <Crosshair size={16} />
            </Button>
            <div className="anatomy-legend">
              <span>
                {mode === 'length'
                  ? 'MODELED MUSCLE LENGTH'
                  : mode === 'stimulus'
                    ? 'ESTIMATED STIMULUS / WHOLE REP'
                    : mode === 'anatomy'
                      ? 'ANATOMICAL MUSCLE REGIONS'
                      : 'MODELED DEMAND / CURRENT FRAME'}
              </span>
              {mode !== 'anatomy' && (
                <>
                  <i className={mode === 'length' ? 'length-key' : ''} />
                  <div>
                    <b>{mode === 'length' ? 'Shorter' : 'Low'}</b>
                    <b>{mode === 'length' ? 'Longer' : 'High'}</b>
                  </div>
                </>
              )}
              <small>200 bone meshes · 14 muscle meshes</small>
            </div>
            {selected && (
              <div className="anatomy-selection">
                <button
                  aria-label="Clear muscle selection"
                  onClick={() =>
                    useSimulationStore.setState({ selectedMuscle: null })
                  }
                >
                  ×
                </button>
                <span>{selected.name}</span>
                <strong>
                  {Math.round(frame.muscleDemand[selected.id] * 100)}
                  <small> / 100 current demand</small>
                </strong>
                <p>
                  Length {frame.muscleLengths[selected.id].toFixed(2)} · click a
                  muscle to inspect
                </p>
              </div>
            )}
            <span className="scene-corner">
              {mode === 'length'
                ? 'BLUE · SHORTER / ORANGE · LONGER'
                : mode === 'stimulus'
                  ? 'MUSCLE COLOR / ESTIMATED STIMULUS'
                  : mode === 'forces'
                    ? 'VERTICAL EXTERNAL FORCE / ARM'
                    : mode === 'moments'
                      ? 'EXTERNAL MOMENT MAGNITUDE / ARM'
                      : 'ANATOMICAL MESHES / MODELED BEHAVIOR'}
            </span>
            <span className="orbit-hint">Drag to orbit · Scroll to zoom</span>
            {result.reachLimited && (
              <span className="reach-note">
                Bar path limited to the model’s reach.
              </span>
            )}
          </div>
          <div className="anatomy-layer-bar">
            <button
              aria-pressed={bonesVisible}
              onClick={() =>
                useSimulationStore.setState({ bonesVisible: !bonesVisible })
              }
            >
              Skeleton <span>{bonesVisible ? 'On' : 'Off'}</span>
            </button>
            <span className="layer-label">Muscle layer</span>
            <Slider
              aria-label="Muscle layer opacity"
              value={[Math.round(muscleOpacity * 100)]}
              min={15}
              max={100}
              onValueChange={(v) =>
                useSimulationStore.setState({
                  muscleOpacity: (Array.isArray(v) ? v[0] : v) / 100,
                })
              }
            />
            <output>{Math.round(muscleOpacity * 100)}%</output>
            <a href="/models/ATTRIBUTION.md" target="_blank" rel="noreferrer">
              BodyParts3D ↗
            </a>
          </div>
          <div className="frame-strip">
            <span>
              REP POSITION <b>{Math.round(progress * 100)}%</b>
            </span>
            <span>
              ELBOW FLEXION <b>{Math.round(frame.angles.elbowFlexion)}°</b>
            </span>
            <span>
              EXCURSION <b>{Math.round(result.loadedExcursionM * 100)} cm</b>
            </span>
          </div>
          <Transport />
        </section>
        <MuscleProfile {...{ onMethodology, onExplain }} />
      </main>
      <SimulationCharts onMethodology={onMethodology} />
    </>
  );
}
