# Deployment Guide

## Prerequisites

- Node.js 20+
- Supabase CLI: `npm i -g supabase`
- Wrangler (Cloudflare): `npm i -g wrangler`
- Terraform 1.7+

## Phase 1 — Supabase (~15 min)

```bash
# 1. Create project at supabase.com → mis-kitchen (database.new)
# 2. Login and link CLI
supabase login
supabase link --project-ref xxxxxxxxxxxx
# CLI will prompt for DB password — enter it once, it's saved locally

# 3. Run schema — no --password flag, use env var in CI
supabase db push
# In CI: SUPABASE_DB_PASSWORD=... supabase db push --project-ref xxx

# 4. Seed in SQL Editor:
# INSERT INTO public.restaurants (name) VALUES ('Your Restaurant') RETURNING id;
# Auth → Invite yourself → UPDATE profiles SET role='superadmin', restaurant_id='...' WHERE id='...';
```

## Phase 2 — Secrets & Edge Functions (~10 min)

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
supabase secrets set FROM_EMAIL=reports@yourdomain.com

# send-report: needs JWT (called by logged-in user) — no flag
supabase functions deploy send-report --project-ref xxxxxxxxxxxx

# push-sync: called by cron with service role — no flag
supabase functions deploy push-sync --project-ref xxxxxxxxxxxx

# push-webhook: called by Push Operations without JWT — needs --no-verify-jwt
supabase functions deploy push-webhook --project-ref xxxxxxxxxxxx --no-verify-jwt
```

## Phase 3 — Cloudflare via Terraform (~15 min)

```bash
# Create R2 bucket for Terraform state
wrangler r2 bucket create mis-terraform-state

cd terraform
cp environments/prod/terraform.tfvars.example environments/prod/terraform.tfvars
# Fill in terraform.tfvars

terraform init -backend-config=environments/prod/backend.hcl \
  -backend-config="endpoint=https://<ACCOUNT_ID>.r2.cloudflarestorage.com" \
  -backend-config="access_key=<R2_KEY>" \
  -backend-config="secret_key=<R2_SECRET>"

terraform workspace new prod
terraform apply -var-file=environments/prod/terraform.tfvars
```

## Phase 4 — GitHub Secrets

Add in repo Settings → Secrets and variables → Actions:

```
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_REF_PROD
SUPABASE_DB_PASSWORD_PROD
VITE_SUPABASE_ANON_KEY
```

GitHub Variables (not secrets):
```
VITE_SUPABASE_URL
DOMAIN             → yourdomain.com
APP_URL            → mis.yourdomain.com
```

## Phase 5 — First deploy

```bash
git push origin staging
# GitHub Actions: build → migrate → deploy functions → deploy frontend
# Check: mis-staging.yourdomain.com

git checkout main && git merge staging && git push origin main
# Smoke test runs automatically
# Live: mis.yourdomain.com
```

## Invite first cook

Admin Panel → People → Invite → enter email → Send.
They get a link → register → install PWA from browser.
