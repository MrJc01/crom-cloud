#!/bin/bash
# ══════════════════════════════════════════════
# Crom Cloud — Teste de Regressão do Frontend
# Captura bugs comuns: URLs duplicadas, funções
# faltando, syntax errors, inline styles, etc.
# ══════════════════════════════════════════════
set -euo pipefail
BASE="http://localhost:8080"
PASS=0; FAIL=0; TOTAL=0

check() {
  TOTAL=$((TOTAL+1))
  local desc="$1" cmd="$2" expected="$3"
  result=$(eval "$cmd" 2>/dev/null || echo "CURL_FAIL")
  if echo "$result" | grep -q "$expected"; then
    echo "✅ $TOTAL. $desc"
    PASS=$((PASS+1))
  else
    echo "❌ $TOTAL. $desc — esperado '$expected'"
    echo "     got: $(echo "$result" | head -1 | cut -c1-100)"
    FAIL=$((FAIL+1))
  fi
}

check_absent() {
  TOTAL=$((TOTAL+1))
  local desc="$1" cmd="$2" absent="$3"
  result=$(eval "$cmd" 2>/dev/null || echo "")
  if echo "$result" | grep -q "$absent"; then
    echo "❌ $TOTAL. $desc — encontrou '$absent' (não deveria existir)"
    FAIL=$((FAIL+1))
  else
    echo "✅ $TOTAL. $desc"
    PASS=$((PASS+1))
  fi
}

echo "══════════════════════════════════════"
echo "  TESTE DE REGRESSÃO - FRONTEND"
echo "══════════════════════════════════════"
echo ""

# ─── 1. URL DUPLA /v1/v1/ ─────────────────
echo "── URL PREFIX BUGS ──"
for f in home auth dashboard keys billing secrets plugins docs settings activity; do
  check_absent "${f}.js sem /v1/ hardcoded em API.get/post" \
    "curl -s $BASE/static/pages/${f}.js" \
    "API.get('/v1/"
  check_absent "${f}.js sem /v1/ hardcoded em API.post" \
    "curl -s $BASE/static/pages/${f}.js" \
    "API.post('/v1/"
done
echo ""

# ─── 2. FUNÇÕES USADAS EXISTEM ────────────
echo "── API METHODS EXIST ──"
check "API.get() existe" "curl -s $BASE/static/api.js" "get(path)"
check "API.post() existe" "curl -s $BASE/static/api.js" "post(path"
check "API.deleteSecret() existe" "curl -s $BASE/static/api.js" "deleteSecret"
check "API.addCredits() com type" "curl -s $BASE/static/api.js" "type"
check "API.setSecret() com plugin_slug" "curl -s $BASE/static/api.js" "plugin_slug"
echo ""

# ─── 3. INLINE STYLES (não depende de Tailwind) ──
echo "── INLINE STYLES ──"
for f in home auth dashboard keys billing secrets plugins docs settings activity; do
  check "${f}.js tem inline styles" \
    "curl -s $BASE/static/pages/${f}.js | grep -q 'border-radius' && echo HAS_STYLES" \
    "HAS_STYLES"
done
check "ui.js tem inline styles" "curl -s $BASE/static/components/ui.js | grep -q 'linear-gradient' && echo HAS" "HAS"
check "sidebar.js tem inline styles" "curl -s $BASE/static/components/sidebar.js | grep -q 'border-radius' && echo HAS" "HAS"
check "topbar.js tem inline styles" "curl -s $BASE/static/components/topbar.js | grep -q 'border-radius' && echo HAS" "HAS"
echo ""

# ─── 4. SYNTAX ERRORS (aspas não fechadas) ──
echo "── SYNTAX CHECK ──"
for f in home auth dashboard keys billing secrets plugins docs settings activity; do
  check_absent "${f}.js sem template literals com aspas quebradas" \
    "curl -s $BASE/static/pages/${f}.js | node -e 'let c=\"\";process.stdin.on(\"data\",d=>c+=d);process.stdin.on(\"end\",()=>{try{new Function(c);console.log(\"SYNTAX_OK\")}catch(e){console.log(\"SYNTAX_ERROR: \"+e.message)}})'" \
    "SYNTAX_ERROR"
done
for f in ui sidebar topbar command-palette charts icons; do
  check_absent "${f}.js sem erros de syntax" \
    "curl -s $BASE/static/components/${f}.js | node -e 'let c=\"\";process.stdin.on(\"data\",d=>c+=d);process.stdin.on(\"end\",()=>{try{new Function(c);console.log(\"SYNTAX_OK\")}catch(e){console.log(\"SYNTAX_ERROR: \"+e.message)}})'" \
    "SYNTAX_ERROR"
done
check_absent "router.js sem erros de syntax" \
  "curl -s $BASE/static/router.js | node -e 'let c=\"\";process.stdin.on(\"data\",d=>c+=d);process.stdin.on(\"end\",()=>{try{new Function(c);console.log(\"SYNTAX_OK\")}catch(e){console.log(\"SYNTAX_ERROR: \"+e.message)}})'" \
  "SYNTAX_ERROR"
