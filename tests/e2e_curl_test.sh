#!/bin/bash
# ══════════════════════════════════════════════
# Crom Cloud — Teste E2E Completo (Terminal)
# Idempotente: usa email/timestamp único por run
# ══════════════════════════════════════════════
BASE="http://localhost:8080"
OK=0
FAIL=0
RUN_ID=$(date +%s)
EMAIL="e2e-${RUN_ID}@test.dev"

test_endpoint() {
  local desc="$1" expected="$2" actual="$3"
  if echo "$actual" | grep -q "$expected"; then
    echo "✅ $desc"
    OK=$((OK + 1))
  else
    echo "❌ $desc — esperado '$expected'"
    echo "   → got: $(echo "$actual" | head -c 200)"
    FAIL=$((FAIL + 1))
  fi
}

echo "══════════════════════════════════════"
echo "  CROM CLOUD — TESTE E2E COMPLETO"
echo "  Run ID: $RUN_ID"
echo "══════════════════════════════════════"
echo ""

# --- Rotas de sistema (públicas) ---

R=$(curl -s $BASE/v1/system/health)
test_endpoint "1.  Health check" '"status":"ok"' "$R"

R=$(curl -s $BASE/v1/system/plugins)
test_endpoint "2.  Lista plugins (echo)" '"slug":"echo"' "$R"

R=$(curl -s $BASE/v1/system/health/plugins)
test_endpoint "3.  Health plugins" '"success":true' "$R"

# --- Auth ---

R=$(curl -s -X POST $BASE/v1/account/register -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"name\":\"E2E $RUN_ID\",\"password\":\"pass123456\"}")
test_endpoint "4.  Register dev" '"success":true' "$R"

R=$(curl -s -X POST $BASE/v1/account/login -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"pass123456\"}")
TOKEN=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)
test_endpoint "5.  Login (JWT)" 'token' "$R"

R=$(curl -s $BASE/v1/account/me -H "Authorization: Bearer $TOKEN")
test_endpoint "6.  GET /me" "\"email\":\"$EMAIL\"" "$R"

# --- Billing ---

R=$(curl -s -X POST $BASE/v1/account/credits -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"amount":500,"type":"purchase","description":"E2E"}')
test_endpoint "7.  Add 500 créditos" '"balance":500' "$R"

R=$(curl -s $BASE/v1/account/balance -H "Authorization: Bearer $TOKEN")
test_endpoint "8.  Balance = 500" '"balance":500' "$R"

# --- API Keys ---

R=$(curl -s -X POST $BASE/v1/account/keys -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"E2E Key","permissions":[{"plugin_slug":"echo","scope":"write"}]}')
API_KEY=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['key'])" 2>/dev/null)
test_endpoint "9.  Create API Key" 'crom_sk_live_' "$R"

R=$(curl -s $BASE/v1/account/keys -H "Authorization: Bearer $TOKEN")
test_endpoint "10. List keys" '"E2E Key"' "$R"

# --- Plugin via API Key ---

R=$(curl -s $BASE/v1/echo/ping -H "Authorization: Bearer $API_KEY")
test_endpoint "11. Echo/ping → pong" '"message":"pong"' "$R"

R=$(curl -s -X POST $BASE/v1/echo/reflect -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" -d '{"test":"e2e"}')
test_endpoint "12. Echo/reflect" '"test":"e2e"' "$R"

R=$(curl -s $BASE/v1/echo/ping)
test_endpoint "13. Sem key → 401" '"UNAUTHORIZED"' "$R"

# --- Secrets ---

R=$(curl -s -X POST $BASE/v1/account/secrets -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plugin_slug":"echo","secret_name":"e2e_secret","value":"valor-secreto"}')
test_endpoint "14. Set secret" 'armazenado' "$R"

R=$(curl -s $BASE/v1/account/secrets -H "Authorization: Bearer $TOKEN")
test_endpoint "15. List secrets" '"e2e_secret"' "$R"

R=$(curl -s -X DELETE $BASE/v1/account/secrets/echo/e2e_secret -H "Authorization: Bearer $TOKEN")
test_endpoint "16. Delete secret" 'removido' "$R"

# --- Usage ---

R=$(curl -s "$BASE/v1/account/credits/history?limit=10" -H "Authorization: Bearer $TOKEN")
test_endpoint "17. Credits history" '"transactions"' "$R"

R=$(curl -s "$BASE/v1/account/usage?limit=10" -H "Authorization: Bearer $TOKEN")
test_endpoint "18. Usage logs" '"logs"' "$R"

R=$(curl -s "$BASE/v1/account/usage/summary?from=2026-01-01&to=2026-12-31" -H "Authorization: Bearer $TOKEN")
test_endpoint "19. Usage summary" '"by_plugin"' "$R"

# --- Revoke ---

KEY_ID=$(curl -s $BASE/v1/account/keys -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; keys=json.load(sys.stdin)['data']; print(keys[0]['id'] if keys else '')" 2>/dev/null)
R=$(curl -s -X DELETE "$BASE/v1/account/keys/$KEY_ID" -H "Authorization: Bearer $TOKEN")
test_endpoint "20. Revoke key" 'revogada' "$R"

R=$(curl -s $BASE/v1/echo/ping -H "Authorization: Bearer $API_KEY")
test_endpoint "21. Revoked key → falha" 'false' "$R"

# --- Frontend SPA ---

R=$(curl -s -o /dev/null -w "%{http_code}" $BASE/)
test_endpoint "22. Dashboard HTML (200)" '200' "$R"

R=$(curl -s -o /dev/null -w "%{content_type}" $BASE/static/style.css)
test_endpoint "23. CSS Content-Type" 'text/css' "$R"

R=$(curl -s -o /dev/null -w "%{http_code}" $BASE/dashboard)
test_endpoint "24. SPA fallback /dashboard" '200' "$R"

R=$(curl -s -o /dev/null -w "%{content_type}" $BASE/static/router.js)
test_endpoint "25. JS Content-Type" 'javascript' "$R"

echo ""
echo "══════════════════════════════════════"
echo "  RESULTADO: $OK passed / $FAIL failed"
echo "  Total: $((OK + FAIL)) testes"
echo "══════════════════════════════════════"

exit $FAIL
