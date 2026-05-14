# mis. — Line Cook Kitchen App

PWA + Supabase + Cloudflare Pages. For 30 users max.

## Quick start

```bash
bash scripts/bootstrap.sh
cp .env.example .env
# fill in .env with Supabase credentials
npm run dev
```

## Deploy

See the deployment checklist in DEPLOY.md.

## Structure

```
src/
  App.jsx          # Main PWA (Today / Recipes / Templates)
  Admin.jsx        # Admin panel (People / Content / Reports / Security)
  main.jsx         # React entry point
  lib/
    supabase.js    # Supabase client + all query helpers
    push.js        # Push Operations helpers (when token available)

supabase/
  migrations/
    001_schema.sql            # Full DB schema + RLS policies
    002_push_integration.sql  # Push Operations tables (apply when ready)
  functions/
    send-report/    # Sends end-of-shift email via Resend
    push-sync/      # Daily employee + schedule sync from Push
    push-webhook/   # Real-time Push Operations events

public/
  sw.js            # Service worker (offline support)
  manifest.json    # PWA manifest

terraform/
  main.tf          # Cloudflare Pages + DNS + WAF + Supabase IaC

.github/workflows/
  deploy.yml       # CI/CD pipeline
  terraform.yml    # IaC pipeline
  monitor.yml      # Health checks every 5 min
```

## Secrets needed

| Secret | Where |
|--------|-------|
| `VITE_SUPABASE_URL` | `.env` + GitHub Var |
| `VITE_SUPABASE_ANON_KEY` | `.env` + GitHub Secret |
| `RESEND_API_KEY` | `supabase secrets set` |
| `FROM_EMAIL` | `supabase secrets set` |
| `CLOUDFLARE_API_TOKEN` | GitHub Secret |
| `SUPABASE_ACCESS_TOKEN` | GitHub Secret |

Full list in DEPLOY.md.
