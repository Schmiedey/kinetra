import { create } from 'zustand';
import type {
  BenchConfig,
  SimulationResult,
  VisualizationMode,
  CameraMode,
  MuscleId,
} from '../engine/types';
import { simulate, sanitizeConfig } from '../engine/simulate';
import { defaultConfig } from '../exercises/benchPress';
import { clamp } from '../engine/vector';
export interface ComparisonSlot {
  name: string;
  config: BenchConfig;
}
interface SimulationStore {
  config: BenchConfig;
  result: SimulationResult;
  baseline: SimulationResult;
  progress: number;
  playing: boolean;
  direction: 1 | -1;
  speed: number;
  mode: VisualizationMode;
  camera: CameraMode;
  jointsVisible: boolean;
  bonesVisible: boolean;
  muscleOpacity: number;
  selectedMuscle: MuscleId | null;
  tab: 'Movements' | 'Workout' | 'Sandbox' | 'Compare' | 'Research';
  slots: ComparisonSlot[];
  locks: (keyof BenchConfig)[];
  updateConfig: (patch: Partial<BenchConfig>) => void;
  reset: () => void;
  setProgress: (p: number) => void;
  setPlaying: (p: boolean) => void;
  tick: (dt: number) => void;
  setMode: (m: VisualizationMode) => void;
  setCamera: (m: CameraMode) => void;
  setTab: (t: SimulationStore['tab']) => void;
  setBaseline: () => void;
  updateSlot: (i: number, patch: Partial<BenchConfig>) => void;
  toggleLock: (k: keyof BenchConfig) => void;
  saveToSlot: (i: number) => void;
}
const initial = simulate(defaultConfig);
export const useSimulationStore = create<SimulationStore>((set, get) => ({
  config: { ...defaultConfig },
  result: initial,
  baseline: initial,
  progress: 0.22,
  playing: false,
  direction: 1,
  speed: 1,
  mode: 'demand',
  bonesVisible: true,
  muscleOpacity: 0.78,
  selectedMuscle: null,
  camera: '3D',
  jointsVisible: true,
  tab: 'Movements',
  slots: [
    { name: 'A', config: { ...defaultConfig } },
    { name: 'B', config: { ...defaultConfig, benchAngleDeg: 30 } },
    { name: 'C', config: { ...defaultConfig, benchAngleDeg: 45 } },
  ],
  locks: ['gripWidthRatio', 'romPercent', 'rir', 'loadKg', 'reps'],
  updateConfig: (patch) => {
    const config = sanitizeConfig({ ...get().config, ...patch });
    set({ config, result: simulate(config) });
  },
  reset: () =>
    set({
      config: { ...defaultConfig },
      result: initial,
      progress: 0.22,
      playing: false,
      direction: 1,
    }),
  setProgress: (p) => set({ progress: clamp(p), playing: false }),
  setPlaying: (playing) => set({ playing }),
  tick: (dt) => {
    const { playing, progress, direction, speed } = get();
    if (!playing) return;
    let next = progress + (Math.min(dt, 0.1) * direction * speed) / 2;
    let dir = direction;
    if (next >= 1) {
      next = 1;
      dir = -1;
    }
    if (next <= 0) {
      next = 0;
      dir = 1;
    }
    set({ progress: next, direction: dir });
  },
  setMode: (mode) => set({ mode }),
  setCamera: (camera) => set({ camera }),
  setTab: (tab) => set({ tab, playing: false }),
  setBaseline: () => set({ baseline: get().result }),
  updateSlot: (i, patch) =>
    set((s) => ({
      slots: s.slots.map((slot, j) => ({
        ...slot,
        config: sanitizeConfig({
          ...slot.config,
          ...Object.fromEntries(
            Object.entries(patch).filter(
              ([key]) => j === i || s.locks.includes(key as keyof BenchConfig),
            ),
          ),
        }),
      })),
    })),
  toggleLock: (key) =>
    set((s) => {
      const locked = s.locks.includes(key);
      return {
        locks: locked ? s.locks.filter((k) => k !== key) : [...s.locks, key],
        slots: locked
          ? s.slots
          : s.slots.map((slot) => ({
              ...slot,
              config: { ...slot.config, [key]: s.slots[0].config[key] },
            })),
      };
    }),
  saveToSlot: (i) => {
    get().updateSlot(i, get().config);
    set({ tab: 'Compare', playing: false });
  },
}));
