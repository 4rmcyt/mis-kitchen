import { useState, useEffect } from "react";
import { getRecipes, createRecipe, updateRecipe, deleteRecipe, getAllergens, setRecipeAllergens as saveRecipeAllergens } from "../../lib/supabase.js";
import { fetchSheetCsv } from "../../lib/sheets.js";
import { parseSheetCsv } from "../../domain/sheets.js";
import { useToast } from "../components/Toast.js";
import { useConfirm } from "../components/Confirm.js";
import type { Recipe, RecipeIngredient, RecipeStep, Allergen, RecipeAllergen } from "../../lib/types.js";

const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'tsp', 'tbsp', 'cup', 'portion'];

type IngWithKey = RecipeIngredient & { _key: string; amount: string };
type StepWithKey = RecipeStep & { _key: string };

interface RecipeFormData extends Omit<Recipe, 'id' | 'restaurant_id' | 'created_by' | 'created_at' | 'ingredients' | 'steps'> {
  ingredients: IngWithKey[];
  steps: StepWithKey[];
}

function emptyRecipe(): RecipeFormData {
  return { name: '', portions: 1, is_shared: true, station: null, ingredients: [], steps: [] };
}

interface RecipeFormProps {
  initial: RecipeFormData;
  onSave: (form: RecipeFormData) => void;
  onCancel: () => void;
  saving: boolean;
}

