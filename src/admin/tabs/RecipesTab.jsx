import { useState, useEffect } from "react";
import { getRecipes, createRecipe, updateRecipe, deleteRecipe } from "../../lib/supabase.js";
import { useToast } from "../components/Toast.jsx";
import { useConfirm } from "../components/Confirm.jsx";

const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'tsp', 'tbsp', 'cup', 'portion'];

function emptyRecipe() {
  return { name: '', portions: 1, is_shared: true, ingredients: [], steps: [] };
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
    <div className="recipe-form">
      <div className="recipe-form-name-row">
        <div className="recipe-form-name">
          <label className="form-label-sm">Name</label>
          <input className="form-inp" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Recipe name" autoFocus/>
        </div>
        <div className="recipe-form-portions">
          <label className="form-label-sm">Portions</label>
          <input className="form-inp" type="number" min="1" value={form.portions} onChange={e => set('portions', parseInt(e.target.value)||1)}/>
        </div>
      </div>

      <div>
        <label className="form-label-sm recipe-form-label">Ingredients</label>
        <div className="recipe-ing-edit-list">
          {form.ingredients.map((ing, i) => (
            <div key={ing._key} className="recipe-ing-edit-row">
              <div className="recipe-reorder">
                <button onClick={() => moveIng(ing._key, -1)} disabled={i === 0} className={`recipe-reorder-btn recipe-reorder-btn--${i===0?'disabled':'active'}`}>▲</button>
                <button onClick={() => moveIng(ing._key, 1)} disabled={i === form.ingredients.length-1} className={`recipe-reorder-btn recipe-reorder-btn--${i===form.ingredients.length-1?'disabled':'active'}`}>▼</button>
              </div>
              <input value={ing.name} onChange={e => updateIng(ing._key, 'name', e.target.value)} className="recipe-ing-name-inp"/>
              <input value={ing.amount} onChange={e => updateIng(ing._key, 'amount', e.target.value)} className="recipe-ing-amt-inp"/>
              <select value={ing.unit} onChange={e => updateIng(ing._key, 'unit', e.target.value)} className="recipe-ing-unit-sel">
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
              <button onClick={() => removeIng(ing._key)} className="recipe-del-btn">×</button>
            </div>
          ))}
        </div>
        <div className="recipe-ing-add-row">
          <input className="search-inp recipe-ing-add-inp" placeholder="Ingredient" value={ingText}
            onChange={e => setIngText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addIng()}/>
          <input className="search-inp recipe-ing-add-amt" placeholder="Amt" value={ingAmt}
            onChange={e => setIngAmt(e.target.value)} onKeyDown={e => e.key === 'Enter' && addIng()}/>
          <select className="form-sel recipe-ing-add-unit" value={ingUnit} onChange={e => setIngUnit(e.target.value)}>
            {UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
          <button className="btn-secondary" onClick={addIng}>+</button>
        </div>
      </div>

      <div>
        <label className="form-label-sm recipe-form-label">Steps</label>
        <div className="recipe-step-edit-list">
          {form.steps.map((step, i) => (
            <div key={step._key} className="recipe-step-edit-row">
              <div className="recipe-step-reorder">
                <button onClick={() => moveStep(step._key, -1)} disabled={i === 0} className={`recipe-reorder-btn recipe-reorder-btn--${i===0?'disabled':'active'}`}>▲</button>
                <button onClick={() => moveStep(step._key, 1)} disabled={i === form.steps.length-1} className={`recipe-reorder-btn recipe-reorder-btn--${i===form.steps.length-1?'disabled':'active'}`}>▼</button>
              </div>
              <span className="recipe-step-num-lbl">{i+1}.</span>
              <textarea value={step.text} onChange={e => updateStep(step._key, e.target.value)}
                rows={1} className="recipe-step-textarea"/>
              <button onClick={() => removeStep(step._key)} className="recipe-step-del">×</button>
            </div>
          ))}
        </div>
        <div className="recipe-step-add-row">
          <input className="search-inp recipe-ing-add-inp" placeholder="Step description" value={stepText}
            onChange={e => setStepText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addStep()}/>
          <button className="btn-secondary" onClick={addStep}>+</button>
        </div>
      </div>

      <div className="recipe-form-actions">
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


  if (selected && editing) {
    return (
      <div className="tab-content">
        <div className="recipe-detail-hdr">
          <button className="btn-secondary" onClick={() => setEditing(false)}>← Back</button>
          <span className="recipe-edit-name">Edit: {selected.name}</span>
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
        <div className="recipe-detail-hdr">
          <button className="btn-secondary" onClick={() => setSelected(null)}>← Back</button>
          <span className="recipe-detail-name">{selected.name}</span>
          <button className="btn-secondary" onClick={() => setEditing(true)}>Edit</button>
          <button className="btn-danger" onClick={handleDelete}>Delete</button>
        </div>
        <div className="recipe-meta">{selected.portions} portion{selected.portions!==1?'s':''}</div>

        {ings.length > 0 && (
          <div className="recipe-block">
            <div className="recipe-block-title">Ingredients ({selected.portions}p)</div>
            <div className="recipe-ing-list">
              {ings.map((ing, i) => (
                <div key={i} className="recipe-ing-row">
                  <span className="recipe-ing-name">{ing.name}</span>
                  <span className="recipe-ing-amt">{ing.amount} {ing.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {steps.length > 0 && (
          <div className="recipe-block">
            <div className="recipe-block-title">Steps</div>
            <div className="recipe-steps-list">
              {steps.map((step, i) => (
                <div key={i} className="recipe-step-row">
                  <span className="recipe-step-num">{i+1}.</span>
                  <span className="recipe-step-text">{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {ings.length === 0 && steps.length === 0 && (
          <div className="recipe-empty">No ingredients or steps yet. <button className="recipe-empty-link" onClick={() => setEditing(true)}>Add them →</button></div>
        )}
      </div>
    );
  }

  if (showNew) {
    return (
      <div className="tab-content">
        <div className="recipe-detail-hdr">
          <button className="btn-secondary" onClick={() => setShowNew(false)}>← Back</button>
          <span className="recipe-edit-name">New Recipe</span>
        </div>
        <RecipeForm initial={emptyRecipe()} onSave={handleCreate} onCancel={() => setShowNew(false)} saving={saving}/>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="stat-row">
        <div className="stat-card"><div className="stat-val">{recipes.length}</div><div className="stat-lbl">Recipes</div></div>
        <div className="stat-card"><div className="stat-val c-green">{recipes.filter(r=>r.is_shared).length}</div><div className="stat-lbl">Shared</div></div>
      </div>
      <div className="toolbar">
        <button className="btn-primary" onClick={() => setShowNew(true)}>+ New Recipe</button>
      </div>
      <div className="recipe-list">
        {recipes.map(r => (
          <div key={r.id} className="recipe-list-item" onClick={() => setSelected(r)}>
            <div className="recipe-list-body">
              <div className="recipe-list-name">{r.name}</div>
              <div className="recipe-list-meta">
                {r.ingredients?.length||0} ingredients · {r.steps?.length||0} steps · {r.portions}p
              </div>
            </div>
            {r.is_shared && <span className="recipe-list-shared">● Shared</span>}
          </div>
        ))}
        {recipes.length === 0 && <div className="template-empty">No recipes yet.</div>}
      </div>
    </div>
  );
}
