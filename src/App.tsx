import { lazy, Suspense, useEffect, useState } from 'react';
import { Activity, FlaskConical, Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSimulationStore } from './store/useSimulationStore';
import Sandbox from './components/Sandbox';
import Methodology, { Research } from './components/Methodology';
import ExplainChanges from './components/ExplainChanges';
import { AnimationClock } from './components/Transport';
import { registerLiftLabTools } from './lib/webmcp';
const Compare = lazy(() => import('./components/Compare'));
export default function App() {
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
        <a className="brand" href="#sandbox" onClick={() => setTab('Sandbox')}>
          <Activity />
          <b>
            LiftLab<span>®</span>
          </b>
        </a>
        <nav aria-label="Main navigation">
          {(['Sandbox', 'Compare', 'Research'] as const).map((t) => (
            <button
              key={t}
              className={tab === t ? 'active' : ''}
              onClick={() => {
                setTab(t);
                setSaveMenu(false);
              }}
              aria-current={tab === t ? 'page' : undefined}
            >
              {t}
            </button>
          ))}
        </nav>
        <div className="topbar-end">
          <span className="version">
            BENCH LAB <i /> v0.1
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
      {tab === 'Sandbox' && (
        <div className="workspace-title">
          <div>
            <span className="eyebrow">EXPLORE THE MECHANICS</span>
            <h1>Every angle changes the lift.</h1>
          </div>
          <div className="workspace-actions">
            <span className="status">
              <i /> Live simulation
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
      {tab === 'Sandbox' ? (
        <Sandbox
          onMethodology={() => setMethodology(true)}
          onExplain={() => setExplain(true)}
        />
      ) : tab === 'Compare' ? (
        <Suspense
          fallback={<div className="page-loading">Opening comparison lab…</div>}
        >
          <Compare onMethodology={() => setMethodology(true)} />
        </Suspense>
      ) : (
        <Research />
      )}
      <footer className="page-footer">
        <span>LIFTLAB / BENCH PRESS V0.1</span>
        <span>
          Calculated mechanics. Modeled muscle behavior.{' '}
          <button onClick={() => setMethodology(true)}>
            Know the difference ↗
          </button>
        </span>
      </footer>
      <Methodology open={methodology} onClose={() => setMethodology(false)} />
      <ExplainChanges open={explain} onClose={() => setExplain(false)} />
    </div>
  );
}
