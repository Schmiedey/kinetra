export type Vec3 = [number, number, number];
export type MuscleId =
  | 'pecClavicular'
  | 'pecSternal'
  | 'anteriorDelt'
  | 'triceps';
export type MuscleValues = Record<MuscleId, number>;
export type Confidence = 'high' | 'medium' | 'low';
export interface BenchConfig {
  benchAngleDeg: number;
  gripWidthRatio: number;
  elbowFlareDeg: number;
  romPercent: number;
  touchPoint: number;
  barPathCurve: number;
  loadKg: number;
  reps: number;
  rir: number;
}
export interface BodyProfile {
  heightCm: number;
  shoulderWidthCm: number;
  upperArmLengthCm: number;
  forearmLengthCm: number;
}
export interface SimulationFrame {
  progress: number;
  joints: {
    leftShoulder: Vec3;
    rightShoulder: Vec3;
    leftElbow: Vec3;
    rightElbow: Vec3;
    leftHand: Vec3;
    rightHand: Vec3;
  };
  barPosition: Vec3;
  angles: {
    shoulderFlexion: number;
    shoulderHorizontalAbduction: number;
    elbowFlexion: number;
  };
  moments: { shoulder: number; elbow: number };
  muscleLengths: MuscleValues;
  muscleDemand: MuscleValues;
  reachLimited: boolean;
}
export interface MuscleResult {
  id: MuscleId;
  mechanicalDemand: number;
  lengthenedExposure: number;
  loadedRom: number;
  estimatedStimulus: number;
  effortFactor: number;
  lengthenedExposureFactor: number;
  confidence: Confidence;
}
export interface SimulationResult {
  exercise: string;
  config: BenchConfig;
  frames: SimulationFrame[];
  muscles: MuscleResult[];
  peakShoulderMomentNm: number;
  peakElbowMomentNm: number;
  averageShoulderMomentNm: number;
  averageElbowMomentNm: number;
  loadedExcursionM: number;
  reachLimited: boolean;
  summary: {
    primaryMuscle: MuscleId;
    strongestRegion: 'bottom' | 'mid' | 'top';
    shoulderDemand: number;
    elbowDemand: number;
  };
}
export type VisualizationMode =
  | 'anatomy'
  | 'demand'
  | 'moments'
  | 'stimulus'
  | 'length'
  | 'forces';
export type CameraMode = '3D' | 'Front' | 'Side' | 'Top' | 'Shoulder' | 'Elbow';
