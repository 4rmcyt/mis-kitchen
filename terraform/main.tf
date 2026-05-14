# terraform/main.tf
#
# Infrastructure as Code for Mis Kitchen App
#
# What this manages:
#   - Cloudflare Pages project + custom domain
#   - Cloudflare DNS CNAME record
#   - Cloudflare WAF custom rules
#   - Supabase project
#
# IMPORTANT — what Terraform does NOT manage here:
#   - DB schema (use: supabase db push)
#   - Edge Functions (use: supabase functions deploy)
#   - Supabase secrets (use: supabase secrets set)
#   - Cloudflare Pages env vars with secrets (set manually in CF dashboard)
#
# Usage:
#   cd terraform
#   cp environments/prod/terraform.tfvars.example environments/prod/terraform.tfvars
#   # fill in terraform.tfvars
#   terraform init -backend-config=environments/prod/backend.hcl
#   terraform apply -var-file=environments/prod/terraform.tfvars

terraform {
  required_version = ">= 1.7"

  required_providers {
    # Cloudflare v4 — v5 was released Feb 2025 but has known drift issues.
    # Stick with v4 until v5 stabilises (target: end of Q1 2026 per CF changelog).
    # https://developers.cloudflare.com/changelog/post/2025-02-03-terraform-v5-provider/
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }

  # Terraform state stored in Cloudflare R2.
  # endpoint, access_key, secret_key passed via -backend-config flag (not here)
  # to avoid committing credentials.
  backend "s3" {
    bucket                      = "mis-terraform-state"
    key                         = "mis/terraform.tfstate"
    region                      = "auto"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    force_path_style            = true
  }
}

# ── Providers ─────────────────────────────────────────────────
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "supabase" {
  access_token = var.supabase_access_token
}

# ── Variables ─────────────────────────────────────────────────
variable "cloudflare_api_token"  { sensitive = true }
variable "supabase_access_token" { sensitive = true }
variable "cloudflare_account_id" {}
variable "cloudflare_zone_id"    {}
variable "domain"                { default = "yourdomain.com" }
variable "environment"           { default = "prod" }
variable "supabase_org_id"       {}
variable "supabase_db_password"  { sensitive = true }

locals {
  is_prod   = var.environment == "prod"
  subdomain = local.is_prod ? "mis" : "mis-staging"
  fqdn      = "${local.subdomain}.${var.domain}"
  project   = "mis-kitchen-${var.environment}"
}

# ── Cloudflare Pages project ──────────────────────────────────
# Docs: https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/pages_project
resource "cloudflare_pages_project" "mis" {
  account_id        = var.cloudflare_account_id
  name              = local.project
  production_branch = "main"

  build_config {
    build_command   = "npm run build"
    destination_dir = "dist"
    root_dir        = "/"
  }

  deployment_configs {
    production {
      environment_variables = {
        VITE_APP_ENV = var.environment
        NODE_VERSION = "20"
      }
      # NOTE: Secret env vars (VITE_SUPABASE_ANON_KEY etc.) must be set
      # in the CF dashboard manually or via wrangler — Terraform stores
      # them in state in plaintext, which is a security risk.
    }

    preview {
      environment_variables = {
        VITE_APP_ENV = "preview"
        NODE_VERSION = "20"
      }
    }
  }
}

# ── Cloudflare Pages custom domain ────────────────────────────
resource "cloudflare_pages_domain" "mis" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.mis.name
  domain       = local.fqdn
}

# ── DNS CNAME record ──────────────────────────────────────────
# v4 cloudflare_record uses `value`, not `content` (that's v5)
resource "cloudflare_record" "mis_cname" {
  zone_id = var.cloudflare_zone_id
  name    = local.subdomain
  value   = "${local.project}.pages.dev"
  type    = "CNAME"
  proxied = true
}

# www → mis.yourdomain.com redirect (prod only)
resource "cloudflare_record" "www_redirect" {
  count   = local.is_prod ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = "www"
  value   = local.fqdn
  type    = "CNAME"
  proxied = true
}

