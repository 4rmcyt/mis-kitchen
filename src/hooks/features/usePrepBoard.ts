import { useState, useEffect, useCallback } from 'react';
import { getTasks, assignTask, createTask } from '../../lib/tasks.js';
import { getRestaurantProfiles } from '../../lib/profiles.js';
import type { Task, Profile } from '../../lib/types.js';

export interface PrepBoardState {
  tasks: Task[];
  people: Profile[];
  loading: boolean;
  error: string | null;
  assign: (taskId: string, userId: string | null) => Promise<void>;
  addTask: (text: string) => Promise<void>;
}

export function usePrepBoard(): PrepBoardState {
  const [tasks, setTasks]   = useState<Task[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allTasks, profiles] = await Promise.all([
        getTasks(today),
        getRestaurantProfiles(),
      ]);
      setTasks(allTasks.filter(t => t.station === 'Common'));
      setPeople(profiles.filter(p => p.active !== false));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => { load(); }, [load]);

  const assign = useCallback(async (taskId: string, userId: string | null) => {
    const updated = await assignTask(taskId, userId);
    setTasks(ts => ts.map(t => t.id === taskId ? updated : t));
  }, []);

  const addTask = useCallback(async (text: string) => {
    const created = await createTask({
      text,
      station: 'Common',
      section: 'Prep',
      date: today,
      source: 'manual',
    });
    setTasks(ts => [...ts, created]);
  }, [today]);

  return { tasks, people, loading, error, assign, addTask };
}
