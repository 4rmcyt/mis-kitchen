import { useState, useEffect } from 'react';
import { supabase, q } from '../../lib/client.js';
import { completeTask, uncompleteTask, updateTask } from '../../lib/supabase.js';
import type { Task } from '../../lib/types.js';

export interface PrepTask extends Task {
  assigned_profile: { name: string | null } | null;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

async function getPrepTasks(date: string): Promise<PrepTask[]> {
  return q(() =>
    supabase
      .from('tasks')
      .select('*, assigned_profile:profiles!assigned_to(name)')
      .eq('date', date)
      .eq('section', 'Prep')
      .order('text')
  );
}

export function usePrepTasks() {
  const [tasks, setTasks] = useState<PrepTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPrepTasks(todayStr())
      .then((rows) => { if (!cancelled) setTasks(rows); })
      .catch(() => { if (!cancelled) setTasks([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const toggle = async (task: PrepTask) => {
    try {
      const updated = task.done ? await uncompleteTask(task.id) : await completeTask(task.id);
      setTasks(ts => ts.map(t => t.id === task.id ? { ...t, ...updated } : t));
    } catch { /* noop */ }
  };

  const setQuantity = async (taskId: string, quantity: number | null) => {
    try {
      const updated = await updateTask(taskId, { quantity });
      setTasks(ts => ts.map(t => t.id === taskId ? { ...t, ...updated } : t));
    } catch { /* noop */ }
  };

  return { tasks, loading, toggle, setQuantity };
}
