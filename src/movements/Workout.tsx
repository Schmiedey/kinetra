import { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Download,
  Upload,
  Check,
  ArrowUp,
  ArrowDown,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { exportLibrary, type Library } from './useLibrary';
import { validLibrary, type WorkoutItem } from './catalog';
import { useSimulationStore } from '../store/useSimulationStore';
export default function Workout({ library }: { library: Library }) {
  const { data, update } = library;
  const file = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState(''),
    [restUntil, setRestUntil] = useState(0),
    [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!restUntil) return;
    const tick = () => {
      setRemaining(Math.max(0, Math.ceil((restUntil - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [restUntil]);
  const patch = (id: string, values: Partial<WorkoutItem>) =>
    update((d) => ({
      ...d,
      workout: d.workout.map((x) => (x.id === id ? { ...x, ...values } : x)),
    }));
  const reorder = (index: number, dir: number) =>
    update((d) => {
      const items = [...d.workout];
      [items[index], items[index + dir]] = [items[index + dir], items[index]];
      return { ...d, workout: items };
    });
  const sets = data.workout.reduce((n, x) => n + x.sets, 0),
    done = data.workout.reduce((n, x) => n + x.completed, 0);
  async function importFile(f: File) {
    try {
      if (f.size > 1000000) throw Error('Backup is too large.');
      const parsed = JSON.parse(await f.text());
      if (
        parsed.format !== 'liftlab-library' ||
        parsed.version !== 1 ||
        !validLibrary(parsed.data)
      )
        throw Error('Choose a valid LiftLab library backup.');
      if (
        window.confirm(
          'Replace your library, current workout and history with this backup? Export first if you want to keep them.',
        )
      ) {
        update(() => parsed.data);
        setNotice('Backup imported.');
      }
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  function finish() {
    const logged = data.workout.filter((x) => x.completed > 0);
    if (!logged.length) {
      setNotice('Log at least one set before finishing your session.');
      return;
    }
    update((d) => ({
      ...d,
      history: [
        {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          name: d.workoutName,
          items: logged,
        },
        ...d.history,
      ].slice(0, 30),
      workout: d.workout.map((x) => ({ ...x, completed: 0 })),
    }));
    setRestUntil(0);
    setRemaining(0);
    setNotice('Session saved to history. Your plan is ready to repeat.');
  }
  return (
    <main className="movement-page workout-page">
      <div className="movement-heading">
        <div>
          <span className="eyebrow">FROM EXPLORATION TO TRAINING</span>
          <h1>Your workout, your way.</h1>
          <p>Plan the session. Log each set. Keep a record.</p>
        </div>
        <Button
          onClick={() => useSimulationStore.getState().setTab('Movements')}
        >
          <Plus size={16} /> Add movements
        </Button>
      </div>
      <div className="workout-summary">
        <label htmlFor="workout-name">
          WORKOUT NAME
          <Input
            id="workout-name"
            aria-label="Workout name"
            maxLength={100}
            disabled={!library.ready}
            value={data.workoutName}
            onChange={(e) =>
              update((d) => ({ ...d, workoutName: e.target.value }))
            }
          />
        </label>
        <div>
          <strong>{data.workout.length}</strong>
          <span>movements</span>
        </div>
        <div>
          <strong>
            {done}
            <small> / {sets}</small>
          </strong>
          <span>sets logged</span>
        </div>
        <div>
          <strong>
            {remaining
              ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
              : '—'}
          </strong>
          <span>{remaining ? 'rest remaining' : 'rest timer'}</span>
          {remaining > 0 && (
            <button
              onClick={() => {
                setRestUntil(0);
                setRemaining(0);
              }}
            >
              Skip rest
            </button>
          )}
        </div>
      </div>
      {!data.workout.length && (
        <section className="workout-empty">
          <span className="eyebrow">A FRESH START</span>
          <h2>What are you training today?</h2>
          <p>Add movements from the library or create your own variation.</p>
          <Button
            onClick={() => useSimulationStore.getState().setTab('Movements')}
          >
            Explore movements <Plus size={15} />
          </Button>
        </section>
      )}
      <div className="workout-items">
        {data.workout.map((item, index) => {
          const timed = ['Core', 'Carry'].includes(item.movement.pattern);
          return (
            <article key={item.id} className="workout-item">
              <div className="workout-item-heading">
                <span className="workout-number">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h2>{item.movement.name}</h2>
                  <p>
                    {item.movement.equipment} · {item.movement.pattern} ·{' '}
                    {item.movement.range}% ROM
                  </p>
                </div>
                <div className="workout-order">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === 0}
                    aria-label={`Move ${item.movement.name} up`}
                    onClick={() => reorder(index, -1)}
                  >
                    <ArrowUp size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === data.workout.length - 1}
                    aria-label={`Move ${item.movement.name} down`}
                    onClick={() => reorder(index, 1)}
                  >
                    <ArrowDown size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${item.movement.name}`}
                    onClick={() =>
                      update((d) => ({
                        ...d,
                        workout: d.workout.filter((x) => x.id !== item.id),
                      }))
                    }
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              <div className="workout-prescription">
                {(
                  [
                    { key: 'sets', label: 'Sets', min: 1, max: 20 },
                    {
                      key: 'reps',
                      label: timed ? 'Seconds / set' : 'Reps / set',
                      min: 1,
                      max: 300,
                    },
                    {
                      key: 'load',
                      label: 'Total load · kg',
                      min: 0,
                      max: 1000,
                    },
                    { key: 'rest', label: 'Rest · seconds', min: 0, max: 600 },
                  ] as const
                ).map((field) => (
                  <label key={field.key}>
                    {field.label}
                    <Input
                      aria-label={`${item.movement.name}: ${field.label}`}
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.key === 'load' ? 0.5 : 1}
                      value={item[field.key]}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (
                          !Number.isFinite(value) ||
                          value < field.min ||
                          value > field.max
                        )
                          return;
                        const n =
                          field.key === 'load' ? value : Math.round(value);
                        patch(item.id, {
                          [field.key]: n,
                          ...(field.key === 'sets'
                            ? { completed: Math.min(n, item.completed) }
                            : {}),
                        });
                      }}
                    />
                  </label>
                ))}
              </div>
              <div className="workout-log">
                <div className="workout-set-buttons">
                  {Array.from({ length: item.sets }, (_, i) => (
                    <button
                      key={i}
                      className={i < item.completed ? 'done' : ''}
                      aria-label={`${item.movement.name}: ${i < item.completed ? 'Undo from' : 'Complete through'} set ${i + 1}`}
                      onClick={() => {
                        const completed = i < item.completed ? i : i + 1;
                        patch(item.id, { completed });
                        if (completed > item.completed && item.rest)
                          setRestUntil(Date.now() + item.rest * 1000);
                      }}
                    >
                      {i < item.completed ? <Check size={13} /> : i + 1}
                    </button>
                  ))}
                </div>
                <span>
                  {item.completed} / {item.sets} complete
                </span>
              </div>
              <Input
                aria-label={`${item.movement.name}: notes`}
                placeholder="Notes, effort, or a cue for next time…"
                maxLength={2000}
                value={item.notes}
                onChange={(e) => patch(item.id, { notes: e.target.value })}
              />
            </article>
          );
        })}
      </div>
      <div className="movement-actions">
        <Button disabled={!done || !library.ready} onClick={finish}>
          <Check size={15} /> Finish session
        </Button>
        {data.workout.length > 0 && (
          <Button
            variant="outline"
            onClick={() => {
              if (
                window.confirm(
                  'Clear the current workout? Saved sessions stay in history.',
                )
              )
                update((d) => ({ ...d, workout: [] }));
            }}
          >
            Clear workout
          </Button>
        )}
      </div>
      <p className="workout-help">
        Load is the total external weight, including both dumbbells. Timed
        movements use seconds per set. Set prescriptions apply to every set; use
        notes for changes.
      </p>
      <section className="workout-history">
        <div className="movement-detail-title">
          <div>
            <span className="eyebrow">YOUR TRAINING RECORD</span>
            <h2>Recent sessions</h2>
          </div>
          <span>Last 30 sessions</span>
        </div>
        {!data.history.length ? (
          <p>Completed sessions appear here.</p>
        ) : (
          data.history.map((session) => (
            <details key={session.id}>
              <summary>
                <span>
                  <strong>{session.name || 'Workout'}</strong>
                  <small>
                    {new Date(session.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    · {session.items.reduce((n, x) => n + x.completed, 0)} sets
                    · {session.items.length} movements
                  </small>
                </span>
                <span>View session +</span>
              </summary>
              <div className="history-detail">
                {session.items.map((x) => (
                  <p key={x.id}>
                    <strong>{x.movement.name}</strong> {x.completed} × {x.reps}
                    {['Core', 'Carry'].includes(x.movement.pattern)
                      ? ' sec'
                      : ' reps'}{' '}
                    · {x.load} kg{x.notes && <small>{x.notes}</small>}
                  </p>
                ))}
                <Button
                  variant="outline"
                  onClick={() => {
                    if (
                      !data.workout.length ||
                      window.confirm(
                        'Replace your current workout with this session?',
                      )
                    ) {
                      update((d) => ({
                        ...d,
                        workoutName: session.name,
                        workout: session.items.map((x) => ({
                          ...x,
                          id: crypto.randomUUID(),
                          completed: 0,
                        })),
                      }));
                      setNotice('Session copied into your current workout.');
                    }
                  }}
                >
                  Use this workout again
                </Button>
              </div>
            </details>
          ))
        )}
      </section>
      <section className="library-backup">
        <div>
          <h3>Your library travels with you.</h3>
          <p>
            Saved on the server for this browser’s private library ID. Export a
            backup to move to another browser or keep a copy before clearing
            cookies.
          </p>
        </div>
        <div className="movement-actions">
          <Button
            variant="outline"
            disabled={!library.ready}
            onClick={() => exportLibrary(data)}
          >
            <Download size={14} /> Export library
          </Button>
          <Button
            variant="outline"
            disabled={!library.ready}
            onClick={() => file.current?.click()}
          >
            <Upload size={14} /> Import backup
          </Button>
          <input
            ref={file}
            hidden
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f);
              e.target.value = '';
            }}
          />
        </div>
      </section>
      {notice && <output className="movement-notice">{notice}</output>}
    </main>
  );
}
