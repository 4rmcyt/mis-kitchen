#!/usr/bin/env bash
# scripts/bootstrap.sh
#
# Initial developer environment setup.
# Run once after cloning the repo.
#
# Usage: bash scripts/bootstrap.sh

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}▶${NC} $1"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $1"; }
error()   { echo -e "${RED}✗${NC} $1"; exit 1; }
success() { echo -e "${GREEN}✓${NC} $1"; }

echo ""
echo "  mis. — Kitchen App Bootstrap"
echo "  ────────────────────────────"
echo ""

# ── Check required tools ──────────────────────────────────────
info "Checking required tools..."

check_tool() {
  if command -v "$1" &>/dev/null; then
    success "$1 $(command $1 --version 2>/dev/null | head -1 || echo 'found')"
  else
    warn "$1 not found — installing..."
    return 1
  fi
}

check_tool node    || error "Install Node.js 20+ from nodejs.org"
check_tool pnpm    || npm install -g pnpm
check_tool git     || error "Install git"
check_tool terraform || warn "Terraform not found — install from terraform.io if you need IaC"

# Check supabase CLI
if ! command -v supabase &>/dev/null; then
  warn "Supabase CLI not found — installing..."
  npm install -g supabase
fi
success "supabase CLI $(supabase --version)"

# Check wrangler (Cloudflare)
if ! command -v wrangler &>/dev/null; then
  warn "Wrangler not found — installing..."
  npm install -g wrangler
fi
success "wrangler $(wrangler --version 2>/dev/null | head -1)"

# ── Install dependencies ──────────────────────────────────────
info "Installing dependencies..."
pnpm install
success "Dependencies installed"

# ── Copy env files ────────────────────────────────────────────
info "Setting up environment files..."

if [ ! -f .env ]; then
  cp .env.example .env
  warn "Created .env from .env.example — fill in your values!"
else
  success ".env already exists"
fi

if [ ! -f terraform/environments/prod/terraform.tfvars ]; then
  cp terraform/environments/prod/terraform.tfvars.example \
     terraform/environments/prod/terraform.tfvars
  warn "Created terraform/environments/prod/terraform.tfvars — fill in your values!"
fi

if [ ! -f terraform/environments/staging/terraform.tfvars ]; then
  cp terraform/environments/staging/terraform.tfvars.example \
     terraform/environments/staging/terraform.tfvars
  warn "Created terraform/environments/staging/terraform.tfvars — fill in your values!"
fi

# ── Git hooks ─────────────────────────────────────────────────
info "Installing git hooks..."

# Pre-commit: lint check before commit
cat > .git/hooks/pre-commit << 'HOOK'
#!/bin/sh
echo "Running pre-commit checks..."
pnpm lint --max-warnings=0 || exit 1
echo "✓ Lint passed"
HOOK
chmod +x .git/hooks/pre-commit

# Commit message format check
cat > .git/hooks/commit-msg << 'HOOK'
#!/bin/sh
# Enforce conventional commits: feat/fix/chore/docs/refactor/ci
PATTERN="^(feat|fix|chore|docs|refactor|ci|perf|test)(\(.+\))?: .{1,72}$"
if ! echo "$1" | grep -qE "$PATTERN"; then
  echo "❌ Commit message must follow conventional commits format:"
  echo "   feat: add timer notifications"
  echo "   fix: recipe multiplier calculation"
  echo "   chore: update dependencies"
  exit 1
fi
HOOK
chmod +x .git/hooks/commit-msg

success "Git hooks installed"

# ── Summary ───────────────────────────────────────────────────
echo ""
echo "  ────────────────────────────────────────"
echo "  Setup complete! Next steps:"
echo ""
echo "  1. Fill in .env with your Supabase keys"
echo "  2. Run: pnpm dev"
echo "  3. For Terraform: cd terraform && terraform init"
echo "  4. For Supabase: supabase login && supabase link"
echo "  ────────────────────────────────────────"
echo ""
