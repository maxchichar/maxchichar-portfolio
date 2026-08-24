#!/usr/bin/env bash
# Full deterministic Neon verification, run in the order specified in the
# Phase 2 Neon verification procedure: Database -> Seed -> Authentication ->
# Application. Run via: npm run verify:neon
#
# Requires DATABASE_URL, AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD,
# VERIFY_ADMIN_EMAIL, VERIFY_ADMIN_PASSWORD already set in the environment
# (e.g. via `.env.local`, loaded with `--env-file=.env.local`, or exported
# directly). Fails loudly and exits without running anything else if
# DATABASE_URL is missing — never falls back to a local database, never
# swaps drivers, never mocks Neon.
set -uo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "BLOCKED DATABASE_URL is not set. See .env.example — this script will not"
  echo "        substitute a local database or any other fallback."
  exit 2
fi
if [ -z "${VERIFY_ADMIN_EMAIL:-}" ] || [ -z "${VERIFY_ADMIN_PASSWORD:-}" ]; then
  echo "BLOCKED VERIFY_ADMIN_EMAIL/VERIFY_ADMIN_PASSWORD are not set. These are a"
  echo "        separate account from ADMIN_EMAIL, used only for failing/lockout"
  echo "        checks, so the real admin is never put at risk. See .env.example."
  exit 2
fi

echo "=================================================="
echo "### Database"
echo "=================================================="
npx tsx scripts/verify-neon-db.ts
DB_STATUS=$?
if [ $DB_STATUS -ne 0 ]; then
  echo ""
  echo "Database checks did not fully pass (exit $DB_STATUS) — stopping here."
  echo "Seed and Authentication checks are meaningless against a database"
  echo "that isn't confirmed correct, so they were not attempted."
  exit $DB_STATUS
fi

echo ""
echo "=================================================="
echo "### Seed"
echo "=================================================="
SEED_OUT_1=$(npm run seed:admin 2>&1)
echo "$SEED_OUT_1"
if echo "$SEED_OUT_1" | grep -q "Admin user created"; then
  echo "PASS admin seed creates the admin user"
elif echo "$SEED_OUT_1" | grep -q "already exists"; then
  echo "PASS admin seed is idempotent (admin already existed from a prior run)"
else
  echo "FAIL admin seed — unexpected output, see above"
fi

SEED_OUT_2=$(npm run seed:admin 2>&1)
echo "$SEED_OUT_2"
if echo "$SEED_OUT_2" | grep -q "already exists"; then
  echo "PASS second seed run is idempotent — no duplicate created"
else
  echo "FAIL second seed run — expected 'already exists', got different output above"
fi

echo ""
echo "=================================================="
echo "### Authentication"
echo "=================================================="
bash scripts/verify-neon-auth.sh
AUTH_STATUS=$?

echo ""
echo "=================================================="
echo "### Application verification"
echo "=================================================="
npm run typecheck && echo "PASS typecheck" || echo "FAIL typecheck"
npm run lint && echo "PASS lint" || echo "FAIL lint"
npm run format:check && echo "PASS format:check" || echo "FAIL format:check"
npm run build > /dev/null 2>&1 && echo "PASS build" || echo "FAIL build"

exit $AUTH_STATUS
