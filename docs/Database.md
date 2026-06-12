# Database

## Tables

### profiles
User accounts. Created by `handle_new_user()` trigger on auth.users insert.

| Column | Type | Notes |
|---|---|---|
| id | uuid | = auth.users.id |
| restaurant_id | uuid | FK → restaurants |
| name | text | |
| email | text | |
| role | text | cook / admin / superadmin |
| station | text | Common / Garmo / Rolls / Pans / Grill / Tandoor |
| secondary_station | text | nullable — T-shaped skill (secondary station) |
| active | boolean | default true |
| last_seen | timestamptz | updated by trigger |
| password_set | boolean | false until user sets password on onboarding |

### invites
| Column | Type | Notes |
|---|---|---|
| token | text | uuid, used for link-based invites |
| email | text | nullable — null for link invites |
| role | text | |
| station | text | |
| used | boolean | set true after onboarding |
| expires_at | timestamptz | 48h from creation |
| source | text | 'e2e' for test data |

### tasks
Daily prep tasks.

| Column | Type | Notes |
|---|---|---|
| text | text | |
| station | text | |
| section | text | Opening / Closing / Other |
| date | date | |
| done | boolean | |
| source | text | manual / template / e2e |
| template_id | uuid | nullable FK → templates (station-level template, rarely used) |
| day_template_id | uuid | nullable FK → day_templates — set on all rows generated from a day template |

**Idempotency:** day-template generation is idempotent via a full unique constraint:

```sql
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_day_template_dedup
  UNIQUE (restaurant_id, date, day_template_id, station, section, text);
```

`createTasksBatch` uses `upsert({ onConflict: 'restaurant_id,date,day_template_id,station,section,text', ignoreDuplicates: true })` so a concurrent second generation call no-ops instead of duplicating rows.

Ad-hoc tasks (`day_template_id IS NULL`) are **not** deduplicated — `NULL != NULL` in Postgres unique indexes, so two manual tasks with the same text on the same date pass through freely. Do **not** add `NULLS NOT DISTINCT` to this constraint.

### recipes
| Column | Type | Notes |
|---|---|---|
| name | text | |
| station | text | |
| ingredients | jsonb | [{id, name, amount, unit}] |
| steps | jsonb | [string] |
| is_shared | boolean | true = visible to all cooks |
| restaurant_id | uuid | |

### allergens
Reference table — seeded from CCC Allergy Sheet Summer 2025.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | e.g. "Gluten", "Dairy" |
| slug | text | e.g. "gluten", "fresh-cilantro" |

### recipe_allergens
Join table: recipe ↔ allergen with optional modifier note.

| Column | Type | Notes |
|---|---|---|
| recipe_id | uuid | FK → recipes |
| allergen_id | uuid | FK → allergens |
| note | text | nullable, e.g. "no butter", "no yogurt" |

### daily_reports
End-of-shift reports saved by cooks.

| Column | Type | Notes |
|---|---|---|
| user_id | uuid | FK → auth.users |
| restaurant_id | uuid | |
| date | date | unique per user+date |
| sections | jsonb | [{name, items:[{text,done}], done, total}] |
| next_shift | jsonb | [string] — incomplete task texts |
| completed_pct | int | |
| completed_count | int | |
| total_count | int | |

### push_subscriptions
Web Push subscriptions per device.

| Column | Type | Notes |
|---|---|---|
| user_id | uuid | FK → auth.users |
| restaurant_id | uuid | |
| endpoint | text | push service URL |
| p256dh | text | encryption key |
| auth | text | auth secret |
| unique | | (user_id, endpoint) |

### day_templates + templates
Named task sets. `day_templates` is the parent, `templates` contains individual entries.

### shifts
Daily rota entries (one row per staff per day).

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | nullable FK → profiles |
| restaurant_id | uuid | FK → restaurants |
| date | date | calendar date of the shift |
| start_time | time | nullable |
| end_time | time | nullable |
| station | text | nullable |
| created_at | timestamptz | |

### improvement_logs
Staff win records posted by admins.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| restaurant_id | uuid | FK → restaurants |
| author_id | uuid | FK → profiles (admin) |
| text | text | |
| created_at | timestamptz | |

### temp_logs
Temperature log entries.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → profiles |
| restaurant_id | uuid | FK → restaurants |
| station | text | |
| temperature | numeric | |
| recorded_at | timestamptz | |

### station_velocity (view)
Aggregated task completion stats per station per day-of-week. Used by VelocityTab.
Defined in migration `20260526235301` with `SECURITY INVOKER`.

| Column | Type | Notes |
|---|---|---|
| station | text | |
| dow | int | 0 = Sunday … 6 = Saturday (PostgreSQL EXTRACT) |
| completed_count | bigint | count of completed tasks |

## Task Integrity Rules

### INSERT (`enforce_task_insert_done_by` trigger — migration `20260611145146`)

The `tasks_insert` RLS policy only checks `restaurant_id`. The trigger adds:

- **Admins / superadmins**: no restrictions.
- **Cooks**: `done_by` must be `auth.uid()` or `NULL`. Inserting with a foreign `done_by` raises a permission error.
- If `done = true` and `done_by IS NULL`, `done_by` is automatically set to `auth.uid()`.

### UPDATE (`enforce_task_update_columns` trigger — migration `20260610180529`)

The `tasks_update` RLS policy allows any authenticated user in the same restaurant to issue
an UPDATE. Column-level enforcement:

- **Admins / superadmins**: may update any column.
- **Cooks**: may only change `done`, `done_at`, `done_by`, `comment`.
  Attempting to change `text`, `station`, `section`, `date`, `source`, `template_id`,
  `day_template_id`, `restaurant_id`, or `created_by` raises a permission error.
- **done_by**: forced to `auth.uid()` or `NULL` for non-admins — prevents attributing
  completions to other users (which would corrupt `station_velocity` stats).

## RLS Functions

All functions: `SECURITY DEFINER`, `SET search_path = ''`, must use `public.` prefix internally.

```sql
public.get_user_restaurant() → uuid
public.get_user_role()       → text
public.is_admin()            → boolean
public.update_last_seen()    → trigger
public.handle_new_user()     → trigger (requires valid invite row)
```

## Migrations

Applied via `mcp__supabase__apply_migration`. After every MCP migration:
1. Note the auto-generated timestamp from `list_migrations`
2. Create local stub file `supabase/migrations/<timestamp>_<name>.sql`
3. Commit and push immediately

Production will use a clean 2-file schema — no migration history. See [[Decisions/Clean prod schema]].

## Related

- [[Architecture]]
- [[Invite Flow]]
