import { useState, useEffect } from "react";
import { getShifts, createShift, deleteShift, getRestaurantProfiles } from "../../lib/supabase.js";
import { STATIONS, STATION_COLORS } from "../../lib/constants.js";
import { useToast } from "../components/Toast.jsx";
import { Avatar } from "../components/Avatar.jsx";

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function addDays(isoDate, n) {
  const d = new Date(isoDate + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function fmtDate(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function RotaTab() {
  const [weekStart, setWeekStart] = useState(getMonday());
  const [shifts, setShifts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(null); // { date }
  const [newUserId, setNewUserId] = useState('');
  const [newStation, setNewStation] = useState('');
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('17:00');
  const [saving, setSaving] = useState(false);
  const { show: toast } = useToast();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [s, u] = await Promise.all([getShifts(weekStart), getRestaurantProfiles()]);
        setShifts(s || []);
        setUsers((u || []).filter(u => u.active));
      } catch (e) {
        toast(e.message, 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [weekStart]);

  const weekDates = DAYS.map((_, i) => addDays(weekStart, i));

  const shiftsForDate = (date) => shifts.filter(s => s.date === date);

  const startAdd = (date) => {
    setAdding({ date });
    setNewUserId(users[0]?.id || '');
    setNewStation(users[0]?.station || STATIONS[1]);
    setNewStart('09:00');
    setNewEnd('17:00');
  };

  const cancelAdd = () => setAdding(null);

  const saveShift = async () => {
    if (!newUserId) return;
    setSaving(true);
    try {
      const s = await createShift({
        userId: newUserId,
        date: adding.date,
        station: newStation,
        startTime: newStart,
        endTime: newEnd,
      });
      setShifts(prev => [...prev, s]);
      setAdding(null);
      toast('Shift added', 'success');
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  const remove = async (shift) => {
    try {
      await deleteShift(shift.id);
      setShifts(prev => prev.filter(s => s.id !== shift.id));
    } catch (e) { toast(e.message, 'error'); }
  };

  const prevWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));

  return (
    <div className="tab-content">
      {/* Week navigator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn-secondary" onClick={prevWeek}>← Prev</button>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, flex: 1, textAlign: 'center' }}>
          {fmtDate(weekStart)} — {fmtDate(addDays(weekStart, 6))}
        </span>
        <button className="btn-secondary" onClick={nextWeek}>Next →</button>
        <button className="btn-secondary" onClick={() => setWeekStart(getMonday())}>Today</button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>}

      {!loading && (
        <div className="rota-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {weekDates.map((date, i) => {
            const dayShifts = shiftsForDate(date);
            const isToday = date === new Date().toISOString().split('T')[0];
            return (
              <div key={date} style={{
                background: 'var(--surface)', border: `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)', padding: 8, minHeight: 120,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? 'var(--accent)' : 'var(--text-muted)', marginBottom: 6, textAlign: 'center' }}>
                  {DAYS[i]}<br/>{fmtDate(date)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {dayShifts.map(shift => (
                    <div key={shift.id} style={{
                      background: (STATION_COLORS[shift.station] || '#6B7280') + '18',
                      border: `1px solid ${(STATION_COLORS[shift.station] || '#6B7280')}44`,
                      borderRadius: 4, padding: '3px 6px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <Avatar name={shift.profiles?.name || '?'} size={16}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {(shift.profiles?.name || '?').split(' ')[0]}
                        </div>
                        {shift.station && <div style={{ color: STATION_COLORS[shift.station] || '#888', fontSize: 10 }}>{shift.station}</div>}
                        {shift.start_time && <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>{shift.start_time.slice(0,5)}–{shift.end_time?.slice(0,5)}</div>}
                      </div>
                      <button onClick={() => remove(shift)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
                    </div>
                  ))}
                </div>
                {adding?.date === date ? (
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <select className="form-sel" style={{ fontSize: 11, padding: '3px 4px' }} value={newUserId} onChange={e => setNewUserId(e.target.value)}>
                      {users.map(u => <option key={u.id} value={u.id}>{(u.name || '?').split(' ')[0]}</option>)}
                    </select>
                    <select className="form-sel" style={{ fontSize: 11, padding: '3px 4px' }} value={newStation} onChange={e => setNewStation(e.target.value)}>
                      {STATIONS.filter(s => s !== 'Common').map(s => <option key={s}>{s}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <input type="time" style={{ flex: 1, fontSize: 10, padding: '2px 3px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)' }} value={newStart} onChange={e => setNewStart(e.target.value)}/>
                      <input type="time" style={{ flex: 1, fontSize: 10, padding: '2px 3px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)' }} value={newEnd} onChange={e => setNewEnd(e.target.value)}/>
                    </div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      <button className="btn-primary" style={{ flex: 1, fontSize: 10, padding: '3px 0' }} onClick={saveShift} disabled={saving}>{saving ? '…' : '✓'}</button>
                      <button className="btn-secondary" style={{ flex: 1, fontSize: 10, padding: '3px 0' }} onClick={cancelAdd}>✕</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => startAdd(date)} style={{ width: '100%', marginTop: 6, background: 'none', border: '1px dashed var(--border)', borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, padding: '3px 0' }}>+ Add</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
