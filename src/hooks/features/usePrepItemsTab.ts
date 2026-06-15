import { useState, useEffect, useCallback } from "react";
import {
  getPrepItems,
  createPrepItem,
  updatePrepItem,
  type PrepItem,
} from "../../lib/prep_items.js";

export function usePrepItemsTab() {
  const [items, setItems] = useState<PrepItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getPrepItems());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addItem = useCallback(
    async (name: string, station: string, defaultQuantity: number | null) => {
      const item = await createPrepItem({ name, station, default_quantity: defaultQuantity });
      setItems(prev => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)));
      return item;
    },
    []
  );

  const renameItem = useCallback(async (id: string, name: string) => {
    const updated = await updatePrepItem(id, { name });
    setItems(prev => prev.map(i => i.id === id ? updated : i).sort((a, b) => a.name.localeCompare(b.name)));
  }, []);

  const setDefaultQuantity = useCallback(async (id: string, defaultQuantity: number | null) => {
    const updated = await updatePrepItem(id, { default_quantity: defaultQuantity });
    setItems(prev => prev.map(i => i.id === id ? updated : i));
  }, []);

  const deactivateItem = useCallback(async (id: string) => {
    const updated = await updatePrepItem(id, { active: false });
    setItems(prev => prev.map(i => i.id === id ? updated : i));
  }, []);

  const reactivateItem = useCallback(async (id: string) => {
    const updated = await updatePrepItem(id, { active: true });
    setItems(prev => prev.map(i => i.id === id ? updated : i));
  }, []);

  return { items, loading, addItem, renameItem, setDefaultQuantity, deactivateItem, reactivateItem };
}
