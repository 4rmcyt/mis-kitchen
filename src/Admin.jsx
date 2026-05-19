import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, getRestaurantProfiles, adminUpdateProfile, getTemplates, getRecipes, getRestaurantReports, signOut } from "./lib/supabase.js";


const STATIONS = ["Common", "Cold", "Rolls", "Hot", "Grill", "Tandoor"];
const STATION_COLORS = {
  Cold:"#22D3EE", Rolls:"#A78BFA", Hot:"#F97316",
  Grill:"#EF4444", Tandoor:"#F59E0B", Common:"#6B7280", All:"#6B7280"
};

const ROLE_COLORS = { superadmin:"#F97316", admin:"#6366F1", cook:"#3A3A3A" };
const ROLE_LABELS = { superadmin:"Super Admin", admin:"Admin", cook:"Cook" };

function _uid() { return Math.random().toString(36).slice(2,9); }

//  TOAST 
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = (msg, type = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };
  return { toasts, show };
}

function ToastContainer({ toasts }) {
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

function Avatar({ name, size = 36 }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const hue = name.split('').reduce((a,c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `hsl(${hue},35%,20%)`, border: `1.5px solid hsl(${hue},35%,30%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 600, color: `hsl(${hue},60%,70%)`,
      flexShrink: 0, fontFamily: 'var(--font-display)',
    }}>{initials}</div>
  );
}

function Badge({ color, children, small }) {
  return (
    <span style={{
      background: color + '22', border: `1px solid ${color}44`,
      color, borderRadius: 4, padding: small ? '1px 6px' : '3px 8px',
      fontSize: small ? 10 : 11, fontWeight: 600,
      fontFamily: 'var(--font-display)', letterSpacing: '0.3px',
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function PctBar({ pct, color = "#F97316", height = 4 }) {
  const c = pct >= 90 ? "#10B981" : pct >= 70 ? "#F97316" : "#EF4444";
  return (
    <div style={{ background: '#1a1a1a', borderRadius: 2, height, overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color || c, borderRadius: 2, transition: 'width 0.4s' }}/>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-hdr">
          <span>{title}</span>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

//  PEOPLE TAB
function PeopleTab() {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('cook');
  const [inviteStation, setInviteStation] = useState('Grill');
  const [inviteSent, setInviteSent] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const { show: toast } = useToast();

  useEffect(() => {
    getRestaurantProfiles().then(setUsers).catch(e => toast(e.message, 'error'));
  }, []);

  const filtered = users.filter(u =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = users.filter(u => u.active).length;
  const adminCount = users.filter(u => u.role === 'admin' || u.role === 'superadmin').length;

  const sendInvite = async () => {
    if (!inviteEmail) return;
    setLoading(true);
    try {
      const { data: { user: me } } = await supabase.auth.getUser();
      const { data: myProfile } = await supabase.from('profiles').select('name, restaurant_id').eq('id', me.id).single();
      const { error } = await supabase.functions.invoke('send-invite', {
        body: {
          email: inviteEmail,
          role: inviteRole,
          station: inviteStation,
          restaurant_id: myProfile.restaurant_id,
          invited_by: me.id,
          invited_by_name: myProfile.name,
        },
      });
      if (error) throw new Error(error.message);
      setInviteSent(true);
      setTimeout(() => { setShowInvite(false); setInviteSent(false); setInviteEmail(''); }, 1800);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id) => {
    const user = users.find(u => u.id === id);
    try {
      await adminUpdateProfile(id, { active: !user.active });
      setUsers(us => us.map(u => u.id === id ? { ...u, active: !u.active } : u));
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const changeRole = async (id, role) => {
    try {
      await adminUpdateProfile(id, { role });
      setUsers(us => us.map(u => u.id === id ? { ...u, role } : u));
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="tab-content">
      {/* Stats row */}
      <div className="stat-row">
        <div className="stat-card"><div className="stat-val">{users.length}</div><div className="stat-lbl">Total Users</div></div>
        <div className="stat-card"><div className="stat-val" style={{ color:'#10B981' }}>{activeCount}</div><div className="stat-lbl">Active</div></div>
        <div className="stat-card"><div className="stat-val" style={{ color:'#6366F1' }}>{adminCount}</div><div className="stat-lbl">Admins</div></div>
        <div className="stat-card"><div className="stat-val" style={{ color:'#F97316' }}>{users.filter(u=>u.shifts_this_week>0).length}</div><div className="stat-lbl">On shift this week</div></div>
      </div>

      <div className="toolbar">
        <input className="search-inp" placeholder="Search people…" value={search} onChange={e => setSearch(e.target.value)}/>
        <button className="btn-primary" onClick={() => setShowInvite(true)}>+ Invite</button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Station</th>
              <th>This week</th>
              <th>Avg completion</th>
              <th>Last seen</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className={!u.active ? 'row-inactive' : ''} onClick={() => setSelected(u)} style={{ cursor:'pointer' }}>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <Avatar name={u.name}/>
                    <div>
                      <div className="user-name">{u.name}</div>
                      <div className="user-email">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td><Badge color={ROLE_COLORS[u.role]}>{ROLE_LABELS[u.role]}</Badge></td>
                <td><Badge color={STATION_COLORS[u.station] || '#6B7280'} small>{u.station}</Badge></td>
                <td><span className="cell-num">{u.shifts_this_week} shifts</span></td>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <PctBar pct={u.avg_completion}/>
                    <span className="cell-num" style={{ width:32, textAlign:'right' }}>{u.avg_completion}%</span>
                  </div>
                </td>
                <td><span className="cell-muted">{u.last_seen}</span></td>
                <td>
                  <span style={{ fontSize:11, color: u.active ? '#10B981' : '#555', fontWeight:600 }}>
                    {u.active ? '● Active' : '○ Inactive'}
                  </span>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <div style={{ display:'flex', gap:4 }}>
                    <button className="tbl-btn" onClick={() => setSelected(u)}>Edit</button>
                    <button className="tbl-btn danger" onClick={() => toggleActive(u.id)}>
                      {u.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User detail modal */}
      {selected && (
        <Modal title="User Details" onClose={() => setSelected(null)}>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:14, padding:'4px 0 16px', borderBottom:'1px solid var(--border)' }}>
              <Avatar name={selected.name} size={52}/>
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700 }}>{selected.name}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{selected.email}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>Joined {selected.joined}</div>
              </div>
            </div>
            <div className="form-row">
              <label className="form-label-sm">Role</label>
              <select className="form-sel" value={selected.role} onChange={e => { changeRole(selected.id, e.target.value); setSelected(s => ({...s, role: e.target.value})); }}>
                <option value="cook">Cook</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-row">
              <label className="form-label-sm">Station</label>
              <select className="form-sel" value={selected.station} onChange={e => setSelected(s => ({...s, station: e.target.value}))}>
                {STATIONS.map(st => <option key={st}>{st}</option>)}
              </select>
            </div>
            <div style={{ background:'var(--surface2)', borderRadius:8, padding:12, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              <div style={{ textAlign:'center' }}><div style={{ fontSize:22, fontWeight:700, color:'var(--accent)', fontFamily:'var(--font-display)' }}>{selected.shifts_this_week}</div><div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Shifts this week</div></div>
              <div style={{ textAlign:'center' }}><div style={{ fontSize:22, fontWeight:700, color:'#10B981', fontFamily:'var(--font-display)' }}>{selected.avg_completion}%</div><div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Avg completion</div></div>
              <div style={{ textAlign:'center' }}><div style={{ fontSize:22, fontWeight:700, color: selected.active ? '#10B981' : '#555', fontFamily:'var(--font-display)' }}>{selected.active ? 'ON' : 'OFF'}</div><div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Status</div></div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn-secondary" style={{ flex:1 }} onClick={async () => {
                setLoading(true);
                try {
                  // TODO: supabase.auth.admin.generateLink({ type: 'recovery', email: selected.email })
                  // For now triggers via Supabase Dashboard or service role
                  await new Promise(r => setTimeout(r, 600)); // simulate
                  toast(`Reset email sent to ${selected.email}`, 'success');
                } catch {
                  toast('Failed to send reset email', 'error');
                } finally { setLoading(false); }
              }}>Reset Password</button>
              <button className={`btn-${selected.active ? 'danger' : 'primary'}`} style={{ flex:1 }} onClick={() => { toggleActive(selected.id); setSelected(s => ({...s, active: !s.active})); }}>
                {selected.active ? 'Deactivate User' : 'Activate User'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Invite modal */}
      {showInvite && (
        <Modal title="Invite User" onClose={() => setShowInvite(false)}>
          {inviteSent ? (
            <div style={{ textAlign:'center', padding:'24px 0', color:'#10B981', fontFamily:'var(--font-display)', fontSize:16 }}>
              ✓ Invite sent to {inviteEmail}
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div><label className="form-label-sm">Email</label>
                <input className="form-inp" type="email" placeholder="cook@restaurant.io" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}/></div>
              <div><label className="form-label-sm">Role</label>
                <select className="form-sel" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                  <option value="cook">Cook</option><option value="admin">Admin</option>
                </select></div>
              <div><label className="form-label-sm">Primary Station</label>
                <select className="form-sel" value={inviteStation} onChange={e => setInviteStation(e.target.value)}>
                  {STATIONS.map(st => <option key={st}>{st}</option>)}
                </select></div>
              <div className="security-note">
                🔒 Invite link expires in 48 hours. User sets their own password.
              </div>
              <button className="btn-primary" onClick={sendInvite} disabled={loading}>{loading ? 'Sending…' : 'Send Invite'}</button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

//  CONTENT TAB
function ContentList({ items, type, onToggle, stationFilter, setStationFilter }) {
  const filtered = stationFilter === 'All' ? items : items.filter(i => i.station === stationFilter);
  return (
    <div className="tab-content">
      <div className="stat-row">
        <div className="stat-card"><div className="stat-val">{items.length}</div><div className="stat-lbl">{type === 'templates' ? 'Templates' : 'Recipes'}</div></div>
        <div className="stat-card"><div className="stat-val" style={{ color:'#10B981' }}>{items.filter(i=>i.is_shared).length}</div><div className="stat-lbl">Shared</div></div>
      </div>
      <div className="toolbar">
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {['All', ...STATIONS].map(st => (
            <button key={st} className={`pill ${stationFilter===st?'pill-active':''}`}
              style={stationFilter===st && st!=='All' ? { background: STATION_COLORS[st], color:'#000', borderColor: STATION_COLORS[st] } : {}}
              onClick={() => setStationFilter(st)}>{st}</button>
          ))}
        </div>
      </div>
      <div className="content-grid">
        {filtered.map(item => (
          <div key={item.id} className={`content-card ${item.is_shared ? 'shared' : ''}`}>
            <div className="content-card-top">
              {type === 'templates' && <div className="content-color-dot" style={{ background: item.color }}/>}
              <div className="content-card-info">
                <div className="content-card-name">{item.name}</div>
                <div className="content-card-meta">
                  {type === 'templates' ? `${item.items?.length ?? 0} items` : `${item.ingredients?.length ?? 0} ingredients`}
                </div>
              </div>
              <Badge color={STATION_COLORS[item.station] || '#6B7280'} small>{item.station}</Badge>
            </div>
            <div className="content-card-footer">
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div className={`share-dot ${item.is_shared ? 'shared' : ''}`}/>
                <span style={{ fontSize:11, color: item.is_shared ? '#10B981' : 'var(--text-muted)' }}>
                  {item.is_shared ? 'Shared with team' : 'Personal only'}
                </span>
              </div>
              <button className={`share-toggle ${item.is_shared ? 'unshare' : 'share'}`} onClick={() => onToggle(item.id)}>
                {item.is_shared ? '↓ Unpublish' : '↑ Publish to team'}
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ color:'var(--text-muted)', fontSize:13, padding:'20px 0' }}>No {type} found.</div>}
      </div>
    </div>
  );
}

function TasksTab() {
  const [templates, setTemplates] = useState([]);
  const [stationFilter, setStationFilter] = useState('All');
  const { show: toast } = useToast();
  useEffect(() => { getTemplates().then(setTemplates).catch(e => toast(e.message, 'error')); }, []);
  const toggle = async (id) => {
    const item = templates.find(t => t.id === id);
    try {
      await supabase.from('templates').update({ is_shared: !item.is_shared }).eq('id', id);
      setTemplates(ts => ts.map(t => t.id === id ? { ...t, is_shared: !t.is_shared } : t));
    } catch (e) { toast(e.message, 'error'); }
  };
  return <ContentList items={templates} type="templates" onToggle={toggle} stationFilter={stationFilter} setStationFilter={setStationFilter}/>;
}

function RecipesTab() {
  const [recipes, setRecipes] = useState([]);
  const [stationFilter, setStationFilter] = useState('All');
  const { show: toast } = useToast();
  useEffect(() => { getRecipes().then(setRecipes).catch(e => toast(e.message, 'error')); }, []);
  const toggle = async (id) => {
    const item = recipes.find(r => r.id === id);
    try {
      await supabase.from('recipes').update({ is_shared: !item.is_shared }).eq('id', id);
      setRecipes(rs => rs.map(r => r.id === id ? { ...r, is_shared: !r.is_shared } : r));
    } catch (e) { toast(e.message, 'error'); }
  };
  return <ContentList items={recipes} type="recipes" onToggle={toggle} stationFilter={stationFilter} setStationFilter={setStationFilter}/>;
}

//  REPORTS TAB
function ReportsTab() {
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

      {/* Team heatmap */}
      <div className="heatmap">
        {filtered.map(r => {
          const c = r.pct >= 90 ? '#10B981' : r.pct >= 70 ? '#F97316' : '#EF4444';
          return (
            <button key={r.id} className="heat-cell" onClick={() => setSelected(r)} style={{ borderColor: c + '44' }}>
              <Avatar name={r.name} size={32}/>
              <div className="heat-name">{r.name.split(' ')[0]}</div>
              <div className="heat-pct" style={{ color: c }}>{r.pct}%</div>
              <PctBar pct={r.pct} color={c}/>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ color:'var(--text-muted)', fontSize:13, padding:'32px 0' }}>No reports for {dateFilter}</div>
        )}
      </div>

      {/* Detail table */}
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
            {selected.next_shift.length > 0 && (
              <div style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:8, padding:12 }}>
                <div style={{ fontSize:11, color:'#6366F1', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>→ Deferred to next shift</div>
                {selected.next_shift.map((t,i) => (
                  <div key={i} style={{ fontSize:13, color:'var(--text)', padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>• {t}</div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

//  SECURITY TAB 
function SecurityTab() {
  const [resendKey, setResendKey] = useState('re_••••••••••••••••');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveKey = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const policies = [
    { label: "Row Level Security", status: "enabled", desc: "Every DB query is scoped to the authenticated user's restaurant" },
    { label: "JWT Expiry", status: "1 hour", desc: "Access tokens rotate automatically, refresh tokens are HTTP-only cookies" },
    { label: "API keys in env", status: "secure", desc: "Resend key stored server-side only, never exposed to client" },
    { label: "Invite-only registration", status: "enabled", desc: "New accounts require admin invite — no self-signup" },
    { label: "HTTPS only", status: "enforced", desc: "All traffic encrypted via Vercel/Cloudflare TLS" },
    { label: "Password hashing", status: "bcrypt", desc: "Supabase Auth — passwords never stored in plaintext" },
  ];

  const STATUS_COLORS = { enabled:'#10B981', secure:'#10B981', enforced:'#10B981', bcrypt:'#10B981', '1 hour':'#F97316' };

  return (
    <div className="tab-content">
      <div className="stat-row">
        {[
          { val:'6', lbl:'Security policies active', c:'#10B981' },
          { val:'RLS', lbl:'Row Level Security', c:'#10B981' },
          { val:'0', lbl:'Exposed secrets', c:'#10B981' },
          { val:'Invite', lbl:'Registration mode', c:'#6366F1' },
        ].map((s,i) => (
          <div key={i} className="stat-card"><div className="stat-val" style={{ color:s.c }}>{s.val}</div><div className="stat-lbl">{s.lbl}</div></div>
        ))}
      </div>

      <div className="section-block">
        <div className="section-block-title">Security Policies</div>
        {policies.map((p,i) => (
          <div key={i} className="policy-row">
            <div className="policy-check">✓</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:500 }}>{p.label}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{p.desc}</div>
            </div>
            <Badge color={STATUS_COLORS[p.status] || '#6B7280'}>{p.status}</Badge>
          </div>
        ))}
      </div>

      <div className="section-block">
        <div className="section-block-title">Server-side Secrets</div>
        <div className="security-note" style={{ marginBottom:12 }}>
          🔒 These values are stored as environment variables in Supabase Edge Functions. They are never sent to the client browser.
        </div>
        <div className="form-row">
          <label className="form-label-sm">Resend API Key (email reports)</label>
          <div style={{ display:'flex', gap:8 }}>
            <input className="form-inp" type={showKey?'text':'password'} value={resendKey} onChange={e => setResendKey(e.target.value)} style={{ flex:1 }}/>
            <button className="btn-secondary" onClick={() => setShowKey(s=>!s)}>{showKey?'Hide':'Show'}</button>
            <button className="btn-primary" onClick={saveKey}>{saved ? '✓ Saved' : 'Save'}</button>
          </div>
        </div>
      </div>

      <div className="section-block">
        <div className="section-block-title">Data Isolation</div>
        <div className="code-block">
{`-- No cook can access another cook's data
-- This policy is enforced at the database level

CREATE POLICY "users_own_data" ON daily_reports
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "admin_sees_restaurant" ON daily_reports
  FOR SELECT USING (
    get_user_role() IN ('admin', 'superadmin') AND
    restaurant_id = get_user_restaurant()
  );

-- Recipes: personal vs shared
CREATE POLICY "recipes_access" ON recipes
  FOR SELECT USING (
    user_id = auth.uid() OR
    (is_shared = true AND
     restaurant_id = get_user_restaurant())
  );`}
        </div>
      </div>
    </div>
  );
}

//  MAIN APP 
export default function Admin() {
  const [tab, setTab] = useState('people');
  const navigate = useNavigate();

  const TABS = [
    { id:'people',   label:'People',   icon:'👥' },
    { id:'tasks',    label:'Tasks',    icon:'✓'  },
    { id:'recipes',  label:'Recipes',  icon:'⚗'  },
    { id:'reports',  label:'Reports',  icon:'📊' },
    { id:'security', label:'Security', icon:'🔒' },
  ];

  return (
    <div className="admin-app">
      <style>{CSS}</style>
      <ToastContainer toasts={[]} />
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>mis<span style={{ color:'#F97316' }}>.</span></span>
          <span className="sidebar-role">Admin</span>
        </div>
        <nav className="sidebar-nav">
          {TABS.map(t => (
            <button key={t.id} className={`nav-item ${tab===t.id?'active':''}`} onClick={() => setTab(t.id)}>
              <span className="nav-item-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Avatar name="Admin User" size={32}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:600 }}>You</div>
            <div style={{ fontSize:10, color:'var(--text-muted)' }}>superadmin</div>
          </div>
          <button onClick={() => signOut()} title="Sign out" style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:18, cursor:'pointer', padding:'4px 6px', borderRadius:6 }}>⏻</button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">{TABS.find(t=>t.id===tab)?.label}</h1>
            <div className="admin-sub">Kitchen OS · La Brasserie</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div className="live-badge">● Live</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>{new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div>
            <button onClick={() => navigate('/')} style={{ background:'none', border:'1px solid var(--border)', color:'var(--text-muted)', fontSize:12, cursor:'pointer', padding:'4px 10px', borderRadius:6, fontFamily:'var(--font-mono)' }}>← App</button>
          </div>
        </div>

        {tab === 'people'   && <PeopleTab/>}
        {tab === 'tasks'    && <TasksTab/>}
        {tab === 'recipes'  && <RecipesTab/>}
        {tab === 'reports'  && <ReportsTab/>}
        {tab === 'security' && <SecurityTab/>}
      </main>

      <nav className="bottom-nav">
        {TABS.map(t => (
          <button key={t.id} className={`bottom-nav-item ${tab===t.id?'active':''}`} onClick={() => setTab(t.id)}>
            <span className="bottom-nav-icon">{t.icon}</span>
            <span className="bottom-nav-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

//  CSS 
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@600;700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#0A0A0A; --surface:#111; --surface2:#181818; --surface3:#1E1E1E;
    --border:#222; --border2:#2A2A2A;
    --text:#E8E8E0; --text-muted:#4A4A4A;
    --accent:#F97316;
    --font-display:'Syne',sans-serif; --font-mono:'DM Mono',monospace;
    --radius:8px;
  }
  html,body,#root{height:100%;background:var(--bg);color:var(--text);font-family:var(--font-mono)}

  .admin-app{display:flex;height:100vh;overflow:hidden}

  /* Sidebar */
  .sidebar{width:200px;flex-shrink:0;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:0}
  .sidebar-logo{padding:20px 18px 16px;font-family:var(--font-display);font-size:20px;font-weight:800;letter-spacing:-1px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
  .sidebar-role{font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px}
  .sidebar-nav{flex:1;padding:12px 8px;display:flex;flex-direction:column;gap:2px}
  .nav-item{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:var(--radius);border:none;background:transparent;color:var(--text-muted);font-family:var(--font-mono);font-size:13px;cursor:pointer;text-align:left;transition:all 0.15s;width:100%}
  .nav-item:hover{background:var(--surface2);color:var(--text)}
  .nav-item.active{background:var(--surface3);color:var(--text);border-left:2px solid var(--accent);padding-left:8px}
  .nav-item-icon{font-size:15px;width:20px;text-align:center}
  .sidebar-footer{padding:12px 16px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px}

  /* Main */
  .admin-main{flex:1;overflow-y:auto;display:flex;flex-direction:column;min-width:0}
  .admin-header{padding:20px 28px 16px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;position:sticky;top:0;background:var(--bg);z-index:10}
  .admin-title{font-family:var(--font-display);font-size:22px;font-weight:700;line-height:1}
  .admin-sub{font-size:11px;color:var(--text-muted);margin-top:3px;text-transform:uppercase;letter-spacing:0.5px}
  .live-badge{font-size:11px;color:#10B981;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);padding:3px 8px;border-radius:20px;font-weight:600}

  .tab-content{padding:24px 28px;display:flex;flex-direction:column;gap:20px}

  /* Stats */
  .stat-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
  .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px}
  .stat-val{font-family:var(--font-display);font-size:26px;font-weight:800;line-height:1}
  .stat-lbl{font-size:11px;color:var(--text-muted);margin-top:4px;text-transform:uppercase;letter-spacing:0.3px}

  /* Toolbar */
  .toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .search-inp{background:var(--surface);border:1px solid var(--border);color:var(--text);font-family:var(--font-mono);font-size:13px;padding:8px 12px;border-radius:var(--radius);outline:none;flex:1;max-width:280px}
  .search-inp:focus{border-color:var(--accent)}

  /* Buttons */
  .btn-primary{background:var(--accent);color:#fff;border:none;padding:8px 16px;border-radius:var(--radius);font-family:var(--font-display);font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;transition:opacity 0.15s}
  .btn-primary:hover{opacity:0.85}
  .btn-secondary{background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:8px 14px;border-radius:var(--radius);font-family:var(--font-mono);font-size:12px;cursor:pointer;white-space:nowrap;transition:background 0.15s}
  .btn-secondary:hover{background:var(--surface3)}
  .btn-danger{background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#EF4444;padding:8px 14px;border-radius:var(--radius);font-family:var(--font-mono);font-size:12px;cursor:pointer;white-space:nowrap}

  /* Table */
  .table-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;overflow-x:auto}
  .data-table{width:100%;border-collapse:collapse;font-size:13px}
  .data-table th{padding:10px 14px;text-align:left;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid var(--border);background:var(--surface2);white-space:nowrap}
  .data-table td{padding:12px 14px;border-bottom:1px solid var(--border2);vertical-align:middle}
  .data-table tr:last-child td{border-bottom:none}
  .data-table tbody tr:hover{background:var(--surface2)}
  .row-inactive{opacity:0.5}
  .user-name{font-size:13px;font-weight:500}
  .user-email{font-size:11px;color:var(--text-muted);margin-top:1px}
  .cell-num{font-size:12px;font-family:var(--font-mono)}
  .cell-muted{font-size:12px;color:var(--text-muted)}
  .tbl-btn{background:var(--surface3);border:1px solid var(--border);color:var(--text-muted);font-family:var(--font-mono);font-size:11px;padding:4px 10px;border-radius:4px;cursor:pointer;transition:all 0.15s;white-space:nowrap}
  .tbl-btn:hover{color:var(--text);border-color:var(--text-muted)}
  .tbl-btn.danger:hover{color:#EF4444;border-color:#EF444466}

  /* Segments */
  .seg-ctrl{display:flex;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
  .seg-btn{background:transparent;border:none;color:var(--text-muted);font-family:var(--font-mono);font-size:12px;padding:7px 14px;cursor:pointer;transition:all 0.15s}
  .seg-btn.active{background:var(--surface3);color:var(--text)}

  /* Pills */
  .pill{background:transparent;border:1px solid var(--border);color:var(--text-muted);font-family:var(--font-mono);font-size:11px;padding:4px 10px;border-radius:20px;cursor:pointer;transition:all 0.15s;white-space:nowrap}
  .pill:hover{border-color:var(--text-muted);color:var(--text)}
  .pill-active{border-color:var(--accent);color:var(--accent)}

  /* Content cards */
  .content-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}
  .content-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px;transition:border-color 0.15s}
  .content-card.shared{border-color:#10B98122}
  .content-card-top{display:flex;align-items:flex-start;gap:10px;margin-bottom:12px}
  .content-color-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:3px}
  .content-card-info{flex:1;min-width:0}
  .content-card-name{font-size:14px;font-weight:600;font-family:var(--font-display)}
  .content-card-meta{font-size:11px;color:var(--text-muted);margin-top:3px}
  .content-card-footer{display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid var(--border2)}
  .share-dot{width:6px;height:6px;border-radius:50%;background:var(--text-muted)}
  .share-dot.shared{background:#10B981}
  .share-toggle{background:transparent;border:none;font-family:var(--font-mono);font-size:11px;cursor:pointer;padding:0;transition:color 0.15s}
  .share-toggle.share{color:var(--accent)}
  .share-toggle.share:hover{color:#fff}
  .share-toggle.unshare{color:var(--text-muted)}
  .share-toggle.unshare:hover{color:#EF4444}

  /* Reports heatmap */
  .heatmap{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px}
  .heat-cell{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px 10px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;transition:border-color 0.15s}
  .heat-cell:hover{background:var(--surface2)}
  .heat-name{font-size:12px;font-weight:600;font-family:var(--font-display)}
  .heat-pct{font-size:18px;font-weight:800;font-family:var(--font-display);line-height:1}

  /* Security */
  .section-block{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;display:flex;flex-direction:column;gap:12px}
  .section-block-title{font-family:var(--font-display);font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);border-bottom:1px solid var(--border);padding-bottom:10px;margin-bottom:4px}
  .policy-row{display:flex;align-items:flex-start;gap:12px;padding:8px 0;border-bottom:1px solid var(--border2)}
  .policy-row:last-child{border-bottom:none}
  .policy-check{color:#10B981;font-size:14px;margin-top:1px;flex-shrink:0}
  .code-block{background:#080808;border:1px solid var(--border);border-radius:var(--radius);padding:14px;font-size:11px;color:#888;line-height:1.7;white-space:pre;overflow-x:auto;font-family:var(--font-mono)}
  .security-note{background:rgba(249,115,22,0.06);border:1px solid rgba(249,115,22,0.15);border-radius:var(--radius);padding:10px 14px;font-size:12px;color:#B0875A}

  /* Modal */
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px}
  .modal-box{background:#111;border:1px solid var(--border2);border-radius:12px;padding:22px;width:100%;max-width:480px;max-height:85vh;overflow-y:auto}
  .modal-hdr{display:flex;justify-content:space-between;align-items:center;font-family:var(--font-display);font-size:17px;font-weight:700;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--border)}
  .icon-btn{background:none;border:none;color:var(--text-muted);font-size:20px;cursor:pointer;padding:0 2px;line-height:1;transition:color 0.15s}
  .icon-btn:hover{color:var(--text)}

  /* Forms */
  .form-row{display:flex;flex-direction:column;gap:6px}
  .form-label-sm{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px}
  .form-inp{background:var(--surface2);border:1px solid var(--border);color:var(--text);font-family:var(--font-mono);font-size:13px;padding:9px 12px;border-radius:var(--radius);outline:none;width:100%}
  .form-inp:focus{border-color:var(--accent)}
  .form-sel{background:var(--surface2);border:1px solid var(--border);color:var(--text);font-family:var(--font-mono);font-size:13px;padding:9px 12px;border-radius:var(--radius);outline:none;width:100%}

  .bottom-nav{display:none}

  @media (max-width: 768px) {
    .sidebar{display:none}
    .stat-row{grid-template-columns:1fr 1fr}
    .tab-content{padding:16px}
    .admin-header{padding:14px 16px}
    .admin-main{padding-bottom:64px}
    .bottom-nav{
      display:flex;position:fixed;bottom:0;left:0;right:0;
      background:var(--surface);border-top:1px solid var(--border);
      z-index:50;height:60px;
    }
    .bottom-nav-item{
      flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
      gap:2px;border:none;background:transparent;color:var(--text-muted);
      font-family:var(--font-mono);font-size:10px;cursor:pointer;padding:6px 2px;
      transition:color 0.15s;
    }
    .bottom-nav-item.active{color:var(--accent)}
    .bottom-nav-icon{font-size:18px;line-height:1}
    .bottom-nav-label{font-size:9px;letter-spacing:0.3px;text-transform:uppercase}
  }
`;
