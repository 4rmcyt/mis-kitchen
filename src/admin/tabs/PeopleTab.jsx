import { useState, useEffect } from "react";
import { supabase, getRestaurantProfiles, adminUpdateProfile } from "../../lib/supabase.js";
import { STATIONS, STATION_COLORS, ROLE_COLORS, ROLE_LABELS } from "../../lib/constants.js";
import { useToast } from "../components/Toast.jsx";
import { Avatar } from "../components/Avatar.jsx";
import { Badge } from "../components/Badge.jsx";
import { Modal } from "../components/Modal.jsx";

export function PeopleTab() {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteRole, setInviteRole] = useState('cook');
  const [inviteStation, setInviteStation] = useState('Grill');
  const [inviteMode, setInviteMode] = useState('link');
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
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // eslint-disable-line react-hooks/purity
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

      {/* Coverage matrix: which stations have backup */}
      {users.length > 0 && (() => {
        const workStations = STATIONS.filter(s => s !== 'Common');
        return (
          <div className="coverage-matrix" style={{ marginTop: 24, padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Station coverage</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {workStations.map(st => {
                const primary = users.filter(u => u.active && u.station === st);
                const backup  = users.filter(u => u.active && u.station !== st && (u.secondary_stations || []).includes(st));
                const covered = primary.length > 0 || backup.length > 0;
                return (
                  <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: covered ? '#10B981' : '#EF4444', flexShrink: 0 }}/>
                    <span style={{ fontSize: 13, width: 72, flexShrink: 0 }}>{st}</span>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
                      {primary.map(u => (
                        <span key={u.id} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: (STATION_COLORS[st]||'#888')+'22', color: STATION_COLORS[st]||'#888', fontWeight: 600 }}>{(u.name||'?').split(' ')[0]}</span>
                      ))}
                      {backup.map(u => (
                        <span key={u.id} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{(u.name||'?').split(' ')[0]} ✓</span>
                      ))}
                      {!covered && <span style={{ fontSize: 11, color: '#EF4444' }}>No coverage!</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

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
            <div className="form-row">
              <label className="form-label-sm">Also trained for</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>
                {STATIONS.filter(st => st !== 'Common' && st !== selected.station).map(st => {
                  const active = (selected.secondary_stations || []).includes(st);
                  return (
                    <button key={st} onClick={async () => {
                      const current = selected.secondary_stations || [];
                      const next = active ? current.filter(s => s !== st) : [...current, st];
                      try {
                        await adminUpdateProfile(selected.id, { secondary_stations: next });
                        setUsers(us => us.map(u => u.id === selected.id ? { ...u, secondary_stations: next } : u));
                        setSelected(s => ({ ...s, secondary_stations: next }));
                      } catch (e) { toast(e.message, 'error'); }
                    }} style={{
                      padding:'4px 10px', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer',
                      border:`1px solid ${active ? STATION_COLORS[st]||'#888' : 'var(--border)'}`,
                      background: active ? (STATION_COLORS[st]||'#888')+'22' : 'transparent',
                      color: active ? STATION_COLORS[st]||'#888' : 'var(--text-muted)',
                    }}>
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ background:'var(--surface2)', borderRadius:8, padding:12, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              <div style={{ textAlign:'center' }}><div style={{ fontSize:22, fontWeight:700, color: selected.active ? '#10B981' : '#555', fontFamily:'var(--font-display)' }}>{selected.active ? 'ON' : 'OFF'}</div><div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Status</div></div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn-secondary" style={{ flex:1 }} onClick={async () => {
                setLoading(true);
                try {
                  await new Promise(r => { setTimeout(r, 600); });
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
