# Mis — Deployment Guide

Prerequisites: Node.js 20+, domain on Cloudflare.

---

## Phase 1 — GitHub (~5 min)

Create repo: github.com → New repository → name `mis-kitchen` → Create.

```bash
unzip mis-kitchen.zip && cd mis-kitchen
git remote add origin https://github.com/YOUR_USERNAME/mis-kitchen.git
git push -u origin main
git checkout -b staging && git push -u origin staging
```

---

## Phase 2 — Supabase (~15 min)

**2.1 Create project**

Go to **database.new** → New project:
- Name: `mis-kitchen`
- Database password: generate a strong one, **save it**
- Region: closest to you

Wait ~2 min for provisioning.

**2.2 Get credentials**

Your **project ref** is visible in the dashboard URL:
`supabase.com/dashboard/project/YOUR_PROJECT_REF`

For Project URL and anon key — two options depending on your project age:

*New projects:* Dashboard → **Settings → API Keys** → copy:
- **Project URL** (format: `https://xxxx.supabase.co`) → `VITE_SUPABASE_URL`
- **Publishable key** → `VITE_SUPABASE_ANON_KEY`

*Older projects:* Dashboard → **Settings → API Keys → Legacy API Keys tab** → copy:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon key** → `VITE_SUPABASE_ANON_KEY`

**2.3 Run schema via CLI**

```bash
npm install -g supabase
supabase login

# The repo already contains supabase/ folder — do NOT run supabase init
# (it would conflict with existing config.toml)

supabase link --project-ref YOUR_PROJECT_REF
# CLI prompts for DB password — enter the one from step 2.1

supabase db push
# Applies supabase/migrations/*.sql to your remote database
```

**2.4 Create restaurant and superadmin**

Dashboard → **SQL Editor** → run:

```sql
INSERT INTO public.restaurants (name)
VALUES ('Your Restaurant Name')
RETURNING id;
```

Copy the `id` that comes back.

Dashboard → **Authentication → Users → Invite user** → enter your email → accept the link in your email → set password.

Back in SQL Editor:

```sql
-- Find your auth UID: Authentication → Users → click your row → copy id field
UPDATE public.profiles
SET role = 'superadmin',
    restaurant_id = 'paste-restaurant-id-here'
WHERE id = 'paste-your-auth-uid-here';
```

**2.5 Verify**

```sql
SELECT id, name, email, role FROM public.profiles;
-- Must show you with role = superadmin

SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- All 7 tables must show rowsecurity = true
```

---

## Phase 3 — Resend (~10 min)

**3.1 Create account**

Go to **resend.com** → Sign up (free).
Free plan: 3,000 emails/month, 100/day — enough for 30 cooks.

**3.2 Add domain**

Resend dashboard → **Domains** → **Add Domain**:
- Domain: `mail.yourdomain.com` (subdomain recommended to protect main domain reputation)
- Region: closest to you

**3.3 Add DNS records in Cloudflare**

Resend shows SPF + DKIM records to add.

dash.cloudflare.com → your domain → **DNS → Records** → for each record:
- **Add record** → Type: **TXT**
- Name and Content: copy exactly from Resend
- Proxy status: **DNS only (grey cloud, NOT orange)**
- Save

Back in Resend → **Verify DNS Records** → wait up to 5 min → status becomes **Verified**.

**3.4 Create API key**

Resend → **API Keys** → **Create API Key**:
- Name: `mis-kitchen-prod`
- Permission: **Sending access**
- Domain: your verified domain

**Copy immediately** — shown only once. Starts with `re_`.

**3.5 Set secrets and deploy functions**

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
supabase secrets set FROM_EMAIL=reports@mail.yourdomain.com

# send-report: called with user JWT — no --no-verify-jwt
supabase functions deploy send-report --project-ref YOUR_PROJECT_REF

# push-sync: called by cron with service role — no --no-verify-jwt
supabase functions deploy push-sync --project-ref YOUR_PROJECT_REF

# push-webhook: called by Push Operations without JWT — needs flag
supabase functions deploy push-webhook --project-ref YOUR_PROJECT_REF --no-verify-jwt
```

---

## Phase 4 — Cloudflare (~15 min)

**4.1 Create two API tokens**

Both at: dash.cloudflare.com → My Profile → **API Tokens** → **Create Token** → **Custom Token** → Get started

**Token 1** — for GitHub Actions (deploying the frontend):

| Category | Item             | Access |
| -------- | ---------------- | ------ |
| Account  | Cloudflare Pages | Edit   |

Save as `CLOUDFLARE_API_TOKEN`

**Token 2** — for Terraform (creating infrastructure):

| Category | Item             | Access |
| -------- | ---------------- | ------ |
| Account  | Cloudflare Pages | Edit   |
| Zone     | DNS              | Edit   |
| Zone     | Zone             | Read   |

Under Zone Resources: select your specific zone (yourdomain.com)

Save as `TF_VAR_cloudflare_api_token`

**4.2 Find Account ID and Zone ID**

dash.cloudflare.com → click your domain → right sidebar → copy both.

**4.3 Create R2 bucket for Terraform state**

```bash
npx wrangler login
npx wrangler r2 bucket create mis-terraform-state
```

**4.4 Get R2 API credentials**

dash.cloudflare.com → R2 Object Storage → **Manage R2 API Tokens** → **Create API Token**:
- Permissions: Object Read & Write
- Specify bucket: `mis-terraform-state`

Copy **Access Key ID** and **Secret Access Key** — shown once.

**4.5 Run Terraform**

```bash
cd terraform

