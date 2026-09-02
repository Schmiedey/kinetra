import { RotateCcw, FlaskConical, ChevronDown } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { memo, useState } from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { presets } from '../../exercises/benchPress';
import type { BenchConfig } from '../../engine/types';
import { configBounds } from '../../data/calibration';
export function ConfigSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v) => String(v),
  left,
  right,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  left?: string;
  right?: string;
}) {
  return (
    <div className="control">
      <label>
        {label}
        <output>{format(value)}</output>
      </label>
      <Slider
        aria-label={label}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
      {left && (
        <div className="range-labels">
          <span>{left}</span>
          <span>{right}</span>
        </div>
      )}
    </div>
  );
}
export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="number-field">
      <span>{label}</span>
      <div>
        <Input
          type="number"
          inputMode="decimal"
          aria-label={label}
          value={draft ?? value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const text = e.target.value;
            setDraft(text);
            if (
              text !== '' &&
              Number.isFinite(Number(text)) &&
              Number(text) >= min &&
              Number(text) <= max
            )
              onChange(Number(text));
          }}
          onBlur={() => {
            if (
              draft !== null &&
              draft !== '' &&
              Number.isFinite(Number(draft))
            )
              onChange(Math.min(max, Math.max(min, Number(draft))));
            setDraft(null);
          }}
        />
        {suffix && <small>{suffix}</small>}
      </div>
    </label>
  );
}
function ConfigControls() {
  const config = useSimulationStore((s) => s.config),
    update = useSimulationStore((s) => s.updateConfig),
    reset = useSimulationStore((s) => s.reset);
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg');
  const slider = (
    key: keyof BenchConfig,
    label: string,
    format: (v: number) => string,
    left: string,
    right: string,
    step = 1,
  ) => (
    <ConfigSlider
      label={label}
      value={config[key]}
      min={configBounds[key][0]}
      max={configBounds[key][1]}
      step={step}
      onChange={(v) => update({ [key]: v })}
      format={format}
      left={left}
      right={right}
    />
  );
  return (
    <aside className="panel controls">
      <div className="section-heading">
        <span>EXERCISE SETUP</span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Reset exercise settings"
          onClick={reset}
        >
          <RotateCcw size={13} />
        </Button>
      </div>
      <h2>Barbell bench press</h2>
      <p className="muted">One movement. Endless variables.</p>
      <div className="exercise-tabs">
        {presets.map((p) => (
          <button
            key={p.id}
            aria-pressed={
              p.angle === 0
                ? config.benchAngleDeg === 0
                : p.angle > 0
                  ? config.benchAngleDeg > 0
                  : config.benchAngleDeg < 0
            }
            className={
              (
                p.angle === 0
                  ? config.benchAngleDeg === 0
                  : p.angle > 0
                    ? config.benchAngleDeg > 0
                    : config.benchAngleDeg < 0
              )
                ? 'selected'
                : ''
            }
            onClick={() => update({ benchAngleDeg: p.angle })}
          >
            {p.label}
          </button>
        ))}
      </div>
      {slider(
        'benchAngleDeg',
        'Bench angle',
        (v) => `${v}°`,
        '−20° decline',
        '60° incline',
      )}
      {slider(
        'gripWidthRatio',
        'Grip width',
        (v) => `${v.toFixed(2)}×`,
        'Narrow',
        'Wide',
        0.05,
      )}
      {slider(
        'elbowFlareDeg',
        'Elbow flare',
        (v) => `${v}°`,
        '20° tucked',
        '90° flared',
      )}
      {slider(
        'romPercent',
        'Range of motion',
        (v) => `${v}%`,
        '40% partial',
        '110% extended',
      )}
      <details className="advanced-controls">
        <summary>
          Bar path & touch point <ChevronDown size={13} />
        </summary>
        {slider(
          'touchPoint',
          'Touch point',
          (v) => `${Math.round(v * 100)}%`,
          'Upper chest',
          'Lower sternum',
          0.01,
        )}
        {slider(
          'barPathCurve',
          'Bar path',
          (v) => `${Math.round(v * 100)}%`,
          'Vertical',
          'Curved',
          0.01,
        )}
      </details>
      <div className="section-heading set-heading">
        <span>TRAINING SET</span>
        <button
          className="unit-toggle"
          aria-label="Toggle load units"
          onClick={() => setUnit((u) => (u === 'kg' ? 'lb' : 'kg'))}
        >
          {unit.toUpperCase()} <span>/ {unit === 'kg' ? 'LB' : 'KG'}</span>
        </button>
      </div>
      <div className="training-fields">
        <NumberField
          label="Load"
          value={
            unit === 'kg'
              ? Number(config.loadKg.toFixed(1))
              : Number((config.loadKg * 2.20462).toFixed(1))
          }
          min={0}
          max={unit === 'kg' ? 500 : 1102.3}
          step={unit === 'kg' ? 2.5 : 5}
          suffix={unit}
          onChange={(v) => update({ loadKg: unit === 'kg' ? v : v / 2.20462 })}
        />
        <NumberField
          label="Reps"
          value={config.reps}
          min={1}
          max={30}
          onChange={(v) => update({ reps: v })}
        />
        <NumberField
          label="RIR"
          value={config.rir}
          min={0}
          max={5}
          onChange={(v) => update({ rir: v })}
        />
      </div>
      <p className="rir-note">RIR = reps left before failure. 5 = 5+.</p>
      <div className="setup-note">
        <FlaskConical size={16} />
        <span>
          Anatomical atlas · 42 cm model shoulders
          <br />
          Simplified vertical-force model
        </span>
      </div>
    </aside>
  );
}

export default memo(ConfigControls);
