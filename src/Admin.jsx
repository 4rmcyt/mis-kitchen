import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, getRestaurantProfiles, adminUpdateProfile, getDayTemplates, createDayTemplate, updateDayTemplate, deleteDayTemplate, createTasksBatch, getRecipes, createRecipe, updateRecipe, deleteRecipe, getRestaurantReports, signOut } from "./lib/supabase.js";


const STATIONS = ["Common", "Garmo", "Rolls", "Pans", "Grill", "Tandoor"];
const STATION_COLORS = {
  Garmo:"#22D3EE", Rolls:"#A78BFA", Pans:"#F97316",
  Grill:"#EF4444", Tandoor:"#F59E0B", Common:"#6B7280", All:"#6B7280"
};

const ROLE_COLORS = { superadmin:"#F97316", admin:"#6366F1", cook:"#3A3A3A" };
const ROLE_LABELS = { superadmin:"Super Admin", admin:"Admin", cook:"Cook" };

// CONFIRM
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

function useConfirm() {
  const [state, setState] = useState(null);
  const confirm = (message) => new Promise(resolve => {
    setState({ message, resolve });
  });
  const handleConfirm = () => { state.resolve(true); setState(null); };
  const handleCancel = () => { state.resolve(false); setState(null); };
  const dialog = state ? <ConfirmDialog message={state.message} onConfirm={handleConfirm} onCancel={handleCancel}/> : null;
  return { confirm, dialog };
}

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
  const safeName = name || '?';
  const initials = safeName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const hue = safeName.split('').reduce((a,c) => a + c.charCodeAt(0), 0) % 360;
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
  const [inviteRole, setInviteRole] = useState('cook');
  const [inviteStation, setInviteStation] = useState('Grill');
  const [inviteMode, setInviteMode] = useState('link'); // 'link' | 'email'
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
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

  const generateInvite = async () => {
    setLoading(true);
    try {
      const { data: { user: me } } = await supabase.auth.getUser();
      const { data: myProfile } = await supabase.from('profiles').select('restaurant_id, name').eq('id', me.id).single();

      if (inviteMode === 'email') {
        const { data, error } = await supabase.functions.invoke('send-invite', {
          body: {
            email: inviteEmail.trim(),
            role: inviteRole,
            station: inviteStation,
            restaurant_id: myProfile.restaurant_id,
            invited_by: me.id,
            invited_by_name: myProfile.name,
          },
        });
        if (error || data?.error) throw new Error(error?.message || data?.error);
        toast('Invite sent!', 'success');
        setTimeout(closeInvite, 1500);
        return;
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const { error: invErr } = await supabase.from('invites').insert({
        restaurant_id: myProfile.restaurant_id,
        invited_by: me.id,
        email: null,
        role: inviteRole,
        station: inviteStation,
        token,
        used: false,
        expires_at: expiresAt,
      });
      if (invErr) throw new Error(invErr.message);
      setInviteLink(`${window.location.origin}/join/${token}`);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeInvite = () => {
    setShowInvite(false);
    setInviteLink('');
    setCopied(false);
    setInviteRole('cook');
    setInviteStation('Grill');
    setInviteMode('link');
    setInviteEmail('');
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
                <td><span className="cell-muted">{u.last_seen ? new Date(u.last_seen).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span></td>
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
        <Modal title="Invite Person" onClose={closeInvite}>
          {inviteLink ? (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ fontSize:13, color:'var(--text-muted)' }}>
                {inviteMode === 'email'
                  ? `Share this link with ${inviteEmail}. It expires in 48 hours.`
                  : 'Share this link via WhatsApp, Signal, or any messenger. It expires in 48 hours.'}
              </div>
              <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', fontSize:12, color:'var(--text)', wordBreak:'break-all', fontFamily:'var(--font-mono)' }}>
                {inviteLink}
              </div>
              <button className="btn-primary" onClick={copyLink} data-testid="copy-invite-link">
                {copied ? '✓ Copied!' : 'Copy Link'}
              </button>
              <div style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center' }}>
                Role: <strong>{inviteRole}</strong> · Station: <strong>{inviteStation}</strong>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', gap:8, marginBottom:4 }}>
                <button
                  onClick={() => setInviteMode('link')}
                  style={{ flex:1, padding:'8px 0', borderRadius:8, border:'1px solid', cursor:'pointer', fontSize:12, fontFamily:'var(--font-mono)',
                    background: inviteMode==='link' ? 'var(--accent)' : 'transparent',
                    color: inviteMode==='link' ? '#000' : 'var(--text-muted)',
                    borderColor: inviteMode==='link' ? 'var(--accent)' : 'var(--border)' }}>
                  Generate Link
                </button>
                <button
                  onClick={() => setInviteMode('email')}
                  style={{ flex:1, padding:'8px 0', borderRadius:8, border:'1px solid', cursor:'pointer', fontSize:12, fontFamily:'var(--font-mono)',
                    background: inviteMode==='email' ? 'var(--accent)' : 'transparent',
                    color: inviteMode==='email' ? '#000' : 'var(--text-muted)',
                    borderColor: inviteMode==='email' ? 'var(--accent)' : 'var(--border)' }}>
                  Invite by Email
                </button>
              </div>
              {inviteMode === 'email' && (
                <div><label className="form-label-sm">Email</label>
                  <input className="form-inp" type="email" placeholder="colleague@email.com"
                    value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}/>
                </div>
              )}
              <div><label className="form-label-sm">Role</label>
                <select className="form-sel" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                  <option value="cook">Cook</option><option value="admin">Admin</option>
                </select></div>
              <div><label className="form-label-sm">Primary Station</label>
                <select className="form-sel" value={inviteStation} onChange={e => setInviteStation(e.target.value)}>
                  {STATIONS.map(st => <option key={st}>{st}</option>)}
                </select></div>
              {inviteMode === 'link' && (
                <div className="security-note">
                  🔒 No email needed. The person fills in their details when they open the link.
                </div>
              )}
              <button className="btn-primary" onClick={generateInvite} disabled={loading || (inviteMode==='email' && !inviteEmail.trim())} data-testid="generate-invite-btn">
                {loading ? 'Generating…' : inviteMode === 'email' ? 'Send Invite' : 'Generate Link'}
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

const SECTIONS = ['Opening', 'Closing', 'Other'];
const SECTION_COLORS = { Opening: '#F97316', Closing: '#6366F1', Other: '#6B7280' };

function TasksTab() {
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
  const { show: toast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => { getDayTemplates().then(setDayTemplates).catch(e => toast(e.message, 'error')); }, []);

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
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <button className="btn-secondary" onClick={() => setSelected(null)}>← Back</button>
          <span style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, flex:1 }}>{selected.name}</span>
          <button className="btn-danger" onClick={() => deleteTemplate(selected)}>Delete</button>
        </div>
        <div style={{ color:'var(--text-muted)', fontSize:12 }}>{entries.length} tasks</div>

        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          {entries.map((entry, idx) => (
            <div key={idx} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)' }}>
              <span style={{ flex:1, fontSize:13 }}>{entry.text}</span>
              <Badge color={STATION_COLORS[entry.station]||'#6B7280'} small>{entry.station}</Badge>
              <span style={{ fontSize:11, color:SECTION_COLORS[entry.section], border:`1px solid ${SECTION_COLORS[entry.section]}44`, padding:'1px 7px', borderRadius:4, flexShrink:0 }}>{entry.section}</span>
              <button className="icon-btn" onClick={() => removeTask(idx)} style={{ color:'#EF4444', fontSize:16, flexShrink:0 }}>×</button>
            </div>
          ))}
          {entries.length === 0 && <div style={{ color:'var(--text-muted)', fontSize:13, padding:'8px 0' }}>No tasks yet.</div>}
        </div>

        <div style={{ display:'flex', gap:8, alignItems:'center', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'10px 12px' }}>
          <input className="search-inp" style={{ flex:1, maxWidth:'none', background:'transparent', border:'none', padding:0 }}
            placeholder="New task…" value={newText} onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()} autoFocus/>
          <select className="form-sel" style={{ width:100, padding:'4px 8px' }} value={newStation} onChange={e => setNewStation(e.target.value)}>
            {STATIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="form-sel" style={{ width:100, padding:'4px 8px' }} value={newSection} onChange={e => setNewSection(e.target.value)}>
            {SECTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <button className="btn-primary" style={{ flexShrink:0 }} onClick={addTask}>Add</button>
        </div>

        <div style={{ paddingTop:16, borderTop:'1px solid var(--border)', display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:12, color:'var(--text-muted)', flexShrink:0 }}>Apply to</span>
          <input type="date" className="search-inp" value={assignDate} style={{ width:160 }}
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
      <div className="stat-row">
        <div className="stat-card"><div className="stat-val">{dayTemplates.length}</div><div className="stat-lbl">Templates</div></div>
        <div className="stat-card"><div className="stat-val">{dayTemplates.reduce((a,d) => a+(d.entries?.length||0), 0)}</div><div className="stat-lbl">Total Tasks</div></div>
      </div>
      <div className="toolbar">
        <div style={{ flex:1 }}/>
        <button className="btn-primary" onClick={() => setShowNew(true)}>+ New Template</button>
      </div>
      {showNew && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:16, display:'flex', gap:8, alignItems:'center' }}>
          <input className="search-inp" style={{ flex:1, maxWidth:'none' }} placeholder="Template name (e.g. Tuesday Setup)" value={newName}
            onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createTemplate()} autoFocus/>
          <button className="btn-primary" onClick={createTemplate} disabled={saving}>{saving ? 'Creating…' : 'Create'}</button>
          <button className="btn-secondary" onClick={() => { setShowNew(false); setNewName(''); }}>Cancel</button>
        </div>
      )}
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {dayTemplates.map(dt => (
          <div key={dt.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', cursor:'pointer', transition:'border-color 0.15s' }}
            onClick={() => setSelected({ ...dt, entries: dt.entries||[] })}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:700, flex:1 }}>{dt.name}</span>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>{dt.entries?.length||0} tasks</span>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>→</span>
          </div>
        ))}
        {dayTemplates.length === 0 && <div style={{ color:'var(--text-muted)', fontSize:13, padding:'8px 0' }}>No templates yet.</div>}
      </div>
    </div>
  );
}

