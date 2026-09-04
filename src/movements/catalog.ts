export const muscleGroups = {
  chest: 'Chest',
  frontDelts: 'Front delts',
  sideDelts: 'Side delts',
  rearDelts: 'Rear delts',
  triceps: 'Triceps',
  biceps: 'Biceps',
  lats: 'Lats',
  upperBack: 'Upper back',
  core: 'Core',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
} as const;
export type GroupId = keyof typeof muscleGroups;
export const patterns = [
  'Horizontal press',
  'Vertical press',
  'Horizontal pull',
  'Vertical pull',
  'Squat',
  'Hinge',
  'Lunge',
  'Elbow flexion',
  'Elbow extension',
  'Shoulder raise',
  'Knee extension',
  'Knee flexion',
  'Calf raise',
  'Hip extension',
  'Core',
  'Carry',
] as const;
export type Pattern = (typeof patterns)[number];
export const equipmentOptions = [
  'Barbell',
  'Dumbbells',
  'Cable',
  'Machine',
  'Bodyweight',
  'Kettlebell',
  'Band',
] as const;
export type Equipment = (typeof equipmentOptions)[number];
export function angleControl(
  m: Movement,
): { label: string; min: number; max: number } | null {
  if (m.pattern === 'Horizontal press' && m.equipment !== 'Bodyweight')
    return { label: 'Bench angle', min: -20, max: 60 };
  if (
    m.pattern === 'Horizontal pull' &&
    !['Cable', 'Machine'].includes(m.equipment)
  )
    return { label: 'Torso angle', min: 20, max: 75 };
  if (m.pattern === 'Squat')
    return { label: 'Torso lean', min: -20, max: 45 };
  if (m.pattern === 'Hinge')
    return { label: 'Torso angle', min: -20, max: 20 };
  if (m.pattern === 'Shoulder raise')
    return { label: 'Raise plane', min: 0, max: 90 };
  if (m.pattern === 'Elbow extension')
    return { label: 'Upper arm angle', min: 0, max: 90 };
  if (m.pattern === 'Vertical press')
    return { label: 'Bar path lean', min: -15, max: 20 };
  return null;
}
export function widthControl(m: Movement): { label: string; min: number; max: number } {
  const upper = [
    'Horizontal press',
    'Vertical press',
    'Horizontal pull',
    'Vertical pull',
    'Elbow flexion',
    'Elbow extension',
    'Shoulder raise',
  ].includes(m.pattern);
  return {
    label: upper ? 'Grip width' : 'Stance width',
    min: 0.6,
    max: 1.6,
  };
}
export function gripAngleControl(m: Movement): boolean {
  return m.pattern !== 'Core' && m.equipment !== 'Machine';
}
export interface Movement {
  id: string;
  name: string;
  pattern: Pattern;
  equipment: Equipment;
  primary: GroupId[];
  secondary: GroupId[];
  cues: string[];
  notes: string;
  angle: number;
  range: number;
  stance: number;
  gripAngle?: number;
  custom?: boolean;
}
const entry = (
  id: string,
  name: string,
  pattern: Pattern,
  equipment: Equipment,
  primary: GroupId[],
  secondary: GroupId[],
  cues: string[],
  angle = 0,
): Movement => ({
  id,
  name,
  pattern,
  equipment,
  primary,
  secondary,
  cues,
  notes: '',
  angle,
  range: 100,
  stance: 1,
  gripAngle: 0,
});
const press = [
  'Keep a closed grip around the handle.',
  'Move through a controlled, comfortable range.',
  'Keep the load balanced between both sides.',
];
const pull = [
  'Keep the torso steady.',
  'Lead the pull with the elbows.',
  'Control the return without dropping the load.',
];
const legs = [
  'Keep the feet planted and knees tracking with the toes.',
  'Use a controlled depth you can repeat.',
  'Finish each rep with balance.',
];
export const catalog: Movement[] = [
  entry(
    'bench',
    'Barbell bench press',
    'Horizontal press',
    'Barbell',
    ['chest'],
    ['frontDelts', 'triceps'],
    press,
  ),
  entry(
    'incline-bench',
    'Incline barbell press',
    'Horizontal press',
    'Barbell',
    ['chest', 'frontDelts'],
    ['triceps'],
    press,
    30,
  ),
  entry(
    'decline-bench',
    'Decline barbell press',
    'Horizontal press',
    'Barbell',
    ['chest'],
    ['triceps'],
    press,
    -15,
  ),
  entry(
    'db-bench',
    'Dumbbell bench press',
    'Horizontal press',
    'Dumbbells',
    ['chest'],
    ['frontDelts', 'triceps'],
    press,
  ),
  entry(
    'incline-db',
    'Incline dumbbell press',
    'Horizontal press',
    'Dumbbells',
    ['chest', 'frontDelts'],
    ['triceps'],
    press,
    30,
  ),
  entry(
    'pushup',
    'Push-up',
    'Horizontal press',
    'Bodyweight',
    ['chest'],
    ['triceps', 'core'],
    press,
  ),
  entry(
    'chest-machine',
    'Machine chest press',
    'Horizontal press',
    'Machine',
    ['chest'],
    ['triceps', 'frontDelts'],
    press,
  ),
  entry(
    'ohp',
    'Overhead barbell press',
    'Vertical press',
    'Barbell',
    ['frontDelts'],
    ['sideDelts', 'triceps', 'core'],
    press,
  ),
  entry(
    'db-shoulder',
    'Dumbbell shoulder press',
    'Vertical press',
    'Dumbbells',
    ['frontDelts', 'sideDelts'],
    ['triceps'],
    press,
  ),
  entry(
    'band-press',
    'Band overhead press',
    'Vertical press',
    'Band',
    ['frontDelts'],
    ['triceps'],
    press,
  ),
  entry(
    'barbell-row',
    'Bent-over barbell row',
    'Horizontal pull',
    'Barbell',
    ['lats', 'upperBack'],
    ['biceps', 'rearDelts'],
    pull,
    45,
  ),
  entry(
    'db-row',
    'Dumbbell row',
    'Horizontal pull',
    'Dumbbells',
    ['lats', 'upperBack'],
    ['biceps', 'rearDelts'],
    pull,
    45,
  ),
  entry(
    'cable-row',
    'Seated cable row',
    'Horizontal pull',
    'Cable',
    ['lats', 'upperBack'],
    ['biceps', 'rearDelts'],
    pull,
  ),
  entry(
    'machine-row',
    'Machine row',
    'Horizontal pull',
    'Machine',
    ['upperBack', 'lats'],
    ['biceps'],
    pull,
  ),
  entry(
    'pullup',
    'Pull-up',
    'Vertical pull',
    'Bodyweight',
    ['lats'],
    ['biceps', 'upperBack'],
    pull,
  ),
  entry(
    'chinup',
    'Chin-up',
    'Vertical pull',
    'Bodyweight',
    ['lats', 'biceps'],
    ['upperBack'],
    pull,
  ),
  entry(
    'pulldown',
    'Lat pulldown',
    'Vertical pull',
    'Cable',
    ['lats'],
    ['biceps', 'upperBack'],
    pull,
  ),
  entry(
    'band-pulldown',
    'Band pulldown',
    'Vertical pull',
    'Band',
    ['lats'],
    ['biceps'],
    pull,
  ),
  entry(
    'back-squat',
    'Barbell back squat',
    'Squat',
    'Barbell',
    ['quads', 'glutes'],
    ['core'],
    legs,
  ),
  entry(
    'front-squat',
    'Front squat',
    'Squat',
    'Barbell',
    ['quads'],
    ['glutes', 'core'],
    legs,
  ),
  entry(
    'goblet',
    'Goblet squat',
    'Squat',
    'Kettlebell',
    ['quads', 'glutes'],
    ['core'],
    legs,
  ),
  entry(
    'body-squat',
    'Bodyweight squat',
    'Squat',
    'Bodyweight',
    ['quads', 'glutes'],
    ['core'],
    legs,
  ),
  entry(
    'deadlift',
    'Conventional deadlift',
    'Hinge',
    'Barbell',
    ['glutes', 'hamstrings'],
    ['quads', 'upperBack', 'core'],
    legs,
  ),
  entry(
    'rdl',
    'Romanian deadlift',
    'Hinge',
    'Barbell',
    ['hamstrings', 'glutes'],
    ['core', 'upperBack'],
    [
      'Move the hips backward with a soft knee bend.',
      'Keep the load close to the legs.',
      'Stand tall through the hips.',
    ],
  ),
  entry(
    'db-rdl',
    'Dumbbell Romanian deadlift',
    'Hinge',
    'Dumbbells',
    ['hamstrings', 'glutes'],
    ['core'],
    legs,
  ),
  entry(
    'goodmorning',
    'Good morning',
    'Hinge',
    'Barbell',
    ['hamstrings', 'glutes'],
    ['core'],
    legs,
  ),
  entry(
    'split-squat',
    'Split squat',
    'Lunge',
    'Dumbbells',
    ['quads', 'glutes'],
    ['core'],
    legs,
  ),
  entry(
    'reverse-lunge',
    'Reverse lunge',
    'Lunge',
    'Dumbbells',
    ['quads', 'glutes'],
    ['hamstrings', 'core'],
    legs,
  ),
  entry(
    'body-lunge',
    'Bodyweight lunge',
    'Lunge',
    'Bodyweight',
    ['quads', 'glutes'],
    ['core'],
    legs,
  ),
  entry(
    'barbell-curl',
    'Barbell curl',
    'Elbow flexion',
    'Barbell',
    ['biceps'],
    [],
    [
      'Keep the upper arms steady.',
      'Bend at the elbows.',
      'Lower with control.',
    ],
  ),
  entry(
    'db-curl',
    'Dumbbell curl',
    'Elbow flexion',
    'Dumbbells',
    ['biceps'],
    [],
    pull,
  ),
  entry(
    'cable-curl',
    'Cable curl',
    'Elbow flexion',
    'Cable',
    ['biceps'],
    [],
    pull,
  ),
  entry(
    'pushdown',
    'Triceps pushdown',
    'Elbow extension',
    'Cable',
    ['triceps'],
    [],
    [
      'Keep the elbows close to the torso.',
      'Extend the elbow without swinging the shoulder.',
      'Control the return.',
    ],
  ),
  entry(
    'overhead-extension',
    'Overhead triceps extension',
    'Elbow extension',
    'Dumbbells',
    ['triceps'],
    ['core'],
    press,
    90,
  ),
  entry(
    'lateral-raise',
    'Dumbbell lateral raise',
    'Shoulder raise',
    'Dumbbells',
    ['sideDelts'],
    ['upperBack'],
    [
      'Lead with the elbows.',
      'Raise within a comfortable shoulder range.',
      'Avoid swinging the torso.',
    ],
  ),
  entry(
    'front-raise',
    'Front raise',
    'Shoulder raise',
    'Dumbbells',
    ['frontDelts'],
    ['core'],
    press,
    90,
  ),
  entry(
    'leg-extension',
    'Leg extension',
    'Knee extension',
    'Machine',
    ['quads'],
    [],
    [
      'Align the knee with the machine pivot.',
      'Extend with control.',
      'Keep the hips against the pad.',
    ],
  ),
  entry(
    'leg-curl',
    'Seated leg curl',
    'Knee flexion',
    'Machine',
    ['hamstrings'],
    [],
    [
      'Keep the hips still.',
      'Bend the knees through the available range.',
      'Control the return.',
    ],
  ),
  entry(
    'calf-raise',
    'Standing calf raise',
    'Calf raise',
    'Dumbbells',
    ['calves'],
    [],
    [
      'Rise through the balls of the feet.',
      'Pause under control.',
      'Lower slowly.',
    ],
  ),
  entry(
    'hip-thrust',
    'Hip thrust',
    'Hip extension',
    'Barbell',
    ['glutes'],
    ['hamstrings', 'core'],
    [
      'Keep the feet planted.',
      'Extend through the hips.',
      'Finish without overextending the lower back.',
    ],
  ),
  entry(
    'glute-bridge',
    'Glute bridge',
    'Hip extension',
    'Bodyweight',
    ['glutes'],
    ['hamstrings', 'core'],
    legs,
  ),
  entry(
    'plank',
    'Plank',
    'Core',
    'Bodyweight',
    ['core'],
    ['glutes', 'frontDelts'],
    [
      'Keep a straight line from shoulders to ankles.',
      'Breathe while holding the position.',
      'End the hold when you lose position.',
    ],
  ),
  entry(
    'farmer',
    'Farmer carry',
    'Carry',
    'Dumbbells',
    ['upperBack', 'core'],
    ['glutes', 'calves'],
    [
      'Stand tall with balanced loads.',
      'Take controlled steps.',
      'Keep the shoulders steady.',
    ],
  ),
  entry(
    'suitcase',
    'Suitcase carry',
    'Carry',
    'Kettlebell',
    ['core', 'upperBack'],
    ['glutes'],
    [
      'Resist leaning toward the weight.',
      'Walk with controlled steps.',
      'Repeat on the other side.',
    ],
  ),
];
export const patternDefaults: Record<
  Pattern,
  { primary: GroupId[]; secondary: GroupId[] }