function RecipeForm({ initial, onSave, onCancel, saving }: RecipeFormProps) {
  const [form, setForm] = useState<RecipeFormData>(() => ({
    ...initial,
    ingredients: (initial.ingredients || []).map((ing, i) => ({ ...ing, _key: (ing as IngWithKey)._key ?? `ing-${i}-${Date.now()}` })),
    steps: (initial.steps || []).map((s, i) => ({ text: typeof s === 'string' ? s : (s as StepWithKey).text, _key: (s as StepWithKey)._key ?? `step-${i}-${Date.now()}` })),
  }));
  const [ingText, setIngText] = useState('');
  const [ingAmt, setIngAmt] = useState('');
  const [ingUnit, setIngUnit] = useState('g');
  const [stepText, setStepText] = useState('');

  const set = <K extends keyof RecipeFormData>(k: K, v: RecipeFormData[K]) => setForm(f => ({ ...f, [k]: v }));

  const addIng = () => {
    if (!ingText.trim()) return;
    set('ingredients', [...form.ingredients, { name: ingText.trim(), amount: ingAmt, unit: ingUnit, _key: `ing-new-${Date.now()}` }]);
    setIngText(''); setIngAmt('');
  };
  const removeIng = (key: string) => set('ingredients', form.ingredients.filter(x => x._key !== key));
  const updateIng = (key: string, field: keyof IngWithKey, val: string) => set('ingredients', form.ingredients.map(x => x._key === key ? { ...x, [field]: val } : x));
  const moveIng = (key: string, dir: number) => {
    const ings = [...form.ingredients];
    const i = ings.findIndex(x => x._key === key);
    const j = i + dir;
    if (j < 0 || j >= ings.length) return;
    [ings[i], ings[j]] = [ings[j], ings[i]];
    set('ingredients', ings);
  };

  const addStep = () => {
    if (!stepText.trim()) return;
    set('steps', [...form.steps, { text: stepText.trim(), _key: `step-new-${Date.now()}` }]);
    setStepText('');
  };
  const removeStep = (key: string) => set('steps', form.steps.filter(x => x._key !== key));
  const updateStep = (key: string, val: string) => set('steps', form.steps.map(x => x._key === key ? { ...x, text: val } : x));
  const moveStep = (key: string, dir: number) => {
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
      ingredients: form.ingredients.map(({ _key: _k, ...rest }) => rest as IngWithKey),
      steps: form.steps.map(({ _key: _k, text }) => ({ text, _key: _k })),
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
          <input className="form-inp" type="number" min="1" value={form.portions ?? 1} onChange={e => set('portions', parseInt(e.target.value)||1)}/>
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

interface SheetImportModalProps {
  onImport: (form: RecipeFormData) => void;
  onClose: () => void;
}

function SheetImportModal({ onImport, onClose }: SheetImportModalProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<RecipeFormData | null>(null);

  const handleFetch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setPreview(null);
    try {
      const csv = await fetchSheetCsv(url.trim());
      const parsed = parseSheetCsv(csv);
      const form: RecipeFormData = {
        name: parsed.name,
        portions: parsed.portions ?? 1,
        is_shared: true,
        station: null,
        ingredients: parsed.ingredients.map((ing, i) => ({
          ...ing,
          _key: `ing-${i}-${Date.now()}`,
          amount: String(ing.amount),
        })),
        steps: parsed.steps.map((s, i) => ({ text: s.text, _key: `step-${i}-${Date.now()}` })),
      };
      setPreview(form);
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  return (
    <div className="sheet-import-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet-import-modal">
        <div className="sheet-import-hdr">
          <span className="sheet-import-title">Import from Google Sheets</span>
          <button className="sheet-import-close" onClick={onClose}>×</button>
        </div>

        <div className="sheet-import-body">
          <label className="form-label-sm">Sheet URL</label>
          <div className="sheet-import-url-row">
            <input
              className="form-inp sheet-import-url-inp"
              placeholder="https://docs.google.com/spreadsheets/d/…"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFetch()}
              autoFocus
            />
            <button className="btn-primary" onClick={handleFetch} disabled={loading || !url.trim()}>
              {loading ? 'Loading…' : 'Fetch'}
            </button>
          </div>
          <p className="sheet-import-hint">Sheet must be shared as &ldquo;Anyone with the link → Viewer&rdquo;</p>

          {error && <div className="sheet-import-error">{error}</div>}

          {preview && (
            <div className="sheet-import-preview">
              <div className="sheet-import-preview-name">{preview.name}</div>
              <div className="sheet-import-preview-meta">
                {preview.portions}p · {preview.ingredients.length} ingredients · {preview.steps.length} steps
              </div>
              {preview.ingredients.length > 0 && (
                <div className="sheet-import-section">
                  <div className="sheet-import-section-title">Ingredients</div>
                  {preview.ingredients.map((ing, i) => (
                    <div key={i} className="sheet-import-ing-row">
                      <span className="sheet-import-ing-name">{ing.name}</span>
                      <span className="sheet-import-ing-amt">{ing.amount} {ing.unit}</span>
                    </div>
                  ))}
                </div>
              )}
              {preview.steps.length > 0 && (
                <div className="sheet-import-section">
                  <div className="sheet-import-section-title">Steps</div>
                  {preview.steps.map((s, i) => (
                    <div key={i} className="sheet-import-step-row">
                      <span className="sheet-import-step-num">{i + 1}.</span>
                      <span>{s.text}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="sheet-import-actions">
                <button className="btn-secondary" onClick={() => setPreview(null)}>Back</button>
                <button className="btn-primary" onClick={() => onImport(preview)}>Save Recipe</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface AllergenPickerProps {
  allergens: Allergen[];
  selected: { allergen_id: string; note: string | null }[];
  onChange: (selected: { allergen_id: string; note: string | null }[]) => void;
}

function AllergenPicker({ allergens, selected, onChange }: AllergenPickerProps) {
  const toggle = (id: string) => {
    if (selected.find(x => x.allergen_id === id)) {
      onChange(selected.filter(x => x.allergen_id !== id));
    } else {
      onChange([...selected, { allergen_id: id, note: null }]);
    }
  };
  const setNote = (id: string, note: string) => {
    onChange(selected.map(x => x.allergen_id === id ? { ...x, note: note || null } : x));
  };

  return (
    <div className="allergen-picker">
      <div className="allergen-picker-chips">
        {allergens.map(a => {
          const active = !!selected.find(x => x.allergen_id === a.id);
          return (
            <button
              key={a.id}
              type="button"
              className={`allergen-chip ${active ? 'allergen-chip--active' : ''}`}
              onClick={() => toggle(a.id)}
            >
              {a.name}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div className="allergen-notes">
          {selected.map(s => {
            const a = allergens.find(x => x.id === s.allergen_id);
            if (!a) return null;
            return (
              <div key={s.allergen_id} className="allergen-note-row">
                <span className="allergen-note-name">{a.name}</span>
                <input
                  className="allergen-note-inp"
                  placeholder="note (optional)"
                  value={s.note || ''}
                  onChange={e => setNote(s.allergen_id, e.target.value)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RecipesTab() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recipeAllergens, setRecipeAllergens] = useState<{ allergen_id: string; note: string | null }[]>([]);
  const { show: toast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => {
    getRecipes().then(setRecipes).catch((e: Error) => toast(e.message, 'error'));
    getAllergens().then(setAllergens).catch(() => {});
  }, []);

  const selectRecipe = (r: Recipe | null) => {
    setSelected(r);
    if (r) {
      setRecipeAllergens((r.recipe_allergens || []).map((ra: RecipeAllergen) => ({ allergen_id: ra.allergen_id, note: ra.note })));
    } else {
      setRecipeAllergens([]);
    }
  };

  const handleImport = async (form: RecipeFormData) => {
    setShowImport(false);
    setSaving(true);
    try {
      const r = await createRecipe(form as unknown as Partial<Recipe>);
      setRecipes(rs => [r, ...rs]);
      selectRecipe(r);
      toast('Recipe imported', 'success');
    } catch (e) { toast((e as Error).message, 'error'); }
    setSaving(false);
  };

  const handleCreate = async (form: RecipeFormData) => {
    setSaving(true);
    try {
      const r = await createRecipe(form as unknown as Partial<Recipe>);
      setRecipes(rs => [r, ...rs]);
      setShowNew(false);
      selectRecipe(r);
      toast('Recipe created', 'success');
    } catch (e) { toast((e as Error).message, 'error'); }
    setSaving(false);
  };

  const handleUpdate = async (form: RecipeFormData) => {
    if (!selected) return;
    setSaving(true);
    try {
      const [r, savedAllergens] = await Promise.all([
        updateRecipe(selected.id, form as unknown as Partial<Recipe>),
        saveRecipeAllergens(selected.id, recipeAllergens),
      ]);
      const updated: Recipe = { ...r, recipe_allergens: savedAllergens };
      setRecipes(rs => rs.map(x => x.id === r.id ? updated : x));
      selectRecipe(updated);
      setEditing(false);
      toast('Saved', 'success');
    } catch (e) { toast((e as Error).message, 'error'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!await confirm(`Delete "${selected.name}"?`)) return;
    try {
      await deleteRecipe(selected.id);
      setRecipes(rs => rs.filter(r => r.id !== selected.id));
      selectRecipe(null);
      toast('Deleted', 'success');
    } catch (e) { toast((e as Error).message, 'error'); }
  };

  if (selected && editing) {
    const formData: RecipeFormData = {
      name: selected.name,
      portions: selected.portions,
      is_shared: selected.is_shared,
      station: selected.station,
      ingredients: (selected.ingredients || []).map((ing, i) => ({ ...ing, _key: `ing-${i}`, amount: String(ing.amount) })),
      steps: (selected.steps || []).map((s, i) => ({ text: typeof s === 'string' ? s : s.text, _key: `step-${i}` })),
    };
    return (
      <div className="tab-content">
        <div className="recipe-detail-hdr">
          <button className="btn-secondary" onClick={() => setEditing(false)}>← Back</button>
          <span className="recipe-edit-name">Edit: {selected.name}</span>
        </div>
        <RecipeForm initial={formData} onSave={handleUpdate} onCancel={() => setEditing(false)} saving={saving}/>
        {allergens.length > 0 && (
          <div className="recipe-block">
            <div className="recipe-block-title">Allergens</div>
            <AllergenPicker allergens={allergens} selected={recipeAllergens} onChange={setRecipeAllergens} />
          </div>
        )}
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
          <button className="btn-secondary" onClick={() => selectRecipe(null)}>← Back</button>
          <span className="recipe-detail-name">{selected.name}</span>
          <button className="btn-secondary" onClick={() => setEditing(true)}>Edit</button>
          <button className="btn-danger" onClick={handleDelete}>Delete</button>
        </div>
        <div className="recipe-meta">{selected.portions} portion{selected.portions!==1?'s':''}</div>
        {recipeAllergens.length > 0 && (
          <div className="allergen-badges">
            {recipeAllergens.map(ra => {
              const a = allergens.find(x => x.id === ra.allergen_id);
              if (!a) return null;
              return (
                <span key={ra.allergen_id} className="allergen-badge" title={ra.note || ''}>
                  {a.name}{ra.note ? ` (${ra.note})` : ''}
                </span>
              );
            })}
          </div>
        )}

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
                  <span className="recipe-step-text">{typeof step === 'string' ? step : step.text}</span>
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
      {showImport && <SheetImportModal onImport={handleImport} onClose={() => setShowImport(false)} />}
      <div className="stat-row">
        <div className="stat-card"><div className="stat-val">{recipes.length}</div><div className="stat-lbl">Recipes</div></div>
        <div className="stat-card"><div className="stat-val c-green">{recipes.filter(r=>r.is_shared).length}</div><div className="stat-lbl">Shared</div></div>
      </div>
      <div className="toolbar">
        <button className="btn-primary" onClick={() => setShowNew(true)}>+ New Recipe</button>
        <button className="btn-secondary" onClick={() => setShowImport(true)}>Import from Sheets</button>
      </div>
      <div className="recipe-list">
        {recipes.map(r => (
          <div key={r.id} className="recipe-list-item" onClick={() => selectRecipe(r)}>
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
