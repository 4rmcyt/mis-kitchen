# mis-kitchen — Claude Instructions

## Language

- **Chat with user**: Russian
- **Everything else**: English only — code, comments, UI text, commit messages, Fizzy cards

## MCP Tools — always use, never bash

| Operation | Tool |
|---|---|
| Supabase (SQL, migrations, functions, logs) | `mcp__supabase__*` |
| GitHub (PRs, issues, actions, code search) | `mcp__github__*` |
| Fizzy (tickets, cards) | `mcp__fizzy__*` |
| Web search | `mcp__tavily__*` |
| Fetch URL | `mcp__fetch__*` |

## Fizzy

- Account slug for this project: `/6196871` (account "Fizzy pizzy")
- Staging URL: `staging.mis-kitchen-prod.pages.dev`

### Every change requires:
1. **Fizzy ticket** — create before starting work
2. **Documentation** — update Architecture.md / Roadmap.md / relevant docs/
3. **Ticket → Done** — only after deploy succeeded + E2E tests passed on staging

## Supabase Migrations

Critical workflow — always in this order:
1. Create local file `supabase/migrations/<timestamp>_name.sql`
2. Apply via `mcp__supabase__apply_migration`
3. Run `mcp__supabase__list_migrations` — verify timestamps match
4. If mismatch — rename local file immediately before committing

Never create the local file after applying — MCP generates its own timestamp.

## Quality Bar

**No half-working state.** If something is broken, misconfigured, or throwing errors — fix it before moving on. Console errors, missing env vars, silent failures — all count. "It works but..." is not done.

## Domain Rules

- **Tasks**: cooks do not delete tasks — never code for that case
- **Recipes**: loaded from Supabase, not localStorage; cooks see `is_shared=true` only
- **Prod DB**: will be clean 2-file schema (ticket #49) — don't add to staging migration history

## Architecture — Layer Rules

Imports flow **top → bottom only**. Lower layers must not import from upper layers.

```
[screens/ + admin/tabs/]  ← UI: JSX only, no supabase calls
        ↓
[hooks/features/]         ← controllers: call lib/, pass data through domain/
        ↓
[domain/]                 ← pure functions, no I/O, no imports from lib/
        ↓
[lib/]                    ← Supabase, Edge Functions, auth
```

**Rules enforced for all new code:**

- `supabase.from()` / `supabase.auth.*` **never** in screens or components — only in `src/lib/`
- Business logic (filtering, grouping, calculations, payload building) → `src/domain/`
- Every function added to `src/domain/` must have a unit test (`pnpm test`)
- Screens/tabs call hooks, hooks call lib + domain

**When adding a feature with logic:**
1. Extract rules into `src/domain/<entity>.ts`
2. Write unit tests for those functions
3. Wire up the call in `src/hooks/features/use<Feature>.ts`
4. Screen/tab only does JSX + hook calls

## Project Structure

```
src/
  main.tsx              — root: dependency-free ErrorBoundary + deferred Sentry.init + useAuth() gate + routing
  App.tsx               — cook app, 6-tab bottom nav (Today / Prep / Lineup / Recipes / Temp / Timers)
  Admin.tsx             — admin layout, 11 lazy-loaded tabs + responsive bottom nav
  domain/               — pure business logic (no I/O), each exported fn has a *.test.ts
    tasks.ts            — filterByStation, groupBySection, calcProgress, buildTasksFromTemplate
    invites.ts          — inviteExpiresAt, buildLinkInvitePayload, buildEmailInvitePayload
    recipes.ts          — scaleAmount   ·  ownership.ts — selectOwnedTasks
    prep_stats.ts       — groupByPerson, groupByPrepItem   ·  allergens.ts — offTagsToSlugs
    datetime.ts         — localDayUtcBounds   ·  sheets.ts — parseSheetCsv (Google Sheets import)
    *.test.ts           — vitest unit tests (pnpm test)
  hooks/
    useAuth.ts          — session, onboarding, password reset
    features/           — feature hooks (controllers)
      useTodayTasks.ts  — task loading, filtering, toggle/comment/delete
      usePrepTasks.ts / usePrepBoard.ts / usePrepItemsTab.ts / usePrepStats.ts
      usePeopleTab.ts   — users, invite, role/station management
  screens/              — TodayScreen, PrepScreen, RecipesScreen, LineupScreen, TempScreen, TimerScreen
  components/           — AddTaskModal, ReportModal
  admin/tabs/           — PeopleTab, PrepBoardTab, PrepItemsTab, PrepStatsTab, TasksTab, RecipesTab,
                          ReportsTab, VelocityTab, ImprovementsTab, RotaTab, PushTab
  admin/components/     — Toast, Confirm, Avatar, Badge, PctBar, Modal
  lib/
    supabase.ts         — re-export barrel
    client.ts / auth.ts / tasks.ts / recipes.ts / templates.ts / reports.ts
    push.ts / invites.ts / profiles.ts / prep_items.ts / prep_stats.ts
    shifts.ts / temp_logs.ts / allergens.ts / improvements.ts / sheets.ts
    constants.ts        — STATIONS, SECTIONS, colors, role labels

supabase/
  migrations/           — SQL stubs (always committed after MCP apply)
  functions/            — send-invite, accept-invite, send-report, send-push,
                          push-sync + push-webhook (Push Operations HR/schedule integration)

e2e/
  features/             — Cucumber .feature files
  steps/                — Playwright step definitions
  support/              — world.js, helpers
```

## E2E Testing

Profiles defined in `cucumber.json`:

| Command | Profile | Viewport | Features |
|---|---|---|---|
| `pnpm test:e2e` | default | 1280×720 | All app features (auth, tasks, recipes, etc.) |
| `pnpm test:mobile` | mobile | 390×844 | Mobile layout assertions (`layout.feature`) |
| `pnpm test:invite` | invite | 1280×720 | Invite onboarding flow |

Append `:ui` to any command to run headed (e.g. `pnpm test:mobile:ui`).

Mobile layout tests (`e2e/features/layout.feature`) verify:
- Bottom nav is fully visible (not clipped at viewport edges)
- Station filter renders ≥6 pills without horizontal cutoff
- Header logout button is visible

Both `test:e2e` and `test:mobile` run in CI (`e2e.yml`) after every deploy.

### What breaks mobile layout

- `left:50%; transform:translateX(-50%)` on fixed elements → use `left:0; right:0` instead
- Unicode symbols (`⏻`, `✓`, `◈`, `⚗`) don't render on Android → use SVG icons

## Stack

- React 19 + Vite 8 (TypeScript, SPA) → Cloudflare Pages
- Supabase (PostgreSQL + PostgREST + GoTrue + Edge Functions / Deno)
- Push: Web Push API + VAPID (`send-push`); Sentry for errors (lazy-loaded)
- E2E: Cucumber.js + Playwright against staging
- CI: GitHub Actions — `ci.yml` orchestrates `deploy.yml` → `e2e.yml` → `e2e-invite.yml`
- Supabase project (staging): `nlvuqcvjlkgybvcpiqzn`
