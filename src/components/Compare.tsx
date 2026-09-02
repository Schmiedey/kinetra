import { useMemo, lazy, Suspense } from 'react';
import { Lock, Copy, ArrowUpRight, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSimulationStore } from '../store/useSimulationStore';
import { simulate } from '../engine/simulate';
import { muscles } from '../data/muscles';
import { exerciseName } from '../exercises/benchPress';
import { ConfigSlider, NumberField } from './controls/ConfigControls';
import Transport from './Transport';
import type { BenchConfig } from '../engine/types';
const BenchScene = lazy(() => import('./three/BenchScene'));
const lockOptions: { key: keyof BenchConfig; label: string }[] = [
  { key: 'gripWidthRatio', label: 'Grip width' },
  { key: 'romPercent', label: 'ROM' },
  { key: 'loadKg', label: 'Absolute load' },
  { key: 'rir', label: 'RIR / effort' },
  { key: 'reps', label: 'Reps' },
  { key: 'elbowFlareDeg', label: 'Elbow flare' },
  { key: 'touchPoint', label: 'Touch point' },
  { key: 'barPathCurve', label: 'Bar path' },
];
export default function Compare({
  onMethodology,
}: {
  onMethodology: () => void;
}) {
  const slots = useSimulationStore((s) => s.slots),
    locks = useSimulationStore((s) => s.locks),
    updateSlot = useSimulationStore((s) => s.updateSlot),
    toggleLock = useSimulationStore((s) => s.toggleLock),
    progress = useSimulationStore((s) => s.progress);
  const results = useMemo(() => slots.map((s) => simulate(s.config)), [slots]);
  const equal = (k: keyof BenchConfig) =>
    slots.every((s) => s.config[k] === slots[0].config[k]);
  const loadToSandbox = (i: number) => {
    const s = useSimulationStore.getState();
    s.updateConfig(slots[i].config);
    s.setTab('Sandbox');
  };
  return (
    <div className="compare-page">
      <div className="compare-intro">
        <div>
          <span className="eyebrow">CONTROL THE VARIABLES</span>
          <h1>Same movement. Different mechanics.</h1>
          <p>
            Explore three configurations side by side. Shared locks propagate
            edits across all slots.
          </p>
        </div>
        <Button variant="outline" onClick={onMethodology}>
          How to compare <ArrowUpRight size={13} />
        </Button>
      </div>
      <div className="lock-bar">
        <span>
          <Lock size={13} /> KEEP THE SAME
        </span>
        {lockOptions.map((l) => (
          <label key={l.key}>
            <input
              type="checkbox"
              checked={locks.includes(l.key)}
              onChange={() => toggleLock(l.key)}
            />
            {l.label}
          </label>
        ))}
      </div>
      <div className="comparison-context">
        <span className={equal('loadKg') ? '' : 'unequal'}>
          {equal('loadKg') ? 'Equal absolute load' : 'Different absolute loads'}
        </span>
        <span className={equal('rir') ? '' : 'unequal'}>
          {equal('rir')
            ? 'Equal user-entered RIR'
            : 'Different user-entered RIR'}
        </span>
        <span>Individual relative strength is not modeled.</span>
      </div>
      <div className="comparison-cards">
        {slots.map((slot, i) => (
          <section key={slot.name} className="comparison-card">
            <header>
              <span className="slot-label">{slot.name}</span>
              <div>
                <h2>{exerciseName(slot.config.benchAngleDeg)}</h2>
                <p>
                  {slot.config.loadKg.toFixed(1)} kg · {slot.config.reps} reps ·{' '}
                  {slot.config.rir} RIR
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Open slot ${slot.name} in sandbox`}
                onClick={() => loadToSandbox(i)}
              >
                <ArrowUpRight size={15} />
              </Button>
            </header>
            <div className="comparison-scene">
              <Suspense
                fallback={
                  <div className="scene-loading">Loading 3D model…</div>
                }
              >
                <BenchScene
                  config={slot.config}
                  result={results[i]}
                  progress={progress}
                  compact
                  jointsVisible={false}
                />
              </Suspense>
            </div>
            <div className="comparison-controls">
              <ConfigSlider
                label={`Bench angle ${slot.name}`}
                value={slot.config.benchAngleDeg}
                min={-20}
                max={60}
                onChange={(v) => updateSlot(i, { benchAngleDeg: v })}
                format={(v) => `${v}°`}
                left="−20°"
                right="60°"
              />
              <div className="training-fields">
                <NumberField
                  label={`Load ${slot.name}`}
                  value={Number(slot.config.loadKg.toFixed(1))}
                  min={0}
                  max={500}
                  suffix="kg"
                  onChange={(v) => updateSlot(i, { loadKg: v })}
                />
                <NumberField
                  label={`RIR ${slot.name}`}
                  value={slot.config.rir}
                  min={0}
                  max={5}
                  onChange={(v) => updateSlot(i, { rir: v })}
                />
                <NumberField
                  label={`Reps ${slot.name}`}
                  value={slot.config.reps}
                  min={1}
                  max={30}
                  onChange={(v) => updateSlot(i, { reps: v })}
                />
              </div>
              <details className="comparison-more">
                <summary>
                  <SlidersHorizontal size={12} /> Technique controls
                </summary>
                <ConfigSlider
                  label={`Grip ${slot.name}`}
                  value={slot.config.gripWidthRatio}
                  min={1}
                  max={2.2}
                  step={0.05}
                  onChange={(v) => updateSlot(i, { gripWidthRatio: v })}
                  format={(v) => `${v.toFixed(2)}×`}
                />
                <ConfigSlider
                  label={`ROM ${slot.name}`}
                  value={slot.config.romPercent}
                  min={40}
                  max={110}
                  onChange={(v) => updateSlot(i, { romPercent: v })}
                  format={(v) => `${v}%`}
                />
                <ConfigSlider
                  label={`Flare ${slot.name}`}
                  value={slot.config.elbowFlareDeg}
                  min={20}
                  max={90}
                  onChange={(v) => updateSlot(i, { elbowFlareDeg: v })}
                  format={(v) => `${v}°`}
                />
                <ConfigSlider
                  label={`Touch point ${slot.name}`}
                  value={slot.config.touchPoint}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(v) => updateSlot(i, { touchPoint: v })}
                  format={(v) => `${Math.round(v * 100)}%`}
                />
                <ConfigSlider
                  label={`Bar path ${slot.name}`}
                  value={slot.config.barPathCurve}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(v) => updateSlot(i, { barPathCurve: v })}
                  format={(v) => `${Math.round(v * 100)}%`}
                />
              </details>
              <Button
                variant="ghost"
                className="copy-setup"
                onClick={() =>
                  updateSlot(i, useSimulationStore.getState().config)
                }
              >
                <Copy size={11} /> Copy current sandbox into {slot.name}
              </Button>
            </div>
          </section>
        ))}
      </div>
      <Transport />
      <div className="comparison-table-wrap">
        <div className="comparison-table-heading">
          <h2>Read the differences.</h2>
          <span>Relative estimates · not predicted growth</span>
        </div>
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Estimated Stimulus Index</th>
              {slots.map((s) => (
                <th key={s.name}>
                  SETUP {s.name} <span>{s.config.benchAngleDeg}°</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {muscles.map((m) => (
              <tr key={m.id}>
                <th>
                  <i style={{ background: m.color }} />
                  {m.name}
                  <button
                    onClick={onMethodology}
                    aria-label={`How is ${m.name} stimulus calculated?`}
                  >
                    ⓘ
                  </button>
                </th>
                {results.map((r, i) => (
                  <td key={i}>
                    <div className="table-score">
                      <span
                        style={{
                          background: m.color,
                          width: `${r.muscles.find((x) => x.id === m.id)!.estimatedStimulus}%`,
                        }}
                      />
                    </div>
                    <strong>
                      {Math.round(
                        r.muscles.find((x) => x.id === m.id)!.estimatedStimulus,
                      )}
                    </strong>
                  </td>
                ))}
              </tr>
            ))}
            {[
              {
                label: 'Peak shoulder moment / arm',
                value: (i: number) =>
                  `${Math.round(results[i].peakShoulderMomentNm)} Nm`,
              },
              {
                label: 'Peak elbow moment / arm',
                value: (i: number) =>
                  `${Math.round(results[i].peakElbowMomentNm)} Nm`,
              },
              {
                label: 'Loaded bar excursion',
                value: (i: number) =>
                  `${(results[i].loadedExcursionM * 100).toFixed(1)} cm`,
              },
              {
                label: 'Mean lengthened exposure / 100',
                value: (i: number) =>
                  `${Math.round((results[i].muscles.reduce((sum, m) => sum + m.lengthenedExposure, 0) / 4) * 100)}`,
              },
            ].map((row) => (
              <tr key={row.label}>
                <th>{row.label}</th>
                {results.map((_, i) => (
                  <td key={i}>
                    <strong>{row.value(i)}</strong>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
