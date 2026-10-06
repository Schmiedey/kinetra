export interface EvidenceReference {
  id: string;
  title: string;
  authors: string;
  year: number;
  url: string;
  supports: string[];
  confidence: 'strong' | 'moderate' | 'limited';
  notes: string;
}
export const evidence: EvidenceReference[] = [
  {
    id: 'grip',
    title:
      'Understanding Bench Press Biomechanics—The Necessity of Measuring Lateral Barbell Forces',
    authors: 'Mausehund et al.',
    year: 2022,
    url: 'https://pubmed.ncbi.nlm.nih.gov/33555823/',
    supports: ['Grip width → shoulder and elbow demand'],
    confidence: 'moderate',
    notes:
      'Narrower grips increased elbow joint moments; wider grips increased shoulder moments. Lateral forces matter in real pressing. This app only calculates the external vertical-load component, so its outputs are not equivalent to the study’s net joint moments.',
  },
  {
    id: 'incline',
    title:
      'An electromyography analysis of 3 muscles surrounding the shoulder joint during the performance of a chest press exercise at several angles',
    authors: 'Trebs, Brandenburg & Pitney',
    year: 2010,
    url: 'https://pubmed.ncbi.nlm.nih.gov/20512064/',
    supports: ['Incline → regional pec and deltoid emphasis'],
    confidence: 'moderate',
    notes:
      'Compared chest pressing at 0°, 28°, 44° and 56°. Regional activation varied with angle, including greater clavicular activity at higher inclines. Used only as a directional guide: EMG is not a measure of hypertrophy or a calibration of these scores.',
  },
  {
    id: 'effort',
    title:
      'Influence of Resistance Training Proximity-to-Failure on Skeletal Muscle Hypertrophy: A Systematic Review with Meta-analysis',
    authors: 'Refalo et al.',
    year: 2023,
    url: 'https://pubmed.ncbi.nlm.nih.gov/36334240/',
    supports: ['Effort is distinct from external mechanics'],
    confidence: 'limited',
    notes:
      'Found no clear superiority for momentary failure over non-failure and suggested a nonlinear relationship. This does not establish a precise RIR-to-growth curve. Kinetra’s RIR factors are explicit exploratory assumptions.',
  },
  {
    id: 'length',
    title:
      'Does longer-muscle length resistance training cause greater longitudinal growth in humans? A systematic review',
    authors: 'Wolf et al.',
    year: 2026,
    url: 'https://pubmed.ncbi.nlm.nih.gov/41646176/',
    supports: ['Lengthened exposure as an exploratory factor'],
    confidence: 'limited',
    notes:
      'Results suggest a possible benefit of longer-length training, but findings are mixed and structural adaptations remain uncertain. The app’s 0.75–1.25 length weights are not research-derived biological constants.',
  },
];
