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
    skip_requesting_account_id  = true
    force_path_style            = true
    endpoints = {
      s3 = "https://8239dd1bb0d0bfedf13673a195df59cf.r2.cloudflarestorage.com"
    }
  }
}

# ── Providers ─────────────────────────────────────────────────
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# ── Variables ─────────────────────────────────────────────────
variable "cloudflare_api_token"  { sensitive = true }
variable "cloudflare_account_id" {}
variable "cloudflare_zone_id"    {}
variable "domain"                { default = "labhome.work" }
variable "environment"           { default = "prod" }

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

# WAF and cache rulesets require Zone Rulesets Edit permission.
# Configure manually in Cloudflare dashboard if needed.

# ── Outputs ───────────────────────────────────────────────────
output "app_url" {
  value = "https://${local.fqdn}"
}

output "pages_dev_url" {
  value = "https://${local.project}.pages.dev"
}
