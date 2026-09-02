import { beforeEach, describe, it, expect } from 'vitest';
import { useSimulationStore as store } from './useSimulationStore';
import { defaultConfig } from '../exercises/benchPress';
import { frameAt, simulate } from '../engine/simulate';
import { explainChanges } from '../engine/explain';
const original = store.getState();
beforeEach(() => store.setState(original, true));
describe('shared simulation state', () => {
  it('updates paused pose and charts from exactly the same simulation result', () => {
    store.getState().setProgress(0.42);
    store.getState().updateConfig({ benchAngleDeg: 45, gripWidthRatio: 1.2 });
    const s = store.getState();
    expect(s.playing).toBe(false);
    expect(s.result.config).toEqual(s.config);
    const frame = frameAt(s.result, s.progress);
    expect(frame).toBe(s.result.frames[42]);
    expect(frame.barPosition).not.toEqual(
      frameAt(original.result, 0.42).barPosition,
    );
  });
  it('scrubbing pauses and clamps the animation', () => {
    store.getState().setPlaying(true);
    store.getState().tick(0.05);
    expect(store.getState().progress).toBeGreaterThan(original.progress);
    store.getState().setProgress(3);
    expect(store.getState().progress).toBe(1);
    expect(store.getState().playing).toBe(false);
  });
  it('animation reverses at lockout and bottom', () => {
    store.setState({ progress: 0.999, playing: true, direction: 1 });
    store.getState().tick(0.1);
    expect(store.getState().progress).toBe(1);
    expect(store.getState().direction).toBe(-1);
    store.setState({ progress: 0.001 });
    store.getState().tick(0.1);
    expect(store.getState().progress).toBe(0);
    expect(store.getState().direction).toBe(1);
  });
  it('locked edits propagate and unlocked angles stay independent', () => {
    store.getState().updateSlot(1, { loadKg: 100, benchAngleDeg: 50 });
    expect(store.getState().slots.map((s) => s.config.loadKg)).toEqual([
      100, 100, 100,
    ]);
    expect(store.getState().slots.map((s) => s.config.benchAngleDeg)).toEqual([
      0, 50, 45,
    ]);
  });
  it('unlocking isolates edits and relocking adopts slot A consistently', () => {
    store.getState().toggleLock('loadKg');
    store.getState().updateSlot(2, { loadKg: 40 });
    expect(store.getState().slots.map((s) => s.config.loadKg)).toEqual([
      80, 80, 40,
    ]);
    store.getState().toggleLock('loadKg');
    expect(store.getState().slots.map((s) => s.config.loadKg)).toEqual([
      80, 80, 80,
    ]);
  });
  it('saving the current sandbox copies the complete configuration and honors locks', () => {
    store
      .getState()
      .updateConfig({ benchAngleDeg: -15, loadKg: 90, romPercent: 80 });
    store.getState().saveToSlot(1);
    const s = store.getState();
    expect(s.slots[1].config).toEqual(s.config);
    expect(s.slots[0].config.loadKg).toBe(90);
    expect(s.tab).toBe('Compare');
  });
  it('explanations report real deltas and distinguish unchanged mechanics from RIR', () => {
    const current = simulate({ ...defaultConfig, rir: 0 });
    const explanation = explainChanges(original.result, current);
    expect(explanation.shoulderDelta).toBe(0);
    expect(explanation.elbowDelta).toBe(0);
    expect(explanation.changes.some((c) => c.delta > 0)).toBe(true);
    expect(explanation.notes.join(' ')).toContain(
      'Only the heuristic effort factor',
    );
  });
});
