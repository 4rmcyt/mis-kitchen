import { describe, it, expect } from 'vitest';
import { groupByPerson, groupByPrepItem, type PrepStatRow } from './prep_stats.js';

function row(overrides: Partial<PrepStatRow> & { done_by_id: string; prep_item_id: string }): PrepStatRow {
  return {
    done_by_name: 'Alice',
    prep_item_name: 'Cut Potato',
    task_count: 1,
    total_quantity: 0,
    ...overrides,
  };
}

const ALICE = 'user-alice';
const BOB   = 'user-bob';
const ITEM1 = 'item-cut-potato';
const ITEM2 = 'item-rice';

describe('groupByPerson', () => {
  it('returns empty array for no rows', () => {
    expect(groupByPerson([])).toEqual([]);
  });

  it('groups multiple prep types under one person', () => {
    const rows: PrepStatRow[] = [
      row({ done_by_id: ALICE, done_by_name: 'Alice', prep_item_id: ITEM1, prep_item_name: 'Cut Potato', task_count: 3, total_quantity: 9 }),
      row({ done_by_id: ALICE, done_by_name: 'Alice', prep_item_id: ITEM2, prep_item_name: 'Rice',       task_count: 2, total_quantity: 0 }),
    ];
    const result = groupByPerson(rows);
    expect(result).toHaveLength(1);
    expect(result[0].person_id).toBe(ALICE);
    expect(result[0].total_tasks).toBe(5);
    expect(result[0].total_units).toBe(9);
    expect(result[0].items).toHaveLength(2);
  });

  it('splits rows across two people', () => {
    const rows: PrepStatRow[] = [
      row({ done_by_id: ALICE, done_by_name: 'Alice', prep_item_id: ITEM1, task_count: 5, total_quantity: 15 }),
      row({ done_by_id: BOB,   done_by_name: 'Bob',   prep_item_id: ITEM1, task_count: 2, total_quantity: 6  }),
    ];
    const result = groupByPerson(rows);
    expect(result).toHaveLength(2);
    // sorted descending by total_tasks
    expect(result[0].person_id).toBe(ALICE);
    expect(result[1].person_id).toBe(BOB);
  });

  it('treats NULL quantity (0 after COALESCE) as 0 in total_units', () => {
    const rows: PrepStatRow[] = [
      row({ done_by_id: ALICE, prep_item_id: ITEM1, task_count: 2, total_quantity: 0 }),
    ];
    const result = groupByPerson(rows);
    expect(result[0].total_units).toBe(0);
  });
});

describe('groupByPrepItem', () => {
  it('returns empty array for no rows', () => {
    expect(groupByPrepItem([])).toEqual([]);
  });

  it('groups multiple people under one prep item', () => {
    const rows: PrepStatRow[] = [
      row({ done_by_id: ALICE, done_by_name: 'Alice', prep_item_id: ITEM1, prep_item_name: 'Cut Potato', task_count: 4, total_quantity: 12 }),
      row({ done_by_id: BOB,   done_by_name: 'Bob',   prep_item_id: ITEM1, prep_item_name: 'Cut Potato', task_count: 1, total_quantity: 3  }),
    ];
    const result = groupByPrepItem(rows);
    expect(result).toHaveLength(1);
    expect(result[0].prep_item_id).toBe(ITEM1);
    expect(result[0].total_tasks).toBe(5);
    expect(result[0].total_units).toBe(15);
    expect(result[0].people).toHaveLength(2);
  });

  it('splits rows across two prep items', () => {
    const rows: PrepStatRow[] = [
      row({ done_by_id: ALICE, prep_item_id: ITEM1, prep_item_name: 'Cut Potato', task_count: 3, total_quantity: 0 }),
      row({ done_by_id: ALICE, prep_item_id: ITEM2, prep_item_name: 'Rice',       task_count: 1, total_quantity: 0 }),
    ];
    const result = groupByPrepItem(rows);
    expect(result).toHaveLength(2);
    expect(result[0].prep_item_id).toBe(ITEM1); // higher task_count first
  });

  it('NULL quantity (qty_sum=0 from COALESCE) contributes 0 to total_units', () => {
    const rows: PrepStatRow[] = [
      row({ done_by_id: ALICE, prep_item_id: ITEM1, task_count: 3, total_quantity: 0 }),
      row({ done_by_id: BOB,   prep_item_id: ITEM1, task_count: 2, total_quantity: 5 }),
    ];
    const result = groupByPrepItem(rows);
    expect(result[0].total_units).toBe(5); // 0 + 5
  });
});
