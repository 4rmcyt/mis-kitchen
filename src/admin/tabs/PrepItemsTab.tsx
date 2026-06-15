import { useState } from "react";
import { STATIONS, STATION_COLORS } from "../../lib/constants.js";
import { useToast } from "../components/Toast.js";
import { useConfirm } from "../components/Confirm.js";
import { Badge } from "../components/Badge.js";
import { usePrepItemsTab } from "../../hooks/features/usePrepItemsTab.js";
import type { PrepItem } from "../../lib/prep_items.js";

export function PrepItemsTab() {
  const { items, loading, addItem, renameItem, setDefaultQuantity, deactivateItem, reactivateItem } = usePrepItemsTab();
  const { show: toast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [showInactive, setShowInactive] = useState(false);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addStation, setAddStation] = useState('Common');
  const [addQty, setAddQty] = useState('');
  const [addSaving, setAddSaving] = useState(false);

  // Edit state: keyed by item id
  const [editName, setEditName] = useState<Record<string, string>>({});
  const [editQty, setEditQty] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const visible = items.filter(i => showInactive ? true : i.active);
  const activeCount = items.filter(i => i.active).length;
  const inactiveCount = items.filter(i => !i.active).length;

  const handleAdd = async () => {
    const name = addName.trim();
    if (!name) return;
    const qty = addQty.trim() !== '' ? parseInt(addQty.trim(), 10) : null;
    if (addQty.trim() !== '' && (isNaN(qty as number) || (qty as number) < 0)) {
      toast('Quantity must be a positive number', 'error');
      return;
    }
    setAddSaving(true);
    try {
      await addItem(name, addStation, qty ?? null);
      toast('Added', 'success');
      setAddName(''); setAddQty(''); setAddStation('Common'); setShowAdd(false);
    } catch (e) { toast((e as Error).message, 'error'); }
    setAddSaving(false);
  };

  const startEdit = (item: PrepItem) => {
    setEditName(p => ({ ...p, [item.id]: item.name }));
    setEditQty(p => ({ ...p, [item.id]: item.default_quantity !== null && item.default_quantity !== undefined ? String(item.default_quantity) : '' }));
  };

  const cancelEdit = (id: string) => {
    setEditName(p => { const n = { ...p }; delete n[id]; return n; });
    setEditQty(p => { const n = { ...p }; delete n[id]; return n; });
  };

  const handleSave = async (item: PrepItem) => {
    const name = (editName[item.id] ?? item.name).trim();
    if (!name) { toast('Name cannot be empty', 'error'); return; }
    const rawQty = editQty[item.id] ?? '';
    const qty = rawQty.trim() !== '' ? parseInt(rawQty.trim(), 10) : null;
    if (rawQty.trim() !== '' && (isNaN(qty as number) || (qty as number) < 0)) {
      toast('Quantity must be a positive number', 'error');
      return;
    }
    setSavingId(item.id);
    try {
      if (name !== item.name) await renameItem(item.id, name);
      if (qty !== item.default_quantity) await setDefaultQuantity(item.id, qty ?? null);
      toast('Saved', 'success');
      cancelEdit(item.id);
    } catch (e) { toast((e as Error).message, 'error'); }
    setSavingId(null);
  };

  const handleDeactivate = async (item: PrepItem) => {
    const ok = await confirm(`Deactivate "${item.name}"? It won't appear in new catalogs but historical tasks keep their link.`);
    if (!ok) return;
    try {
      await deactivateItem(item.id);
      toast('Deactivated', 'success');
    } catch (e) { toast((e as Error).message, 'error'); }
  };

  const handleReactivate = async (item: PrepItem) => {
    try {
      await reactivateItem(item.id);
      toast('Reactivated', 'success');
    } catch (e) { toast((e as Error).message, 'error'); }
  };

  const isEditing = (id: string) => id in editName;

  if (loading) return <div className="loading-msg">Loading…</div>;

  return (
    <div className="prep-items-tab">
      {confirmDialog}

      <div className="prep-items-header">
        <div className="prep-items-meta">
          <span>{activeCount} active</span>
          {inactiveCount > 0 && (
            <button className="btn-link" onClick={() => setShowInactive(v => !v)}>
              {showInactive ? 'Hide inactive' : `Show ${inactiveCount} inactive`}
            </button>
          )}
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(v => !v)}>
          {showAdd ? 'Cancel' : '+ Add item'}
        </button>
      </div>

      {showAdd && (
        <div className="prep-items-add-form">
          <input
            className="input"
            placeholder="Name"
            value={addName}
            onChange={e => setAddName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          <select className="select" value={addStation} onChange={e => setAddStation(e.target.value)}>
            {STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            className="input input-qty"
            placeholder="Default qty"
            type="number"
            min={0}
            value={addQty}
            onChange={e => setAddQty(e.target.value)}
          />
          <button className="btn-primary" onClick={handleAdd} disabled={addSaving || !addName.trim()}>
            {addSaving ? 'Adding…' : 'Add'}
          </button>
        </div>
      )}

      <table className="prep-items-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Station</th>
            <th>Default qty</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {visible.map(item => (
            <tr key={item.id} className={item.active ? '' : 'prep-item-inactive'}>
              <td>
                {isEditing(item.id) ? (
                  <input
                    className="input"
                    value={editName[item.id]}
                    onChange={e => setEditName(p => ({ ...p, [item.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleSave(item); if (e.key === 'Escape') cancelEdit(item.id); }}
                    autoFocus
                  />
                ) : (
                  <span className={item.active ? '' : 'text-muted'}>{item.name}</span>
                )}
              </td>
              <td>
                <Badge color={STATION_COLORS[item.station] || '#6B7280'}>{item.station}</Badge>
              </td>
              <td>
                {isEditing(item.id) ? (
                  <input
                    className="input input-qty"
                    type="number"
                    min={0}
                    value={editQty[item.id]}
                    onChange={e => setEditQty(p => ({ ...p, [item.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleSave(item); if (e.key === 'Escape') cancelEdit(item.id); }}
                  />
                ) : (
                  <span className="text-muted">{item.default_quantity ?? '—'}</span>
                )}
              </td>
              <td className="prep-item-actions">
                {isEditing(item.id) ? (
                  <>
                    <button className="btn-sm btn-primary" onClick={() => handleSave(item)} disabled={savingId === item.id}>
                      {savingId === item.id ? '…' : 'Save'}
                    </button>
                    <button className="btn-sm btn-ghost" onClick={() => cancelEdit(item.id)}>Cancel</button>
                  </>
                ) : item.active ? (
                  <>
                    <button className="btn-sm btn-ghost" onClick={() => startEdit(item)}>Edit</button>
                    <button className="btn-sm btn-ghost text-danger" onClick={() => handleDeactivate(item)}>Deactivate</button>
                  </>
                ) : (
                  <button className="btn-sm btn-ghost" onClick={() => handleReactivate(item)}>Reactivate</button>
                )}
              </td>
            </tr>
          ))}
          {visible.length === 0 && (
            <tr><td colSpan={4} className="text-muted prep-items-empty">No items</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
