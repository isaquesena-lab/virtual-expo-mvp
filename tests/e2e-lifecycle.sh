#!/usr/bin/env bash
# E2E for accounts + stand lifecycle against a local dev server (port 5173).
set -euo pipefail
B=http://127.0.0.1:5173
D1="npm exec --yes --package=pnpm@10 -- pnpm exec wrangler d1 execute virtual-expo-db --local --json"

for i in $(seq 1 25); do curl -sf -o /dev/null --max-time 2 "$B/api/stands" && break; sleep 2; done

echo "=== 1. submit booth ==="
SUB=$(curl -s -X POST "$B/api/booths" -H 'Content-Type: application/json' -d '{
  "company_name":"Lifecycle Test Co",
  "description":"A booth used to validate the accounts and lifecycle flow end to end.",
  "category":"SaaS","booth_code":"P2-001",
  "meet_url":"https://meet.google.com/abc-defg-hij",
  "owner_email":"lifecycle@example.com"}')
echo "$SUB" | head -c 220; echo
ID=$(printf '%s' "$SUB" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")

echo "=== 2. login request before any account exists (generic answer, no email sent) ==="
curl -s -X POST "$B/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"lifecycle@example.com"}'; echo

echo "=== 3. admin approves -> approved_at + expires_at set ==="
curl -s -X PATCH "$B/api/admin/booths/$ID" -H 'Content-Type: application/json' \
  -H 'x-admin-token: dev-moderator-token-change-me' -d '{"status":"approved"}' \
  | python3 -c "import json,sys; b=json.load(sys.stdin)['booth']; print('status:',b['status'],'| approved_at:',b.get('approved_at'),'| expires_at:',b.get('expires_at'))"

echo "=== 4. seed account + magic code in D1 (simulates MailChannels delivery) ==="
$D1 --command "INSERT OR IGNORE INTO accounts (id, email) VALUES ('acct-lifecycle','lifecycle@example.com')" >/dev/null
CODE=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef
HASH=$(node -e "console.log(require('crypto').createHash('sha256').update(process.argv[1]).digest('hex'))" "$CODE")
NOW=$(date +%s)
$D1 --command "INSERT OR REPLACE INTO login_codes (id, account_id, code_hash, expires_at) VALUES ('lc-e2e','acct-lifecycle','$HASH', $((NOW+900)))" >/dev/null

echo "=== 5. redeem code -> session cookie ==="
COOKIE=$(curl -s -D - -o /dev/null -X POST "$B/api/auth/session" -H 'Content-Type: application/json' -d "{\"code\":\"$CODE\"}" | tr -d '\r' | grep -i '^set-cookie:' | sed 's/^[Ss]et-[Cc]ookie: //' | cut -d';' -f1)
echo "cookie: ${COOKIE:0:26}..."

echo "=== 6. /api/auth/me claims the booth and lists it ==="
curl -s "$B/api/auth/me" -H "Cookie: $COOKIE" | python3 -c "import json,sys; d=json.load(sys.stdin); print('email:',d['email'],'| booths:',[(b['company_name'],b['status'],b['expires_at']) for b in d['booths']])"

echo "=== 7. renew via session cookie ==="
curl -s -X POST "$B/api/booths/$ID/renew" -H "Cookie: $COOKIE" | python3 -c "import json,sys; b=json.load(sys.stdin)['booth']; print('expires_at after renew:', b['expires_at'])"

echo "=== 8. force expiry -> slot freed, hidden from public list ==="
$D1 --command "UPDATE booths SET expires_at = $((NOW-10)) WHERE id = '$ID'" >/dev/null
curl -s "$B/api/stands" | python3 -c "import json,sys; t=json.load(sys.stdin)['taken']; print('P2-001 taken after reap:', 'P2-001' in t, '(expect False)')"
curl -s "$B/api/booths" | python3 -c "import json,sys; print('expired booth in public list:', any(b['company_name']=='Lifecycle Test Co' for b in json.load(sys.stdin)['booths']), '(expect False)')"

echo "=== 9. slot reusable by a new submission ==="
curl -s -X POST "$B/api/booths" -H 'Content-Type: application/json' -d '{
  "company_name":"Second Company",
  "description":"Takes the slot freed by the expired booth in the lifecycle e2e run.",
  "category":"SaaS","booth_code":"P2-001",
  "meet_url":"https://meet.google.com/xyz-abcd-efg",
  "owner_email":"second@example.com"}' | python3 -c "import json,sys; d=json.load(sys.stdin); print('re-submit same slot ->', d.get('status') or d.get('error'))"

echo "=== 10. logout clears session ==="
curl -s -X POST "$B/api/auth/logout" -H "Cookie: $COOKIE" >/dev/null
curl -s -o /dev/null -w 'me after logout: %{http_code} (expect 401)\n' "$B/api/auth/me" -H "Cookie: $COOKIE"
