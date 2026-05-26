import { useState, useEffect } from "react";
import { getStationVelocity } from "../../lib/supabase.js";
import { STATIONS, STATION_COLORS } from "../../lib/constants.js";
import { useToast } from "../components/Toast.jsx";

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pctColor(pct) {
  if (pct === null || pct === undefined) return 'var(--surface)';
  if (pct >= 90) return '#10B981';
  if (pct >= 70) return '#F97316';
  return '#EF4444';
}


export function VelocityTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);
  const { show: toast } = useToast();

  useEffect(() => {
    setLoading(true);
    getStationVelocity(range)
      .then(setRows)
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [range]);

  // Build matrix: station → day_of_week → avg pct
  const matrix = {};
  const stationTotals = {};
  for (const row of rows) {
    if (!matrix[row.station]) {
      matrix[row.station] = {};
      stationTotals[row.station] = { sum: 0, count: 0 };
    }
    if (!matrix[row.station][row.day_of_week]) {
      matrix[row.station][row.day_of_week] = { sum: 0, count: 0 };
    }
    matrix[row.station][row.day_of_week].sum += row.pct;
    matrix[row.station][row.day_of_week].count += 1;
    stationTotals[row.station].sum += row.pct;
    stationTotals[row.station].count += 1;
  }

  const avgFor = (station, dow) => {
    const cell = matrix[station]?.[dow];
    if (!cell || cell.count === 0) return null;
    return Math.round(cell.sum / cell.count);
  };

  const stationAvg = (station) => {
    const t = stationTotals[station];
    if (!t || t.count === 0) return null;
    return Math.round(t.sum / t.count);
  };

  // Day-level avg across all stations
  const dayAvg = (dow) => {
    let sum = 0, count = 0;
    for (const station of STATIONS.filter(s => s !== 'Common')) {
      const cell = matrix[station]?.[dow];
      if (cell?.count) { sum += cell.sum; count += cell.count; }
    }
    return count ? Math.round(sum / count) : null;
  };

  const activeStations = STATIONS.filter(s => s !== 'Common' && matrix[s]);
  const hasData = rows.length > 0;

  // Worst station and worst day
  const worstStation = activeStations.reduce((worst, s) => {
    const avg = stationAvg(s);
    if (avg === null) return worst;
    if (!worst || avg < stationAvg(worst)) return s;
    return worst;
  }, null);

  const worstDay = DAYS.reduce((worst, _, dow) => {
    const avg = dayAvg(dow);
    if (avg === null) return worst;
    if (worst === null || avg < dayAvg(worst)) return dow;
    return worst;
  }, null);

  return (
    <div className="tab-content">
      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div className="seg-ctrl">
          {[7, 14, 30].map(d => (
            <button key={d} className={`seg-btn ${range === d ? 'active' : ''}`} onClick={() => setRange(d)}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
      )}

      {!loading && !hasData && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
          No data yet — complete some tasks to see velocity stats.
        </div>
      )}

      {!loading && hasData && (
        <>
          <div className="stat-row" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-val">{rows.length}</div>
              <div className="stat-lbl">Shifts tracked</div>
            </div>
            {worstStation && (
              <div className="stat-card">
                <div className="stat-val" style={{ color: '#EF4444', fontSize: 16 }}>{worstStation}</div>
                <div className="stat-lbl">Weakest station</div>
              </div>
            )}
            {worstDay !== null && (
              <div className="stat-card">
                <div className="stat-val" style={{ color: '#EF4444', fontSize: 16 }}>{DAYS[worstDay]}</div>
                <div className="stat-lbl">Hardest day</div>
              </div>
            )}
          </div>

          {/* Heatmap */}
          <div className="velocity-heatmap" style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 480 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Station</th>
                  {DAYS.map((d, i) => (
                    <th key={i} style={{ padding: '6px 8px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>{d}</th>
                  ))}
                  <th style={{ padding: '6px 8px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Avg</th>
                </tr>
              </thead>
              <tbody>
                {activeStations.map(station => (
                  <tr key={station}>
                    <td style={{ padding: '6px 10px', fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATION_COLORS[station] || '#6B7280', flexShrink: 0 }}/>
                        {station}
                      </div>
                    </td>
                    {DAYS.map((_, dow) => {
                      const pct = avgFor(station, dow);
                      return (
                        <td key={dow} style={{ padding: 4, textAlign: 'center' }}>
                          <div style={{
                            background: pct !== null ? pctColor(pct) + '33' : 'transparent',
                            border: `1px solid ${pct !== null ? pctColor(pct) + '66' : 'var(--border)'}`,
                            borderRadius: 6,
                            padding: '4px 2px',
                            fontSize: 11,
                            fontWeight: 700,
                            color: pct !== null ? pctColor(pct) : 'var(--text-muted)',
                            minWidth: 36,
                          }}>
                            {pct !== null ? `${pct}%` : '—'}
                          </div>
                        </td>
                      );
                    })}
                    <td style={{ padding: 4, textAlign: 'center' }}>
                      {(() => {
                        const avg = stationAvg(station);
                        return (
                          <div style={{
                            background: avg !== null ? pctColor(avg) + '22' : 'transparent',
                            border: `1px solid ${avg !== null ? pctColor(avg) : 'var(--border)'}`,
                            borderRadius: 6,
                            padding: '4px 6px',
                            fontSize: 12,
                            fontWeight: 800,
                            color: avg !== null ? pctColor(avg) : 'var(--text-muted)',
                          }}>
                            {avg !== null ? `${avg}%` : '—'}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
                {/* Day averages row */}
                <tr style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px 10px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Day avg</td>
                  {DAYS.map((_, dow) => {
                    const avg = dayAvg(dow);
                    return (
                      <td key={dow} style={{ padding: 4, textAlign: 'center' }}>
                        <div style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: avg !== null ? pctColor(avg) : 'var(--text-muted)',
                          padding: '4px 2px',
                        }}>
                          {avg !== null ? `${avg}%` : '—'}
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
