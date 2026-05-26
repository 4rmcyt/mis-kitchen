import { useState } from "react";
import { saveReport, sendReportEmail } from "../lib/supabase.js";

export function ReportModal({ sections, nextShift, pct, done, total, date, experiment, onClose }) {
  const [state, setState] = useState('idle');
  const [errMsg, setErrMsg] = useState('');
  const [experimentOutcome, setExperimentOutcome] = useState(null);
  const [experimentNote, setExperimentNote] = useState('');
  const pctColor = pct >= 90 ? '#10B981' : pct >= 70 ? '#F97316' : '#EF4444';

  const handleSend = async () => {
    setState('saving');
    try {
      await saveReport({
        sections,
        nextShift,
        experimentText: experiment || null,
        experimentOutcome: experimentOutcome || null,
        experimentNote: experimentNote.trim() || null,
      });
      await sendReportEmail(date);
      setState('sent');
    } catch (e) {
      setErrMsg(e.message);
      setState('error');
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:100 }}>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'16px 16px 0 0', width:'100%', maxWidth:480, padding:24, maxHeight:'80vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <span style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700 }}>End of Shift Report</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:20, cursor:'pointer', lineHeight:1 }}>×</button>
        </div>

        {state === 'sent' ? (
          <div className="report-sent">✓ Report saved and emailed</div>
        ) : (
          <>
            <div className="report-summary">
              <div className="report-pct" style={{ color: pctColor }}>{pct}%</div>
              <div className="report-sub">{done} of {total} tasks completed</div>
            </div>

            <div className="report-sections" style={{ marginTop:16 }}>
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
              <div className="report-next" style={{ marginTop:16 }}>
                <div className="report-next-label">→ Incomplete — carried to next shift</div>
                {nextShift.map((t, i) => (
                  <div key={i} className="report-next-item">
                    <span style={{ flex:1 }}>{t}</span>
                  </div>
                ))}
              </div>
            )}

            {experiment && (
              <div style={{ marginTop:16, padding:'12px 14px', background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.25)', borderRadius:'var(--radius)' }}>
                <div style={{ fontSize:11, color:'#F97316', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>🧪 Today's experiment</div>
                <div style={{ fontSize:13, color:'var(--text)', marginBottom:12, lineHeight:1.4 }}>{experiment}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:8 }}>Did it work?</div>
                <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                  {[['yes','✓ Yes','#10B981'],['no','✗ No','#EF4444'],['not_tried','— Not tried','#6B7280']].map(([val, label, color]) => (
                    <button key={val} onClick={() => setExperimentOutcome(v => v === val ? null : val)}
                      style={{ flex:1, padding:'6px 4px', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer', border:`1px solid ${experimentOutcome===val ? color : 'var(--border)'}`, background: experimentOutcome===val ? color+'22' : 'transparent', color: experimentOutcome===val ? color : 'var(--text-muted)', transition:'all 0.15s' }}>
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  className="add-input"
                  placeholder="Optional note…"
                  value={experimentNote}
                  onChange={e => setExperimentNote(e.target.value)}
                  style={{ width:'100%', boxSizing:'border-box', fontSize:12 }}
                />
              </div>
            )}

            {state === 'error' && <div className="report-error" style={{ marginTop:12 }}>✗ {errMsg}</div>}

            <button
              className="btn-primary"
              style={{ width:'100%', marginTop:20 }}
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
