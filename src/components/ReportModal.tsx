import { useState } from "react";
import { saveReport, sendReportEmail } from "../lib/supabase.js";
import type { ExperimentOutcome } from "../lib/types.js";

interface ReportSection {
  name: string;
  items: Array<{ text: string; done: boolean }>;
  done: number;
  total: number;
}

interface ReportModalProps {
  sections: ReportSection[];
  nextShift: string[];
  pct: number;
  done: number;
  total: number;
  date: string;
  experiment: string | null;
  onClose: () => void;
}

export function ReportModal({ sections, nextShift, pct, done, total, date, experiment, onClose }: ReportModalProps) {
  const [state, setState] = useState<'idle' | 'saving' | 'sent' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');
  const [experimentOutcome, setExperimentOutcome] = useState<ExperimentOutcome | null>(null);
  const [experimentNote, setExperimentNote] = useState('');
  const pctColor = pct >= 90 ? '#10B981' : pct >= 70 ? '#F97316' : '#EF4444';

  const handleSend = async () => {
    setState('saving');
    try {
      await saveReport({
        sections,
        nextShift,
        experimentText: experiment || '',
        experimentOutcome: experimentOutcome || null,
        experimentNote: experimentNote.trim() || '',
      });
      await sendReportEmail(date);
      setState('sent');
    } catch (e) {
      setErrMsg((e as Error).message);
      setState('error');
    }
  };

  return (
    <div className="report-modal-overlay">
      <div className="report-modal-box">
        <div className="report-modal-title-row">
          <span className="report-modal-title">End of Shift Report</span>
          <button onClick={onClose} className="report-modal-close">×</button>
        </div>

        {state === 'sent' ? (
          <div className="report-sent">✓ Report saved and emailed</div>
        ) : (
          <>
            <div className="report-summary">
              <div className="report-pct" style={{ color: pctColor }}>{pct}%</div>
              <div className="report-sub">{done} of {total} tasks completed</div>
            </div>

            <div className="report-sections report-sections-block">
              {sections.map((sec, i) => sec.total > 0 && (
                <div key={i} className="report-sec-row">
                  <span className="report-sec-name">{sec.name}</span>
                  <div className="report-sec-bar">
                    <div className="report-sec-fill" style={{ width: `${sec.total ? (sec.done/sec.total)*100 : 0}%`, background: pctColor }}/>
                  </div>
                  <span className="report-sec-count">{sec.done}/{sec.total}</span>
                </div>
              ))}
            </div>

            {nextShift.length > 0 && (
              <div className="report-next report-next-block">
                <div className="report-next-label">→ Incomplete — carried to next shift</div>
                {nextShift.map((t, i) => (
                  <div key={i} className="report-next-item">
                    <span className="report-next-item-text">{t}</span>
                  </div>
                ))}
              </div>
            )}

            {experiment && (
              <div className="experiment-report-block">
                <div className="experiment-report-title">🧪 Today&apos;s experiment</div>
                <div className="experiment-report-text">{experiment}</div>
                <div className="experiment-report-hint">Did it work?</div>
                <div className="experiment-outcome-row">
                  {(['yes', 'no', 'not_tried'] as const).map((val) => {
                    const labels: Record<string, string> = { yes: '✓ Yes', no: '✗ No', not_tried: '— Not tried' };
                    const colors: Record<string, string> = { yes: '#10B981', no: '#EF4444', not_tried: '#6B7280' };
                    const color = colors[val];
                    return (
                      <button key={val} onClick={() => setExperimentOutcome(v => v === val ? null : val)}
                        className="experiment-outcome-btn"
                        style={{ border:`1px solid ${experimentOutcome===val ? color : 'var(--border)'}`, background: experimentOutcome===val ? color+'22' : 'transparent', color: experimentOutcome===val ? color : 'var(--text-muted)' }}>
                        {labels[val]}
                      </button>
                    );
                  })}
                </div>
                <input
                  className="add-input experiment-note-inp"
                  placeholder="Optional note…"
                  value={experimentNote}
                  onChange={e => setExperimentNote(e.target.value)}
                />
              </div>
            )}

            {state === 'error' && <div className="report-error">✗ {errMsg}</div>}

            <button
              className="btn-primary btn-full"
              onClick={handleSend}
              disabled={state === 'saving'}
            >
              {state === 'saving' ? 'Sending…' : 'Save & Send Report'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
