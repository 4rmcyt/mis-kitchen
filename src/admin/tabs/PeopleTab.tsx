import { useState } from "react";
import { STATIONS, STATION_COLORS, ROLE_COLORS, ROLE_LABELS } from "../../lib/constants.js";
import { useToast } from "../components/Toast.js";
import { Avatar } from "../components/Avatar.js";
import { Badge } from "../components/Badge.js";
import { Modal } from "../components/Modal.js";
import { usePeopleTab } from "../../hooks/features/usePeopleTab.js";
import type { Profile, Role, Station } from "../../lib/types.js";

export function PeopleTab() {
  const { users, loading, toggleActive, changeRole, changeSecondaryStations, generateLinkInvite, sendEmailInvite, resetPassword } = usePeopleTab();
  const [selected, setSelected] = useState<Profile | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteRole, setInviteRole] = useState<Role>('cook');
  const [inviteStation, setInviteStation] = useState<Station>('Grill');
  const [inviteMode, setInviteMode] = useState<'link' | 'email'>('link');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');
  const { show: toast } = useToast();

  const filtered = users.filter(u =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = users.filter(u => u.active).length;
  const adminCount = users.filter(u => u.role === 'admin' || u.role === 'superadmin').length;

  const handleGenerateInvite = async () => {
    try {
      if (inviteMode === 'email') {
        await sendEmailInvite(inviteEmail, inviteRole, inviteStation);
        toast('Invite sent!', 'success');
        setTimeout(closeInvite, 1500);
        return;
      }
      const link = await generateLinkInvite(inviteRole, inviteStation);
      setInviteLink(link);
    } catch (e) {
      toast((e as Error).message, 'error');
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

  const handleToggleActive = async (id: string) => {
    try {
      await toggleActive(id);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const handleChangeRole = async (id: string, role: Role) => {
    try {
      await changeRole(id, role);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      await resetPassword(email);
      toast(`Reset email sent to ${email}`, 'success');
    } catch (e) {
      toast((e as Error).message || 'Failed to send reset email', 'error');
    }
  };

  return (
    <div className="tab-content">
      <div className="stat-row">
        <div className="stat-card"><div className="stat-val">{users.length}</div><div className="stat-lbl">Total Users</div></div>
        <div className="stat-card"><div className="stat-val c-green">{activeCount}</div><div className="stat-lbl">Active</div></div>
        <div className="stat-card"><div className="stat-val c-indigo">{adminCount}</div><div className="stat-lbl">Admins</div></div>
      </div>

      <div className="toolbar">
        <input className="search-inp" placeholder="Search people…" value={search} onChange={e => setSearch(e.target.value)}/>
        <button className="btn-primary" onClick={() => setShowInvite(true)}>+ Invite</button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th><th>Role</th><th>Station</th><th>Last seen</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className={`row-clickable${!u.active ? ' row-inactive' : ''}`} onClick={() => setSelected(u)}>
                <td>
                  <div className="flex-row gap-10">
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
                  <span className={`user-status user-status--${u.active ? 'active' : 'inactive'}`}>
                    {u.active ? '● Active' : '○ Inactive'}
                  </span>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="flex-row gap-4">
                    <button className="tbl-btn" onClick={() => setSelected(u)}>Edit</button>
                    <button className="tbl-btn danger" onClick={() => handleToggleActive(u.id)}>
                      {u.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length > 0 && (() => {
        const workStations = STATIONS.filter(s => s !== 'Common');
        return (
          <div className="coverage-matrix">
            <div className="coverage-matrix-title">Station coverage</div>
            <div className="coverage-rows">
              {workStations.map(st => {
                const primary = users.filter(u => u.active && u.station === st);
                const backup  = users.filter(u => u.active && u.station !== st && (u.secondary_stations || []).includes(st as Station));
                const covered = primary.length > 0 || backup.length > 0;
                return (
                  <div key={st} className="coverage-row">
                    <div className={`coverage-dot coverage-dot--${covered ? 'ok' : 'missing'}`}/>
                    <span className="coverage-station">{st}</span>
                    <div className="coverage-chips">
                      {primary.map(u => (
                        <span key={u.id} className="coverage-chip-primary" style={{ background: (STATION_COLORS[st]||'#888')+'22', color: STATION_COLORS[st]||'#888' }}>{(u.name||'?').split(' ')[0]}</span>
                      ))}
                      {backup.map(u => (
                        <span key={u.id} className="coverage-chip-backup">{(u.name||'?').split(' ')[0]} ✓</span>
                      ))}
                      {!covered && <span className="coverage-missing">No coverage!</span>}
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
          <div className="flex-col gap-16">
            <div className="modal-user-hdr">
              <Avatar name={selected.name} size={52}/>
              <div>
                <div className="modal-user-name">{selected.name}</div>
                <div className="modal-user-email">{selected.email}</div>
                <div className="modal-user-joined">Joined {selected.joined}</div>
              </div>
            </div>
            <div className="form-row">
              <label className="form-label-sm">Role</label>
              <select className="form-sel" value={selected.role} onChange={e => { handleChangeRole(selected.id, e.target.value as Role); setSelected(s => s ? ({...s, role: e.target.value as Role}) : s); }}>
                <option value="cook">Cook</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-row">
              <label className="form-label-sm">Station</label>
              <select className="form-sel" value={selected.station} onChange={e => setSelected(s => s ? ({...s, station: e.target.value as Station}) : s)}>
                {STATIONS.map(st => <option key={st}>{st}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label className="form-label-sm">Also trained for</label>
              <div className="secondary-stations">
                {STATIONS.filter(st => st !== 'Common' && st !== selected.station).map(st => {
                  const active = (selected.secondary_stations || []).includes(st as Station);
                  return (
                    <button key={st} className="station-toggle" onClick={async () => {
                      const current = selected.secondary_stations || [];
                      const next = active ? current.filter(s => s !== st) : [...current, st as Station];
                      try {
                        await changeSecondaryStations(selected.id, next);
                        setSelected(s => s ? ({ ...s, secondary_stations: next }) : s);
                      } catch (e) { toast((e as Error).message, 'error'); }
                    }} style={{
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
            <div className="modal-user-stats">
              <div className="modal-user-stat">
                <div className={`modal-user-stat-val modal-user-stat-val--${selected.active ? 'active' : 'inactive'}`}>{selected.active ? 'ON' : 'OFF'}</div>
                <div className="modal-user-stat-lbl">Status</div>
              </div>
            </div>
            <div className="modal-user-actions">
              <button className="btn-secondary flex-1" onClick={() => handleResetPassword(selected.email!)} disabled={loading}>
                Reset Password
              </button>
              <button className={`btn-${selected.active ? 'danger' : 'primary'} flex-1`} onClick={() => { handleToggleActive(selected.id); setSelected(s => s ? ({...s, active: !s.active}) : s); }}>
                {selected.active ? 'Deactivate User' : 'Activate User'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showInvite && (
        <Modal title="Invite Person" onClose={closeInvite}>
          {inviteLink ? (
            <div className="invite-link-box">
              <div className="invite-link-hint">
                {inviteMode === 'email'
                  ? `Share this link with ${inviteEmail}. It expires in 48 hours.`
                  : 'Share this link via WhatsApp, Signal, or any messenger. It expires in 48 hours.'}
              </div>
              <div className="invite-link-code">{inviteLink}</div>
              <button className="btn-primary" onClick={copyLink} data-testid="copy-invite-link">
                {copied ? '✓ Copied!' : 'Copy Link'}
              </button>
              <div className="invite-link-meta">
                Role: <strong>{inviteRole}</strong> · Station: <strong>{inviteStation}</strong>
              </div>
            </div>
          ) : (
            <div className="invite-form">
              <div className="invite-mode-row">
                <button className="invite-mode-btn" onClick={() => setInviteMode('link')} style={{
                  background: inviteMode==='link' ? 'var(--accent)' : 'transparent',
                  color: inviteMode==='link' ? '#000' : 'var(--text-muted)',
                  borderColor: inviteMode==='link' ? 'var(--accent)' : 'var(--border)',
                }}>Generate Link</button>
                <button className="invite-mode-btn" onClick={() => setInviteMode('email')} style={{
                  background: inviteMode==='email' ? 'var(--accent)' : 'transparent',
                  color: inviteMode==='email' ? '#000' : 'var(--text-muted)',
                  borderColor: inviteMode==='email' ? 'var(--accent)' : 'var(--border)',
                }}>Invite by Email</button>
              </div>
              {inviteMode === 'email' && (
                <div><label className="form-label-sm">Email</label>
                  <input className="form-inp" type="email" placeholder="colleague@email.com"
                    value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}/>
                </div>
              )}
              <div><label className="form-label-sm">Role</label>
                <select className="form-sel" value={inviteRole} onChange={e => setInviteRole(e.target.value as Role)}>
                  <option value="cook">Cook</option><option value="admin">Admin</option>
                </select></div>
              <div><label className="form-label-sm">Primary Station</label>
                <select className="form-sel" value={inviteStation} onChange={e => setInviteStation(e.target.value as Station)}>
                  {STATIONS.map(st => <option key={st}>{st}</option>)}
                </select></div>
              {inviteMode === 'link' && (
                <div className="security-note">
                  🔒 No email needed. The person fills in their details when they open the link.
                </div>
              )}
              <button className="btn-primary" onClick={handleGenerateInvite} disabled={loading || (inviteMode==='email' && !inviteEmail.trim())} data-testid="generate-invite-btn">
                {loading ? 'Generating…' : inviteMode === 'email' ? 'Send Invite' : 'Generate Link'}
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
