import { useState, useEffect } from "react";
import { getStationVelocity } from "../../lib/supabase.js";
import { STATIONS, STATION_COLORS } from "../../lib/constants.js";
import { useToast } from "../components/Toast.jsx";

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function countColor(n) {
  if (n === null || n === undefined) return 'var(--surface)';
  if (n >= 20) return '#10B981';
  if (n >= 8)  return '#F97316';
  return '#EF4444';
}

export function VelocityTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const { show: toast } = useToast();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setRows(await getStationVelocity());
      } catch (e) {
        toast(e.message, 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const matrix = {};
  const stationTotals = {};
  for (const row of rows) {
    if (!matrix[row.station]) {
      matrix[row.station] = {};
      stationTotals[row.station] = 0;
    }
    matrix[row.station][row.dow] = (matrix[row.station][row.dow] || 0) + row.completed_count;
    stationTotals[row.station] += row.completed_count;
  }

  const countFor = (station, dow) => matrix[station]?.[dow] ?? null;

  const stationTotal = (station) => stationTotals[station] ?? null;

  const dayTotal = (dow) => {
    let sum = 0, found = false;
    for (const station of STATIONS.filter(s => s !== 'Common')) {
      if (matrix[station]?.[dow] !== undefined) { sum += matrix[station][dow]; found = true; }
    }
    return found ? sum : null;
  };

  const activeStations = STATIONS.filter(s => s !== 'Common' && matrix[s]);
  const hasData = rows.length > 0;

  const worstStation = activeStations.reduce((worst, s) => {
    const total = stationTotal(s);
    if (total === null) return worst;
    if (!worst || total < stationTotal(worst)) return s;
    return worst;
  }, null);

  const worstDay = DAYS.reduce((worst, _, dow) => {
    const total = dayTotal(dow);
    if (total === null) return worst;
    if (worst === null || total < dayTotal(worst)) return dow;
    return worst;
  }, null);

  return (
    <div className="tab-content">
      {loading && <div className="empty-inline p-40">Loading…</div>}

      {!loading && !hasData && (
        <div className="empty-inline p-40">No data yet — complete some tasks to see velocity stats.</div>
      )}

      {!loading && hasData && (
        <>
          <div className="stat-row mb-20">
            <div className="stat-card">
              <div className="stat-val">{rows.length}</div>
              <div className="stat-lbl">Shifts tracked</div>
            </div>
            {worstStation && (
              <div className="stat-card">
                <div className="stat-val stat-val-sm" style={{ color: '#EF4444' }}>{worstStation}</div>
                <div className="stat-lbl">Weakest station</div>
              </div>
            )}
            {worstDay !== null && (
              <div className="stat-card">
                <div className="stat-val stat-val-sm" style={{ color: '#EF4444' }}>{DAYS[worstDay]}</div>
                <div className="stat-lbl">Hardest day</div>
              </div>
            )}
          </div>

          <div className="velocity-heatmap">
            <table className="v-table">
              <thead>
                <tr>
                  <th className="v-th">Station</th>
                  {DAYS.map((d, i) => <th key={i} className="v-th-center">{d}</th>)}
                  <th className="v-th-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {activeStations.map(station => (
                  <tr key={station}>
                    <td className="v-td-station">
                      <div className="flex-row gap-8">
                        <span className="v-station-dot" style={{ background: STATION_COLORS[station] || '#6B7280' }}/>
                        {station}
                      </div>
                    </td>
                    {DAYS.map((_, dow) => {
                      const n = countFor(station, dow);
                      return (
                        <td key={dow} className="v-td-cell">
                          <div className="v-cell" style={{
                            background: n !== null ? countColor(n) + '33' : 'transparent',
                            border: `1px solid ${n !== null ? countColor(n) + '66' : 'var(--border)'}`,
                            color: n !== null ? countColor(n) : 'var(--text-muted)',
                          }}>
                            {n !== null ? n : '—'}
                          </div>
                        </td>
                      );
                    })}
                    <td className="v-td-cell">
                      {(() => {
                        const total = stationTotal(station);
                        return (
                          <div className="v-cell-avg" style={{
                            background: total !== null ? countColor(total) + '22' : 'transparent',
                            border: `1px solid ${total !== null ? countColor(total) : 'var(--border)'}`,
                            color: total !== null ? countColor(total) : 'var(--text-muted)',
                          }}>
                            {total !== null ? total : '—'}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
                <tr className="v-row-dayavg">
                  <td className="v-td-label">Day avg</td>
                  {DAYS.map((_, dow) => {
                    const total = dayTotal(dow);
                    return (
                      <td key={dow} className="v-td-cell">
                        <div className="v-day-val" style={{ color: total !== null ? countColor(total) : 'var(--text-muted)' }}>
                          {total !== null ? total : '—'}
                        </div>
                      </td>
                    );
                  })}
                  <td/>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
