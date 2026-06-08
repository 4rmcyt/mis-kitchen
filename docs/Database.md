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
| template_id | uuid | nullable FK → day_templates |

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
Weekly rota entries.

| Column | Type | Notes |
|---|---|---|
| user_id | uuid | FK → auth.users |
| restaurant_id | uuid | |
| week_start | date | Monday of the week |
| day | int | 0–6 (Mon–Sun) |
| shift | text | morning / evening / off |

### improvement_logs
Staff win records posted by admins.

| Column | Type | Notes |
|---|---|---|
| restaurant_id | uuid | |
| posted_by | uuid | FK → auth.users (admin) |
| text | text | |
| created_at | timestamptz | |

### temp_logs
Temperature log entries.

| Column | Type | Notes |
|---|---|---|
| user_id | uuid | FK → auth.users |
| restaurant_id | uuid | |
| item | text | what was measured |
| temperature | numeric | |
| unit | text | C / F |
| logged_at | timestamptz | |

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
