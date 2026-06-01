import { describe, it, expect } from 'vitest';
import { filterByStation, groupBySection, calcProgress, buildTasksFromTemplate } from './tasks.js';
import type { Task } from '../lib/types.js';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'a',
    restaurant_id: 'r',
    created_by: 'u',
    text: 'do something',
    station: 'Grill',
    section: 'Opening',
    date: '2026-06-01',
    done: false,
    done_at: null,
    done_by: null,
    comment: null,
    source: 'manual',
    template_id: null,
    created_at: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('filterByStation', () => {
  const tasks = [
    makeTask({ id: '1', station: 'Grill' }),
    makeTask({ id: '2', station: 'Rolls' }),
    makeTask({ id: '3', station: 'Common' }),
  ];

  it('returns all tasks when filter is All', () => {
    expect(filterByStation(tasks, 'All')).toHaveLength(3);
  });

  it('returns matching station + Common', () => {
    const result = filterByStation(tasks, 'Grill');
    expect(result.map(t => t.id)).toEqual(['1', '3']);
  });

  it('returns only Common when station has no tasks', () => {
    const result = filterByStation(tasks, 'Pans');
    expect(result.map(t => t.id)).toEqual(['3']);
  });

  it('returns empty array when nothing matches', () => {
    const noCommon = tasks.filter(t => t.station !== 'Common');
    expect(filterByStation(noCommon, 'Pans')).toHaveLength(0);
  });
});

describe('groupBySection', () => {
  const tasks = [
    makeTask({ id: '1', section: 'Opening' }),
    makeTask({ id: '2', section: 'Closing' }),
    makeTask({ id: '3', section: 'Opening' }),
  ];
  const sections = ['Opening', 'Closing', 'Other'];

  it('groups tasks into correct sections', () => {
    const result = groupBySection(tasks, sections);
    expect(result['Opening'].map(t => t.id)).toEqual(['1', '3']);
    expect(result['Closing'].map(t => t.id)).toEqual(['2']);
    expect(result['Other']).toHaveLength(0);
  });

  it('preserves all sections even when empty', () => {
    expect(Object.keys(groupBySection(tasks, sections))).toEqual(sections);
  });
});

describe('calcProgress', () => {
  it('returns zeros for empty list', () => {
    expect(calcProgress([])).toEqual({ done: 0, total: 0, pct: 0 });
  });

  it('calculates pct correctly', () => {
    const tasks = [
      makeTask({ done: true }),
      makeTask({ done: true }),
      makeTask({ done: false }),
      makeTask({ done: false }),
    ];
    expect(calcProgress(tasks)).toEqual({ done: 2, total: 4, pct: 50 });
  });

  it('rounds pct', () => {
    const tasks = [makeTask({ done: true }), makeTask(), makeTask()];
    expect(calcProgress(tasks).pct).toBe(33);
  });
});

describe('buildTasksFromTemplate', () => {
  it('maps entries to task create inputs', () => {
    const entries = [
      { text: 'Prep grill', station: 'Grill', section: 'Opening' },
      { text: 'Clean rolls', station: 'Rolls', section: 'Closing' },
    ];
    const result = buildTasksFromTemplate(entries, '2026-06-01');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      text: 'Prep grill',
      station: 'Grill',
      section: 'Opening',
      date: '2026-06-01',
      source: 'template',
    });
  });
});
