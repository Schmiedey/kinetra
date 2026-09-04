import { lazy, Suspense, useEffect, useState } from 'react';
import { Activity, FlaskConical, Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSimulationStore } from './store/useSimulationStore';
import Sandbox from './components/Sandbox';
import Methodology, { Research } from './components/Methodology';
import ExplainChanges from './components/ExplainChanges';
import { AnimationClock } from './components/Transport';
import { registerLiftLabTools } from './lib/webmcp';
import { useLibrary, exportLibrary } from './movements/useLibrary';
const MovementLibrary = lazy(() => import('./movements/MovementLibrary'));
const Workout = lazy(() => import('./movements/Workout'));
const Compare = lazy(() => import('./components/Compare'));

const tabs = [
  ['Movements', 'Lab'],
  ['Workout', 'Session'],
  ['Sandbox', 'Bench'],
  ['Compare', 'Compare'],
  ['Research', 'Notes'],
] as const;

export default function App() {
  const library = useLibrary();
  const tab = useSimulationStore((s) => s.tab),
    setTab = useSimulationStore((s) => s.setTab),
    saveToSlot = useSimulationStore((s) => s.saveToSlot);
  const [methodology, setMethodology] = useState(false),
    [explain, setExplain] = useState(false),
    [saveMenu, setSaveMenu] = useState(false);
  useEffect(() => registerLiftLabTools(), []);
  function exportResults() {
    const s = useSimulationStore.getState();
    const blob = new Blob(
      [
        JSON.stringify(
          {
            model: 'LiftLab bench v0.1',
            notice:
              'Comparative model estimates, not measured hypertrophy. External moments assume only vertical load.',
            sandbox: s.result,
            comparisons: s.slots,
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
    a.download = 'liftlab-simulation.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="app">
      <AnimationClock />
      <header className="topbar">
        <a
          className="brand"
          href="#lab"
          onClick={() => setTab('Movements')}
        >
          <Activity />
          <b>
            LiftLab<span>®</span>
          </b>
        </a>
        <nav aria-label="Main navigation">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? 'active' : ''}
              onClick={() => {
                setTab(id);
                setSaveMenu(false);
              }}
              aria-current={tab === id ? 'page' : undefined}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="topbar-end">
          <span className="version">
            LOAD LAB <i /> v0.2
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open methodology"
            onClick={() => setMethodology(true)}
          >
            <FlaskConical size={16} />
          </Button>
        </div>
      </header>
      {(tab === 'Movements' || tab === 'Workout') && (
        <output className="library-save-status">
          <span className={library.error ? 'save-error' : ''}>
            {library.error || library.status}
          </span>
          {library.error && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  library.ready ? library.retry() : window.location.reload()
                }
              >
                Retry
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportLibrary(library.data)}
              >
                Export
              </Button>
            </>
          )}
        </output>
      )}
      {tab === 'Sandbox' && (
        <div className="workspace-title">
          <div>
            <span className="eyebrow">4-MUSCLE BENCH MODEL</span>
            <h1>Barbell bench mechanics</h1>
          </div>
          <div className="workspace-actions">
            <span className="status">
              <i /> Live
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Export simulation results"
              onClick={exportResults}
            >
              <Download size={15} />
            </Button>
            <div className="save-wrap">
              <Button
                variant="outline"
                className="compare-save"
                onClick={() => setSaveMenu(!saveMenu)}
                aria-expanded={saveMenu}
              >
                <Copy size={13} /> Save to compare
              </Button>
              {saveMenu && (
                <div className="save-menu">
                  {['A', 'B', 'C'].map((s, i) => (
                    <button
                      key={s}
                      onClick={() => {
                        saveToSlot(i);
                        setSaveMenu(false);
                      }}
                    >
                      Replace setup {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {tab === 'Movements' || tab === 'Workout' ? (
        <Suspense fallback={<div className="page-loading">Opening lab…</div>}>
          {tab === 'Movements' ? (
            <MovementLibrary library={library} />
          ) : (
            <Workout library={library} />
          )}
        </Suspense>
      ) : tab === 'Sandbox' ? (
        <Sandbox
          onMethodology={() => setMethodology(true)}
          onExplain={() => setExplain(true)}
        />
      ) : tab === 'Compare' ? (
        <Suspense fallback={<div className="page-loading">Opening compare…</div>}>
          <Compare onMethodology={() => setMethodology(true)} />
        </Suspense>
      ) : (
        <Research />
      )}
      {tab !== 'Movements' && (
        <footer className="page-footer">
          <span>LiftLab / load lab v0.2</span>
          <span>
            Static r × F moments.{' '}
            <button onClick={() => setMethodology(true)}>Model limits</button>
          </span>
        </footer>
      )}
      <Methodology open={methodology} onClose={() => setMethodology(false)} />
      <ExplainChanges open={explain} onClose={() => setExplain(false)} />
    </div>
  );
}
