import { useMemo, useState } from 'react';
import { Activity, Info } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  BarChart,
  Bar,
} from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { useSimulationStore } from '../../store/useSimulationStore';
import { muscles } from '../../data/muscles';
const seriesConfig = Object.fromEntries([
  ...muscles.map((m) => [m.id, { label: m.short, color: m.color }]),
  ['shoulder', { label: 'Shoulder', color: '#315fe8' }],
  ['elbow', { label: 'Elbow', color: '#8460c7' }],
]);
const tabs = [
  'Joint moments',
  'Muscle demand',
  'Muscle length',
  'Stimulus',
] as const;
const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid #d3ddeb',
  borderRadius: 6,
  fontSize: 11,
  color: '#17223b',
};
export default function SimulationCharts({
  onMethodology,
}: {
  onMethodology: () => void;
}) {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Joint moments');
  const result = useSimulationStore((s) => s.result),
    progress = useSimulationStore((s) => s.progress);
  const data = useMemo(
    () =>
      result.frames.map((f) => ({
        position: Math.round(f.progress * 100),
        shoulder: f.moments.shoulder,
        elbow: f.moments.elbow,
        ...Object.fromEntries(
          muscles.map((m) => [
            m.id,
            (tab === 'Muscle length'
              ? f.muscleLengths[m.id]
              : f.muscleDemand[m.id]) * 100,
          ]),
        ),
      })),
    [result, tab],
  );
  const breakdown = useMemo(
    () =>
      muscles.map((m) => {
        const r = result.muscles.find((x) => x.id === m.id)!;
        return {
          name: m.short,
          tension: r.mechanicalDemand * 100,
          length: r.lengthenedExposure * 100,
          effort: r.effortFactor * 100,
          stimulus: r.estimatedStimulus,
        };
      }),
    [result],
  );
  const isMoments = tab === 'Joint moments';
  return (
    <section className="charts-section">
      <div className="chart-nav">
        <div role="tablist" aria-label="Simulation charts">
          {tabs.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? 'active' : ''}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <button className="chart-info" onClick={onMethodology}>
          <Info size={12} />
          <span>
            {isMoments
              ? 'Calculated · per arm'
              : tab === 'Stimulus'
                ? 'Experimental estimate'
                : 'Modeled estimate'}
          </span>
        </button>
      </div>
      <div className="chart-content" role="tabpanel" aria-label={tab}>
        <div className="chart-summary">
          <span className="eyebrow">
            {isMoments
              ? 'EXTERNAL JOINT MOMENTS'
              : tab === 'Stimulus'
                ? 'ESTIMATED STIMULUS INDEX'
                : tab.toUpperCase()}
          </span>
          <h3>
            {isMoments
              ? 'Leverage through the lift.'
              : tab === 'Muscle length'
                ? 'Longer. Shorter. In motion.'
                : tab === 'Stimulus'
                  ? 'The factors behind the estimate.'
                  : 'Where the demand goes.'}
          </h3>
          <p>
            {isMoments
              ? 'Vertical-load moments across the concentric rep.'
              : tab === 'Muscle length'
                ? 'Normalized within this model. Not measured fiber length.'
                : tab === 'Stimulus'
                  ? 'Tension, lengthened tension, and effort shown separately.'
                  : 'Relative modeled demand. Not measured activation.'}
          </p>
          <div className="chart-legend">
            {(isMoments
              ? [
                  { name: 'Shoulder', color: '#315fe8' },
                  { name: 'Elbow', color: '#8460c7' },
                ]
              : tab === 'Stimulus'
                ? [
                    { name: 'Tension', color: '#315fe8' },
                    { name: 'Lengthened tension', color: '#8460c7' },
                    { name: 'Effort', color: '#16898f' },
                    { name: 'Stimulus index', color: '#b66430' },
                  ]
                : muscles.map((m) => ({ name: m.short, color: m.color }))
            ).map((m) => (
              <span key={m.name}>
                <i style={{ background: m.color }} />
                {m.name}
              </span>
            ))}
          </div>
          {isMoments && (
            <div className="peak-readout">
              <Activity size={15} />
              <span>
                Peak shoulder{' '}
                <b>
                  {Math.round(result.peakShoulderMomentNm)} <small>Nm</small>
                </b>
              </span>
            </div>
          )}
        </div>
        <div className="chart-plot">
          <span className="axis-label">
            {isMoments
              ? 'Nm'
              : tab === 'Stimulus'
                ? 'INDEX / 100'
                : 'NORMALIZED / 100'}
          </span>
          <ChartContainer config={seriesConfig} className="main-chart">
            {tab === 'Stimulus' ? (
              <BarChart
                data={breakdown}
                margin={{ top: 15, right: 12, bottom: 4, left: -25 }}
                barGap={3}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#dce3ed"
                  strokeDasharray="3 5"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9 }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => Math.round(Number(v))}
                />
                <Bar
                  dataKey="tension"
                  name="Tension"
                  fill="#315fe8"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="length"
                  name="Lengthened tension"
                  fill="#8460c7"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="effort"
                  name="Effort"
                  fill="#16898f"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="stimulus"
                  name="Stimulus index"
                  fill="#b66430"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            ) : (
              <LineChart
                data={data}
                margin={{ top: 15, right: 16, bottom: 4, left: -20 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#dce3ed"
                  strokeDasharray="3 5"
                />
                <XAxis
                  type="number"
                  dataKey="position"
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(v) => `${v}%`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9 }}
                />
                <YAxis
                  domain={isMoments ? [0, 'auto'] : [0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9 }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(v) => `Rep position ${v}%`}
                  formatter={(v) =>
                    `${Math.round(Number(v))}${isMoments ? ' Nm' : ''}`
                  }
                />
                <ReferenceLine
                  x={Math.round(progress * 100)}
                  stroke="#61718d"
                  strokeDasharray="3 3"
                />
                {(isMoments
                  ? [
                      { id: 'shoulder', name: 'Shoulder', color: '#315fe8' },
                      { id: 'elbow', name: 'Elbow', color: '#8460c7' },
                    ]
                  : muscles
                ).map((m) => (
                  <Line
                    key={m.id}
                    dataKey={m.id}
                    name={m.name}
                    stroke={m.color}
                    strokeWidth={2}
                    type="monotone"
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            )}
          </ChartContainer>
          {tab !== 'Stimulus' && (
            <div className="chart-endpoints">
              <span>BOTTOM POSITION</span>
              <span>CONCENTRIC PHASE</span>
              <span>LOCKOUT</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
