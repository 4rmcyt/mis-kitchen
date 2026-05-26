import { useState, useEffect } from "react";
import { getRestaurantReports } from "../../lib/supabase.js";
import { STATION_COLORS } from "../../lib/constants.js";
import { useToast } from "../components/Toast.jsx";
import { Avatar } from "../components/Avatar.jsx";
import { Badge } from "../components/Badge.jsx";
import { PctBar } from "../components/PctBar.jsx";
import { Modal } from "../components/Modal.jsx";

export function ReportsTab() {
  const [dateFilter, setDateFilter] = useState('Today');
  const [selected, setSelected] = useState(null);
  const [reports, setReports] = useState([]);
  const { show: toast } = useToast();

  useEffect(() => {
    const date = dateFilter === 'Today'
      ? new Date().toISOString().split('T')[0]
      : new Date(Date.now() - 86400000).toISOString().split('T')[0];
    getRestaurantReports(date)
      .then(data => setReports((data || []).map(r => ({
        ...r,
        name: r.profiles?.name || 'Unknown',
        station: r.profiles?.station || '—',
        pct: r.completed_pct,
        done: r.completed_count,
        total: r.total_count,
        next_shift: r.next_shift || [],
        sections: r.sections || [],
        experiment_text: r.experiment_text || null,
        experiment_outcome: r.experiment_outcome || null,
        experiment_note: r.experiment_note || null,
      }))))
      .catch(e => toast(e.message, 'error'));
  }, [dateFilter]);

  const filtered = reports;
  const avgPct = filtered.length ? Math.round(filtered.reduce((a,r) => a+r.pct, 0) / filtered.length) : 0;
  const perfect = filtered.filter(r => r.pct === 100).length;
  const withNext = filtered.filter(r => r.next_shift.length > 0).length;

  return (
    <div className="tab-content">
      <div className="stat-row">
        <div className="stat-card"><div className="stat-val" style={{ color:'#F97316' }}>{avgPct}%</div><div className="stat-lbl">Avg completion</div></div>
        <div className="stat-card"><div className="stat-val">{filtered.length}</div><div className="stat-lbl">Reports submitted</div></div>
        <div className="stat-card"><div className="stat-val" style={{ color:'#10B981' }}>{perfect}</div><div className="stat-lbl">100% complete</div></div>
        <div className="stat-card"><div className="stat-val" style={{ color:'#6366F1' }}>{withNext}</div><div className="stat-lbl">Tasks deferred</div></div>
      </div>

      <div className="toolbar">
        <div className="seg-ctrl">
          {['Today','Yesterday'].map(d => (
            <button key={d} className={`seg-btn ${dateFilter===d?'active':''}`} onClick={() => setDateFilter(d)}>{d}</button>
          ))}
        </div>
      </div>

      <div className="heatmap">
        {filtered.map(r => {
          const c = r.pct >= 90 ? '#10B981' : r.pct >= 70 ? '#F97316' : '#EF4444';
          return (
            <button key={r.id} className="heat-cell" onClick={() => setSelected(r)} style={{ borderColor: c + '44' }}>
              <Avatar name={r.name} size={32}/>
              <div className="heat-name">{(r.name || '?').split(' ')[0]}</div>
              <div className="heat-pct" style={{ color: c }}>{r.pct}%</div>
              <PctBar pct={r.pct} color={c}/>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ color:'var(--text-muted)', fontSize:13, padding:'32px 0' }}>No reports for {dateFilter}</div>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="table-wrap" style={{ marginTop:0 }}>
          <table className="data-table">
            <thead>
              <tr><th>Cook</th><th>Station</th><th>Completion</th><th>Done/Total</th><th>Deferred</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} style={{ cursor:'pointer' }} onClick={() => setSelected(r)}>
                  <td><div style={{ display:'flex', alignItems:'center', gap:8 }}><Avatar name={r.name} size={28}/><span className="user-name">{r.name}</span></div></td>
                  <td><Badge color={STATION_COLORS[r.station]||'#6B7280'} small>{r.station}</Badge></td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <PctBar pct={r.pct}/>
                      <span className="cell-num" style={{ width:36, textAlign:'right' }}>{r.pct}%</span>
                    </div>
                  </td>
                  <td><span className="cell-num">{r.done}/{r.total}</span></td>
                  <td>
                    {r.next_shift.length > 0
                      ? <Badge color="#6366F1" small>{r.next_shift.length} tasks</Badge>
                      : <span style={{ fontSize:11, color:'#10B981' }}>✓ none</span>}
                  </td>
                  <td><button className="tbl-btn" onClick={e => { e.stopPropagation(); setSelected(r); }}>Details</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <Modal title={`${selected.name} — ${selected.date}`} onClose={() => setSelected(null)}>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:14, paddingBottom:16, borderBottom:'1px solid var(--border)' }}>
              <Avatar name={selected.name} size={44}/>
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:700 }}>{selected.name}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{selected.station} · {selected.date}</div>
              </div>
              <div style={{ marginLeft:'auto', textAlign:'right' }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:800, color: selected.pct>=90?'#10B981':selected.pct>=70?'#F97316':'#EF4444', lineHeight:1 }}>{selected.pct}%</div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{selected.done}/{selected.total} tasks</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Sections</div>
              {selected.sections.map((sec,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <span style={{ fontSize:13, flex:1 }}>{sec.name}</span>
                  <PctBar pct={sec.total ? (sec.done/sec.total)*100 : 0}/>
                  <span style={{ fontSize:12, color:'var(--text-muted)', width:40, textAlign:'right' }}>{sec.done}/{sec.total}</span>
                </div>
              ))}
            </div>
            {selected.experiment_text && (
              <div style={{ background:'rgba(249,115,22,0.06)', border:'1px solid rgba(249,115,22,0.2)', borderRadius:8, padding:12 }}>
                <div style={{ fontSize:11, color:'#F97316', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>🧪 Experiment</div>
                <div style={{ fontSize:13, color:'var(--text)', marginBottom:8, lineHeight:1.4 }}>{selected.experiment_text}</div>
                {selected.experiment_outcome && (
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{
                      fontSize:12, fontWeight:700, padding:'2px 10px', borderRadius:4,
                      background: selected.experiment_outcome==='yes' ? '#10B98122' : selected.experiment_outcome==='no' ? '#EF444422' : '#6B728022',
                      color: selected.experiment_outcome==='yes' ? '#10B981' : selected.experiment_outcome==='no' ? '#EF4444' : '#9CA3AF',
                    }}>
                      {selected.experiment_outcome==='yes' ? '✓ Worked' : selected.experiment_outcome==='no' ? '✗ Didn\'t work' : '— Not tried'}
                    </span>
                    {selected.experiment_note && <span style={{ fontSize:12, color:'var(--text-muted)', fontStyle:'italic' }}>{selected.experiment_note}</span>}
                  </div>
                )}
              </div>
            )}

            {selected.next_shift.length > 0 && (
              <div style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:8, padding:12 }}>
                <div style={{ fontSize:11, color:'#6366F1', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>→ Deferred to next shift</div>
                {selected.next_shift.map((t,i) => (
                  <div key={i} style={{ fontSize:13, color:'var(--text)', padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>• {typeof t === 'string' ? t : t.text}</div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
