import { lazy, Suspense, useState } from 'react';
import {
  Search,
  Plus,
  Star,
  Play,
  Pause,
  ArrowRight,
  Trash2,
  Download,
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
  widthControl,
  gripAngleControl,
} from './catalog';
import type { Library } from './useLibrary';
import { useSimulationStore } from '../store/useSimulationStore';
import { useLabStore } from '../store/useLabStore';
import { solveMovementFrame } from './simulateMovement';
import { jointIds, tissueIds, type JointId } from '../engine/tissueLoad';
const MovementScene = lazy(() => import('./MovementScene'));

const jointLabel: Record<JointId, string> = {
  shoulder: 'Shoulder',
  elbow: 'Elbow',
  hip: 'Hip',
  knee: 'Knee',
  ankle: 'Ankle',
};

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

function Spark({
  frames,
  id,
}: {
  frames: { demand: Record<GroupId, number> }[];
  id: GroupId;
}) {
  const w = 220,
    h = 36;
  const pts = frames
    .map((f, i) => {
      const x = (i / (frames.length - 1)) * w;
      const y = h - 3 - f.demand[id] * (h - 6);
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg className="lab-spark" viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        points={pts}
      />
    </svg>
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
          Pattern and equipment set the load case. Muscle tags are labels, not
          the moment model.
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
            label={widthControl(draft).label}
            value={draft.stance}
            min={0.6}
            max={1.6}
            step={0.05}
            suffix="×"
            onChange={(stance) => setDraft({ ...draft, stance })}
          />
          {gripAngleControl(draft) && (
            <RangeControl
              label="Grip angle"
              value={draft.gripAngle ?? 0}
              min={-90}
              max={90}
              suffix="°"
              onChange={(gripAngle) => setDraft({ ...draft, gripAngle })}
            />
          )}
          <label>
            Cues · one per line
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
    [editor, setEditor] = useState<Movement | null>(null),
    [notice, setNotice] = useState('');
  const movement = useLabStore((s) => s.movement),
    loadKg = useLabStore((s) => s.loadKg),
    bodyMassKg = useLabStore((s) => s.bodyMassKg),
    progress = useLabStore((s) => s.progress),
    playing = useLabStore((s) => s.playing),
    bones = useLabStore((s) => s.bones),
    view = useLabStore((s) => s.view),
    selectedGroup = useLabStore((s) => s.selectedGroup),
    sim = useLabStore((s) => s.sim);
  const all = [...catalog, ...library.data.custom];
  const original = all.find((m) => m.id === movement.id) ?? movement;
  const angle = angleControl(movement);
  const width = widthControl(movement);
  const live = solveMovementFrame(movement, progress, loadKg, bodyMassKg);
  const ranked = tissueIds
    .map((id) => ({ id, live: live.demand[id], peak: sim.peakDemand[id] }))
    .filter((row) => row.peak > 0.04)
    .sort((a, b) => b.live - a.live);
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
  const favorite = library.data.favorites.includes(original.id);

  function addWorkout() {
    if (library.data.workout.length >= 40) {
      setNotice('Your session can contain up to 40 movements.');
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
              : 8,
          load: loadKg,
          rest: 90,
          completed: 0,
          notes: '',
        },
      ],
    }));
    setNotice(`Queued at ${loadKg} kg. Open Train to prescribe sets.`);
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
    <main className="lab">
      <aside className="lab-catalog">
        <div className="lab-catalog-heading">
          <b>MOVEMENT INDEX</b>
          <span>EXPLORE / 01</span>
        </div>
        <div className="lab-search">
          <Search size={14} />
          <Input
            aria-label="Search movements"
            placeholder="Movement or tissue"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="lab-filters">
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
        <div className="lab-scopes">
          {['All', 'Favorites', 'Mine'].map((s) => (
            <button
              key={s}
              className={
                (s === 'Mine' ? scope === 'My movements' : scope === s)
                  ? 'on'
                  : ''
              }
              onClick={() => setScope(s === 'Mine' ? 'My movements' : s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="lab-count">{matches.length}</div>
        <div className="lab-list">
          {matches.map((m) => (
            <button
              key={m.id}
              className={m.id === original.id ? 'on' : ''}
              onClick={() => useLabStore.getState().open(m)}
            >
              <em>{m.pattern}</em>
              <strong>{m.name}</strong>
              <span>{m.equipment}</span>
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          disabled={!library.ready}
          onClick={() => create(false)}
        >
          <Plus size={14} /> Custom
        </Button>
      </aside>

      <section className="lab-stage">
        <div className="lab-viewport">
          <div className="lab-view-tools">
            <span>
              {original.equipment} · {original.pattern}
            </span>
            <div>
              {(['3D', 'Front', 'Side', 'Back'] as const).map((v) => (
                <button
                  key={v}
                  className={view === v ? 'on' : ''}
                  onClick={() => useLabStore.getState().setView(v)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <Suspense
            fallback={<div className="page-loading">Loading anatomy…</div>}
          >
            <MovementScene
              movement={movement}
              progress={progress}
              bones={bones}
              selected={selectedGroup}
              view={view}
              demand={live.demand}
              forces={live.forces}
            />
          </Suspense>
          <div className="lab-hud">
            <div>
              <span>Load</span>
              <b>
                {loadKg.toFixed(0)}
                <small> kg</small>
              </b>
            </div>
            <div>
              <span>{jointLabel[live.peakMomentJoint]}</span>
              <b>
                {Math.round(live.peakMomentNm)}
                <small> Nm</small>
              </b>
            </div>
            <div>
              <span>Impact</span>
              <b>
                {live.impactBw.toFixed(1)}
                <small> BW</small>
              </b>
            </div>
            <div>
              <span>Tissue</span>
              <b>{muscleGroups[sim.hottest]}</b>
            </div>
          </div>
          <button
            className={'lab-bone-toggle' + (bones ? ' on' : '')}
            onClick={() => useLabStore.getState().setBones(!bones)}
          >
            Skeleton {bones ? 'on' : 'off'}
          </button>
        </div>

        <div className="lab-transport">
          <Button
            variant="outline"
            size="icon"
            aria-label={playing ? 'Pause' : 'Play'}
            onClick={() => useLabStore.getState().setPlaying(!playing)}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </Button>
          <input
            aria-label="Rep position"
            type="range"
            min={0}
            max={1}
            step={0.005}
            value={progress}
            onChange={(e) =>
              useLabStore.getState().setProgress(Number(e.target.value))
            }
          />
          <span>{Math.round(progress * 100)}</span>
        </div>

        <div className="lab-load">
          <span>External load</span>
          <div className="lab-stepper">
            {[-10, -2.5, 2.5, 10].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() =>
                  useLabStore.getState().setLoad(Math.max(0, loadKg + step))
                }
              >
                {step > 0 ? `+${step}` : step}
              </button>
            ))}
            <Input
              aria-label="External load in kilograms"
              type="number"
              min={0}
              max={500}
              step={0.5}
              value={loadKg}
              onChange={(e) =>
                useLabStore.getState().setLoad(Number(e.target.value) || 0)
              }
            />
            <b>kg</b>
          </div>
          {movement.equipment === 'Bodyweight' && (
            <p>Body mass is the moving load. Added mass is a vest or belt.</p>
          )}
        </div>

        <div className="lab-setup">
          {angle && (
            <RangeControl
              label={angle.label}
              value={movement.angle}
              min={angle.min}
              max={angle.max}
              suffix="°"
              onChange={(angle) =>
                useLabStore.getState().setSettings({ angle })
              }
            />
          )}
          <RangeControl
            label="ROM"
            value={movement.range}
            min={20}
            max={100}
            suffix="%"
            onChange={(range) => useLabStore.getState().setSettings({ range })}
          />
          <RangeControl
            label={width.label}
            value={movement.stance}
            min={width.min}
            max={width.max}
            step={0.05}
            suffix="×"
            onChange={(stance) =>
              useLabStore.getState().setSettings({ stance })
            }
          />
          {gripAngleControl(movement) && (
            <RangeControl
              label="Grip angle"
              value={movement.gripAngle ?? 0}
              min={-90}
              max={90}
              suffix="°"
              onChange={(gripAngle) =>
                useLabStore.getState().setSettings({ gripAngle })
              }
            />
          )}
        </div>

        <div className="lab-actions">
          <Button disabled={!library.ready} onClick={addWorkout}>
            <Plus size={15} /> Add to session
          </Button>
          <Button
            variant="outline"
            disabled={!library.ready}
            onClick={() => create(true)}
          >
            Save variation
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={!library.ready}
            aria-label={favorite ? 'Remove favorite' : 'Add favorite'}
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
                  if (window.confirm(`Delete ${original.name}?`)) {
                    library.update((d) => ({
                      ...d,
                      custom: d.custom.filter((m) => m.id !== original.id),
                      favorites: d.favorites.filter((id) => id !== original.id),
                    }));
                    useLabStore.getState().open(catalog[0]);
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
                    benchAngleDeg: movement.angle,
                    romPercent: movement.range,
                    gripWidthRatio: 1.6 * movement.stance,
                    loadKg,
                  });
                  useSimulationStore.getState().setTab('Sandbox');
                }}
              >
                4-muscle bench <ArrowRight size={14} />
              </Button>
            )}
          <Button
            variant="ghost"
            onClick={() => {
              const blob = new Blob(
                [
                  JSON.stringify(
                    {
                      model: 'Kinetra tissue-load v0.2',
                      movement,
                      loadKg,
                      bodyMassKg,
                      peakMoments: sim.peakMoments,
                      meanDemand: sim.meanDemand,
                      peakImpactN: sim.peakImpactN,
                      notice:
                        'Static inverse-dynamics estimates. Not measured joint contact or EMG.',
                    },
                    null,
                    2,
                  ),
                ],
                { type: 'application/json' },
              );
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `kinetra-${original.id}-load.json`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 500);
            }}
          >
            <Download size={14} />
          </Button>
        </div>
        {notice && <output className="movement-notice">{notice}</output>}
      </section>

      <aside className="lab-data">
        <header>
          <h1>{original.name}</h1>
          <p>
            {live.peakMomentJoint} {Math.round(live.peakMomentNm)} Nm · hottest{' '}
            {muscleGroups[sim.hottest]} · {sim.strongestRegion}
          </p>
        </header>

        <section>
          <h2>Joint moment</h2>
          {jointIds.map((j) => (
            <button
              key={j}
              className={
                'lab-bar' + (j === live.peakMomentJoint ? ' peak' : '')
              }
              type="button"
            >
              <span>{jointLabel[j]}</span>
              <i>
                <b
                  style={{
                    width: `${Math.min(100, (live.moments.peak[j] / Math.max(sim.peakMoments[live.peakMomentJoint], 1)) * 100)}%`,
                  }}
                />
              </i>
              <em>{Math.round(live.moments.peak[j])}</em>
            </button>
          ))}
        </section>

        <section>
          <h2>Tissue load</h2>
          <Spark frames={sim.frames} id={sim.hottest} />
          <div className="lab-tissues">
            {ranked.map((row) => (
              <button
                key={row.id}
                type="button"
                className={selectedGroup === row.id ? 'on' : ''}
                onClick={() =>
                  useLabStore
                    .getState()
                    .setGroup(selectedGroup === row.id ? null : row.id)
                }
              >
                <span>{muscleGroups[row.id]}</span>
                <i>
                  <b style={{ width: `${Math.min(100, row.live * 100)}%` }} />
                  <s style={{ left: `${Math.min(100, row.peak * 100)}%` }} />
                </i>
                <em>{Math.round(row.live * 100)}</em>
              </button>
            ))}
          </div>
        </section>

        <section className="lab-impact">
          <h2>Impact</h2>
          <dl>
            <div>
              <dt>Peak compression</dt>
              <dd>{(live.impactN / 1000).toFixed(2)} kN</dd>
            </div>
            <div>
              <dt>Bodyweights</dt>
              <dd>{live.impactBw.toFixed(2)} BW</dd>
            </div>
            <div>
              <dt>Ground reaction</dt>
              <dd>
                {live.groundReactionN
                  ? `${(live.groundReactionN / 1000).toFixed(2)} kN`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>Body mass</dt>
              <dd>
                <Input
                  aria-label="Body mass in kilograms"
                  type="number"
                  min={40}
                  max={180}
                  step={1}
                  value={bodyMassKg}
                  onChange={(e) =>
                    useLabStore
                      .getState()
                      .setBodyMass(Number(e.target.value) || 78)
                  }
                />
              </dd>
            </div>
          </dl>
        </section>

        <p className="lab-note">
          Color is modeled demand from current joint moments, not EMG. Arrows
          are external load and ground reaction. Compression uses |F| plus
          moment / 5 cm as a muscle-force proxy.
        </p>
      </aside>

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
            useLabStore.getState().open(m);
            setEditor(null);
          }}
        />
      )}
    </main>
  );
}
