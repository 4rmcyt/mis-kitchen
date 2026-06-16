import { useState } from "react";
import { usePrepTasks, type PrepTask } from "../hooks/features/usePrepTasks.js";

function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,7 5.5,10.5 12,3" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function OwnerBadge({ name }: { name: string | null | undefined }) {
  const initials = name ? name.trim().slice(0, 2).toUpperCase() : '?';
  const color = name ? '#F97316' : '#555';
  return (
    <span className="prep-owner-badge" style={{ background: `${color}22`, borderColor: `${color}44`, color }}>
      {initials}
    </span>
  );
}

function QtyInput({ task, onSave }: { task: PrepTask; onSave: (id: string, qty: number | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(task.quantity !== null ? String(task.quantity) : '');

  const commit = () => {
    setEditing(false);
    const num = val.trim() === '' ? null : parseInt(val.trim(), 10);
    if (val.trim() !== '' && (isNaN(num as number) || (num as number) < 0)) {
      setVal(task.quantity !== null ? String(task.quantity) : '');
      return;
    }
    onSave(task.id, num ?? null);
  };

  if (task.done) {
    return <span className="prep-qty-locked">{task.quantity !== null ? `×${task.quantity}` : ''}</span>;
  }

  if (editing) {
    return (
      <input
        className="prep-qty-input"
        type="number"
        min={0}
        value={val}
        autoFocus
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') commit(); }}
      />
    );
  }

  return (
    <button className="prep-qty-btn" onClick={() => setEditing(true)}>
      {task.quantity !== null ? `×${task.quantity}` : <span className="prep-qty-empty">qty</span>}
    </button>
  );
}

export function PrepScreen() {
  const { tasks, loading, toggle, setQuantity } = usePrepTasks();

  const done = tasks.filter(t => t.done).length;
  const total = tasks.length;

  return (
    <div className="screen">
      <div className="screen-header">
        <div>
          <div className="screen-title">Prep</div>
          <div className="screen-sub">
            {total > 0 ? `${done} / ${total} done` : 'No prep tasks today'}
          </div>
        </div>
      </div>

      {loading && <div className="loading-msg">Loading…</div>}

      {!loading && (
        <div className="prep-list">
          {tasks.map(task => (
            <div key={task.id} className={`prep-row${task.done ? ' prep-row--done' : ''}`}>
              <button
                className={`prep-toggle${task.done ? ' prep-toggle--done' : ''}`}
                onClick={() => toggle(task)}
                aria-label={task.done ? 'Undo' : 'Complete'}
              >
                {task.done && <CheckIcon />}
              </button>

              <div className="prep-row-body">
                <span className="prep-row-text">{task.text}</span>
              </div>

              <QtyInput task={task} onSave={setQuantity} />

              <OwnerBadge name={task.assigned_profile?.name} />
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="prep-empty-msg">No prep tasks for today.</div>
          )}
        </div>
      )}
    </div>
  );
}
