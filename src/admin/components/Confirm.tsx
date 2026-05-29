import { useState } from "react";

interface ConfirmState {
  message: string;
  resolve: (value: boolean) => void;
}

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="confirm-overlay">
      <div className="confirm-box">
        <div className="confirm-msg">{message}</div>
        <div className="confirm-actions">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-danger" data-testid="confirm-delete" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const confirm = (message: string) => new Promise<boolean>(resolve => {
    setState({ message, resolve });
  });
  const handleConfirm = () => { state!.resolve(true); setState(null); };
  const handleCancel = () => { state!.resolve(false); setState(null); };
  const dialog = state ? <ConfirmDialog message={state.message} onConfirm={handleConfirm} onCancel={handleCancel}/> : null;
  return { confirm, dialog };
}