cp environments/prod/terraform.tfvars.example environments/prod/terraform.tfvars
cp environments/prod/backend.hcl.example      environments/prod/backend.hcl

# Fill in terraform.tfvars — CF account ID, zone ID, domain, supabase org slug, etc.
# Fill in backend.hcl — R2 endpoint and credentials from step 4.4
# Endpoint format: https://<ACCOUNT_ID>.r2.cloudflarestorage.com

terraform init -backend-config=environments/prod/backend.hcl
terraform workspace new prod
terraform apply -var-file=environments/prod/terraform.tfvars
```

Terraform creates: Pages project, DNS CNAME, WAF rules.

---

## Phase 5 — GitHub Secrets (~10 min)

Repo → **Settings → Secrets and variables → Actions**

**Secrets:**

| Name                               | Value                                                  |
| ---------------------------------- | ------------------------------------------------------ |
| `CLOUDFLARE_API_TOKEN`             | Token 1 from Phase 4.1                                 |
| `CLOUDFLARE_ACCOUNT_ID`            | CF account ID                                          |
| `SUPABASE_ACCESS_TOKEN`            | supabase.com → Account → Access Tokens → Generate      |
| `SUPABASE_PROJECT_REF_PROD`        | Your project ref                                       |
| `SUPABASE_PROJECT_REF_STG`         | Staging project ref (create a second Supabase project) |
| `SUPABASE_DB_PASSWORD_PROD`        | Prod DB password                                       |
| `SUPABASE_DB_PASSWORD_STG`         | Staging DB password                                    |
| `VITE_SUPABASE_ANON_KEY`           | anon/publishable key from Settings → API Keys          |
| `TF_VAR_cloudflare_api_token`      | Token 2 from Phase 4.1                                 |
| `TF_VAR_supabase_access_token`     | Same as SUPABASE_ACCESS_TOKEN                          |
| `TF_VAR_cloudflare_account_id`     | CF account ID                                          |
| `TF_VAR_cloudflare_zone_id`        | CF zone ID                                             |
| `TF_VAR_supabase_org_id`           | Org slug: dashboard → Org Settings → Organization slug |
| `TF_VAR_supabase_db_password_prod` | Prod DB password                                       |
| `TF_VAR_supabase_db_password_stg`  | Staging DB password                                    |
| `R2_ACCESS_KEY_ID`                 | From Phase 4.4                                         |
| `R2_SECRET_ACCESS_KEY`             | From Phase 4.4                                         |
| `R2_ENDPOINT`                      | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`        |

**Variables** (visible in logs, not secret):

| Name                | Value                                  |
| ------------------- | -------------------------------------- |
| `VITE_SUPABASE_URL` | `https://YOUR_PROJECT_REF.supabase.co` |
| `DOMAIN`            | `yourdomain.com`                       |
| `APP_URL`           | `mis.yourdomain.com`                   |

---

## Phase 6 — First deploy (~5 min)

```bash
git push origin staging
```

GitHub Actions runs automatically: lint → build → migrate DB → deploy functions → deploy frontend.

Watch progress: github.com/YOUR_USERNAME/mis-kitchen → **Actions**

Once green → open `mis-staging.yourdomain.com` → log in → verify everything works.

```bash
git checkout main && git merge staging && git push origin main
```

App is live at `mis.yourdomain.com`.

---

## Phase 7 — Invite the team

Admin Panel → **People** → **Invite**:
- Email, role (Cook or Admin), station
- They receive a link → register → open app in **Safari** → Share → **Add to Home Screen**

---

## Troubleshooting

**`supabase: command not found`**
Run `npm install -g supabase` first.

**`supabase db push` fails saying no config found**
You may be in the wrong directory. Run from the project root (where the `supabase/` folder is).

**Build fails in GitHub Actions**
Actions tab → click the failed job → read the error message at the bottom.

**Email not arriving**
Resend dashboard → **Logs** — every send attempt is logged with exact error.

**Resend DNS not verifying**
The TXT records must have grey cloud in Cloudflare (DNS only), not orange (proxied).

**PWA not installing on iPhone**
Must use Safari. Chrome on iOS cannot install PWAs. Safari → Share → Add to Home Screen.

**Cook can't log in after invite**
Invite links expire after 48 hours — resend from Admin Panel → People.
