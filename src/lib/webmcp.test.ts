import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { registerKinetraTools } from './webmcp';
import { useSimulationStore as store } from '../store/useSimulationStore';
const original = store.getState();
beforeEach(() => store.setState(original, true));
afterEach(() => vi.unstubAllGlobals());
describe('optional WebMCP tool contract (simulated context)', () => {
  it('registers, updates shared state, reads back, rejects invalid patches, and cleans up', async () => {
    const calls: {
      tool: {
        name: string;
        annotations: { readOnlyHint: boolean };
        execute: (input: unknown) => unknown;
        inputSchema: object;
      };
      signal: AbortSignal;
    }[] = [];
    vi.stubGlobal('document', {
      modelContext: {
        registerTool: (
          tool: (typeof calls)[number]['tool'],
          opts: { signal: AbortSignal },
        ) => calls.push({ tool, signal: opts.signal }),
      },
    });
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
      callback();
      return 1;
    });
    const cleanup = registerKinetraTools();
    expect(calls.map((c) => c.tool.name)).toEqual([
      'configure_bench_simulation',
      'read_bench_simulation',
    ]);
    expect(calls[0].tool.annotations.readOnlyHint).toBe(false);
    expect(calls[1].tool.annotations.readOnlyHint).toBe(true);
    await calls[0].tool.execute({ benchAngleDeg: 30, loadKg: 95 });
    expect(store.getState().config.benchAngleDeg).toBe(30);
    expect(store.getState().result.config.loadKg).toBe(95);
    const read = calls[1].tool.execute({}) as { config: { loadKg: number } };
    expect(read.config.loadKg).toBe(95);
    const before = store.getState().config;
    await expect(calls[0].tool.execute({ loadKg: Infinity })).rejects.toThrow();
    await expect(calls[0].tool.execute({ madeUp: 2 })).rejects.toThrow();
    await expect(calls[0].tool.execute({ rir: 1.5 })).rejects.toThrow();
    expect(store.getState().config).toBe(before);
    expect(() => calls[1].tool.execute({ unknown: true })).toThrow();
    cleanup?.();
    expect(calls.every((c) => c.signal.aborted)).toBe(true);
  });
  it('works normally in browsers without this optional API', () => {
    vi.stubGlobal('document', {});
    expect(registerKinetraTools()).toBeUndefined();
  });
});
