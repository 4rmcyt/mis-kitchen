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
      <div className="rota-nav">
        <button className="btn-secondary" onClick={prevWeek}>← Prev</button>
        <span className="rota-nav-title">{fmtDate(weekStart)} — {fmtDate(addDays(weekStart, 6))}</span>
        <button className="btn-secondary" onClick={nextWeek}>Next →</button>
        <button className="btn-secondary" onClick={() => setWeekStart(getMonday())}>Today</button>
      </div>

      {loading && <div className="empty-inline p-40">Loading…</div>}

      {!loading && (
        <div className="rota-grid">
          {weekDates.map((date, i) => {
            const dayShifts = shiftsForDate(date);
            const isToday = date === new Date().toISOString().split('T')[0];
            return (
              <div key={date} className="rota-day" style={{ border: `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}` }}>
                <div className="rota-day-hdr" style={{ color: isToday ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {DAYS[i]}<br/>{fmtDate(date)}
                </div>
                <div className="rota-shifts">
                  {dayShifts.map(shift => (
                    <div key={shift.id} className="rota-shift" style={{
                      background: (STATION_COLORS[shift.station] || '#6B7280') + '18',
                      border: `1px solid ${(STATION_COLORS[shift.station] || '#6B7280')}44`,
                    }}>
                      <Avatar name={shift.profiles?.name || '?'} size={16}/>
                      <div className="rota-shift-body">
                        <div className="rota-shift-name">{(shift.profiles?.name || '?').split(' ')[0]}</div>
                        {shift.station && <div className="rota-shift-station" style={{ color: STATION_COLORS[shift.station] || '#888' }}>{shift.station}</div>}
                        {shift.start_time && <div className="rota-shift-time">{shift.start_time.slice(0,5)}–{shift.end_time?.slice(0,5)}</div>}
                      </div>
                      <button className="rota-del" onClick={() => remove(shift)}>×</button>
                    </div>
                  ))}
                </div>
                {adding?.date === date ? (
                  <div className="rota-add-form">
                    <select className="form-sel rota-sel-sm" value={newUserId} onChange={e => setNewUserId(e.target.value)}>
                      {users.map(u => <option key={u.id} value={u.id}>{(u.name || '?').split(' ')[0]}</option>)}
                    </select>
                    <select className="form-sel rota-sel-sm" value={newStation} onChange={e => setNewStation(e.target.value)}>
                      {STATIONS.filter(s => s !== 'Common').map(s => <option key={s}>{s}</option>)}
                    </select>
                    <div className="rota-time-row">
                      <input type="time" className="rota-time-inp" value={newStart} onChange={e => setNewStart(e.target.value)}/>
                      <input type="time" className="rota-time-inp" value={newEnd} onChange={e => setNewEnd(e.target.value)}/>
                    </div>
                    <div className="rota-add-actions">
                      <button className="btn-primary rota-add-btn" onClick={saveShift} disabled={saving}>{saving ? '…' : '✓'}</button>
                      <button className="btn-secondary rota-add-btn" onClick={cancelAdd}>✕</button>
                    </div>
                  </div>
                ) : (
                  <button className="rota-add-trigger" onClick={() => startAdd(date)}>+ Add</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
