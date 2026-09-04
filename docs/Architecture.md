# Architecture

## Stack

| Layer              | Technology                                        |
| ------------------ | ------------------------------------------------ |
| Frontend           | React 19 + Vite 8, SPA (TypeScript), react-router 7 |
| Hosting            | Cloudflare Pages                                 |
| Backend            | Supabase (PostgreSQL + PostgREST + GoTrue)       |
| Edge Functions     | Supabase Edge Functions (Deno)                   |
| Email              | Resend (`send-invite`, `send-report`)            |
| Push Notifications | Web Push API + VAPID (`send-push`)               |
| Workforce sync     | Push Operations API — employees + schedules (`push-sync`, `push-webhook`) |
| PWA                | Service Worker (app-shell cache), installable iOS/Android |
| Error Tracking     | Sentry — lazy-loaded, behind a dependency-free ErrorBoundary; DSN via env |
| E2E Tests          | Cucumber.js + Playwright                         |
| CI/CD              | GitHub Actions; Cloudflare Pages + DNS via Terraform |

## Environments

| Environment | URL | Supabase |
|---|---|---|
| Staging | staging.mis-kitchen-prod.pages.dev | cloud `nlvuqcvjlkgybvcpiqzn` |
| Production | planned (branch `main`) | self-hosted on k3s — Roadmap #54 |

## Architecture Layers

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

Rules:
- `supabase.from()` / `supabase.auth.*` only in `src/lib/` — never in screens or components
- Business logic (filtering, grouping, calculations, payload building) → `src/domain/`
- Every function in `src/domain/` must have a unit test (`pnpm test`)

## Key Files

```
src/
  main.tsx             — root: dependency-free ErrorBoundary + deferred Sentry.init
                         + useAuth() gate → Login / Onboarding / ResetPassword / App / Admin
  App.tsx              — cook app, 6-tab bottom nav (Today / Prep / Lineup / Recipes / Temp / Timers)
  Admin.tsx            — admin layout, 11 lazy-loaded tabs (sidebar + responsive bottom nav)
  domain/              — pure business logic (no I/O); every exported fn has a *.test.ts (65 tests / 8 files)
    tasks.ts           — filterByStation, groupBySection, calcProgress, buildTasksFromTemplate
    invites.ts         — inviteExpiresAt, buildLinkInvitePayload, buildEmailInvitePayload
    recipes.ts         — scaleAmount (portion multiplier)
    ownership.ts       — selectOwnedTasks (which tasks count toward a cook's report)
    prep_stats.ts      — groupByPerson, groupByPrepItem
    allergens.ts       — offTagsToSlugs (Open Food Facts tag → allergen slug)
    datetime.ts        — localDayUtcBounds (restaurant-local day → UTC range)
    sheets.ts          — parseSheetCsv (Google Sheets recipe import)
  hooks/
    useAuth.ts         — session, onboarding + password-reset detection
    features/          — feature controllers
      useTodayTasks.ts — task loading, template generation, filtering, toggle/comment/delete
      usePrepTasks.ts / usePrepBoard.ts / usePrepItemsTab.ts / usePrepStats.ts
      usePeopleTab.ts  — users, invite, role/station management
  screens/
    TodayScreen.tsx    — Opening/Closing/Other lists, progress ring, date switcher, report modal
    PrepScreen.tsx     — flat prep list, owner badge, editable quantities, rolling prep stats
    RecipesScreen.tsx  — list + detail, portion multiplier, allergen badges
    LineupScreen.tsx   — crew grouped by station (+ unassigned)
    TempScreen.tsx     — per-station temperature logging
    TimerScreen.tsx    — app-wide named kitchen timers with alarm
  components/
    AddTaskModal.tsx   — add/edit task modal
    ReportModal.tsx    — end-of-shift report modal
  admin/
    tabs/              — PeopleTab, PrepBoardTab, PrepItemsTab, PrepStatsTab, TasksTab,
                         RecipesTab, ReportsTab, VelocityTab, ImprovementsTab, RotaTab, PushTab
    components/        — Toast, Confirm, Avatar, Badge, PctBar, Modal
  lib/
    supabase.ts        — re-export barrel (backwards compat)
    client.ts          — typed Supabase singleton (PKCE flow) + q(), getCurrentProfile()
    auth.ts            — signIn, signOut, getSession, onAuthChange, sendPasswordReset
    tasks.ts           — task CRUD + batch upsert + deferred/assigned tasks
    recipes.ts         — recipe CRUD + getAllergens, setRecipeAllergens
    allergens.ts       — fetchAllergenSuggestions via Open Food Facts API
    templates.ts       — day-template + station-template CRUD, getDefaultDayTemplate
    reports.ts         — saveReport, sendReportEmail, getRestaurantReports,
                         getStationVelocity, get/setShiftExperiment
    push.ts            — subscribePush, sendPushNotification, getPushSubscriptionCount
    invites.ts         — createLinkInvite, createEmailInvite, getInvites
    profiles.ts        — getProfile, updateProfile, adminUpdateProfile, getRestaurantProfiles
    prep_items.ts      — prep item catalog CRUD + getPrepItemsMap
    prep_stats.ts      — getPrepStats(start, end)
    improvements.ts    — improvement-log ops
    shifts.ts          — rota shift ops
    temp_logs.ts       — temperature-log ops
    sheets.ts          — toSheetCsvUrl, fetchSheetCsv
    constants.ts       — STATIONS, SECTIONS, colors, role labels
    types.ts           — TypeScript interfaces (incl. Allergen, RecipeAllergen)
    database.types.ts  — auto-generated Supabase types

supabase/
  migrations/      — SQL migrations (stubs always committed after MCP apply)
  functions/
    send-invite/   — send invite email via Resend
    accept-invite/ — process /join/:token form submission (creates auth user)
    send-report/   — end-of-shift report email via Resend
    send-push/     — Web Push notifications, admin → staff (VAPID, web-push)
    push-sync/     — pull employees + today's schedule from Push Operations (daily pg_cron)
    push-webhook/  — receive real-time Push Operations events (--no-verify-jwt)

e2e/
  features/        — 16 Cucumber .feature files (incl. layout.feature for mobile)
  steps/           — Playwright step definitions
  support/         — world.js (viewport via E2E_VIEWPORT), login.js,
                     supabase_admin.js, mailtrap.js

.github/workflows/
  ci.yml           — orchestrator on push to staging/main → deploy → e2e → e2e-invite
  deploy.yml       — check (lint + typecheck) → build → migrate → edge functions
                     → Cloudflare Pages deploy → smoke test (main only)
  e2e.yml          — Cucumber desktop + mobile layout suites (staging only)
  e2e-invite.yml   — invite + onboarding suite (staging only)
  preview.yml      — per-PR Cloudflare preview deploy + PR comment
  terraform.yml    — plan on PR / apply on merge, for terraform/** changes
```

