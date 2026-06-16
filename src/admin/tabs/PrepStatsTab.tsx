import { useState } from 'react';
import { usePrepStats, type Period } from '../../hooks/features/usePrepStats.js';
import type { ByPersonEntry, ByPrepEntry } from '../../domain/prep_stats.js';

function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="period-toggle">
      <button className={`period-btn${value === 'week' ? ' active' : ''}`} onClick={() => onChange('week')}>This week</button>
      <button className={`period-btn${value === 'month' ? ' active' : ''}`} onClick={() => onChange('month')}>This month</button>
    </div>
  );
}

function PersonRow({ entry }: { entry: ByPersonEntry }) {
  return (
    <div className="pstats-person-row">
      <div className="pstats-person-header">
        <span className="pstats-person-name">{entry.person_name ?? 'Unknown'}</span>
        <span className="pstats-summary">{entry.total_tasks} tasks · {entry.total_units} units</span>
      </div>
      <div className="pstats-items">
        {entry.items.map(item => (
          <div key={item.prep_item_id} className="pstats-item-chip">
            <span className="pstats-item-name">{item.prep_item_name}</span>
            <span className="pstats-item-counts">×{item.task_count}{item.total_quantity > 0 ? ` / ${item.total_quantity} u` : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrepRow({ entry }: { entry: ByPrepEntry }) {
  return (
    <div className="pstats-prep-row">
      <div className="pstats-prep-header">
        <span className="pstats-prep-name">{entry.prep_item_name}</span>
        <span className="pstats-summary">{entry.total_tasks} tasks · {entry.total_units} units</span>
      </div>
      <div className="pstats-items">
        {entry.people.map(p => (
          <div key={p.person_id} className="pstats-item-chip">
            <span className="pstats-item-name">{p.person_name ?? 'Unknown'}</span>
            <span className="pstats-item-counts">×{p.task_count}{p.total_quantity > 0 ? ` / ${p.total_quantity} u` : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PrepStatsTab() {
  const [period, setPeriod] = useState<Period>('week');
  const { data, loading, error } = usePrepStats(period);

  return (
    <div className="tab-content">
      <div className="pstats-toolbar">
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      {loading && <div className="empty-inline p-40">Loading…</div>}
      {error   && <div className="empty-inline p-40" style={{ color: '#EF4444' }}>{error}</div>}

      {!loading && !error && data && data.byPrep.length === 0 && (
        <div className="empty-inline p-40">No prep data for this period.</div>
      )}

      {!loading && !error && data && data.byPrep.length > 0 && (
        <div className="pstats-grid">
          <section className="pstats-section">
            <h3 className="pstats-section-title">By person</h3>
            {data.byPerson.map(e => <PersonRow key={e.person_id} entry={e} />)}
          </section>

          <section className="pstats-section">
            <h3 className="pstats-section-title">By prep type</h3>
            {data.byPrep.map(e => <PrepRow key={e.prep_item_id} entry={e} />)}
          </section>
        </div>
      )}
    </div>
  );
}