> = Object.fromEntries(
  patterns.map((p) => {
    const m = catalog.find((x) => x.pattern === p)!;
    return [p, { primary: m.primary, secondary: m.secondary }];
  }),
) as Record<Pattern, { primary: GroupId[]; secondary: GroupId[] }>;
export interface WorkoutItem {
  id: string;
  movement: Movement;
  sets: number;
  reps: number;
  load: number;
  rest: number;
  completed: number;
  notes: string;
}
export interface Session {
  id: string;
  date: string;
  name: string;
  items: WorkoutItem[];
}
export interface LibraryData {
  custom: Movement[];
  favorites: string[];
  workout: WorkoutItem[];
  workoutName: string;
  history: Session[];
}
export const emptyLibrary: LibraryData = {
  custom: [],
  favorites: [],
  workout: [],
  workoutName: 'My workout',
  history: [],
};
const strings = (v: unknown, max: number): v is string[] =>
  Array.isArray(v) &&
  v.length <= max &&
  v.every((x) => typeof x === 'string' && x.length <= 600);
export function validMovement(v: unknown): v is Movement {
  if (!v || typeof v !== 'object') return false;
  const m = v as Movement;
  return (
    typeof m.id === 'string' &&
    m.id.length > 0 &&
    m.id.length <= 100 &&
    typeof m.name === 'string' &&
    m.name.trim().length > 0 &&
    m.name.length <= 100 &&
    patterns.includes(m.pattern) &&
    equipmentOptions.includes(m.equipment) &&
    strings(m.primary, 13) &&
    m.primary.length > 0 &&
    strings(m.secondary, 13) &&
    [...m.primary, ...m.secondary].every((g) =>
      Object.hasOwn(muscleGroups, g),
    ) &&
    strings(m.cues, 6) &&
    typeof m.notes === 'string' &&
    m.notes.length <= 2000 &&
    Number.isFinite(m.angle) &&
    Math.abs(m.angle) <= 90 &&
    Number.isFinite(m.range) &&
    m.range >= 20 &&
    m.range <= 100 &&
    Number.isFinite(m.stance) &&
    m.stance >= 0.6 &&
    m.stance <= 1.6 &&
    (m.gripAngle === undefined ||
      (Number.isFinite(m.gripAngle) && Math.abs(m.gripAngle) <= 90))
  );
}
export function validLibrary(v: unknown): v is LibraryData {
  if (!v || typeof v !== 'object') return false;
  const d = v as LibraryData;
  const item = (x: WorkoutItem) =>
    x &&
    typeof x.id === 'string' &&
    x.id.length <= 100 &&
    validMovement(x.movement) &&
    Number.isInteger(x.sets) &&
    x.sets >= 1 &&
    x.sets <= 20 &&
    Number.isInteger(x.reps) &&
    x.reps >= 1 &&
    x.reps <= 300 &&
    Number.isFinite(x.load) &&
    x.load >= 0 &&
    x.load <= 1000 &&
    Number.isInteger(x.rest) &&
    x.rest >= 0 &&
    x.rest <= 600 &&
    Number.isInteger(x.completed) &&
    x.completed >= 0 &&
    x.completed <= x.sets &&
    typeof x.notes === 'string' &&
    x.notes.length <= 2000;
  return (
    Array.isArray(d.custom) &&
    d.custom.length <= 100 &&
    d.custom.every(validMovement) &&
    new Set(d.custom.map((x) => x.id)).size === d.custom.length &&
    strings(d.favorites, 200) &&
    typeof d.workoutName === 'string' &&
    d.workoutName.length <= 100 &&
    Array.isArray(d.workout) &&
    d.workout.length <= 40 &&
    d.workout.every(item) &&
    Array.isArray(d.history) &&
    d.history.length <= 30 &&
    d.history.every(
      (s) =>
        s &&
        typeof s.id === 'string' &&
        s.id.length <= 100 &&
        typeof s.date === 'string' &&
        Number.isFinite(Date.parse(s.date)) &&
        typeof s.name === 'string' &&
        s.name.length <= 100 &&
        Array.isArray(s.items) &&
        s.items.length <= 40 &&
        s.items.every(item),
    )
  );
}
