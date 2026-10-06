import { useSimulationStore } from '../store/useSimulationStore';
import { configBounds } from '../data/calibration';
import type { BenchConfig } from '../engine/types';
interface ModelContext {
  registerTool(
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ): void | Promise<void>;
}
export function validatePatch(input: unknown): Partial<BenchConfig> {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Expected a configuration object.');
  for (const [key, value] of Object.entries(input)) {
    if (!(key in configBounds))
      throw new Error(`Unknown configuration parameter: ${key}`);
    const [min, max] = configBounds[key as keyof BenchConfig];
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < min ||
      value > max
    )
      throw new Error(
        `${key} must be a finite number between ${min} and ${max}.`,
      );
    if ((key === 'reps' || key === 'rir') && !Number.isInteger(value))
      throw new Error(`${key} must be an integer.`);
  }
  return input as Partial<BenchConfig>;
}
export function readSimulation() {
  const s = useSimulationStore.getState();
  return {
    config: s.config,
    muscles: s.result.muscles,
    peakShoulderMomentNm: s.result.peakShoulderMomentNm,
    peakElbowMomentNm: s.result.peakElbowMomentNm,
    loadedExcursionM: s.result.loadedExcursionM,
    notice:
      'Simplified vertical-force model. Muscle and stimulus values are estimates.',
  };
}
export function registerKinetraTools() {
  const context = (document as Document & { modelContext?: ModelContext })
    .modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  const register = (tool: Parameters<ModelContext['registerTool']>[0]) => {
    try {
      void Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {
      /* Optional browser capability: app remains fully functional. */
    }
  };
  register({
    name: 'configure_bench_simulation',
    description:
      'Update the visible Kinetra bench configuration and return the recalculated mechanics and comparative estimates.',
    inputSchema: {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(configBounds).map(([key, [min, max]]) => [
          key,
          {
            type: key === 'rir' || key === 'reps' ? 'integer' : 'number',
            minimum: min,
            maximum: max,
          },
        ]),
      ),
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: async (input) => {
      const patch = validatePatch(input);
      const s = useSimulationStore.getState();
      s.updateConfig(patch);
      s.setTab('Sandbox');
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      return readSimulation();
    },
  });
  register({
    name: 'read_bench_simulation',
    description:
      'Read the current bench configuration, calculated joint moments and modeled muscle estimates.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: (input) => {
      if (!input || typeof input !== 'object' || Object.keys(input).length)
        throw new Error('Expected an empty object.');
      return readSimulation();
    },
  });
  return () => lifecycle.abort();
}
