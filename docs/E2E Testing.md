# E2E Testing

## Setup

Tests run against `staging.mis-kitchen-prod.pages.dev`. Credentials in `.env.test` (gitignored).

```
TEST_URL=https://staging.mis-kitchen-prod.pages.dev
TEST_ADMIN_EMAIL=4rmcyt@gmail.com
TEST_ADMIN_PASSWORD=...
TEST_COOK_EMAIL=e2e-cook@gmail.com
TEST_COOK_PASSWORD=E2eTestPass@2026
SUPABASE_URL=https://nlvuqcvjlkgybvcpiqzn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
MAILTRAP_API_TOKEN=...
MAILTRAP_INBOX_ID=...
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=...
```

## Running

```bash
pnpm test:e2e           # desktop (1280×720) — all features
pnpm test:mobile        # mobile (390×844) — layout.feature only
pnpm test:invite        # invite flow only
pnpm test:e2e:ui        # headed mode for debugging
pnpm test:mobile:ui     # mobile headed
pnpm test:invite:ui     # invite headed
```

## Test user lifecycle

`BeforeAll`: creates e2e-cook via `supabase.auth.admin.createUser` + seeds invite record  
`AfterAll`: deletes e2e-cook + wipes e2e data (tasks, templates, invites with source='e2e')

## Features

| File | Scenarios | Profile |
|---|---|---|
| auth.feature | Admin login, Cook login, Invalid credentials | default |
| today.feature | Cook sees today, switch to tomorrow | default |
| add_task.feature | Open modal, add manual task, button visible | default |
| recipes.feature | Load, search, open detail, multiplier | default |
| lineup.feature | Grouped by station, station count | default |
| admin_templates.feature | Create, add entry, delete template | default |
| admin_recipes.feature | Admin sees recipes | default |
| velocity.feature | Velocity heatmap renders | default |
| rota.feature | Rota grid renders | default |
| improvements.feature | Improvement log | default |
| skills.feature | T-shaped skills matrix | default |
| push.feature | Push subscription (stale — audit pending #88) | default |
| report_gate.feature | Progress ring, add task button (stale — audit pending #88) | default |
| layout.feature | Bottom nav visible, station pills, header logout | mobile |
| invite_onboarding.feature | Generate link, invite by email, onboarding | invite |

## CI

- Lint runs as pre-push git hook locally
- Full E2E runs in GitHub Actions after every deploy to staging
- Both desktop and mobile profiles run in `e2e.yml`
- Invite profile runs in `e2e-invite.yml`
- HTML report uploaded as artifact (14 day retention)

## Related

- [[Architecture]]
- [[Invite Flow]]
