import {
  Activity,
  Info,
  FlaskConical,
  ArrowUpRight,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSimulationStore } from '../store/useSimulationStore';
import { frameAt } from '../engine/simulate';
import { muscles } from '../data/muscles';
export default function MuscleProfile({
  onMethodology,
  onExplain,
}: {
  onMethodology: () => void;
  onExplain: () => void;
}) {
  const mode = useSimulationStore((s) => s.mode),
    setMode = useSimulationStore((s) => s.setMode),
    selectedMuscle = useSimulationStore((s) => s.selectedMuscle),
    baseline = useSimulationStore((s) => s.baseline);
  const metric = mode === 'stimulus' ? 'stimulus' : 'demand';
  const setMetric = (value: 'stimulus' | 'demand') => setMode(value);
  const result = useSimulationStore((s) => s.result),
    progress = useSimulationStore((s) => s.progress);
  const frame = frameAt(result, progress);
  return (
    <aside className="panel profile">
      <div className="section-heading">
        <span>MUSCLE PROFILE</span>
        <Activity size={15} />
      </div>
      <div className="metric-switch">
        <button
          className={metric === 'stimulus' ? 'selected' : ''}
          onClick={() => setMetric('stimulus')}
        >
          Estimated stimulus
        </button>
        <button
          className={metric === 'demand' ? 'selected' : ''}
          onClick={() => setMetric('demand')}
        >
          Demand
        </button>
      </div>
      <div className="profile-subtitle">
        <span>
          {metric === 'stimulus'
            ? 'Estimated Stimulus Index'
            : 'Current mechanical demand'}
        </span>
        <button aria-label="How is this calculated?" onClick={onMethodology}>
          <Info size={12} />
        </button>
      </div>
      {muscles.map((m) => {
        const r = result.muscles.find((x) => x.id === m.id)!;
        const score =
          metric === 'stimulus'
            ? r.estimatedStimulus
            : frame.muscleDemand[m.id] * 100;
        return (
          <details
            className="muscle-row"
            key={m.id}
            open={selectedMuscle === m.id}
            data-selected={selectedMuscle === m.id}
          >
            <summary
              onClick={(event) => {
                event.preventDefault();
                useSimulationStore.setState({
                  selectedMuscle: selectedMuscle === m.id ? null : m.id,
                });
              }}
            >
              <div className="muscle-title">
                <div>
                  <span className="muscle-label">
                    <i style={{ background: m.color }} />
                    {m.name}
                  </span>
                  <span className="muscle-region">{m.region}</span>
                </div>
                <strong>
                  {Math.round(score)}
                  <small>/100</small>
                </strong>
              </div>
              <div className="meter">
                <span style={{ width: `${score}%`, background: m.color }} />
              </div>
              <div className="muscle-foot">
                <span>
                  {metric === 'stimulus'
                    ? 'Experimental estimate'
                    : `At ${Math.round(progress * 100)}% of rep`}
                </span>
                <ChevronDown size={10} />
              </div>
            </summary>
            <div className="muscle-detail">
              <div>
                Change vs reference{' '}
                <b>
                  {Math.round(
                    score -
                      (metric === 'stimulus'
                        ? baseline.muscles.find((x) => x.id === m.id)!
                            .estimatedStimulus
                        : frameAt(baseline, progress).muscleDemand[m.id] * 100),
                  ) > 0
                    ? '+'
                    : ''}
                  {Math.round(
                    score -
                      (metric === 'stimulus'
                        ? baseline.muscles.find((x) => x.id === m.id)!
                            .estimatedStimulus
                        : frameAt(baseline, progress).muscleDemand[m.id] * 100),
                  )}{' '}
                  pts
                </b>
              </div>
              <div>
                Mean demand / rep{' '}
                <b>{Math.round(r.mechanicalDemand * 100)} / 100</b>
              </div>
              <div>
                Current length <b>{frame.muscleLengths[m.id].toFixed(2)}</b>
              </div>
              <div>
                Current demand{' '}
                <b>{Math.round(frame.muscleDemand[m.id] * 100)} / 100</b>
              </div>
              <div>
                Lengthened exposure{' '}
                <b>{Math.round(r.lengthenedExposure * 100)} / 100</b>
              </div>
              <div>
                Loaded ROM <b>{Math.round(r.loadedRom * 100)}%</b>
              </div>
              <p>{m.action}</p>
              <button onClick={onMethodology}>
                How is this calculated? <Info size={11} />
              </button>
            </div>
          </details>
        );
      })}
      <div className="profile-actions">
        <Button
          variant="outline"
          className="explain-button"
          onClick={onExplain}
        >
          Explain changes <ArrowUpRight size={13} />
        </Button>
      </div>
      <div className="model-note">
        <div className="confidence-label">
          <FlaskConical size={15} />
          <span>
            {metric === 'stimulus'
              ? 'LOW / EXPERIMENTAL'
              : 'MODELED / LOW–MEDIUM'}
          </span>
        </div>
        <p>
          For relative exploration.
          <br />
          Not a prediction of muscle growth.
        </p>
        <Button variant="ghost" onClick={onMethodology}>
          Explore the methodology <ArrowUpRight size={12} />
        </Button>
      </div>
    </aside>
  );
}