check_absent "api.js sem erros de syntax" \
  "curl -s $BASE/static/api.js | node -e 'let c=\"\";process.stdin.on(\"data\",d=>c+=d);process.stdin.on(\"end\",()=>{try{new Function(c);console.log(\"SYNTAX_OK\")}catch(e){console.log(\"SYNTAX_ERROR: \"+e.message)}})'" \
  "SYNTAX_ERROR"
check_absent "app.js sem erros de syntax" \
  "curl -s $BASE/static/app.js | node -e 'let c=\"\";process.stdin.on(\"data\",d=>c+=d);process.stdin.on(\"end\",()=>{try{new Function(c);console.log(\"SYNTAX_OK\")}catch(e){console.log(\"SYNTAX_ERROR: \"+e.message)}})'" \
  "SYNTAX_ERROR"
echo ""

# ─── 5. CSP HEADERS ──────────────────────
echo "── CSP HEADERS ──"
check "CSP tem cdn.jsdelivr.net" "curl -sI $BASE/" "cdn.jsdelivr.net"
check "CSP tem unsafe-eval" "curl -sI $BASE/" "unsafe-eval"
echo ""

# ─── 6. COMPONENTS USADOS EXISTEM ────────
echo "── COMPONENT DEPENDENCIES ──"
check "UI.esc() existe" "curl -s $BASE/static/components/ui.js" "esc(str)"
check "UI.toast() existe" "curl -s $BASE/static/components/ui.js" "toast(msg"
check "UI.btn() existe" "curl -s $BASE/static/components/ui.js" "btn(label"
check "UI.stat() existe" "curl -s $BASE/static/components/ui.js" "stat(label"
check "UI.card() existe" "curl -s $BASE/static/components/ui.js" "card(title"
check "UI.table() existe" "curl -s $BASE/static/components/ui.js" "table(headers"
check "UI.modal() existe" "curl -s $BASE/static/components/ui.js" "modal(title"
check "UI.confirm() existe" "curl -s $BASE/static/components/ui.js" "confirm(title"
check "UI.badge() existe" "curl -s $BASE/static/components/ui.js" "badge(text"
check "UI.skeleton() existe" "curl -s $BASE/static/components/ui.js" "skeleton(type"
check "UI.empty() existe" "curl -s $BASE/static/components/ui.js" "empty(ic"
check "UI.input() existe" "curl -s $BASE/static/components/ui.js" "input(id"
check "UI.code() existe" "curl -s $BASE/static/components/ui.js" "code(content"
check "UI.tag() existe" "curl -s $BASE/static/components/ui.js" "tag(text"
check "UI.keyDisplay() existe" "curl -s $BASE/static/components/ui.js" "keyDisplay(value"
check "UI.relTime() existe" "curl -s $BASE/static/components/ui.js" "relTime(dateStr"
check "Sidebar.render() existe" "curl -s $BASE/static/components/sidebar.js" "render(activeNav"
check "Sidebar.toggle() existe" "curl -s $BASE/static/components/sidebar.js" "toggle()"
check "Topbar.render() existe" "curl -s $BASE/static/components/topbar.js" "render(title"
check "dashboardLayout() existe" "curl -s $BASE/static/components/topbar.js" "dashboardLayout"
check "I() icon function existe" "curl -s $BASE/static/components/icons.js" "const I ="
check "CommandPalette.open() existe" "curl -s $BASE/static/components/command-palette.js" "open()"
check "Chart.sparkline() existe" "curl -s $BASE/static/components/charts.js" "sparkline"
echo ""

# ─── 7. SPA FALLBACK ─────────────────────
echo "── SPA ROUTING ──"
check "SPA fallback /dashboard" "curl -s -o /dev/null -w '%{http_code}' $BASE/dashboard" "200"
check "SPA fallback /login" "curl -s -o /dev/null -w '%{http_code}' $BASE/login" "200"
check "SPA fallback /keys" "curl -s -o /dev/null -w '%{http_code}' $BASE/keys" "200"
check "SPA fallback /plugins" "curl -s -o /dev/null -w '%{http_code}' $BASE/plugins" "200"
check "SPA fallback /settings" "curl -s -o /dev/null -w '%{http_code}' $BASE/settings" "200"
check "SPA fallback /activity" "curl -s -o /dev/null -w '%{http_code}' $BASE/activity" "200"
check "SPA fallback /billing" "curl -s -o /dev/null -w '%{http_code}' $BASE/billing" "200"
check "SPA fallback /secrets" "curl -s -o /dev/null -w '%{http_code}' $BASE/secrets" "200"
check "SPA fallback /docs" "curl -s -o /dev/null -w '%{http_code}' $BASE/docs" "200"
echo ""

echo "══════════════════════════════════════"
echo "  RESULTADO: $PASS passed / $FAIL failed"
echo "  Total: $TOTAL testes"
echo "══════════════════════════════════════"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