# ── WAF custom rules ──────────────────────────────────────────
# Docs: https://developers.cloudflare.com/terraform/additional-configurations/waf-custom-rules/
# IMPORTANT: Terraform assumes full control of zone rulesets.
# If you already have rules in your zone, import them first with cf-terraforming
# or they will be deleted on apply.
#
# NOTE: rate() is NOT a valid Wirefilter field — rate limiting rules
# use a separate cloudflare_ruleset with phase = "http_ratelimit".
# Removed the fake rate() expression below.
resource "cloudflare_ruleset" "mis_waf" {
  zone_id = var.cloudflare_zone_id
  name    = "Mis WAF Rules"
  kind    = "zone"
  phase   = "http_request_firewall_custom"

  rules {
    action      = "block"
    description = "Block bad bots"
    # cf.client.bot is true for known bots, cf.verified_bot_category for verified ones
    expression  = "(cf.client.bot and not cf.verified_bot_category in {\"search_engine\" \"monitoring\" \"feed_fetcher\"})"
    enabled     = true
  }
}

# ── Rate limiting (separate ruleset + phase) ──────────────────
# Rate limiting is a different phase from WAF custom rules.
# Free/Pro plans: basic rate limiting available in dashboard only.
# To manage via Terraform requires Business or Enterprise plan.
# Uncomment if you have a paid plan:
#
# resource "cloudflare_ruleset" "mis_ratelimit" {
#   zone_id = var.cloudflare_zone_id
#   name    = "Mis Rate Limiting"
#   kind    = "zone"
#   phase   = "http_ratelimit"
#   rules {
#     action      = "managed_challenge"
#     description = "Challenge high-frequency IPs"
#     expression  = "(http.request.uri.path contains \"/api/\")"
#     enabled     = true
#     ratelimit {
#       characteristics     = ["ip.src"]
#       period              = 60
#       requests_per_period = 100
#       mitigation_timeout  = 60
#     }
#   }
# }

# ── Cloudflare cache rules ────────────────────────────────────
resource "cloudflare_ruleset" "mis_cache" {
  zone_id = var.cloudflare_zone_id
  name    = "Mis Cache Rules"
  kind    = "zone"
  phase   = "http_request_cache_settings"

  rules {
    action      = "set_cache_settings"
    description = "Cache static assets long-term (1 year)"
    expression  = "(http.request.uri.path matches \"\\.(js|css|woff2|png|svg)$\")"
    enabled     = true
    action_parameters {
      cache = true
      edge_ttl {
        mode    = "override_origin"
        default = 31536000
      }
      browser_ttl {
        mode    = "override_origin"
        default = 31536000
      }
    }
  }

  rules {
    action      = "set_cache_settings"
    description = "Never cache service worker or manifest"
    expression  = "(http.request.uri.path eq \"/sw.js\" or http.request.uri.path eq \"/manifest.json\")"
    enabled     = true
    action_parameters {
      cache = false
    }
  }
}

# ── Supabase project ──────────────────────────────────────────
# Docs: https://github.com/supabase/terraform-provider-supabase/blob/main/docs/tutorial.md
# NOTE: organization_id is the org SLUG, not a UUID.
# Find it: dashboard.supabase.com → org settings → Organization slug
resource "supabase_project" "mis" {
  organization_id   = var.supabase_org_id  # org slug e.g. "my-company"
  name              = local.project
  database_password = var.supabase_db_password
  region            = "us-east-1"

  lifecycle {
    prevent_destroy = true  # never destroy prod DB via terraform
    # Ignore password changes after creation — changing it via TF
    # doesn't rotate the actual DB password, do it in dashboard instead.
    ignore_changes = [database_password]
  }
}

# ── Outputs ───────────────────────────────────────────────────
output "app_url" {
  value = "https://${local.fqdn}"
}

output "pages_dev_url" {
  value = "https://${local.project}.pages.dev"
}

output "supabase_project_ref" {
  value = supabase_project.mis.id
}

output "supabase_api_url" {
  value = "https://${supabase_project.mis.id}.supabase.co"
}