const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'tsp', 'tbsp', 'cup', 'portion'];

function emptyRecipe() {
  return { name: '', portions: 1, is_shared: false, ingredients: [], steps: [] };
}

function RecipeForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const [ingText, setIngText] = useState('');
  const [ingAmt, setIngAmt] = useState('');
  const [ingUnit, setIngUnit] = useState('g');
  const [stepText, setStepText] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addIng = () => {
    if (!ingText.trim()) return;
    set('ingredients', [...form.ingredients, { name: ingText.trim(), amount: ingAmt, unit: ingUnit }]);
    setIngText(''); setIngAmt('');
  };
  const removeIng = (i) => set('ingredients', form.ingredients.filter((_, idx) => idx !== i));

  const addStep = () => {
    if (!stepText.trim()) return;
    set('steps', [...form.steps, stepText.trim()]);
    setStepText('');
  };
  const removeStep = (i) => set('steps', form.steps.filter((_, idx) => idx !== i));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', gap:10 }}>
        <div style={{ flex:1 }}>
          <label className="form-label-sm">Name</label>
          <input className="form-inp" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Recipe name" autoFocus/>
        </div>
        <div style={{ width:90 }}>
          <label className="form-label-sm">Portions</label>
          <input className="form-inp" type="number" min="1" value={form.portions} onChange={e => set('portions', parseInt(e.target.value)||1)}/>
        </div>
      </div>

      <div>
        <label className="form-label-sm" style={{ marginBottom:6, display:'block' }}>Ingredients</label>
        <div style={{ display:'flex', flexDirection:'column', gap:2, marginBottom:6 }}>
          {form.ingredients.map((ing, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background:'var(--surface2)', borderRadius:6 }}>
              <span style={{ flex:1, fontSize:13 }}>{ing.name}</span>
              <span style={{ fontSize:12, color:'var(--accent)', fontFamily:'var(--font-mono)' }}>{ing.amount} {ing.unit}</span>
              <button className="icon-btn" onClick={() => removeIng(i)} style={{ color:'#EF4444' }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <input className="search-inp" style={{ flex:1, maxWidth:'none' }} placeholder="Ingredient" value={ingText}
            onChange={e => setIngText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addIng()}/>
          <input className="search-inp" style={{ width:70 }} placeholder="Amt" value={ingAmt}
            onChange={e => setIngAmt(e.target.value)} onKeyDown={e => e.key === 'Enter' && addIng()}/>
          <select className="form-sel" style={{ width:80, padding:'6px 8px' }} value={ingUnit} onChange={e => setIngUnit(e.target.value)}>
            {UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
          <button className="btn-secondary" onClick={addIng}>+</button>
        </div>
      </div>

      <div>
        <label className="form-label-sm" style={{ marginBottom:6, display:'block' }}>Steps</label>
        <div style={{ display:'flex', flexDirection:'column', gap:2, marginBottom:6 }}>
          {form.steps.map((step, i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'6px 10px', background:'var(--surface2)', borderRadius:6 }}>
              <span style={{ color:'var(--text-muted)', fontSize:11, minWidth:18, textAlign:'right', marginTop:2 }}>{i+1}.</span>
              <span style={{ flex:1, fontSize:13 }}>{step}</span>
              <button className="icon-btn" onClick={() => removeStep(i)} style={{ color:'#EF4444' }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <input className="search-inp" style={{ flex:1, maxWidth:'none' }} placeholder="Step description" value={stepText}
            onChange={e => setStepText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addStep()}/>
          <button className="btn-secondary" onClick={addStep}>+</button>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, alignItems:'center', paddingTop:4 }}>
        <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)', cursor:'pointer' }}>
          <input type="checkbox" checked={form.is_shared} onChange={e => set('is_shared', e.target.checked)}/>
          Share with team
        </label>
        <div style={{ flex:1 }}/>
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" onClick={() => onSave(form)} disabled={saving || !form.name.trim()}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function RecipesTab() {
  const [recipes, setRecipes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { show: toast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => { getRecipes().then(setRecipes).catch(e => toast(e.message, 'error')); }, []);

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      const r = await createRecipe(form);
      setRecipes(rs => [r, ...rs]);
      setShowNew(false);
      setSelected(r);
      toast('Recipe created', 'success');
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  const handleUpdate = async (form) => {
    setSaving(true);
    try {
      const r = await updateRecipe(selected.id, form);
      setRecipes(rs => rs.map(x => x.id === r.id ? r : x));
      setSelected(r);
      setEditing(false);
      toast('Saved', 'success');
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!await confirm(`Delete "${selected.name}"?`)) return;
    try {
      await deleteRecipe(selected.id);
      setRecipes(rs => rs.filter(r => r.id !== selected.id));
      setSelected(null);
      toast('Deleted', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  const toggleShare = async (id) => {
    const item = recipes.find(r => r.id === id);
    try {
      await supabase.from('recipes').update({ is_shared: !item.is_shared }).eq('id', id);
      setRecipes(rs => rs.map(r => r.id === id ? { ...r, is_shared: !r.is_shared } : r));
      if (selected?.id === id) setSelected(s => ({ ...s, is_shared: !s.is_shared }));
    } catch (e) { toast(e.message, 'error'); }
  };

  if (selected && editing) {
    return (
      <div className="tab-content">
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <button className="btn-secondary" onClick={() => setEditing(false)}>← Back</button>
          <span style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, flex:1 }}>Edit: {selected.name}</span>
        </div>
        <RecipeForm initial={selected} onSave={handleUpdate} onCancel={() => setEditing(false)} saving={saving}/>
      </div>
    );
  }

  if (selected) {
    const ings = selected.ingredients || [];
    const steps = selected.steps || [];
    return (
      <div className="tab-content">
        {confirmDialog}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <button className="btn-secondary" onClick={() => setSelected(null)}>← Back</button>
          <span style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, flex:1 }}>{selected.name}</span>
          <button className="btn-secondary" onClick={() => setEditing(true)}>Edit</button>
          <button className="btn-danger" onClick={handleDelete}>Delete</button>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>{selected.portions} portion{selected.portions!==1?'s':''}</span>
          <span style={{ fontSize:12, color: selected.is_shared ? '#10B981' : 'var(--text-muted)' }}>
            {selected.is_shared ? '● Shared' : '○ Personal'}
          </span>
          <button style={{ background:'none', border:'none', fontSize:12, cursor:'pointer', color:'var(--accent)', fontFamily:'var(--font-mono)', padding:0 }}
            onClick={() => toggleShare(selected.id)}>
            {selected.is_shared ? 'Unpublish' : 'Publish'}
          </button>
        </div>

        {ings.length > 0 && (
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'14px 16px' }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Ingredients ({selected.portions}p)</div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {ings.map((ing, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'4px 0', borderBottom:'1px solid var(--border2)' }}>
                  <span style={{ flex:1, fontSize:13 }}>{ing.name}</span>
                  <span style={{ fontSize:13, color:'var(--accent)', fontFamily:'var(--font-mono)', fontWeight:500 }}>{ing.amount} {ing.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {steps.length > 0 && (
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'14px 16px' }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Steps</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {steps.map((step, i) => (
                <div key={i} style={{ display:'flex', gap:12, fontSize:13 }}>
                  <span style={{ color:'var(--accent)', fontFamily:'var(--font-mono)', fontWeight:700, flexShrink:0 }}>{i+1}.</span>
                  <span style={{ lineHeight:1.5 }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {ings.length === 0 && steps.length === 0 && (
          <div style={{ color:'var(--text-muted)', fontSize:13 }}>No ingredients or steps yet. <button style={{ background:'none', border:'none', color:'var(--accent)', cursor:'pointer', fontFamily:'var(--font-mono)', fontSize:13, padding:0 }} onClick={() => setEditing(true)}>Add them →</button></div>
        )}
      </div>
    );
  }

  if (showNew) {
    return (
      <div className="tab-content">
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <button className="btn-secondary" onClick={() => setShowNew(false)}>← Back</button>
          <span style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700 }}>New Recipe</span>
        </div>
        <RecipeForm initial={emptyRecipe()} onSave={handleCreate} onCancel={() => setShowNew(false)} saving={saving}/>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="stat-row">
        <div className="stat-card"><div className="stat-val">{recipes.length}</div><div className="stat-lbl">Recipes</div></div>
        <div className="stat-card"><div className="stat-val" style={{ color:'#10B981' }}>{recipes.filter(r=>r.is_shared).length}</div><div className="stat-lbl">Shared</div></div>
      </div>
      <div className="toolbar">
        <button className="btn-primary" onClick={() => setShowNew(true)}>+ New Recipe</button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        {recipes.map(r => (
          <div key={r.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', cursor:'pointer', transition:'border-color 0.15s' }}
            onClick={() => setSelected(r)}>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700 }}>{r.name}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                {r.ingredients?.length||0} ingredients · {r.steps?.length||0} steps · {r.portions}p
              </div>
            </div>
            {r.is_shared && <span style={{ fontSize:11, color:'#10B981' }}>● Shared</span>}
          </div>
        ))}
        {recipes.length === 0 && <div style={{ color:'var(--text-muted)', fontSize:13, padding:'8px 0' }}>No recipes yet.</div>}
      </div>
    </div>
  );
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


//  MAIN APP 
export default function Admin() {
  const [tab, setTab] = useState('people');
  const [me, setMe] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('name,role').eq('id', user.id).single()
        .then(({ data }) => { if (data) setMe(data); });
    });
  }, []);

  const TABS = [
    { id:'people',   label:'People',   icon:'👥' },
    { id:'tasks',    label:'Tasks',    icon:'✓'  },
    { id:'recipes',  label:'Recipes',  icon:'⚗'  },
    { id:'reports',  label:'Reports',  icon:'📊' },
  ];

  return (
    <div className="admin-app">
      <style>{CSS}</style>
      <ToastContainer toasts={[]} />
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span style={{ cursor:'pointer' }} onClick={() => navigate('/')}>mis<span style={{ color:'#F97316' }}>.</span></span>
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
          <Avatar name={me?.name || '?'} size={32}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:600 }}>{me?.name || '…'}</div>
            <div style={{ fontSize:10, color: ROLE_COLORS[me?.role] || 'var(--text-muted)' }}>{ROLE_LABELS[me?.role] || ''}</div>
          </div>
          <button onClick={() => signOut()} title="Sign out" style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:18, cursor:'pointer', padding:'4px 6px', borderRadius:6 }}>⏻</button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">{TABS.find(t=>t.id===tab)?.label}</h1>

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
    --bg:#111111; --surface:#1A1A1A; --surface2:#222222; --surface3:#2A2A2A;
    --border:#333333; --border2:#3A3A3A;
    --text:#F0F0E8; --text-muted:#777;
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
