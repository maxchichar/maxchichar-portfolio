#!/usr/bin/env bash
# Auth-flow Neon verification — TWO separate, clearly labeled tests:
#
#   Test A: the raw Auth.js framework endpoint (/api/auth/callback/credentials)
#           — a framework/DB-layer sanity check. Expects error=CredentialsSignin
#           on failure (Auth.js's own default), because this bypasses the
#           product's login page entirely.
#
#   Test B: the REAL product login flow — reproduces the actual no-JS
#           progressive-enhancement wire protocol of the Next.js Server
#           Action behind src/app/admin/login/page.tsx's `authenticate()`
#           function (GET the page, extract the real $ACTION_ID_* hidden
#           field Next.js renders, POST back as multipart/form-data,
#           exactly like a real form submission). Expects error=1 on
#           failure, because the login page's own catch block deliberately
#           collapses every AuthError to that generic value — this is
#           confirmed application behavior (src/app/admin/login/page.tsx),
#           not a bug, and not the same signal as Test A.
#
# Test B is the one that actually proves the product works; Test A only
# proves the framework+DB layer underneath it.
#
# Uses a DEDICATED verification account (VERIFY_ADMIN_EMAIL/PASSWORD) for
# every failing/lockout-triggering attempt, so the real ADMIN_EMAIL account
# is never subjected to a failed attempt and can never end up locked by
# running this script. ADMIN_EMAIL/PASSWORD are only ever used on the
# success path (correct credentials), which is self-healing even if
# something upstream were ever wrong.
#
# Run via: npm run verify:neon:auth
set -uo pipefail

