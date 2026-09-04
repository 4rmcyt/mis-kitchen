# Roadmap

## In Progress

| # | Title |
|---|---|
| #76 | Fix: Web Push notifications not delivered (FCM legacy + missing RFC 8291 encryption) |

## Backlog

| # | Title |
|---|---|
| #85 | `useAsync` hook — unify loading/error pattern across all tabs |
| #86 | Verify `supabase client.ts` is a singleton (not re-created on each import) |
| #87 | E2E: add Rota, Push, Velocity tab scenarios |
| #88 | Audit `report.feature` and `push.feature` — remove or fix stale tests |
| #89 | Offline cache: cache `getTasks` in service worker so Today screen works on bad WiFi |
| #90 | PWA: add `manifest.json` + install prompt for Home Screen install |
| #65 | Research: SaaS go-to-market strategy |
| #64 | Landing page for mis.kitchen |
| #63 | Billing: Stripe subscription for SaaS |
| #62 | Self-serve onboarding: restaurant creation by owner |
| #54 | Self-hosted Supabase on k3s for production |
| #53 | Local dev environment for running E2E tests locally |
| #49 | Clean prod DB schema (2-file, no migration history) |
| #44 | Reservations (lunch/dinner sub-entities) |
| #35 | Scale prep quantities by reservation count |
| #32 | Add MFA support (TOTP) |
| #26 | Fix seed migration (reassign profiles from existing restaurant) |
| #25 | Import recipes from PDF/photo (OCR) |
| #24 | iOS/Android native app |
| #48 | Admin Recipes: create/edit/delete |
| #23 | Separate Supabase project for staging |

## Done

| # | Title |
|---|---|
| #101 | Auto-detect allergens from recipe ingredients via Open Food Facts |
| #100 | Allergen tracking — DB schema (allergens + recipe_allergens) + admin picker + cook badges |
| #84 | Sentry: ErrorBoundary wraps app + DSN wired via env |
| #83 | Error boundary — wrap app in `<Sentry.ErrorBoundary>` |
| #82 | refactor: migrate all JS/JSX source files to TypeScript |
| #75 | ROTA schedule builder — weekly shift grid |
| #74 | T-shaped skills tracker — coverage matrix + secondary stations |
| #73 | Improvement log — admin posts wins, staff see recent wins |
| #72 | Task velocity / station burndown — heatmap by station × day |
| #71 | Shift experiment: admin posts daily hypothesis, staff see it, report outcome |
| #70 | Research: Agile/Scrum restaurant patterns → mis-kitchen features |
| #69 | Recipe editor: inline edit ingredients/steps + reorder |
| #68 | Fix: full-width desktop layout + default station filter All |
| #66 | Temperature log tab |
| #47 | Timer tab |
| #58 | Mobile layout E2E tests (viewport 390×844, layout assertions) |
| #46 | Refactor: split App.jsx, Admin.jsx, supabase.js into modules |
| #38 | Admin push notification sender |
| #22 | Push notifications end-to-end |
| #56 | End of shift report flow |
| #55 | App health monitoring (removed — no health endpoint, constant noise) |
| #52 | Load recipes from Supabase |
| #50 | Fix Node.js 20 deprecation warnings in CI |
| #51 | Fix Supabase security advisor warnings |
| #42 | E2E Sanity tests |
| #36 | Admin People page |
| #15 | Invite flow |
| #14 | Recipe screen |
