import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSimulationStore } from '../store/useSimulationStore';
import { explainChanges } from '../engine/explain';
export default function ExplainChanges({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const result = useSimulationStore((s) => s.result),
    baseline = useSimulationStore((s) => s.baseline),
    setBaseline = useSimulationStore((s) => s.setBaseline);
  const explanation = explainChanges(baseline, result);
  const signed = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v)}`;
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="explanation-dialog">
        <DialogTitle>What changed in the model?</DialogTitle>
        <DialogDescription>
          Calculated differences from your reference · deterministic explanation
        </DialogDescription>
        <div className="delta-grid">
          {explanation.changes.map((m) => (
            <div key={m.name}>
              <span>{m.name}</span>
              <strong
                className={
                  m.delta > 0 ? 'positive' : m.delta < 0 ? 'negative' : ''
                }
              >
                {signed(m.delta)}
                <small> index points</small>
              </strong>
            </div>
          ))}
        </div>
        <p className="moment-deltas">
          Mean external moment: shoulder {signed(explanation.shoulderDelta)} Nm
          · elbow {signed(explanation.elbowDelta)} Nm.
        </p>
        <div className="explanation-notes">
          {explanation.notes.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </div>
        <p className="estimate-caveat">
          These differences describe this model, not measured biological
          adaptation. The explanation uses calculated results; no AI generates
          the numbers.
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            setBaseline();
            onClose();
          }}
        >
          Use current setup as reference
        </Button>
      </DialogContent>
    </Dialog>
  );
}
