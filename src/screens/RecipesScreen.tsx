import { useState, useEffect } from "react";
import { getRecipes } from "../lib/supabase.js";
import { STATION_COLORS } from "../lib/constants.js";
import { scaleAmount } from "../domain/recipes.js";
import type { Recipe, RecipeIngredient, RecipeAllergen } from "../lib/types.js";

export function RecipesScreen() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [active, setActive] = useState<Recipe | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getRecipes().then((data: Recipe[]) => setRecipes(data || [])).catch(() => {});
  }, []);

  const filtered = recipes.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) || (r.station || '').toLowerCase().includes(search.toLowerCase())
  );

  if (active) return (
    <div className="screen">
      <div className="screen-header">
        <button className="back-btn" onClick={() => setActive(null)}>← Back</button>
      </div>
      <div className="recipe-detail">
        <div className="recipe-station-badge" style={{ background: STATION_COLORS[active.station!]||STATION_COLORS.Default }}>{active.station}</div>
        <h2 className="recipe-title">{active.name}</h2>
        <div className="multiplier-row">
          <span className="mult-label">Portions</span>
          {[1,2,3,4,5,6,10].map(m => <button key={m} className={`mult-btn ${multiplier===m?'active':''}`} onClick={() => setMultiplier(m)}>{m}×</button>)}
        </div>
        {(active.recipe_allergens || []).length > 0 && (
          <div className="allergen-badges">
            {(active.recipe_allergens as RecipeAllergen[]).map(ra => (
              <span key={ra.allergen_id} className="allergen-badge" title={ra.note || ''}>
                {ra.allergens.name}{ra.note ? ` (${ra.note})` : ''}
              </span>
            ))}
          </div>
        )}
        <div className="ingredients-list">
          {active.ingredients.map((ing: RecipeIngredient & { id?: string; amount: number | string }) => (
            <div key={ing._key || ing.name} className="ing-row">
              <span className="ing-name">{ing.name}</span>
              <span className="ing-amount">{scaleAmount(String(ing.amount ?? ''), multiplier)} {ing.unit}</span>
            </div>
          ))}
        </div>
        <div className="steps-list">
          {active.steps.map((step, i) => (
            <div key={i} className="step-row">
              <span className="step-num">{i+1}</span>
              <span className="step-text">{typeof step === 'string' ? step : step.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="screen">
      <div className="screen-header"><div className="screen-title">Recipes</div></div>
      <input className="search-input" placeholder="Search recipes..." value={search} onChange={e => setSearch(e.target.value)}/>
      <div className="recipe-grid">
        {filtered.map(r => (
          <button key={r.id} className="recipe-card" onClick={() => { setActive(r); setMultiplier(1); }}>
            <div className="recipe-card-station" style={{ background: STATION_COLORS[r.station!]||STATION_COLORS.Default }}>{r.station}</div>
            <div className="recipe-card-name">{r.name}</div>
            <div className="recipe-card-meta">{r.ingredients.length} ingredients</div>
          </button>
        ))}
        {filtered.length === 0 && <div className="empty-state col-span-full"><div className="empty-icon">📖</div><div className="empty-title">No recipes found</div></div>}
      </div>
    </div>
  );
}
