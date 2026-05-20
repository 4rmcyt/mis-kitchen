# Clean prod schema

**Decision**: Production database will use a clean 2-file schema, not the migration history from staging.

## Why

Staging has accumulated many fix/patch migrations from development. Applying them all to prod would be messy and fragile. For prod launch we want a single clean baseline.

## Plan

1. Take final staging schema (all migrations applied)
2. Dump as two files:
   - `001_schema.sql` — all tables, RLS policies, functions, triggers
   - `002_seed.sql` — initial restaurant row, default day templates
3. Apply to self-hosted Supabase on k3s

See ticket #49.
