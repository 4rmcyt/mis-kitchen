# Architecture

## Stack

| Layer              | Technology                                 |
| ------------------ | ------------------------------------------ |
| Frontend           | React 19 + Vite, SPA (TypeScript)          |
| Hosting            | Cloudflare Pages                           |
| Backend            | Supabase (PostgreSQL + PostgREST + GoTrue) |
| Edge Functions     | Supabase Edge Functions (Deno)             |
| Email              | Resend                                     |
| Push Notifications | Web Push API + FCM                         |
| PWA                | Service Worker, installable iOS/Android    |
| Error Tracking     | Sentry (ErrorBoundary + DSN via env)       |
| E2E Tests          | Cucumber.js + Playwright                   |
| CI/CD              | GitHub Actions                             |

## Environments

| Environment | URL | Supabase |
|---|---|---|
| Staging | staging.mis-kitchen-prod.pages.dev | cloud `nlvuqcvjlkgybvcpiqzn` |
| Production | mis.kitchen (planned) | self-hosted k3s [[Self-hosted Supabase]] |

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
  main.tsx             — root: Sentry.ErrorBoundary + auth via useAuth() + routing
  App.tsx              — user app (5-tab bottom nav) + push subscribe
  Admin.tsx            — admin layout (8-tab sidebar)
  domain/              — pure business logic (no I/O)
    tasks.ts           — filterByStation, groupBySection, calcProgress, buildTasksFromTemplate
    invites.ts         — inviteExpiresAt, buildLinkInvitePayload, buildEmailInvitePayload
    *.test.ts          — vitest unit tests (pnpm test)
  hooks/
    useAuth.ts         — session, onboarding, password reset logic
    features/          — feature controllers
      useTodayTasks.ts — task loading, filtering, toggle/comment/delete
      usePeopleTab.ts  — users, invite, role/station management
  screens/
    TodayScreen.tsx    — tasks, progress ring, date switcher
    RecipesScreen.tsx  — recipe list + detail view
    LineupScreen.tsx   — crew grouped by station
    TempScreen.tsx     — temperature logging
    TimerScreen.tsx    — timer functionality
  components/
    AddTaskModal.tsx   — add/edit task modal
    ReportModal.tsx    — end-of-shift report modal
  admin/
    tabs/              — PeopleTab, TasksTab, RecipesTab, ReportsTab, PushTab,
                         VelocityTab, ImprovementsTab, RotaTab
    components/        — Toast, Confirm, Avatar, Badge, PctBar, Modal
  lib/
    supabase.ts        — re-export barrel (backwards compat)
    client.ts          — Supabase client singleton
    auth.ts            — signIn, signOut, getSession, onAuthChange, sendPasswordReset
    tasks.ts           — task CRUD + deferred tasks
    recipes.ts         — recipe CRUD + getAllergens, setRecipeAllergens
    allergens.ts       — fetchAllergenSuggestions via Open Food Facts API
    templates.ts       — day template CRUD
    reports.ts         — saveReport, sendReportEmail, getRestaurantReports
    push.ts            — subscribePush, sendPushNotification
    invites.ts         — createLinkInvite, createEmailInvite, getInvites
    profiles.ts        — getProfile, updateProfile, getRestaurantProfiles
    improvements.ts    — improvement log ops
    shifts.ts          — shift scheduling ops
    temp_logs.ts       — temperature log ops
    constants.ts       — STATIONS, SECTIONS, colors, role labels
    types.ts           — TypeScript interfaces (incl. Allergen, RecipeAllergen)
    database.types.ts  — auto-generated Supabase types

supabase/
  migrations/      — SQL migrations (stubs always committed after MCP apply)
  functions/
    send-invite/   — send invite email via Resend
    accept-invite/ — process /join/:token form submission
    send-report/   — daily report emails
    send-push/     — Web Push notifications (admin → staff)
    push-sync/     — push notification sync
    push-webhook/  — push delivery webhooks

e2e/
  features/        — Cucumber .feature files (incl. layout.feature for mobile)
  steps/           — Playwright step definitions
  support/         — world.js (viewport via E2E_VIEWPORT), login.js,
                     supabase_admin.js, mailtrap.js

.github/workflows/
  deploy.yml       — lint → build → Cloudflare deploy → trigger E2E
  e2e.yml          — E2E sanity + mobile layout tests (runs after deploy)
  e2e-invite.yml   — Invite flow E2E
```

## CI/CD Flow

```
git push staging
  → deploy.yml
    → pnpm lint
    → pnpm build
    → Cloudflare Pages deploy
    → supabase db push (migrations)
    → trigger e2e.yml + e2e-invite.yml
  → e2e.yml
    → cucumber-js (desktop 1280×720 + mobile 390×844)
    → upload HTML report artifact
```

## Admin Tabs

| Tab | Purpose |
|---|---|
| People | User management (invite, activate/deactivate) |
| Tasks | Day template CRUD |
| Recipes | Recipe editor (inline edit ingredients/steps + reorder) |
| Reports | View end-of-shift reports |
| Velocity | Station burndown heatmap (completion counts by station × day) |
| Wins | Improvement log — admin posts wins, staff see recent wins |
| Schedule | Weekly rota shift grid |
| Notify | Push notification sender + subscriber count |

## Related

- [[Database]]
- [[Infrastructure]]
- [[Invite Flow]]
- [[E2E Testing]]
