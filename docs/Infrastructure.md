# Infrastructure

## Overview

| Component | Tool | State |
|---|---|---|
| Cloudflare Pages project + DNS | Terraform | `terraform/main.tf` |
| GitHub Actions secrets | Manual (one-time) | GitHub repo settings |
| Supabase DB schema | Supabase CLI | `supabase/migrations/` |
| Supabase Edge Functions | Supabase CLI | `supabase/functions/` |
| Supabase secrets | Supabase CLI | `supabase secrets set` |

## Terraform

Manages: Cloudflare Pages project, custom domain, DNS CNAME.  
Does **not** manage: secrets, DB schema, edge functions (security risk — TF state is plaintext).

State backend: Cloudflare R2 bucket `mis-terraform-state`.

```bash
cd terraform
cp environments/prod/terraform.tfvars.example environments/prod/terraform.tfvars
cp environments/prod/backend.hcl.example environments/prod/backend.hcl
# fill in both files
terraform init -backend-config=environments/prod/backend.hcl
terraform apply -var-file=environments/prod/terraform.tfvars
```

## GitHub Secrets & Variables

Set at: **GitHub → repo → Settings → Secrets and variables → Actions**

### Secrets

| Secret | Description | Where to get |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | CF token: Pages:Edit + DNS:Edit + Zone:Read | dash.cloudflare.com → My Profile → API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | CF account ID | dash.cloudflare.com → top right |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Supabase dashboard → Project → API |
| `VITE_VAPID_PUBLIC_KEY` | VAPID public key for Web Push | from `.env` / VAPID key pair |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI token | supabase.com → Account → Access Tokens |
| `SUPABASE_PROJECT_REF_STG` | Staging project ref | Supabase dashboard → project settings |
| `SUPABASE_PROJECT_REF_PROD` | Production project ref | Supabase dashboard → project settings |
| `SUPABASE_DB_PASSWORD_STG` | Staging DB password | set when project was created |
| `SUPABASE_DB_PASSWORD_PROD` | Production DB password | set when project was created |
| `SUPABASE_URL` | Supabase URL (for E2E) | `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (for E2E) | Supabase dashboard → Project → API |
| `TEST_ADMIN_EMAIL` | Admin test account email | staging Supabase auth |
| `TEST_ADMIN_PASSWORD` | Admin test account password | staging Supabase auth |
| `TEST_COOK_EMAIL` | Cook test account email | created dynamically in E2E |
| `TEST_COOK_PASSWORD` | Cook test account password | created dynamically in E2E |
| `MAILTRAP_API_TOKEN` | Mailtrap API token (invite E2E) | mailtrap.io → API |
| `MAILTRAP_INBOX_ID` | Mailtrap inbox ID (invite E2E) | mailtrap.io → inbox settings |
| `RESEND_API_KEY` | Resend API key (monitor alerts) | resend.com → API Keys |
| `ALERT_EMAIL` | Email address for monitor alerts | any email |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token (monitor alerts) | @BotFather |
| `TELEGRAM_CHAT_ID` | Telegram chat ID (monitor alerts) | @userinfobot |

### Variables (non-secret)

| Variable | Value | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://nlvuqcvjlkgybvcpiqzn.supabase.co` | Staging Supabase URL |
| `STAGING_URL` | `staging.mis-kitchen-prod.pages.dev` | Staging app URL for E2E |
| `APP_URL` | `mis.labhome.work` | Production app URL for smoke test |

## Supabase Secrets (Edge Functions)

Set via Supabase CLI:

```bash
supabase secrets set RESEND_API_KEY=... --project-ref nlvuqcvjlkgybvcpiqzn
supabase secrets set FROM_EMAIL=noreply@mail.labhome.work --project-ref nlvuqcvjlkgybvcpiqzn
supabase secrets set VAPID_PRIVATE_KEY=... --project-ref nlvuqcvjlkgybvcpiqzn
supabase secrets set VAPID_PUBLIC_KEY=... --project-ref nlvuqcvjlkgybvcpiqzn
```

**Resend verified domain:** `mail.labhome.work` — FROM address must use this domain (e.g. `noreply@mail.labhome.work`). Emails from any other domain will be silently dropped.

## Environments

| | Staging | Production |
|---|---|---|
| URL | `staging.mis-kitchen-prod.pages.dev` | `mis.labhome.work` (planned) |
| Branch | `staging` | `main` |
| Supabase | `nlvuqcvjlkgybvcpiqzn` (cloud) | self-hosted k3s (ticket #54) |
| Terraform env | `environments/staging/` | `environments/prod/` |

## Related

- [[Architecture]]
- [[Database]]
