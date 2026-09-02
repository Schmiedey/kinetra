import { ExternalLink, FlaskConical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { evidence } from '../data/evidence';
import { calibration } from '../data/calibration';
export function MethodologyContent() {
  return (
    <div className="methodology-content">
      <span className="eyebrow">TRANSPARENT BY DESIGN</span>
      <h2>Know what the numbers mean.</h2>
      <p>
        LiftLab is a comparative biomechanics model. Every value comes from the
        same deterministic simulation. Scores are not measurements of muscle
        growth.
      </p>
      <div className="confidence-table">
        {[
          ['Joint geometry', 'Calculated', 'High, within model'],
          [
            'External moments',
            'Calculated from r × F',
            'High, within assumptions',
          ],
          ['Muscle length', 'Normalized approximation', 'Medium'],
          ['Mechanical demand', 'Heuristic allocation', 'Low–medium'],
          [
            'Estimated Stimulus Index',
            'Comparative estimate',
            'Low / experimental',
          ],
        ].map((row) => (
          <div key={row[0]}>
            <strong>{row[0]}</strong>
            <span>{row[1]}</span>
            <small>{row[2]}</small>
          </div>
        ))}
      </div>
      <h3>01 / External mechanics</h3>
      <p>
        Gravity = 9.81 m/s². The entered load includes the bar; each arm
        supports half. Moments are the magnitude of the cross product between
        the joint-to-hand lever and vertical force, in Nm per arm. The model
        excludes acceleration, lateral bar forces, segment weight, stabilizers
        and joint contact forces. These are external moments, not muscle forces
        or measured net joint moments.
      </p>
      <h3>02 / Geometry & length</h3>
      <p>
        A generic 178 cm body uses a 42 cm shoulder width, 32 cm upper arms and
        29 cm forearms. Two-link inverse kinematics keep segment lengths fixed.
        Elbow flare steers the elbow’s solution plane; it is a control input,
        not a guaranteed measured joint angle. Muscle lengths are dimensionless
        0–1 estimates derived from joint geometry, not fascicle or sarcomere
        measurements.
      </p>
      <h3>03 / Estimated Stimulus Index</h3>
      <div className="formula">
        100 × mean[demand × length weight]
        <br />× effort factor × loaded-ROM factor
      </div>
      <p>
        Length weight = {calibration.stimulus.lengthBase} +{' '}
        {calibration.stimulus.lengthGain} × normalized length. Effort factors
        for RIR 0–5+ are {calibration.stimulus.rirFactors.join(', ')}.
        Loaded-ROM factor = min(ROM / 100, 1)<sup>0.35</sup>. Means use
        trapezoidal integration across the concentric rep, and results are
        bounded to 0–100. All coefficients are adjustable modeling choices.
      </p>
      <p>
        Absolute load affects modeled demand against generic reference moments,
        not individual strength. Match load, ROM and RIR for meaningful
        technique comparisons. A higher index is not a predicted percentage
        increase in growth.
      </p>
      <h3>04 / Anatomical geometry</h3>
      <p>
        The skeleton uses 200 unique BodyParts3D bone meshes, sourced through
        the open BodyExplorer GitHub repository. The movement library includes
        62 muscle meshes from BodyParts3D and Z-Anatomy. Fourteen press meshes provide
        the actual bilateral pec subdivisions, anterior deltoid and triceps
        heads. The atlas is fitted to the generic engine proportions and posed
        using rigid bone transforms and blended soft-tissue deformation. Shape
        detail does not make the motion or stimulus model a validated
        physiological simulation.
      </p>
      <p>
        Demand mode colors the muscle surface using the selected frame’s
        calculated-model demand. Stimulus mode shows the whole-rep Estimated
        Stimulus Index. Clicking a muscle isolates its region; the muscle-layer
        control reveals the underlying skeleton.
      </p>
      <p>
        <a
          href="https://github.com/JohanBellander/BodyExplorer"
          target="_blank"
          rel="noreferrer"
        >
          BodyExplorer on GitHub ↗
        </a>{' '}
        ·{' '}
        <a href="/models/ATTRIBUTION.md" target="_blank" rel="noreferrer">
          Attribution & mesh license ↗
        </a>{' '}
        ·{' '}
        <a href="/models/manifest.json" target="_blank" rel="noreferrer">
          Mesh provenance ↗
        </a>
      </p>
      <h3>05 / Scope & limits</h3>
      <p>The movement library uses simplified pattern illustrations and assigned primary/supporting muscle roles. Its highlights are not EMG measurements or calculated activation. Custom movements inherit their chosen pattern; they do not create a new validated biomechanics model. The formulas above apply only to the detailed Bench lab.</p>
      <p>
        Reps record the set context; they do not multiply the score. This
        version does not model fatigue, set duration, session or weekly volume,
        injury risk, or individual strength. Partial ROM removes the bottom
        portion; ROM above 100% is a virtual extension below the usual endpoint
        and is not a technique recommendation. Lateral forces and calibrated
        anatomy are future work.
      </p>
    </div>
  );
}
export default function Methodology({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="methodology-dialog">
        <DialogTitle className="dialog-title">
          <FlaskConical size={17} /> Model methodology
        </DialogTitle>
        <DialogDescription>
          Calculated mechanics. Explicit assumptions. Comparative estimates.
        </DialogDescription>
        <MethodologyContent />
        <div className="reference-links">
          {evidence.map((e) => (
            <a key={e.id} href={e.url} target="_blank" rel="noreferrer">
              {e.authors} · {e.year}
              <ExternalLink size={12} />
            </a>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function Research() {
  return (
    <div className="research-page">
      <div className="research-intro">
        <FlaskConical size={30} />
        <span className="eyebrow">THE SCIENCE, WITH ITS LIMITS</span>
        <h1>A model you can look inside.</h1>
        <p>
          Research informs the direction. It does not validate an exact stimulus
          score. Explore the assumptions and the studies behind this sandbox.
        </p>
      </div>
      <div className="research-grid">
        <MethodologyContent />
        <section id="research" className="research-references">
          <div className="section-heading">
            EVIDENCE LIBRARY / 04 REFERENCES
          </div>
          {evidence.map((e, i) => (
            <article className="evidence-card" key={e.id}>
              <span className="eyebrow">
                0{i + 1} / {e.supports[0]}
              </span>
              <h3>{e.title}</h3>
              <span className="citation">
                {e.authors} · {e.year}
              </span>
              <p>{e.notes}</p>
              <a href={e.url} target="_blank" rel="noreferrer">
                Read the study <ExternalLink size={13} />
              </a>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
