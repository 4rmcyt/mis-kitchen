import { useState, useContext, createContext } from "react";

export const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (ctx) return { show: ctx.show };
  const [toasts, setToasts] = useState([]);
  const show = (msg, type = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };
  return { toasts, show };
}

export function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position:'fixed', top:20, right:20, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type==='error' ? '#1a0808' : t.type==='success' ? '#081a0e' : '#101010',
          border: `1px solid ${t.type==='error'?'#EF444455':t.type==='success'?'#10b98155':'#2a2a2a'}`,
          color: t.type==='error' ? '#EF4444' : t.type==='success' ? '#10B981' : '#e8e8e0',
          padding:'10px 16px', borderRadius:8, fontSize:13, fontFamily:'var(--font-mono)',
          maxWidth:320, animation:'fadeIn 0.2s ease',
        }}>
          {t.type==='success'?'✓ ':t.type==='error'?'✗ ':''}{t.msg}
        </div>
      ))}
    </div>
  );
}
