import { supabase } from './client.js';
import type { PrepStatRow } from '../domain/prep_stats.js';

export async function getPrepStats(start: Date, end: Date): Promise<PrepStatRow[]> {
  const p_start = start.toISOString().split('T')[0];
  const p_end   = end.toISOString().split('T')[0];

  const { data, error } = await supabase.rpc('get_prep_stats', { p_start, p_end });
  if (error) throw new Error(error.message);

  return (data ?? []).map(r => ({
    done_by_id:     r.done_by_id,
    done_by_name:   r.done_by_name,
    prep_item_id:   r.prep_item_id,
    prep_item_name: r.prep_item_name,
    task_count:     Number(r.cnt),
    total_quantity: Number(r.qty_sum),
  }));
}
