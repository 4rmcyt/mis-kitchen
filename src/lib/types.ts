export type Role = 'superadmin' | 'admin' | 'cook';
export type Station = 'Common' | 'Grill' | 'Rolls' | 'Pans' | 'Garmo' | 'Tandoor';
export type TaskSource = 'manual' | 'template';
export type ExperimentOutcome = 'yes' | 'no' | 'not_tried';

export interface Profile {
  id: string;
  restaurant_id: string;
  name: string | null;
  email: string | null;
  role: Role;
  station: Station;
  secondary_stations: Station[];
  active: boolean;
  password_set: boolean;
  created_at: string;
  last_seen?: string | null;
  joined?: string | null;
}

export interface Task {
  id: string;
  restaurant_id: string;
  created_by: string;
  text: string;
  station: Station;
  section: string;
  date: string;
  done: boolean;
  done_at: string | null;
  done_by: string | null;
  comment: string | null;
  source: TaskSource;
  template_id: string | null;
  created_at: string;
  profiles?: { name: string } | null;
}

export interface DeferredTask {
  id: string;
  user_id: string;
  restaurant_id: string;
  text: string;
  station: Station;
  deferred_from: string;
  carried: boolean;
  created_at: string;
}

export interface Allergen {
  id: string;
  name: string;
  slug: string;
}

export interface RecipeAllergen {
  allergen_id: string;
  note: string | null;
  allergens: Allergen;
}

export interface Recipe {
  id: string;
  restaurant_id: string;
  created_by: string;
  name: string;
  station: Station | null;
  portions: number | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  is_shared: boolean;
  created_at: string;
  recipe_allergens?: RecipeAllergen[];
}

export interface RecipeIngredient {
  _key?: string;
  name: string;
  amount: string;
  unit: string;
}

export interface RecipeStep {
  _key?: string;
  text: string;
}

export interface Template {
  id: string;
  restaurant_id: string;
  name: string;
  station: Station;
  entries: TemplateEntry[];
  created_at: string;
}

export interface TemplateEntry {
  text: string;
  station: string;
  section: string;
}

export interface Invite {
  id: string;
  restaurant_id: string;
  invited_by: string;
  email: string | null;
  role: Role;
  station: Station | null;
  token: string;
  used: boolean;
  expires_at: string;
  created_at: string;
}

export interface Shift {
  id: string;
  restaurant_id: string;
  user_id: string;
  date: string;
  station: Station;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  profiles?: { name: string } | null;
}

export interface ImprovementLog {
  id: string;
  restaurant_id: string;
  posted_by: string;
  text: string;
  created_at: string;
  profiles?: { name: string } | null;
}

export interface TempLog {
  id: string;
  restaurant_id: string;
  user_id: string;
  station: Station;
  temperature: number;
  recorded_at: string;
  created_at: string;
  profiles?: { name: string } | null;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  restaurant_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface ShiftReport {
  id: string;
  user_id: string;
  restaurant_id: string;
  date: string;
  completed_pct: number;
  completed_count: number;
  total_count: number;
  sections: Array<{ name: string; done: number; total: number }>;
  next_shift: Array<string | { text: string }>;
  experiment_text: string | null;
  experiment_outcome: ExperimentOutcome | null;
  experiment_note: string | null;
  profiles?: { name: string; station: Station } | null;
}
