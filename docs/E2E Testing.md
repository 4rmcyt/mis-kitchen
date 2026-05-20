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
pnpm test:e2e          # sanity (24 scenarios)
pnpm test:invite       # invite flow (3 scenarios)
pnpm test:e2e:ui       # headed mode for debugging
```

## Test user lifecycle

`BeforeAll`: creates e2e-cook via `supabase.auth.admin.createUser` + seeds invite record  
`AfterAll`: deletes e2e-cook + wipes e2e data (tasks, templates, invites with source='e2e')

## Features

| File | Scenarios |
|---|---|
| auth.feature | Admin login, Cook login, Invalid credentials |
| today.feature | Cook sees today, switch to tomorrow |
| add_task.feature | Open modal, add manual task, button visible |
| recipes.feature | Load, search, open detail, multiplier |
| lineup.feature | Grouped by station, station count |
| report_gate.feature | Progress ring, add task button |
| admin_templates.feature | Create, add entry, delete template |
| admin_recipes.feature | Admin sees recipes |
| invite_onboarding.feature | Generate link, invite by email, onboarding |

## CI

- Lint runs as pre-push git hook locally
- Full E2E runs in GitHub Actions after every deploy to staging
- HTML report uploaded as artifact (14 day retention)

## Related

- [[Architecture]]
- [[Invite Flow]]
