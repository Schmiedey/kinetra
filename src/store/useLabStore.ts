import { create } from 'zustand';
import { catalog, type GroupId, type Movement } from '../movements/catalog';
import { suggestedLoadKg, tissueCalibration } from '../engine/tissueLoad';
import { simulateMovement, type MovementSim } from '../movements/simulateMovement';
import { clamp } from '../engine/vector';

interface LabStore {
  movement: Movement;
  loadKg: number;
  bodyMassKg: number;
  progress: number;
  playing: boolean;
  direction: 1 | -1;
  bones: boolean;
  selectedGroup: GroupId | null;
  view: '3D' | 'Front' | 'Side' | 'Back';
  sim: MovementSim;
  open: (movement: Movement, loadKg?: number) => void;
  setLoad: (loadKg: number) => void;
  setBodyMass: (bodyMassKg: number) => void;
  setProgress: (progress: number) => void;
  setPlaying: (playing: boolean) => void;
  setBones: (bones: boolean) => void;
  setView: (view: LabStore['view']) => void;
  setGroup: (group: GroupId | null) => void;
  setSettings: (patch: {
    angle?: number;
    range?: number;
    stance?: number;
    gripAngle?: number;
  }) => void;
  tick: (dt: number) => void;
}

const first = catalog[0];
const firstLoad = suggestedLoadKg(first.pattern, first.equipment);

function compute(movement: Movement, loadKg: number, bodyMassKg: number) {
  return simulateMovement(movement, loadKg, bodyMassKg);
}

export const useLabStore = create<LabStore>((set, get) => ({
  movement: first,
  loadKg: firstLoad,
  bodyMassKg: tissueCalibration.bodyMassKg,
  progress: 0.38,
  playing: false,
  direction: 1,
  bones: false,
  selectedGroup: null,
  view: '3D',
  sim: compute(first, firstLoad, tissueCalibration.bodyMassKg),
  open: (movement, loadKg) => {
    const nextLoad =
      loadKg ?? suggestedLoadKg(movement.pattern, movement.equipment);
    const bodyMassKg = get().bodyMassKg;
    set({
      movement,
      loadKg: nextLoad,
      progress: 0.38,
      playing: false,
      selectedGroup: null,
      sim: compute(movement, nextLoad, bodyMassKg),
    });
  },
  setLoad: (loadKg) => {
    const next = clamp(loadKg, 0, 500);
    const { movement, bodyMassKg } = get();
    set({
      loadKg: next,
      playing: false,
      sim: compute(movement, next, bodyMassKg),
    });
  },
  setBodyMass: (bodyMassKg) => {
    const next = clamp(bodyMassKg, 40, 180);
    const { movement, loadKg } = get();
    set({
      bodyMassKg: next,
      sim: compute(movement, loadKg, next),
    });
  },
  setProgress: (progress) => set({ progress: clamp(progress), playing: false }),
  setPlaying: (playing) => set({ playing }),
  setBones: (bones) => set({ bones }),
  setView: (view) => set({ view }),
  setGroup: (selectedGroup) => set({ selectedGroup }),
  setSettings: (patch) => {
    const movement = { ...get().movement, ...patch };
    const { loadKg, bodyMassKg } = get();
    set({
      movement,
      sim: compute(movement, loadKg, bodyMassKg),
    });
  },
  tick: (dt) => {
    const { playing, progress, direction } = get();
    if (!playing) return;
    let next = progress + Math.min(dt, 0.08) * 0.32 * direction;
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
}));
