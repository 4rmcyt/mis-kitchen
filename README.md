# mis<span>.</span> — kitchen ops for the line

A mobile‑first PWA that runs the back of house: daily prep checklists, opening/closing
tasks, prep quantities, recipes with live portion scaling, allergen tracking,
temperature logs, timers, crew line‑up, end‑of‑shift reports and push notifications.

Built for one restaurant today, structured to become multi‑tenant SaaS.

| | |
|---|---|
| **Frontend** | React 19 + Vite 8, TypeScript, single‑page app |
| **Backend** | Supabase — PostgreSQL + PostgREST + GoTrue + Edge Functions (Deno) |
| **Hosting** | Cloudflare Pages |
| **Email** | Resend (invites, shift reports) |
| **Push** | Web Push API + VAPID |
| **Errors** | Sentry (lazy‑loaded, behind a dependency‑free error boundary) |
| **Tests** | Vitest (unit) · Cucumber.js + Playwright (E2E) |
| **CI/CD** | GitHub Actions → Supabase CLI + Wrangler; Cloudflare/DNS via Terraform |

---

## What's in the app

### Cook app — 6‑tab bottom nav (`src/App.tsx`)

| Tab | Screen | What it does |
|---|---|---|
| **Today** | `TodayScreen` | Opening / Closing / Other task lists for a chosen day (today + 3), station filter, progress ring, per‑task comments, "today's experiment" and "recent wins" banners, end‑of‑shift report. |
| **Prep** | `PrepScreen` | Flat mobile list of prep tasks with owner badge and editable quantities; rolling prep stats (by person / by item). |
| **Lineup** | `LineupScreen` | Crew grouped by station, plus an "unassigned" bucket. |
| **Recipes** | `RecipesScreen` | Search, portion multiplier (1×–10×) that scales every ingredient amount, allergen badges with modifier notes. |
| **Temp** | `TempScreen` | Per‑station temperature entries for the day. |
| **Timers** | `TimerScreen` | Multiple named kitchen timers with an audible alarm; state is shared app‑wide while open. |

Today's tasks are **generated from a day template** the first time the screen is
opened. Generation is idempotent — a full unique constraint on
`(restaurant_id, date, day_template_id, station, section, text)` plus an
`ignoreDuplicates` upsert means a second concurrent generation is a no‑op. Prep
entries pull their default quantity from the Prep Items catalog at generation time.

### Admin panel — 11 tabs (`src/Admin.tsx`, lazy‑loaded, admin/superadmin only)

People · Prep board · Prep Items catalog · Prep Stats · Tasks (day‑template editor) ·
Recipes (inline ingredient/step editor + reorder) · Reports · Velocity (station
burndown heatmap) · Wins (improvement log) · Schedule (weekly rota) · Push.

### Onboarding

Invite‑only. An admin creates an invite (shareable `/join/:token` link **or** an
email invite sent through Resend). The `handle_new_user` trigger only creates a
profile when it finds a matching unused, unexpired invite, and marks it used in the
same transaction — so a token can't be replayed.

---

## Architecture

Imports flow **top → bottom only**. Lower layers never import upward.

```
screens/ + admin/tabs/   UI — JSX only, no Supabase calls
        │
        ▼
hooks/features/           controllers — fetch via lib/, transform via domain/
        │
        ▼
domain/                   pure functions — no I/O, no lib/ imports, unit‑tested
        │
        ▼
lib/                      Supabase client, queries, Edge Function calls, auth
```

Rules that hold across the codebase:

- `supabase.from()` / `supabase.auth.*` live **only** in `src/lib/`.
- Business logic (filtering, grouping, payload building, date math, CSV parsing)
  lives in `src/domain/` and every exported function has a Vitest test —
  **65 tests across 8 files** (`tasks`, `invites`, `recipes`, `allergens`,
  `ownership`, `prep_stats`, `sheets`, `datetime`).

