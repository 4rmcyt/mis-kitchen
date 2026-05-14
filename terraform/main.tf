# terraform/main.tf
#
# Infrastructure as Code for Mis Kitchen App
#
# Manages:
#   - Cloudflare Pages project + domain routing
#   - Cloudflare DNS records
#   - Cloudflare WAF rules (basic protection)
#   - Supabase projects (prod + staging)
#
# Setup:
#   cd terraform
#   terraform init
#   terraform workspace new prod
#   terraform workspace new staging
#   terraform apply -var-file=environments/prod/terraform.tfvars
#
# Required env vars:
#   export TF_VAR_cloudflare_api_token="..."
#   export TF_VAR_supabase_access_token="..."
#   Or use terraform.tfvars (gitignored)

terraform {
  required_version = ">= 1.7"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }

  # Store state in Cloudflare R2 (free, stays in your CF account)
  # Alternative: Terraform Cloud free tier
  backend "s3" {
    bucket                      = "mis-terraform-state"
    key                         = "mis/terraform.tfstate"
    region                      = "auto"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    force_path_style            = true
    # endpoint set via TF_VAR or backend config file
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
variable "cloudflare_api_token"   { sensitive = true }
variable "supabase_access_token"  { sensitive = true }
variable "cloudflare_account_id"  {}
variable "cloudflare_zone_id"     {}
variable "domain"                 { default = "yourdomain.com" }
variable "environment"            { default = "prod" }
variable "supabase_org_id"        {}
variable "supabase_db_password"   { sensitive = true }

locals {
  is_prod   = var.environment == "prod"
  subdomain = local.is_prod ? "mis" : "mis-staging"
  fqdn      = "${local.subdomain}.${var.domain}"
  project   = "mis-kitchen-${var.environment}"
}

# ── Cloudflare Pages project ──────────────────────────────────
resource "cloudflare_pages_project" "mis" {
  account_id        = var.cloudflare_account_id
  name              = local.project
  production_branch = "main"

  build_config {
    build_command   = "pnpm build"
    destination_dir = "dist"
    root_dir        = ""
  }

  deployment_configs {
    production {
      environment_variables = {
        VITE_APP_ENV = var.environment
        NODE_VERSION = "20"
      }
      # Secrets set via CF dashboard or `wrangler secret put` after apply
      
    }

    preview {
      environment_variables = {
        VITE_APP_ENV = "preview"
        NODE_VERSION = "20"
      }
    }
  }
}

# ── Cloudflare Pages domain ───────────────────────────────────
resource "cloudflare_pages_domain" "mis" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.mis.name
  domain       = local.fqdn
}

# ── DNS records ───────────────────────────────────────────────
resource "cloudflare_record" "mis_cname" {
  zone_id = var.cloudflare_zone_id
  name    = local.subdomain
  value   = cloudflare_pages_project.mis.subdomain
  type    = "CNAME"
  proxied = true   # through CF proxy — WAF + analytics enabled
}

# www redirect (prod only)
resource "cloudflare_record" "www_redirect" {
  count   = local.is_prod ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = "www"
  value   = local.fqdn
  type    = "CNAME"
  proxied = true
}

# ── Cloudflare WAF rules ──────────────────────────────────────
resource "cloudflare_ruleset" "mis_waf" {
  zone_id = var.cloudflare_zone_id
  name    = "Mis WAF Rules"
  kind    = "zone"
  phase   = "http_request_firewall_custom"

  # Block requests that aren't targeting our app paths
  rules {
    action      = "block"
    description = "Block suspicious bots"
    expression  = "(cf.client.bot) and not (cf.verified_bot_category in {\"search_engine\"})"
    enabled     = true
  }

  # Rate limit aggressive crawlers
  rules {
    action      = "managed_challenge"
    description = "Challenge high request rate IPs"
    expression  = "(http.request.uri.path contains \"/api/\" and rate(1m) > 100)"
    enabled     = true
  }
}

# ── Cloudflare caching rules for PWA ─────────────────────────
resource "cloudflare_ruleset" "mis_cache" {
  zone_id = var.cloudflare_zone_id
  name    = "Mis Cache Rules"
  kind    = "zone"
  phase   = "http_request_cache_settings"

  # Cache static assets aggressively
  rules {
    action      = "set_cache_settings"
    description = "Cache JS/CSS/fonts long-term"
    expression  = "(http.request.uri.path matches \".*\\.(js|css|woff2|png|svg)$\")"
    enabled     = true
    action_parameters {
      cache = true
      edge_ttl {
        mode    = "override_origin"
        default = 31536000  # 1 year
      }
      browser_ttl {
        mode    = "override_origin"
        default = 31536000
      }
    }
  }

  # Never cache service worker or manifest
  rules {
    action      = "set_cache_settings"
    description = "No cache for SW and manifest"
    expression  = "(http.request.uri.path in {\"/sw.js\" \"/manifest.json\"})"
    enabled     = true
    action_parameters {
      cache = false
    }
  }
}

# ── Supabase projects ─────────────────────────────────────────
resource "supabase_project" "mis" {
  organization_id   = var.supabase_org_id
  name              = local.project
  database_password = var.supabase_db_password
  region            = "us-east-1"

  lifecycle {
    # Never destroy prod DB via terraform
    prevent_destroy = true
  }
}

# ── Outputs ───────────────────────────────────────────────────
output "app_url" {
  value = "https://${local.fqdn}"
}

output "cf_pages_url" {
  value = "https://${cloudflare_pages_project.mis.subdomain}.pages.dev"
}

output "supabase_project_ref" {
  value = supabase_project.mis.id
}

output "supabase_api_url" {
  value = "https://${supabase_project.mis.id}.supabase.co"
}
