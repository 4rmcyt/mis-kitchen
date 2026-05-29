import { useState, useContext, createContext } from "react";

interface Toast {
  id: string;
  msg: string;
  type: string;
}

interface ToastContextValue {
  show: (msg: string, type?: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  const [toasts, setToasts] = useState<Toast[]>([]);
  if (ctx) return { show: ctx.show };
  const show = (msg: string, type = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };
  return { toasts, show };
}

export function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast--${t.type}`}>
          {t.type==='success'?'✓ ':t.type==='error'?'✗ ':''}{t.msg}
        </div>
      ))}
    </div>
  );
}
