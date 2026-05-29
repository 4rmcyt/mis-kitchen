import { useState } from "react";
import { STATIONS, SECTIONS } from "../lib/constants.js";
import type { Station } from "../lib/types.js";

function dateStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

interface AddTaskModalProps {
  userStation: Station | string;
  onSave: (task: { text: string; station: string; section: string; date: string }) => Promise<void>;
  onClose: () => void;
}

export function AddTaskModal({ userStation, onSave, onClose }: AddTaskModalProps) {
  const [text, setText] = useState('');
  const [station, setStation] = useState(userStation);
  const [section, setSection] = useState('Other');
  const [date, setDate] = useState(dateStr(0));
  const [saving, setSaving] = useState(false);

  const minDate = dateStr(0);

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await onSave({ text: text.trim(), station: station as string, section, date });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header"><span>Add Task</span><button className="action-btn del" onClick={onClose}>×</button></div>
        <input className="form-input" placeholder="Task description…" value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()} autoFocus/>
        <div className="recipe-grid">
          <div>
            <div className="form-label">Station</div>
            <select className="form-input" value={station as string} onChange={e => setStation(e.target.value)}>
              {STATIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div className="form-label">Section</div>
            <select className="form-input" value={section} onChange={e => setSection(e.target.value)}>
              {SECTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <div className="form-label">Date</div>
          <input className="form-input" type="date" value={date} min={minDate} onChange={e => setDate(e.target.value)}/>
        </div>
        <button className="save-btn" onClick={save} disabled={saving || !text.trim()}>
          {saving ? 'Saving…' : 'Add Task'}
        </button>
      </div>
    </div>
  );
}
