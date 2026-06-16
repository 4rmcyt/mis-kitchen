import { describe, it, expect } from 'vitest';
import { selectOwnedTasks } from './ownership.js';
import type { Task, Station } from '../lib/types.js';

const ME = 'user-me';
const OTHER = 'user-other';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    restaurant_id: 'r',
    created_by: ME,
    text: 'task',
    station: 'Grill',
    section: 'Opening',
    date: '2026-06-12',
    done: false,
    done_at: null,
    done_by: null,
    comment: null,
    source: 'manual',
    template_id: null,
    day_template_id: null,
    assigned_to: null,
    prep_item_id: null,
    quantity: null,
    created_at: '2026-06-12T00:00:00Z',
    ...overrides,
  };
}

const myProfile = { id: ME, station: 'Grill' as Station };

describe('selectOwnedTasks', () => {
  it('includes tasks explicitly assigned to me', () => {
    const tasks = [makeTask({ assigned_to: ME, station: 'Common' })];
    expect(selectOwnedTasks(tasks, myProfile)).toHaveLength(1);
  });

  it('excludes tasks assigned to someone else', () => {
    const tasks = [makeTask({ assigned_to: OTHER, station: 'Grill' })];
    expect(selectOwnedTasks(tasks, myProfile)).toHaveLength(0);
  });

  it('includes unassigned tasks at my station', () => {
    const tasks = [makeTask({ assigned_to: null, station: 'Grill' })];
    expect(selectOwnedTasks(tasks, myProfile)).toHaveLength(1);
  });

  it('excludes unassigned tasks at a different station', () => {
    const tasks = [makeTask({ assigned_to: null, station: 'Rolls' })];
    expect(selectOwnedTasks(tasks, myProfile)).toHaveLength(0);
  });

  it('excludes unassigned Common tasks (lead-only Prep Board)', () => {
    const tasks = [makeTask({ assigned_to: null, station: 'Common' })];
    expect(selectOwnedTasks(tasks, myProfile)).toHaveLength(0);
  });

  it('includes Common tasks explicitly assigned to me', () => {
    const tasks = [makeTask({ assigned_to: ME, station: 'Common' })];
    expect(selectOwnedTasks(tasks, myProfile)).toHaveLength(1);
  });

  it('floater (station=All): only explicit assignments, no station tasks', () => {
    const floater = { id: ME, station: 'All' as unknown as Station };
    const tasks = [
      makeTask({ assigned_to: null, station: 'Grill' }),
      makeTask({ assigned_to: ME,   station: 'Rolls' }),
    ];
    const result = selectOwnedTasks(tasks, floater);
    expect(result).toHaveLength(1);
    expect(result[0].assigned_to).toBe(ME);
  });

  it('returns empty array for empty input', () => {
    expect(selectOwnedTasks([], myProfile)).toHaveLength(0);
  });
});