```
src/
  main.tsx              entry — useAuth() gate → Login / Onboarding / ResetPassword / App / Admin
  App.tsx / Admin.tsx   cook + admin shells
  domain/               pure logic + *.test.ts
  hooks/
    useAuth.ts          session, onboarding + password‑reset detection
    features/            useTodayTasks, usePrepTasks, usePrepBoard, usePrepStats,
                         usePrepItemsTab, usePeopleTab
  screens/  components/  admin/tabs/  admin/components/
  lib/
    client.ts           typed Supabase singleton (PKCE flow)
    supabase.ts         re‑export barrel
    constants.ts        STATIONS, SECTIONS, colors, role labels — mirrored by DB CHECK constraints
    auth · tasks · recipes · templates · reports · push · invites · profiles ·
    prep_items · prep_stats · shifts · temp_logs · allergens · improvements
    types.ts · database.types.ts (generated)

supabase/
  migrations/            3 legacy numbered files + timestamped migrations (~51 total)
  functions/             send-invite · accept-invite · send-report · send-push ·
                         push-sync · push-webhook

e2e/
  features/  16 .feature files (~46 scenarios)
  steps/     Playwright step definitions
  support/   world.js (viewport), login.js, supabase_admin.js, mailtrap.js

terraform/  Cloudflare Pages project + DNS only (state in an R2 bucket)
public/     sw.js (app‑shell cache), manifest.json (+ shortcuts), icons, _headers
```

### Data model highlights

- **RLS on every table.** Helper functions (`get_user_restaurant`, `get_user_role`,
  `is_admin`) are `SECURITY DEFINER` with `SET search_path = ''`.
- **Trigger‑level column enforcement** on `tasks`: cooks may only change
  `done / done_at / done_by / comment`, and `done_by` is forced to their own uid —
  admins may change anything.
- `tasks.station` / `tasks.section` `CHECK` constraints mirror `src/lib/constants.ts`;
  change one, add a migration for the other.

---

## Local development

Requires **Node 20+** and **pnpm**.

```bash
bash scripts/bootstrap.sh   # checks tools, installs deps, seeds .env + tfvars, installs git hooks
cp .env.example .env         # then fill in the values below
pnpm dev                     # Vite dev server on http://localhost:3000
```

`.env`:

| Variable | Notes |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_APP_ENV` | `development` locally |
| `VITE_VAPID_PUBLIC_KEY` | Web Push public key (optional locally) |
| `VITE_SENTRY_DSN` | leave empty to disable Sentry |

Edge Function secrets (`RESEND_API_KEY`, `FROM_EMAIL`, `VAPID_PRIVATE_KEY`, …) are set
with `supabase secrets set`, never committed.

### Scripts

| Command | Does |
|---|---|
| `pnpm dev` | Vite dev server (port 3000) |
| `pnpm build` | production build to `dist/` |
| `pnpm preview` | serve the built bundle |
| `pnpm lint` | ESLint, `--max-warnings 0` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest unit run (`src/**/*.test.ts`) |
| `pnpm test:e2e` | Cucumber E2E, desktop 1280×720, against staging |
| `pnpm test:mobile` | mobile layout suite, 390×844 |
| `pnpm test:invite` | invite + onboarding suite |

Append `:ui` to any E2E script to run headed.

---

## CI/CD

`ci.yml` fans out on push to `staging` / `main`:

```
deploy.yml
  check          pnpm lint + pnpm typecheck
  build          pnpm build  (env from GitHub vars/secrets, per‑branch matrix)
  migrate        supabase db push          (staging ⇢ main)
  edge functions supabase functions deploy (send-report, send-invite, send-push,
                                            push-sync, push-webhook --no-verify-jwt)
  frontend       wrangler pages deploy dist/ → mis-kitchen-prod
  smoke test     main only — app reachable, manifest.json valid, sw.js served
        │
        ▼   (staging only)
e2e.yml          cucumber desktop + mobile suites, HTML report artifact
e2e-invite.yml   invite + onboarding suite
```

- `preview.yml` — every PR gets a Cloudflare preview deploy (uses the staging
  Supabase project) and a comment with the URL.
- `terraform.yml` — runs on `terraform/**` changes: plan on PR, apply on merge.

### Environments

| | Staging | Production |
|---|---|---|
| Branch | `staging` | `main` |
| Frontend | `staging.mis-kitchen-prod.pages.dev` | *(planned)* |
| Supabase | cloud project | self‑hosted on k3s *(planned)* |

Terraform manages the Cloudflare Pages project and DNS only — **not** secrets, DB
schema, or Edge Functions (Terraform state is plaintext).

---

## Deployment

Full first‑time setup — Supabase project, secrets, Edge Functions, Cloudflare via
Terraform, GitHub secrets, first deploy — is in [`DEPLOY.md`](DEPLOY.md).

## Docs

`docs/` holds the design notes: [`Architecture.md`](docs/Architecture.md),
[`Database.md`](docs/Database.md), [`Infrastructure.md`](docs/Infrastructure.md),
[`Invite Flow.md`](docs/Invite%20Flow.md), [`E2E Testing.md`](docs/E2E%20Testing.md),
[`Roadmap.md`](docs/Roadmap.md), and `docs/Decisions/` for the "why" behind
token‑based invites and the planned clean production schema.
