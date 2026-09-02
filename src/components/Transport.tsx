import { useEffect } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useSimulationStore } from '../store/useSimulationStore';
export function AnimationClock() {
  const playing = useSimulationStore((s) => s.playing);
  useEffect(() => {
    if (!playing) return;
    let id = 0,
      previous = performance.now();
    const loop = (now: number) => {
      useSimulationStore.getState().tick((now - previous) / 1000);
      previous = now;
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [playing]);
  return null;
}
export default function Transport() {
  const progress = useSimulationStore((s) => s.progress),
    playing = useSimulationStore((s) => s.playing),
    speed = useSimulationStore((s) => s.speed),
    setProgress = useSimulationStore((s) => s.setProgress),
    setPlaying = useSimulationStore((s) => s.setPlaying);
  return (
    <div className="transport">
      <Button
        className="play-button"
        variant="secondary"
        onClick={() => setPlaying(!playing)}
        aria-label={playing ? 'Pause rep' : 'Play rep'}
      >
        {playing ? <Pause size={13} /> : <Play size={13} />}
        <span>{playing ? 'Pause' : 'Play rep'}</span>
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Reset rep to bottom"
        onClick={() => setProgress(0)}
      >
        <RotateCcw size={13} />
      </Button>
      <div className="scrubber">
        <Slider
          aria-label="Rep position"
          value={[Math.round(progress * 100)]}
          min={0}
          max={100}
          step={1}
          onValueChange={(v) =>
            setProgress((Array.isArray(v) ? v[0] : v) / 100)
          }
        />
        <div className="range-labels">
          <span>BOTTOM</span>
          <span>LOCKOUT</span>
        </div>
      </div>
      <output>
        {Math.round(progress * 100)}
        <small>%</small>
      </output>
      <button
        className="speed"
        aria-label="Change playback speed"
        onClick={() =>
          useSimulationStore.setState({
            speed: speed === 1 ? 0.5 : speed === 0.5 ? 1.5 : 1,
          })
        }
      >
        {speed}×
      </button>
    </div>
  );
}
