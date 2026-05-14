# Cloudflare API Tokens

You need two separate tokens. Both created at:
**dash.cloudflare.com → My Profile → API Tokens → Create Token → Custom Token → Get started**

---

## Token 1 — GitHub Actions (frontend deploy)

Used by: `deploy.yml` as `CLOUDFLARE_API_TOKEN`

Permissions to add:
| Category | Item | Access |
|----------|------|--------|
| Account | Cloudflare Pages | Edit |

Account Resources: your account
Zone Resources: not needed

That's it. One permission only.

---

## Token 2 — Terraform (infrastructure)

Used by: `terraform.yml` as `TF_VAR_cloudflare_api_token`

Permissions to add:
| Category | Item | Access |
|----------|------|--------|
| Account | Cloudflare Pages | Edit |
| Zone | DNS | Edit |
| Zone | Zone | Read |

Zone Resources: select your specific zone (yourdomain.com)

---

## Where to find your Account ID

dash.cloudflare.com → click your domain → right sidebar → Account ID

## Where to find your Zone ID

dash.cloudflare.com → click your domain → right sidebar → Zone ID

Both IDs are on the same Overview page.

---

## Important

New CF tokens start with `cfut_` (newer format) or nothing.
They do NOT start with `re_` — that's Resend.