## CI/CD Flow

```
git push staging  →  ci.yml
  deploy.yml
    check           pnpm lint + pnpm typecheck
    build           pnpm build (env from GitHub vars/secrets, per-branch matrix)
    migrate         supabase db push
    edge functions  supabase functions deploy (send-report, send-invite, send-push,
                                               push-sync, push-webhook --no-verify-jwt)
    frontend        wrangler pages deploy dist/  → mis-kitchen-prod
    smoke test      main only — app reachable, manifest.json valid, sw.js served
  e2e.yml           cucumber desktop (1280×720) + mobile (390×844), HTML report artifact
  e2e-invite.yml    invite + onboarding suite
```

## Admin Tabs

| Tab        | Purpose                                                       |
| ---------- | ------------------------------------------------------------- |
| People     | User management — invite, role/station, activate/deactivate   |
| Prep       | Prep board — assign prep items to cooks for the day           |
| Prep Items | Prep item catalog — add/rename/set default qty/deactivate     |
| Prep Stats | Rolling prep completion stats (by person / by item)           |
| Tasks      | Day-template editor (entries → generated daily tasks)         |
| Recipes    | Recipe editor (inline edit ingredients/steps + reorder, allergens) |
| Reports    | View end-of-shift reports                                     |
| Velocity   | Station burndown heatmap (completion counts by station × day-of-week) |
| Wins       | Improvement log — admin posts wins, staff see recent wins     |
| Schedule   | Weekly rota shift grid                                        |
| Push       | Web Push sender + subscriber count                            |

## Related

- [[Database]]
- [[Infrastructure]]
- [[Invite Flow]]
- [[E2E Testing]]