# Load local environment for standalone verification scripts.
# Do not print or expose secret values.
if [ -f ".env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source ".env.local"
  set +a
fi

FAILED=0

# Find a free localhost port rather than assuming 3100 is available.
find_free_port() {
  local port
  for port in $(seq 3100 3199); do
    if ! ss -ltn "sport = :$port" 2>/dev/null | grep -q ":$port"; then
      echo "$port"
      return 0
    fi
  done

  echo "No free verification port available in 3100-3199." >&2
  return 1
}

# Allow an explicit verification port, otherwise use 3100.
PORT="${VERIFY_PORT:-3100}"
BASE="http://127.0.0.1:$PORT"
COOKIES=$(mktemp)
SERVER_LOG=$(mktemp)
SERVER_PID=""

pass() { echo "PASS $1"; }
fail() {
  echo "FAIL $1 — $2"
  FAILED=1
  echo "--- server log around this point (for root-cause diagnosis) ---"
  tail -n 40 "$SERVER_LOG"
  echo "--- end server log excerpt ---"
}
blocked_exit() {
  echo "BLOCKED $1"
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null
  rm -f "$COOKIES" "$SERVER_LOG"
  exit 2
}
cleanup() {
  if [ -n "$SERVER_PID" ]; then
    # Kill the entire process group created by setsid.
    kill -- "-$SERVER_PID" 2>/dev/null || true

    # Give children a moment to exit cleanly.
    sleep 1

    # Hard cleanup only if our process group somehow survived.
    kill -9 -- "-$SERVER_PID" 2>/dev/null || true
  fi

  rm -f "$COOKIES" "$SERVER_LOG"
}
trap cleanup EXIT

assert_server_alive() {
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    blocked_exit "verification server died unexpectedly — log:
$(cat "$SERVER_LOG")"
  fi
}

# Redacts cookie VALUES (session tokens etc.) while keeping names/flags/
# expiry visible — safe to print per the "no sensitive cookie contents" rule.
sanitize() {
  sed -E 's/(Set-Cookie: [A-Za-z0-9._-]+=)[^;]+/\1<REDACTED>/g'
}

# --- Required environment, checked loudly up front ---
[ -n "${DATABASE_URL:-}" ] || blocked_exit "DATABASE_URL is not set."
[ -n "${AUTH_SECRET:-}" ] || blocked_exit "AUTH_SECRET is not set."
[ -n "${ADMIN_EMAIL:-}" ] || blocked_exit "ADMIN_EMAIL is not set (success-path checks only)."
[ -n "${ADMIN_PASSWORD:-}" ] || blocked_exit "ADMIN_PASSWORD is not set (success-path checks only)."
[ -n "${VERIFY_ADMIN_EMAIL:-}" ] || blocked_exit "VERIFY_ADMIN_EMAIL is not set — a dedicated account, separate from ADMIN_EMAIL, used for every failing/lockout attempt so the real admin is never at risk."
[ -n "${VERIFY_ADMIN_PASSWORD:-}" ] || blocked_exit "VERIFY_ADMIN_PASSWORD is not set."

echo "Ensuring the dedicated verification account exists and is unlocked..."
if ! npx tsx scripts/ensure-verify-account.ts; then
  blocked_exit "could not create/reset the dedicated verification account — see output above."
fi

echo "Building production app against the configured DATABASE_URL..."
if ! npm run build > "$SERVER_LOG" 2>&1; then
  blocked_exit "production build failed — see below:\n$(cat "$SERVER_LOG")"
fi

echo "Checking port $PORT is available..."

if ss -ltn 2>/dev/null | grep -q ":$PORT "; then
  blocked_exit "port $PORT is already in use. Stop the existing server or set VERIFY_PORT to another free port."
fi

echo "Starting production server on port $PORT..."

# Start the entire npm/Next process tree in its own process group.
setsid env PORT="$PORT" npm start >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!

echo "Server process group started: $SERVER_PID"

READY=0

for _ in $(seq 1 30); do
  # If the process group died, do not send requests to whatever happens
  # to be listening on the port.
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    blocked_exit "production server process exited before becoming ready — log:
$(cat "$SERVER_LOG")"
  fi

  if curl -fsS -o /dev/null --max-time 2 "$BASE/admin/login"; then
    READY=1
    break
  fi

  sleep 1
done

if [ "$READY" -ne 1 ]; then
  blocked_exit "server did not become reachable on $BASE — log:
$(cat "$SERVER_LOG")"
fi

echo "Production server ready on $BASE"

echo ""
echo "=================================================="
echo "### Test A — raw Auth.js framework endpoint"
echo "=================================================="

get_csrf() {
  curl -s -c "$COOKIES" -b "$COOKIES" "$BASE/api/auth/csrf" | node -e \
    'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).csrfToken))'
}

rm -f "$COOKIES"
CSRF=$(get_csrf)
RESP_HEADERS=$(mktemp); RESP_BODY=$(mktemp)
STATUS=$(curl -s -b "$COOKIES" -c "$COOKIES" -D "$RESP_HEADERS" -o "$RESP_BODY" -w "%{http_code}" \
  -X POST "$BASE/api/auth/callback/credentials" \
  --data-urlencode "email=$VERIFY_ADMIN_EMAIL" \
  --data-urlencode "password=deliberately-wrong-password" \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "redirectTo=/admin")
LOC=$(grep -i "^location:" "$RESP_HEADERS" | tr -d '\r')
if [[ "$LOC" == *"error=CredentialsSignin"* ]]; then
  pass "[A] wrong password rejected (error=CredentialsSignin), no session issued"
else
  fail "[A] wrong password rejection" "status=$STATUS, location='$LOC' (expected error=CredentialsSignin) — headers+body:"
  cat "$RESP_HEADERS" | sanitize; echo "--- body ---"; cat "$RESP_BODY"
fi
rm -f "$RESP_HEADERS" "$RESP_BODY"

CSRF=$(get_csrf)
RESP_HEADERS=$(mktemp); RESP_BODY=$(mktemp)
STATUS=$(curl -s -b "$COOKIES" -c "$COOKIES" -D "$RESP_HEADERS" -o "$RESP_BODY" -w "%{http_code}" \
  -X POST "$BASE/api/auth/callback/credentials" \
  --data-urlencode "email=definitely-not-registered-$(date +%s)@example.com" \
  --data-urlencode "password=whatever" \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "redirectTo=/admin")
LOC=$(grep -i "^location:" "$RESP_HEADERS" | tr -d '\r')
if [[ "$LOC" == *"error=CredentialsSignin"* ]]; then
  pass "[A] nonexistent user rejected identically (no enumeration)"
else
  fail "[A] nonexistent user rejection" "status=$STATUS, location='$LOC' — headers+body:"
  cat "$RESP_HEADERS" | sanitize; echo "--- body ---"; cat "$RESP_BODY"
fi
rm -f "$RESP_HEADERS" "$RESP_BODY"

CSRF=$(get_csrf)
RESP_HEADERS=$(mktemp)
curl -s -b "$COOKIES" -c "$COOKIES" -D "$RESP_HEADERS" -o /dev/null \
  -X POST "$BASE/api/auth/callback/credentials" \
  --data-urlencode "email=$ADMIN_EMAIL" \
  --data-urlencode "password=$ADMIN_PASSWORD" \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "redirectTo=/admin"
if grep -q "authjs.session-token" "$COOKIES"; then
  pass "[A] correct credentials issue a session cookie (HttpOnly: $(grep -c '^#HttpOnly_.*authjs.session-token' "$COOKIES" | grep -q '^0$' && echo NO || echo yes))"
else
  fail "[A] correct credentials" "no authjs.session-token cookie — headers:"
  cat "$RESP_HEADERS" | sanitize
fi
rm -f "$RESP_HEADERS"

echo ""
echo "=================================================="
echo "### Test B — real product login flow (Server Action)"
echo "=================================================="

# Reproduces the actual no-JS form submission Next.js renders for a
# Server Action: GET the page, extract the real $ACTION_ID_* hidden field,
# POST back to the same URL as multipart/form-data with the real fields —
# exactly what a browser sends, not a reimplementation.
server_action_login() {
  local email="$1" password="$2" out_headers="$3" out_body="$4"
  local login_html action_id
  login_html=$(mktemp)
  curl -s -b "$COOKIES" -c "$COOKIES" "$BASE/admin/login" -o "$login_html"
  action_id=$(grep -o '\$ACTION_ID_[A-Za-z0-9_]*' "$login_html" | head -1)
  rm -f "$login_html"
  if [ -z "$action_id" ]; then
    echo "COULD_NOT_FIND_ACTION_ID"
    return 1
  fi
  curl -s -b "$COOKIES" -c "$COOKIES" -D "$out_headers" -o "$out_body" -w "%{http_code}" \
    -X POST "$BASE/admin/login" \
    -F "email=$email" \
    -F "password=$password" \
    -F "${action_id}="
}

rm -f "$COOKIES"
RESP_HEADERS=$(mktemp); RESP_BODY=$(mktemp)
STATUS=$(server_action_login "$VERIFY_ADMIN_EMAIL" "deliberately-wrong-password" "$RESP_HEADERS" "$RESP_BODY")
LOC=$(grep -i "^location:" "$RESP_HEADERS" | tr -d '\r')
if [[ "$LOC" == *"/admin/login?error=1"* ]]; then
  pass "[B] wrong password rejected via the real login form (error=1)"
else
  fail "[B] wrong password rejection (real form)" "status=$STATUS, location='$LOC' (expected /admin/login?error=1) — headers+body:"
  cat "$RESP_HEADERS" | sanitize; echo "--- body ---"; cat "$RESP_BODY"
fi
rm -f "$RESP_HEADERS" "$RESP_BODY"

RESP_HEADERS=$(mktemp); RESP_BODY=$(mktemp)
STATUS=$(server_action_login "definitely-not-registered-$(date +%s)@example.com" "whatever" "$RESP_HEADERS" "$RESP_BODY")
LOC=$(grep -i "^location:" "$RESP_HEADERS" | tr -d '\r')
if [[ "$LOC" == *"/admin/login?error=1"* ]]; then
  pass "[B] nonexistent user rejected identically via the real login form"
else
  fail "[B] nonexistent user rejection (real form)" "status=$STATUS, location='$LOC' — headers+body:"
  cat "$RESP_HEADERS" | sanitize; echo "--- body ---"; cat "$RESP_BODY"
fi
rm -f "$RESP_HEADERS" "$RESP_BODY"

RESP_HEADERS=$(mktemp); RESP_BODY=$(mktemp)
STATUS=$(server_action_login "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "$RESP_HEADERS" "$RESP_BODY")
LOC=$(grep -i "^location:" "$RESP_HEADERS" | tr -d '\r')
if grep -q "authjs.session-token" "$COOKIES" && [[ "$LOC" == *"/admin"* ]] && [[ "$LOC" != *"error"* ]]; then
  pass "[B] correct credentials via the real login form issue a session cookie and redirect to /admin"
else
  fail "[B] correct credentials (real form)" "status=$STATUS, location='$LOC' — headers+body:"
  cat "$RESP_HEADERS" | sanitize; echo "--- body ---"; cat "$RESP_BODY"
fi
rm -f "$RESP_HEADERS" "$RESP_BODY"

# --- Authenticated /admin, using the real Test B session ---
STATUS=$(curl -s -b "$COOKIES" -o /tmp/verify-neon-admin.html -w "%{http_code}" "$BASE/admin")
if [ "$STATUS" = "200" ] && grep -qi "$ADMIN_EMAIL" /tmp/verify-neon-admin.html; then
  pass "[B] authenticated /admin returns 200 for the real session"
else
  fail "[B] authenticated /admin" "status=$STATUS (expected 200 with the admin's email visible)"
fi
rm -f /tmp/verify-neon-admin.html

# --- Logout, via the real endpoint (works the same regardless of A/B) ---
CSRF=$(get_csrf)
curl -s -b "$COOKIES" -c "$COOKIES" -o /dev/null \
  -X POST "$BASE/api/auth/signout" \
  --data-urlencode "csrfToken=$CSRF"
POST_LOGOUT_STATUS=$(curl -s -b "$COOKIES" -o /dev/null -w "%{http_code}" "$BASE/admin")
if [ "$POST_LOGOUT_STATUS" = "307" ]; then
  pass "logout invalidates the session — /admin inaccessible again"
else
  fail "logout" "/admin returned $POST_LOGOUT_STATUS after logout (expected 307)"
fi

echo ""
echo "=================================================="
echo "### Lockout — dedicated verification account only, never the real admin"
echo "=================================================="

rm -f "$COOKIES"
for i in 1 2 3 4 5; do
  RESP_HEADERS=$(mktemp); RESP_BODY=$(mktemp)
  server_action_login "$VERIFY_ADMIN_EMAIL" "wrong-lockout-attempt-$i" "$RESP_HEADERS" "$RESP_BODY" > /dev/null
  rm -f "$RESP_HEADERS" "$RESP_BODY"
done

RESP_HEADERS=$(mktemp); RESP_BODY=$(mktemp)
STATUS=$(server_action_login "$VERIFY_ADMIN_EMAIL" "$VERIFY_ADMIN_PASSWORD" "$RESP_HEADERS" "$RESP_BODY")
LOC=$(grep -i "^location:" "$RESP_HEADERS" | tr -d '\r')
if [[ "$LOC" == *"/admin/login?error=1"* ]]; then
  pass "5 failed attempts lock the verification account; correct password still rejected while locked"
else
  fail "lockout" "expected correct password to still fail while locked, got status=$STATUS location='$LOC' — headers+body:"
  cat "$RESP_HEADERS" | sanitize; echo "--- body ---"; cat "$RESP_BODY"
fi
rm -f "$RESP_HEADERS" "$RESP_BODY"

echo ""
echo "Resetting the dedicated verification account's lockout state (cleanup)..."
npx tsx scripts/ensure-verify-account.ts > /dev/null 2>&1 || echo "WARNING: cleanup reset failed — check the verification account manually."
echo "The real ADMIN_EMAIL account was never touched by a failed attempt during this run."

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo "verify-neon-auth: PASS (all checks)"
else
  echo "verify-neon-auth: FAIL (see above)"
fi
exit $FAILED
