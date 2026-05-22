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
- **Never close a ticket** until: deploy succeeded + E2E tests passed on staging
- Staging URL: `staging.mis-kitchen-prod.pages.dev`

## Supabase Migrations

Critical workflow — always in this order:
1. Create local file `supabase/migrations/<timestamp>_name.sql`
2. Apply via `mcp__supabase__apply_migration`
3. Run `mcp__supabase__list_migrations` — verify timestamps match
4. If mismatch — rename local file immediately before committing

Never create the local file after applying — MCP generates its own timestamp.

## Domain Rules

- **Tasks**: cooks do not delete tasks — never code for that case
- **Recipes**: loaded from Supabase, not localStorage; cooks see `is_shared=true` only
- **Prod DB**: will be clean 2-file schema (ticket #49) — don't add to staging migration history

## Project Structure

```
src/
  main.jsx              — root: useAuth() + routing
  App.jsx               — user app tab routing
  Admin.jsx             — admin layout + tab routing
  hooks/useAuth.js      — session, onboarding, password reset
  screens/              — TodayScreen, RecipesScreen, LineupScreen
  components/           — AddTaskModal, ReportModal
  admin/tabs/           — PeopleTab, TasksTab, RecipesTab, ReportsTab, PushTab
  admin/components/     — Toast, Confirm, Avatar, Badge, PctBar, Modal
  lib/
    supabase.js         — re-export barrel
    client.js / auth.js / tasks.js / recipes.js / templates.js
    reports.js / push.js / invites.js / profiles.js
    constants.js        — STATIONS, SECTIONS, colors, role labels

supabase/
  migrations/           — SQL stubs (always committed after MCP apply)
  functions/            — send-invite, accept-invite, send-report, send-push

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

- React 18 + Vite → Cloudflare Pages
- Supabase (PostgreSQL + PostgREST + GoTrue + Edge Functions)
- E2E: Cucumber.js + Playwright against staging
- CI: GitHub Actions (`deploy.yml` → `e2e.yml`)
- Supabase project (staging): `nlvuqcvjlkgybvcpiqzn`
