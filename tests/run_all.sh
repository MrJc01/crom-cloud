#!/bin/bash
# ============================================================
#  CROM CLOUD — SUITE DE TESTES COMPLETA (Terminal)
# ============================================================

BASE="http://localhost:8080"
PASS=0
FAIL=0

test_result() {
  local name="$1" expected="$2" actual="$3"
  if echo "$actual" | grep -q "$expected"; then
    echo "  ✅ $name"
    PASS=$((PASS+1))
  else
    echo "  ❌ $name (esperado: $expected)"
    echo "     Recebido: $(echo "$actual" | head -3)"
    FAIL=$((FAIL+1))
  fi
}

echo "╔══════════════════════════════════════════════╗"
echo "║   CROM CLOUD — SUITE DE TESTES COMPLETA     ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── BLOCO 1: Frontend ──
echo "── Frontend ──"
R=$(curl -s -o /dev/null -w "%{http_code}" $BASE/)
test_result "T01: Landing Page HTML" "200" "$R"

R=$(curl -s -o /dev/null -w "%{http_code}" $BASE/static/style.css)
test_result "T02: CSS carregado" "200" "$R"

R=$(curl -s -o /dev/null -w "%{http_code}" $BASE/static/api.js)
test_result "T03: JS API carregado" "200" "$R"

R=$(curl -s -o /dev/null -w "%{http_code}" $BASE/static/router.js)
test_result "T04: JS Router carregado" "200" "$R"

R=$(curl -s -o /dev/null -w "%{http_code}" $BASE/static/pages/dashboard.js)
test_result "T05: JS Dashboard carregado" "200" "$R"

# ── BLOCO 2: Sistema ──
echo ""
echo "── Sistema ──"
R=$(curl -s $BASE/v1/system/health)
test_result "T06: Health check" '"status":"ok"' "$R"

R=$(curl -s $BASE/v1/system/plugins)
test_result "T07: List plugins (público)" '"slug":"echo"' "$R"

# ── BLOCO 3: Auth ──
echo ""
echo "── Autenticação ──"
R=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"fulltest@crom.cloud","name":"Full Tester","password":"crom2026"}' \
  $BASE/v1/account/register)
test_result "T08: Register" '"email":"fulltest@crom.cloud"' "$R"

R=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"fulltest@crom.cloud","password":"crom2026"}' \
  $BASE/v1/account/login)
test_result "T09: Login → JWT" '"token":"eyJ' "$R"
TOKEN=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

R=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE/v1/account/me)
test_result "T10: Me (JWT)" '"name":"Full Tester"' "$R"

R=$(curl -s $BASE/v1/echo/ping)
test_result "T11: Echo sem auth → 401" '"UNAUTHORIZED"' "$R"

# ── BLOCO 4: API Keys ──
echo ""
echo "── API Keys ──"
R=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"label":"test-key","permissions":[{"plugin":"echo","scope":"write"},{"plugin":"*","scope":"read"}]}' \
  $BASE/v1/account/keys)
test_result "T12: Create API Key" '"crom_sk_live_' "$R"
APIKEY=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['key'])")

R=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE/v1/account/keys)
test_result "T13: List keys" '"label":"test-key"' "$R"

# ── BLOCO 5: Plugin via API Key ──
echo ""
echo "── Plugins (API Key) ──"
R=$(curl -s -H "Authorization: Bearer $APIKEY" $BASE/v1/echo/ping)
test_result "T14: Echo ping (API Key)" '"message":"pong"' "$R"

R=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $APIKEY" \
  -d '{"hello":"crom"}' $BASE/v1/echo/reflect)
test_result "T15: Echo reflect" '"hello":"crom"' "$R"

R=$(curl -s -H "Authorization: Bearer $APIKEY" $BASE/v1/echo/check-secrets)
test_result "T16: Echo check-secrets" '"secret_count"' "$R"

R=$(curl -s -H "Authorization: Bearer $APIKEY" $BASE/v1/nonexistent/test)
test_result "T17: Plugin 404" '"PLUGIN_NOT_FOUND"' "$R"

# ── BLOCO 6: Billing ──
echo ""
echo "── Billing ──"
R=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE/v1/account/balance)
test_result "T18: Balance = 0" '"balance":0' "$R"

R=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"amount":250}' $BASE/v1/account/credits)
test_result "T19: Add 250 créditos" '"balance":250' "$R"

R=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE/v1/account/balance)
test_result "T20: Balance = 250" '"balance":250' "$R"

# ── BLOCO 7: Vault ──
echo ""
echo "── Vault de Secrets ──"
R=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"plugin":"cloudflare","key":"CF_TOKEN","value":"super-secret-123"}' \
  $BASE/v1/account/secrets)
test_result "T21: Set secret" '"success":true' "$R"

R=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"plugin":"aws","key":"AWS_ACCESS_KEY","value":"AKIA1234567890"}' \
  $BASE/v1/account/secrets)
test_result "T22: Set 2nd secret" '"success":true' "$R"

R=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE/v1/account/secrets)
test_result "T23: List secrets (sem valores)" '"CF_TOKEN"' "$R"
# Verificar que o VALOR não aparece
if echo "$R" | grep -q "super-secret-123"; then
  echo "  ❌ T24: Secret value NÃO deve aparecer na listagem"
  FAIL=$((FAIL+1))
else
  echo "  ✅ T24: Secret value oculto na listagem"
  PASS=$((PASS+1))
fi

# ── BLOCO 8: Revoke Key ──
echo ""
echo "── Revoke Key ──"
KEY_ID=$(curl -s -H "Authorization: Bearer $TOKEN" $BASE/v1/account/keys | python3 -c "import sys,json; print(json.load(sys.stdin)['data'][0]['id'])")
R=$(curl -s -X DELETE -H "Authorization: Bearer $TOKEN" $BASE/v1/account/keys/$KEY_ID)
test_result "T25: Revoke key" '"success":true' "$R"

R=$(curl -s -H "Authorization: Bearer $APIKEY" $BASE/v1/echo/ping)
test_result "T26: Revoked key → 401" '"UNAUTHORIZED"' "$R"

# ── Resultado Final ──
echo ""
echo "╔══════════════════════════════════════════════╗"
printf "║   RESULTADO: %d ✅  |  %d ❌  |  Total: %d     ║\n" $PASS $FAIL $((PASS+FAIL))
echo "╚══════════════════════════════════════════════╝"
