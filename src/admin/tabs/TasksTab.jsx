import { useState, useEffect } from "react";
import { getDayTemplates, createDayTemplate, updateDayTemplate, deleteDayTemplate, createTasksBatch, getShiftExperiment, setShiftExperiment } from "../../lib/supabase.js";
import { STATIONS, STATION_COLORS, SECTIONS, SECTION_COLORS } from "../../lib/constants.js";
import { useToast } from "../components/Toast.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import { Badge } from "../components/Badge.jsx";

export function TasksTab() {
  const [dayTemplates, setDayTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignDate, setAssignDate] = useState(new Date().toISOString().split('T')[0]);
  const [newText, setNewText] = useState('');
  const [newStation, setNewStation] = useState('Common');
  const [newSection, setNewSection] = useState('Opening');
  const [experiment, setExperiment] = useState('');
  const [experimentSaved, setExperimentSaved] = useState('');
  const [experimentSaving, setExperimentSaving] = useState(false);
  const { show: toast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => {
    getDayTemplates().then(setDayTemplates).catch(e => toast(e.message, 'error'));
    getShiftExperiment().then(v => { setExperiment(v || ''); setExperimentSaved(v || ''); }).catch(() => {});
  }, []);

  const saveExperiment = async () => {
    setExperimentSaving(true);
    try {
      await setShiftExperiment(experiment.trim());
      setExperimentSaved(experiment.trim());
      toast('Experiment saved', 'success');
    } catch (e) { toast(e.message, 'error'); }
    setExperimentSaving(false);
  };

  const clearExperiment = async () => {
    setExperimentSaving(true);
    try {
      await setShiftExperiment('');
      setExperiment('');
      setExperimentSaved('');
      toast('Experiment cleared', 'success');
    } catch (e) { toast(e.message, 'error'); }
    setExperimentSaving(false);
  };

  const createTemplate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const dt = await createDayTemplate({ name: newName.trim(), entries: [] });
      setDayTemplates(ds => [dt, ...ds]);
      setNewName(''); setShowNew(false);
      setSelected({ ...dt, entries: [] });
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  const deleteTemplate = async (dt) => {
    if (!await confirm(`Delete "${dt.name}"?`)) return;
    try {
      await deleteDayTemplate(dt.id);
      setDayTemplates(ds => ds.filter(d => d.id !== dt.id));
      if (selected?.id === dt.id) setSelected(null);
    } catch (e) { toast(e.message, 'error'); }
  };

  const saveEntries = async (entries) => {
    try {
      await updateDayTemplate(selected.id, { entries });
      setDayTemplates(ds => ds.map(d => d.id === selected.id ? { ...d, entries } : d));
      setSelected(s => ({ ...s, entries }));
    } catch (e) { toast(e.message, 'error'); }
  };

  const addTask = () => {
    if (!newText.trim()) return;
    const entries = [...(selected.entries || []), { text: newText.trim(), station: newStation, section: newSection }];
    saveEntries(entries);
    setNewText('');
  };

  const removeTask = (idx) => saveEntries(selected.entries.filter((_, i) => i !== idx));

  const applyToDate = async () => {
    const entries = selected.entries || [];
    if (!entries.length) { toast('No tasks in this template', 'error'); return; }
    setAssigning(true);
    try {
      const tasks = entries.map(e => ({ text: e.text, station: e.station, section: e.section, date: assignDate, source: 'template' }));
      await createTasksBatch(tasks);
      toast(`${tasks.length} tasks created for ${assignDate}`, 'success');
    } catch (e) { toast(e.message, 'error'); }
    setAssigning(false);
  };

  if (selected) {
    const entries = selected.entries || [];
    return (
      <div className="tab-content">
        {confirmDialog}
        <div className="template-detail-hdr">
          <button className="btn-secondary" onClick={() => setSelected(null)}>← Back</button>
          <span className="template-detail-name">{selected.name}</span>
          <button className="btn-danger" onClick={() => deleteTemplate(selected)}>Delete</button>
        </div>
        <div className="template-count">{entries.length} tasks</div>

        <div className="template-entries">
          {entries.map((entry, idx) => (
            <div key={idx} className="template-entry">
              <span className="template-entry-text">{entry.text}</span>
              <Badge color={STATION_COLORS[entry.station]||'#6B7280'} small>{entry.station}</Badge>
              <span className="template-entry-section" style={{ color:SECTION_COLORS[entry.section], border:`1px solid ${SECTION_COLORS[entry.section]}44` }}>{entry.section}</span>
              <button className="template-entry-del" onClick={() => removeTask(idx)}>×</button>
            </div>
          ))}
          {entries.length === 0 && <div className="template-empty">No tasks yet.</div>}
        </div>

        <div className="template-add-row">
          <input className="template-add-inp"
            placeholder="New task…" value={newText} onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()} autoFocus/>
          <select className="form-sel template-sel-sm" value={newStation} onChange={e => setNewStation(e.target.value)}>
            {STATIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="form-sel template-sel-sm" value={newSection} onChange={e => setNewSection(e.target.value)}>
            {SECTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <button className="btn-primary flex-shrink-0" onClick={addTask}>Add</button>
        </div>

        <div className="template-apply-row">
          <span className="template-apply-label">Apply to</span>
          <input type="date" className="search-inp template-apply-date" value={assignDate}
            onChange={e => setAssignDate(e.target.value)}/>
          <button className="btn-primary" onClick={applyToDate} disabled={assigning}>
            {assigning ? 'Creating…' : `Apply (${entries.length} tasks)`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="experiment-block">
        <div className="experiment-block-title">🧪 Today&apos;s experiment</div>
        <div className="experiment-block-hint">Staff will see this as a banner on their Today screen.</div>
        <div className="experiment-row">
          <input
            className="search-inp flex-1 inp-full"
            placeholder="e.g. Greet every table within 60 seconds of seating…"
            value={experiment}
            onChange={e => setExperiment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveExperiment()}
          />
          <button className="btn-primary flex-shrink-0" onClick={saveExperiment} disabled={experimentSaving || experiment.trim() === experimentSaved}>
            {experimentSaving ? 'Saving…' : 'Save'}
          </button>
          {experimentSaved && (
            <button className="btn-secondary flex-shrink-0" onClick={clearExperiment} disabled={experimentSaving}>Clear</button>
          )}
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card"><div className="stat-val">{dayTemplates.length}</div><div className="stat-lbl">Templates</div></div>
        <div className="stat-card"><div className="stat-val">{dayTemplates.reduce((a,d) => a+(d.entries?.length||0), 0)}</div><div className="stat-lbl">Total Tasks</div></div>
      </div>
      <div className="toolbar">
        <div className="flex-1"/>
        <button className="btn-primary" onClick={() => setShowNew(true)}>+ New Template</button>
      </div>
      {showNew && (
        <div className="template-new-row">
          <input className="search-inp flex-1 inp-full" placeholder="Template name (e.g. Tuesday Setup)" value={newName}
            onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createTemplate()} autoFocus/>
          <button className="btn-primary" onClick={createTemplate} disabled={saving}>{saving ? 'Creating…' : 'Create'}</button>
          <button className="btn-secondary" onClick={() => { setShowNew(false); setNewName(''); }}>Cancel</button>
        </div>
      )}
      <div className="template-list">
        {dayTemplates.map(dt => (
          <div key={dt.id} className="template-list-item" onClick={() => setSelected({ ...dt, entries: dt.entries||[] })}>
            <span className="template-list-name">{dt.name}</span>
            <span className="template-list-meta">{dt.entries?.length||0} tasks</span>
            <span className="template-list-meta">→</span>
          </div>
        ))}
        {dayTemplates.length === 0 && <div className="template-empty">No templates yet.</div>}
      </div>
    </div>
  );
}
