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

## Stack

- React 18 + Vite → Cloudflare Pages
- Supabase (PostgreSQL + PostgREST + GoTrue + Edge Functions)
- E2E: Cucumber.js + Playwright against staging
- CI: GitHub Actions (`deploy.yml` → `e2e.yml`)
- Supabase project (staging): `nlvuqcvjlkgybvcpiqzn`
