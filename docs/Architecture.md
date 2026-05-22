# Architecture

## Stack

| Layer              | Technology                                 |
| ------------------ | ------------------------------------------ |
| Frontend           | React 18 + Vite, SPA                       |
| Hosting            | Cloudflare Pages                           |
| Backend            | Supabase (PostgreSQL + PostgREST + GoTrue) |
| Edge Functions     | Supabase Edge Functions (Deno)             |
| Email              | Resend                                     |
| Push Notifications | Web Push API + FCM                         |
| PWA                | Service Worker, installable iOS/Android    |
| E2E Tests          | Cucumber.js + Playwright                   |
| CI/CD              | GitHub Actions                             |

## Environments

| Environment | URL | Supabase |
|---|---|---|
| Staging | staging.mis-kitchen-prod.pages.dev | cloud `nlvuqcvjlkgybvcpiqzn` |
| Production | mis.kitchen (planned) | self-hosted k3s [[Self-hosted Supabase]] |

## Key Files

```
src/
  main.jsx             — root: auth via useAuth(), routing
  App.jsx              — user app tab routing + push subscribe
  Admin.jsx            — admin layout + tab routing
  hooks/
    useAuth.js         — session, onboarding, password reset logic
  screens/
    TodayScreen.jsx    — tasks, progress ring, date switcher
    RecipesScreen.jsx  — recipe list + detail view
    LineupScreen.jsx   — crew grouped by station
  components/
    AddTaskModal.jsx   — add task modal
    ReportModal.jsx    — end-of-shift report modal
  admin/
    tabs/              — PeopleTab, TasksTab, RecipesTab, ReportsTab, PushTab
    components/        — Toast, Confirm, Avatar, Badge, PctBar, Modal
  lib/
    supabase.js        — re-export barrel (backwards compat)
    client.js          — Supabase client instance
    auth.js            — signIn, signOut, getSession, onAuthChange
    tasks.js           — task CRUD + deferred tasks
    recipes.js         — recipe CRUD
    templates.js       — day template CRUD
    reports.js         — saveReport, sendReportEmail, getRestaurantReports
    push.js            — subscribePush, sendPushNotification
    invites.js         — createInvite, getInvites
    profiles.js        — getProfile, updateProfile, getRestaurantProfiles
    constants.js       — STATIONS, SECTIONS, colors, role labels

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
  support/         — world.js (viewport via E2E_VIEWPORT=mobile), login.js, supabase_admin.js, mailtrap.js

.github/workflows/
  deploy.yml       — lint → build → Cloudflare deploy → trigger E2E
  e2e.yml          — E2E Sanity + mobile layout tests (runs after deploy)
  e2e-invite.yml   — Invite flow E2E
  monitor.yml      — health check every 5min, alerts via Telegram + Resend email
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
    → cucumber-js (24 scenarios)
    → upload HTML report artifact
```

## Related

- [[Database]]
- [[Invite Flow]]
- [[E2E Testing]]
