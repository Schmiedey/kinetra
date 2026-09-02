import { lazy, Suspense, useEffect, useEffectEvent, useState } from 'react';
import {
  Search,
  Plus,
  Star,
  Play,
  Pause,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  catalog,
  muscleGroups,
  patterns,
  equipmentOptions,
  patternDefaults,
  type Movement,
  type GroupId,
  type Pattern,
  type Equipment,
  validMovement,
  angleControl,
} from './catalog';
import type { Library } from './useLibrary';
import { useSimulationStore } from '../store/useSimulationStore';
import { analyzeMovement } from './lab';
const MovementScene = lazy(() => import('./MovementScene'));

function DetailedMovementLab({
  movement,
  progress,
}: {
  movement: Movement;
  progress: number;
}) {
  const reading = analyzeMovement(movement, progress);
  const rows = [
    ['Rep position', `${reading.phasePercent}%`],
    ['Elbow flexion', `${reading.elbowFlexionDeg}°`],
    ['Knee flexion', `${reading.kneeFlexionDeg}°`],
    ['Foot / stance width', `${reading.stanceWidthCm} cm`],
  ];
  return (
    <section
      className="detailed-movement-lab"
      aria-label="Detailed movement lab"
    >
      <div className="detailed-movement-lab-heading">
        <div>
          <span className="eyebrow">DETAILED MOVEMENT LAB</span>
          <h3>Live pose geometry</h3>
        </div>
        <span>{reading.setup}</span>
      </div>
      <div className="detailed-movement-readings">
        {rows.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <p>
        These readings update with the playhead, range, angle and stance
        controls. They describe the generic articulated pose used in this
        preview, not a measurement of your body or an injury assessment.
      </p>
    </section>
  );
}
export function RangeControl({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="movement-range">
      <span>
        {label}
        <b>
          {Number(value.toFixed(2))}
          {suffix}
        </b>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
function Editor({
  initial,
  onClose,
  onSave,
}: {
  initial: Movement;
  onClose: () => void;
  onSave: (m: Movement) => void;
}) {
  const [draft, setDraft] = useState(initial),
    [error, setError] = useState('');
  const angle = angleControl(draft);
  const toggle = (g: GroupId, kind: 'primary' | 'secondary') =>
    setDraft((d) => ({
      ...d,
      [kind]: d[kind].includes(g)
        ? d[kind].filter((x) => x !== g)
        : [...d[kind], g],
      [kind === 'primary' ? 'secondary' : 'primary']: d[
        kind === 'primary' ? 'secondary' : 'primary'
      ].filter((x) => x !== g),
    }));
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="movement-editor">
        <DialogTitle>
          {initial.custom ? 'Edit movement' : 'Create your movement'}
        </DialogTitle>
        <DialogDescription>
          Start from a movement pattern, then set your variation and muscle
          emphasis.
        </DialogDescription>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!validMovement(draft)) {
              setError(
                'Add a name and at least one primary muscle. Keep cues to six lines.',
              );
              return;
            }
            onSave({ ...draft, custom: true });
          }}
        >
          <label htmlFor="movement-name">
            Name
            <Input
              id="movement-name"
              required
              maxLength={100}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <div className="movement-fields">
            <label>
              Movement pattern
              <select
                value={draft.pattern}
                onChange={(e) => {
                  const p = e.target.value as Pattern;
                  setDraft({ ...draft, pattern: p, ...patternDefaults[p] });
                }}
              >
                {patterns.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label>
              Equipment
              <select
                value={draft.equipment}
                onChange={(e) =>
                  setDraft({ ...draft, equipment: e.target.value as Equipment })
                }
              >
                {equipmentOptions.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>
          {(['primary', 'secondary'] as const).map((kind) => (
            <fieldset key={kind}>
              <legend>
                {kind === 'primary'
                  ? 'Primary muscles · choose at least one'
                  : 'Supporting muscles'}
              </legend>
              <div className="muscle-choices">
                {Object.entries(muscleGroups).map(([id, name]) => (
                  <label key={id}>
                    <input
                      type="checkbox"
                      checked={draft[kind].includes(id as GroupId)}
                      onChange={() => toggle(id as GroupId, kind)}
                    />
                    {name}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          {angle && (
            <RangeControl
              label={angle.label}
              value={draft.angle}
              min={angle.min}
              max={angle.max}
              suffix="°"
              onChange={(angle) => setDraft({ ...draft, angle })}
            />
          )}
          <RangeControl
            label="Range of motion"
            value={draft.range}
            min={20}
            max={100}
            suffix="%"
            onChange={(range) => setDraft({ ...draft, range })}
          />
          <RangeControl
            label="Grip / stance multiplier"
            value={draft.stance}
            min={0.6}
            max={1.6}
            step={0.05}
            suffix="×"
            onChange={(stance) => setDraft({ ...draft, stance })}
          />
          <label>
            Coaching cues · one per line
            <textarea
              rows={3}
              maxLength={1800}
              value={draft.cues.join('\n')}
              onChange={(e) =>
                setDraft({ ...draft, cues: e.target.value.split('\n') })
              }
            />
          </label>
          <label>
            Notes
            <textarea
              rows={2}
              maxLength={2000}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <div className="movement-actions">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save movement</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export default function MovementLibrary({ library }: { library: Library }) {
  const [query, setQuery] = useState(''),
    [pattern, setPattern] = useState('All patterns'),
    [equipment, setEquipment] = useState('All equipment'),
    [scope, setScope] = useState('All'),
    [selectedId, setSelectedId] = useState('bench');
  const all = [...catalog, ...library.data.custom];
  const original = all.find((m) => m.id === selectedId) ?? catalog[0];
  const [settings, setSettings] = useState({
      angle: original.angle,
      range: original.range,
      stance: original.stance,
    }),
    [progress, setProgress] = useState(0.35),
    [playing, setPlaying] = useState(false),
    [view, setView] = useState('3D'),
    [bones, setBones] = useState(true),
    [selectedGroup, setSelectedGroup] = useState<GroupId | null>(null),
    [editor, setEditor] = useState<Movement | null>(null),
    [notice, setNotice] = useState('');
  const movement = { ...original, ...settings };
  const angle = angleControl(movement);
  const readProgress = useEffectEvent(() => progress);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now(),
      phase = readProgress(),
      dir = 1;
    let frame: number;
    const tick = (now: number) => {
      phase += Math.min(0.05, (now - last) / 1000) * 0.35 * dir;
      last = now;
      if (phase >= 1) {
        phase = 1;
        dir = -1;
      }
      if (phase <= 0) {
        phase = 0;
        dir = 1;
      }
      setProgress(phase);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);
  const matches = all.filter(
    (m) =>
      (pattern === 'All patterns' || m.pattern === pattern) &&
      (equipment === 'All equipment' || m.equipment === equipment) &&
      (scope !== 'Favorites' || library.data.favorites.includes(m.id)) &&
      (scope !== 'My movements' || m.custom) &&
      `${m.name} ${m.pattern} ${[...m.primary, ...m.secondary].map((g) => muscleGroups[g]).join(' ')}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const select = (m: Movement) => {
    setSelectedId(m.id);
    setSettings({ angle: m.angle, range: m.range, stance: m.stance });
    setProgress(0.35);
    setPlaying(false);
    setSelectedGroup(null);
    setNotice('');
  };
  const favorite = library.data.favorites.includes(original.id);
  function addWorkout() {
    if (library.data.workout.length >= 40) {
      setNotice('Your workout can contain up to 40 movements.');
      return;
    }
    library.update((d) => ({
      ...d,
      workout: [
        ...d.workout,
        {
          id: crypto.randomUUID(),
          movement,
          sets: 3,
          reps:
            movement.pattern === 'Core' || movement.pattern === 'Carry'
              ? 30
              : 10,
          load: 0,
          rest: 90,
          completed: 0,
          notes: '',
        },
      ],
    }));
    setNotice('Added to your workout. Set the load and log sets in Workout.');
  }
  const create = (clone: boolean) => {
    setEditor(
      clone
        ? {
            ...movement,
            id: crypto.randomUUID(),
            name: movement.name + ' variation',
            custom: false,
          }
        : {
            ...catalog[0],
            id: crypto.randomUUID(),
            name: '',
            cues: [],
            notes: '',
          },
    );
  };
  return (
    <main className="movement-page">
      <div className="movement-heading">
        <div>
          <span className="eyebrow">BUILD A BETTER SESSION</span>
          <h1>Find your next movement.</h1>
          <p>Explore the anatomy. Make it yours. Put it to work.</p>
        </div>
        <Button disabled={!library.ready} onClick={() => create(false)}>
          <Plus size={16} /> New movement
        </Button>
      </div>
      <div className="movement-layout">
        <aside className="movement-browser">
          <div className="movement-search">
            <Search size={16} />
            <Input
              aria-label="Search movements"
              placeholder="Search a movement or muscle…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="movement-filters">
            <select
              aria-label="Filter movement pattern"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
            >
              <option>All patterns</option>
              {patterns.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <select
              aria-label="Filter equipment"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
            >
              <option>All equipment</option>
              {equipmentOptions.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="movement-tabs">
            {['All', 'Favorites', 'My movements'].map((s) => (
              <button
                key={s}
                className={scope === s ? 'active' : ''}
                onClick={() => setScope(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="movement-count">
            {matches.length} movements <span>{patterns.length} patterns</span>
          </div>
          <div className="movement-list">
            {matches.map((m) => (
              <button
                className={
                  'movement-card ' + (m.id === original.id ? 'active' : '')
                }
                key={m.id}
                onClick={() => select(m)}
              >
                <span className="movement-card-top">
                  {m.pattern}
                  {library.data.favorites.includes(m.id) && (
                    <Star size={12} fill="currentColor" />
                  )}
                  {m.custom && <i>YOURS</i>}
                </span>
                <strong>{m.name}</strong>
                <span>
                  {m.equipment} <b>·</b>{' '}
                  {m.primary.map((g) => muscleGroups[g]).join(' / ')}
                </span>
              </button>
            ))}
            {!matches.length && (
              <div className="movement-empty">
                <p>No movements match these filters.</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery('');
                    setPattern('All patterns');
                    setEquipment('All equipment');
                    setScope('All');
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        </aside>
        <section className="movement-detail">
          <div className="movement-detail-title">
            <div>
              <span className="eyebrow">
                {original.equipment} /{' '}
                {original.custom ? 'YOUR VARIATION' : 'MOVEMENT LIBRARY'}
              </span>
              <h2>{original.name}</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              disabled={!library.ready}
              aria-label={favorite ? 'Remove favorite' : 'Add favorite'}
              aria-pressed={favorite}
              onClick={() =>
                library.update((d) => ({
                  ...d,
                  favorites: favorite
                    ? d.favorites.filter((id) => id !== original.id)
                    : [...d.favorites, original.id],
                }))
              }
            >
              <Star fill={favorite ? 'currentColor' : 'none'} />
            </Button>
          </div>
          <div className="movement-viewport">
            <div className="movement-view-tools">
              <span>Pattern preview · {original.pattern}</span>
              <div>
                {['3D', 'Front', 'Side', 'Back'].map((v) => (
                  <button
                    key={v}
                    className={view === v ? 'active' : ''}
                    onClick={() => setView(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <Suspense
              fallback={
                <div className="page-loading">Loading anatomical model…</div>
              }
            >
              <MovementScene
                movement={movement}
                progress={progress}
                bones={bones}
                selected={selectedGroup}
                view={view}
              />
            </Suspense>
            <div className="movement-view-bottom">
              <label>
                <input
                  type="checkbox"
                  checked={bones}
                  onChange={(e) => setBones(e.target.checked)}
                />{' '}
                Skeleton
              </label>
              <span>Drag to orbit · scroll to zoom</span>
            </div>
          </div>
          <div className="movement-transport">
            <Button
              variant="outline"
              size="icon"
              aria-label={playing ? 'Pause movement' : 'Play movement'}
              onClick={() => setPlaying(!playing)}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </Button>
            <input
              aria-label="Movement position"
              type="range"
              min={0}
              max={1}
              step={0.005}
              value={progress}
              onChange={(e) => {
                setPlaying(false);
                setProgress(Number(e.target.value));
              }}
            />
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="movement-adjustments">
            {angle && (
              <RangeControl
                label={angle.label}
                value={settings.angle}
                min={angle.min}
                max={angle.max}
                suffix="°"
                onChange={(angle) => setSettings({ ...settings, angle })}
              />
            )}
            <RangeControl
              label="Range of motion"
              value={settings.range}
              min={20}
              max={100}
              suffix="%"
              onChange={(range) => setSettings({ ...settings, range })}
            />
            <RangeControl
              label="Grip / stance"
              value={settings.stance}
              min={0.6}
              max={1.6}
              step={0.05}
              suffix="×"
              onChange={(stance) => setSettings({ ...settings, stance })}
            />
          </div>
          <DetailedMovementLab movement={movement} progress={progress} />
          <div className="movement-anatomy">
            <div>
              <span className="eyebrow">ILLUSTRATIVE MUSCLE EMPHASIS</span>
              <div className="movement-muscles">
                {original.primary.map((g) => (
                  <button
                    key={g}
                    className={
                      'primary ' + (selectedGroup === g ? 'selected' : '')
                    }
                    onClick={() =>
                      setSelectedGroup(selectedGroup === g ? null : g)
                    }
                  >
                    {muscleGroups[g]}
                    <small>Primary</small>
                  </button>
                ))}
                {original.secondary.map((g) => (
                  <button
                    key={g}
                    className={selectedGroup === g ? 'selected' : ''}
                    onClick={() =>
                      setSelectedGroup(selectedGroup === g ? null : g)
                    }
                  >
                    {muscleGroups[g]}
                    <small>Supporting</small>
                  </button>
                ))}
              </div>
            </div>
            <p>
              Real anatomical meshes, simplified movement patterns. Colors show
              assigned muscle roles, not measured activation. Setup controls
              affect supported parts of each pattern; variants may share a
              preview.
            </p>
          </div>
          <div className="movement-cues">
            <h3>Movement cues</h3>
            <ol>
              {original.cues.filter(Boolean).map((cue, i) => (
                <li key={i}>{cue}</li>
              ))}
            </ol>
            {original.notes && <p>{original.notes}</p>}
          </div>
          <div className="movement-actions">
            <Button disabled={!library.ready} onClick={addWorkout}>
              <Plus size={15} /> Add to workout
            </Button>
            <Button
              variant="outline"
              disabled={!library.ready}
              onClick={() => create(true)}
            >
              Save variation
            </Button>
            {original.custom && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => setEditor({ ...movement, custom: true })}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  aria-label="Delete custom movement"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete ${original.name}? Workout entries keep their own copy.`,
                      )
                    ) {
                      library.update((d) => ({
                        ...d,
                        custom: d.custom.filter((m) => m.id !== original.id),
                        favorites: d.favorites.filter(
                          (id) => id !== original.id,
                        ),
                      }));
                      select(catalog[0]);
                    }
                  }}
                >
                  <Trash2 size={15} />
                </Button>
              </>
            )}
            {original.pattern === 'Horizontal press' &&
              original.equipment !== 'Bodyweight' && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    useSimulationStore.getState().updateConfig({
                      benchAngleDeg: settings.angle,
                      romPercent: settings.range,
                      gripWidthRatio: 1.6 * settings.stance,
                    });
                    useSimulationStore.getState().setTab('Sandbox');
                  }}
                >
                  Calculated bench mechanics <ArrowRight size={14} />
                </Button>
              )}
          </div>
          {notice && <output className="movement-notice">{notice}</output>}
        </section>
      </div>
      {editor && (
        <Editor
          key={editor.id}
          initial={editor}
          onClose={() => setEditor(null)}
          onSave={(m) => {
            if (
              library.data.custom.length >= 100 &&
              !library.data.custom.some((x) => x.id === m.id)
            ) {
              setNotice('Your library can contain up to 100 custom movements.');
              setEditor(null);
              return;
            }
            library.update((d) => ({
              ...d,
              custom: d.custom.some((x) => x.id === m.id)
                ? d.custom.map((x) => (x.id === m.id ? m : x))
                : [...d.custom, m],
            }));
            select(m);
            setEditor(null);
          }}
        />
      )}
    </main>
  );
}
