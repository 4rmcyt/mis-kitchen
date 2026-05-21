import { useState } from "react";

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'24px', maxWidth:320, width:'90%', display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ fontSize:14, color:'var(--text)' }}>{message}</div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-danger" data-testid="confirm-delete" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const [state, setState] = useState(null);
  const confirm = (message) => new Promise(resolve => {
    setState({ message, resolve });
  });
  const handleConfirm = () => { state.resolve(true); setState(null); };
  const handleCancel = () => { state.resolve(false); setState(null); };
  const dialog = state ? <ConfirmDialog message={state.message} onConfirm={handleConfirm} onCancel={handleCancel}/> : null;
  return { confirm, dialog };
}
