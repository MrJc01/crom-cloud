#!/bin/bash
# ══════════════════════════════════════════════
# Crom Cloud — Teste do Frontend Redesign
# Valida: TailwindCSS, novos componentes, assets
# ══════════════════════════════════════════════
BASE="http://localhost:8080"
OK=0
FAIL=0

test_check() {
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
echo "  CROM CLOUD — FRONTEND REDESIGN TEST"
echo "══════════════════════════════════════"
echo ""

# --- 1. index.html contém TailwindCSS CDN ---
R=$(curl -s $BASE/)
test_check "1.  HTML contém TailwindCSS CDN" "tailwindcss/browser@4" "$R"
test_check "2.  HTML contém @theme customizado" "@theme" "$R"
test_check "3.  HTML contém cores Crom (crom-500)" "crom-500" "$R"
test_check "4.  HTML contém anim-fade" "anim-fade" "$R"
test_check "5.  HTML contém favicon SVG" "data:image/svg+xml" "$R"
test_check "6.  HTML contém OG meta tags" "og:title" "$R"
test_check "7.  HTML contém JetBrains Mono font" "JetBrains+Mono" "$R"
test_check "8.  HTML contém Inter font" "Inter" "$R"
test_check "9.  HTML carrega icons.js" "components/icons.js" "$R"
test_check "10. HTML carrega ui.js" "components/ui.js" "$R"
test_check "11. HTML carrega sidebar.js" "components/sidebar.js" "$R"
test_check "12. HTML carrega topbar.js" "components/topbar.js" "$R"
test_check "13. HTML carrega command-palette.js" "components/command-palette.js" "$R"
test_check "14. HTML carrega charts.js" "components/charts.js" "$R"
test_check "15. HTML carrega settings.js" "pages/settings.js" "$R"
test_check "16. HTML carrega activity.js" "pages/activity.js" "$R"

# --- 2. Assets HTTP 200 ---
echo ""
for asset in \
  "static/components/icons.js" \
  "static/components/ui.js" \
  "static/components/sidebar.js" \
  "static/components/topbar.js" \
  "static/components/command-palette.js" \
  "static/components/charts.js" \
  "static/pages/settings.js" \
  "static/pages/activity.js" \
  "static/pages/home.js" \
  "static/pages/auth.js" \
  "static/pages/dashboard.js" \
  "static/pages/keys.js" \
  "static/pages/billing.js" \
  "static/pages/secrets.js" \
  "static/pages/plugins.js" \
  "static/pages/docs.js" \
  "static/api.js" \
  "static/router.js" \
  "static/style.css" \
  "static/app.js"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/$asset")
  test_check "    GET /$asset → 200" "200" "$CODE"
done

# --- 3. Conteúdo dos componentes ---
echo ""
R=$(curl -s $BASE/static/components/icons.js)
test_check "36. icons.js contém função I()" "const I" "$R"
test_check "37. icons.js tem ícone 'dashboard'" "dashboard" "$R"
test_check "38. icons.js tem ícone 'key'" "'key'" "$R"

R=$(curl -s $BASE/static/components/ui.js)
test_check "39. ui.js contém UI.toast()" "toast" "$R"
test_check "40. ui.js contém UI.modal()" "modal" "$R"
test_check "41. ui.js contém UI.badge()" "badge" "$R"
test_check "42. ui.js contém UI.skeleton()" "skeleton" "$R"
test_check "43. ui.js contém UI.confirm()" "confirm" "$R"
test_check "44. ui.js contém UI.breadcrumb()" "breadcrumb" "$R"
test_check "45. ui.js contém UI.table()" ".table" "$R"
test_check "46. ui.js contém UI.code()" "code" "$R"
test_check "47. ui.js contém UI.esc() (XSS)" "esc" "$R"
test_check "48. ui.js contém inline styles" "border-radius" "$R"

R=$(curl -s $BASE/static/components/sidebar.js)
test_check "49. sidebar.js contém Sidebar.toggle()" "toggle" "$R"
test_check "50. sidebar.js tem nav items com ícones" "I(" "$R"
test_check "51. sidebar.js persiste estado" "localStorage" "$R"

R=$(curl -s $BASE/static/components/command-palette.js)
test_check "52. command-palette.js escuta ⌘K" "ctrlKey" "$R"
test_check "53. command-palette.js tem fuzzy search" "filter" "$R"
test_check "54. command-palette.js tem backdrop-blur" "backdrop-blur" "$R"

R=$(curl -s $BASE/static/components/charts.js)
test_check "55. charts.js tem Chart.sparkline()" "sparkline" "$R"
test_check "56. charts.js tem Chart.bar()" "bar" "$R"
test_check "57. charts.js tem Chart.donut()" "donut" "$R"
test_check "58. charts.js tem Chart.area()" "area" "$R"

# --- 4. API client melhorado ---
echo ""
R=$(curl -s $BASE/static/api.js)
test_check "59. api.js tem retry logic" "retries" "$R"
test_check "60. api.js tem cache" "_cache" "$R"
test_check "61. api.js tem interceptor 401" "401" "$R"
test_check "62. api.js tem cacheTTL" "cacheTTL" "$R"

# --- 5. Router refatorado ---
R=$(curl -s $BASE/static/router.js)
test_check "63. router.js tem error boundary" "Erro ao carregar" "$R"
test_check "64. router.js tem 404 page" "404" "$R"
test_check "65. router.js tem loading com ícone" "loader" "$R"

# --- 6. SPA fallback funciona ---
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/dashboard")
test_check "66. SPA fallback /dashboard" "200" "$CODE"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/settings")
test_check "67. SPA fallback /settings" "200" "$CODE"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/activity")
test_check "68. SPA fallback /activity" "200" "$CODE"

# --- 7. CSS reduzido ---
R=$(curl -s $BASE/static/style.css)
LINES=$(echo "$R" | wc -l)
test_check "69. CSS < 30 linhas (era 583)" "true" "$([ $LINES -lt 30 ] && echo true || echo false)"
test_check "70. CSS tem scrollbar overrides" "scrollbar" "$R"

echo ""
echo "══════════════════════════════════════"
echo "  RESULTADO: $OK passed / $FAIL failed"
echo "  Total: $((OK + FAIL)) testes"
echo "══════════════════════════════════════"

exit $FAIL
