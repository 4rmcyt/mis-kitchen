import { useState, useEffect } from "react";
import { supabase, getRecipes, createRecipe, updateRecipe, deleteRecipe } from "../../lib/supabase.js";
import { useToast } from "../components/Toast.jsx";
import { useConfirm } from "../components/Confirm.jsx";

const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'tsp', 'tbsp', 'cup', 'portion'];

function emptyRecipe() {
  return { name: '', portions: 1, is_shared: false, ingredients: [], steps: [] };
}

function RecipeForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(() => ({
    ...initial,
    ingredients: (initial.ingredients || []).map((ing, i) => ({ ...ing, _key: ing.id ?? `ing-${i}-${Date.now()}` })),
    steps: (initial.steps || []).map((s, i) => ({ text: typeof s === 'string' ? s : s, _key: `step-${i}-${Date.now()}` })),
  }));
  const [ingText, setIngText] = useState('');
  const [ingAmt, setIngAmt] = useState('');
  const [ingUnit, setIngUnit] = useState('g');
  const [stepText, setStepText] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Ingredients
  const addIng = () => {
    if (!ingText.trim()) return;
    set('ingredients', [...form.ingredients, { name: ingText.trim(), amount: ingAmt, unit: ingUnit, _key: `ing-new-${Date.now()}` }]);
    setIngText(''); setIngAmt('');
  };
  const removeIng = (key) => set('ingredients', form.ingredients.filter(x => x._key !== key));
  const updateIng = (key, field, val) => set('ingredients', form.ingredients.map(x => x._key === key ? { ...x, [field]: val } : x));
  const moveIng = (key, dir) => {
    const ings = [...form.ingredients];
    const i = ings.findIndex(x => x._key === key);
    const j = i + dir;
    if (j < 0 || j >= ings.length) return;
    [ings[i], ings[j]] = [ings[j], ings[i]];
    set('ingredients', ings);
  };

  // Steps
  const addStep = () => {
    if (!stepText.trim()) return;
    set('steps', [...form.steps, { text: stepText.trim(), _key: `step-new-${Date.now()}` }]);
    setStepText('');
  };
  const removeStep = (key) => set('steps', form.steps.filter(x => x._key !== key));
  const updateStep = (key, val) => set('steps', form.steps.map(x => x._key === key ? { ...x, text: val } : x));
  const moveStep = (key, dir) => {
    const steps = [...form.steps];
    const i = steps.findIndex(x => x._key === key);
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    [steps[i], steps[j]] = [steps[j], steps[i]];
    set('steps', steps);
  };

  const handleSave = () => {
    onSave({
      ...form,
      ingredients: form.ingredients.map(({ _key, ...rest }) => rest),
      steps: form.steps.map(({ _key, text }) => text),
    });
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', gap:10 }}>
        <div style={{ flex:1 }}>
          <label className="form-label-sm">Name</label>
          <input className="form-inp" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Recipe name" autoFocus/>
        </div>
        <div style={{ width:90 }}>
          <label className="form-label-sm">Portions</label>
          <input className="form-inp" type="number" min="1" value={form.portions} onChange={e => set('portions', parseInt(e.target.value)||1)}/>
        </div>
      </div>

      <div>
        <label className="form-label-sm" style={{ marginBottom:6, display:'block' }}>Ingredients</label>
        <div style={{ display:'flex', flexDirection:'column', gap:2, marginBottom:6 }}>
          {form.ingredients.map((ing, i) => (
            <div key={ing._key} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 6px', background:'var(--surface2)', borderRadius:6 }}>
              <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                <button onClick={() => moveIng(ing._key, -1)} disabled={i === 0} style={{ background:'none', border:'none', color: i===0 ? 'var(--border)' : 'var(--text-muted)', cursor: i===0 ? 'default' : 'pointer', padding:'1px 3px', fontSize:10, lineHeight:1 }}>▲</button>
                <button onClick={() => moveIng(ing._key, 1)} disabled={i === form.ingredients.length-1} style={{ background:'none', border:'none', color: i===form.ingredients.length-1 ? 'var(--border)' : 'var(--text-muted)', cursor: i===form.ingredients.length-1 ? 'default' : 'pointer', padding:'1px 3px', fontSize:10, lineHeight:1 }}>▼</button>
              </div>
              <input value={ing.name} onChange={e => updateIng(ing._key, 'name', e.target.value)}
                style={{ flex:1, background:'transparent', border:'none', color:'var(--text)', fontFamily:'var(--font-mono)', fontSize:13, outline:'none', minWidth:0 }}/>
              <input value={ing.amount} onChange={e => updateIng(ing._key, 'amount', e.target.value)}
                style={{ width:60, background:'transparent', border:'none', color:'var(--accent)', fontFamily:'var(--font-mono)', fontSize:13, outline:'none', textAlign:'right' }}/>
              <select value={ing.unit} onChange={e => updateIng(ing._key, 'unit', e.target.value)}
                style={{ background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontSize:11, borderRadius:4, padding:'2px 4px' }}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
              <button onClick={() => removeIng(ing._key)} style={{ background:'none', border:'none', color:'#EF4444', cursor:'pointer', padding:'0 4px', fontSize:16, lineHeight:1 }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <input className="search-inp" style={{ flex:1, maxWidth:'none' }} placeholder="Ingredient" value={ingText}
            onChange={e => setIngText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addIng()}/>
          <input className="search-inp" style={{ width:70 }} placeholder="Amt" value={ingAmt}
            onChange={e => setIngAmt(e.target.value)} onKeyDown={e => e.key === 'Enter' && addIng()}/>
          <select className="form-sel" style={{ width:80, padding:'6px 8px' }} value={ingUnit} onChange={e => setIngUnit(e.target.value)}>
            {UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
          <button className="btn-secondary" onClick={addIng}>+</button>
        </div>
      </div>

      <div>
        <label className="form-label-sm" style={{ marginBottom:6, display:'block' }}>Steps</label>
        <div style={{ display:'flex', flexDirection:'column', gap:2, marginBottom:6 }}>
          {form.steps.map((step, i) => (
            <div key={step._key} style={{ display:'flex', alignItems:'flex-start', gap:4, padding:'4px 6px', background:'var(--surface2)', borderRadius:6 }}>
              <div style={{ display:'flex', flexDirection:'column', gap:0, paddingTop:2 }}>
                <button onClick={() => moveStep(step._key, -1)} disabled={i === 0} style={{ background:'none', border:'none', color: i===0 ? 'var(--border)' : 'var(--text-muted)', cursor: i===0 ? 'default' : 'pointer', padding:'1px 3px', fontSize:10, lineHeight:1 }}>▲</button>
                <button onClick={() => moveStep(step._key, 1)} disabled={i === form.steps.length-1} style={{ background:'none', border:'none', color: i===form.steps.length-1 ? 'var(--border)' : 'var(--text-muted)', cursor: i===form.steps.length-1 ? 'default' : 'pointer', padding:'1px 3px', fontSize:10, lineHeight:1 }}>▼</button>
              </div>
              <span style={{ color:'var(--text-muted)', fontSize:11, minWidth:18, textAlign:'right', marginTop:4, flexShrink:0 }}>{i+1}.</span>
              <textarea value={step.text} onChange={e => updateStep(step._key, e.target.value)}
                rows={1}
                style={{ flex:1, background:'transparent', border:'none', color:'var(--text)', fontFamily:'var(--font-mono)', fontSize:13, outline:'none', resize:'vertical', lineHeight:1.5, padding:'2px 0' }}/>
              <button onClick={() => removeStep(step._key)} style={{ background:'none', border:'none', color:'#EF4444', cursor:'pointer', padding:'0 4px', fontSize:16, lineHeight:1, marginTop:2 }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <input className="search-inp" style={{ flex:1, maxWidth:'none' }} placeholder="Step description" value={stepText}
            onChange={e => setStepText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addStep()}/>
          <button className="btn-secondary" onClick={addStep}>+</button>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, alignItems:'center', paddingTop:4 }}>
        <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)', cursor:'pointer' }}>
          <input type="checkbox" checked={form.is_shared} onChange={e => set('is_shared', e.target.checked)}/>
          Share with team
        </label>
        <div style={{ flex:1 }}/>
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export function RecipesTab() {
  const [recipes, setRecipes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { show: toast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => { getRecipes().then(setRecipes).catch(e => toast(e.message, 'error')); }, []);

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      const r = await createRecipe(form);
      setRecipes(rs => [r, ...rs]);
      setShowNew(false);
      setSelected(r);
      toast('Recipe created', 'success');
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  const handleUpdate = async (form) => {
    setSaving(true);
    try {
      const r = await updateRecipe(selected.id, form);
      setRecipes(rs => rs.map(x => x.id === r.id ? r : x));
      setSelected(r);
      setEditing(false);
      toast('Saved', 'success');
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!await confirm(`Delete "${selected.name}"?`)) return;
    try {
      await deleteRecipe(selected.id);
      setRecipes(rs => rs.filter(r => r.id !== selected.id));
      setSelected(null);
      toast('Deleted', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  const toggleShare = async (id) => {
    const item = recipes.find(r => r.id === id);
    try {
      await supabase.from('recipes').update({ is_shared: !item.is_shared }).eq('id', id);
      setRecipes(rs => rs.map(r => r.id === id ? { ...r, is_shared: !r.is_shared } : r));
      if (selected?.id === id) setSelected(s => ({ ...s, is_shared: !s.is_shared }));
    } catch (e) { toast(e.message, 'error'); }
  };

  if (selected && editing) {
    return (
      <div className="tab-content">
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <button className="btn-secondary" onClick={() => setEditing(false)}>← Back</button>
          <span style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, flex:1 }}>Edit: {selected.name}</span>
        </div>
        <RecipeForm initial={selected} onSave={handleUpdate} onCancel={() => setEditing(false)} saving={saving}/>
      </div>
    );
  }

  if (selected) {
    const ings = selected.ingredients || [];
    const steps = selected.steps || [];
    return (
      <div className="tab-content">
        {confirmDialog}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <button className="btn-secondary" onClick={() => setSelected(null)}>← Back</button>
          <span style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, flex:1 }}>{selected.name}</span>
          <button className="btn-secondary" onClick={() => setEditing(true)}>Edit</button>
          <button className="btn-danger" onClick={handleDelete}>Delete</button>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>{selected.portions} portion{selected.portions!==1?'s':''}</span>
          <span style={{ fontSize:12, color: selected.is_shared ? '#10B981' : 'var(--text-muted)' }}>
            {selected.is_shared ? '● Shared' : '○ Personal'}
          </span>
          <button style={{ background:'none', border:'none', fontSize:12, cursor:'pointer', color:'var(--accent)', fontFamily:'var(--font-mono)', padding:0 }}
            onClick={() => toggleShare(selected.id)}>
            {selected.is_shared ? 'Unpublish' : 'Publish'}
          </button>
        </div>

        {ings.length > 0 && (
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'14px 16px' }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Ingredients ({selected.portions}p)</div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {ings.map((ing, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'4px 0', borderBottom:'1px solid var(--border2)' }}>
                  <span style={{ flex:1, fontSize:13 }}>{ing.name}</span>
                  <span style={{ fontSize:13, color:'var(--accent)', fontFamily:'var(--font-mono)', fontWeight:500 }}>{ing.amount} {ing.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {steps.length > 0 && (
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'14px 16px' }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>Steps</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {steps.map((step, i) => (
                <div key={i} style={{ display:'flex', gap:12, fontSize:13 }}>
                  <span style={{ color:'var(--accent)', fontFamily:'var(--font-mono)', fontWeight:700, flexShrink:0 }}>{i+1}.</span>
                  <span style={{ lineHeight:1.5 }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {ings.length === 0 && steps.length === 0 && (
          <div style={{ color:'var(--text-muted)', fontSize:13 }}>No ingredients or steps yet. <button style={{ background:'none', border:'none', color:'var(--accent)', cursor:'pointer', fontFamily:'var(--font-mono)', fontSize:13, padding:0 }} onClick={() => setEditing(true)}>Add them →</button></div>
        )}
      </div>
    );
  }

  if (showNew) {
    return (
      <div className="tab-content">
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <button className="btn-secondary" onClick={() => setShowNew(false)}>← Back</button>
          <span style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700 }}>New Recipe</span>
        </div>
        <RecipeForm initial={emptyRecipe()} onSave={handleCreate} onCancel={() => setShowNew(false)} saving={saving}/>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="stat-row">
        <div className="stat-card"><div className="stat-val">{recipes.length}</div><div className="stat-lbl">Recipes</div></div>
        <div className="stat-card"><div className="stat-val" style={{ color:'#10B981' }}>{recipes.filter(r=>r.is_shared).length}</div><div className="stat-lbl">Shared</div></div>
      </div>
      <div className="toolbar">
        <button className="btn-primary" onClick={() => setShowNew(true)}>+ New Recipe</button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        {recipes.map(r => (
          <div key={r.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', cursor:'pointer', transition:'border-color 0.15s' }}
            onClick={() => setSelected(r)}>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700 }}>{r.name}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                {r.ingredients?.length||0} ingredients · {r.steps?.length||0} steps · {r.portions}p
              </div>
            </div>
            {r.is_shared && <span style={{ fontSize:11, color:'#10B981' }}>● Shared</span>}
          </div>
        ))}
        {recipes.length === 0 && <div style={{ color:'var(--text-muted)', fontSize:13, padding:'8px 0' }}>No recipes yet.</div>}
      </div>
    </div>
  );
}
