import type { MuscleId } from '../engine/types';
export const muscles: {
  id: MuscleId;
  name: string;
  short: string;
  region: string;
  color: string;
  action: string;
}[] = [
  {
    id: 'pecSternal',
    name: 'Sternocostal pec',
    short: 'Sternal pec',
    region: 'MID + LOWER CHEST',
    color: '#d0f991',
    action: 'Modeled shoulder horizontal adduction.',
  },
  {
    id: 'pecClavicular',
    name: 'Clavicular pec',
    short: 'Upper pec',
    region: 'UPPER CHEST',
    color: '#a6b9ee',
    action: 'Modeled shoulder flexion and horizontal adduction.',
  },
  {
    id: 'anteriorDelt',
    name: 'Anterior deltoid',
    short: 'Front delt',
    region: 'FRONT SHOULDER',
    color: '#e5ad7a',
    action: 'Modeled contribution to shoulder flexion.',
  },
  {
    id: 'triceps',
    name: 'Triceps brachii',
    short: 'Triceps',
    region: 'BACK OF UPPER ARM',
    color: '#7bc1c3',
    action: 'Modeled contribution to elbow extension.',
  },
];
