#!/bin/bash
# ================================================================
# Teste de Persistência do Easy CRUD (Fase 2)
# Roda DEPOIS do restart do servidor
# ================================================================
set -e

API="http://localhost:8080"
EMAIL="persistence@test.dev"
PASS="Persist@2026"

echo "═══════════════════════════════════════════════════"
echo "  TESTE DE PERSISTÊNCIA — Easy CRUD (FASE 2)"
echo "═══════════════════════════════════════════════════"

# Step 1: Login
echo ""
echo "→ Step 1: Login"
LOGIN_RESP=$(curl -s -X POST "$API/v1/account/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")

JWT=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('token',''))" 2>/dev/null)
if [ -z "$JWT" ]; then
  echo "  ❌ Falha no login: $LOGIN_RESP"
  exit 1
fi
echo "  ✅ JWT obtido: ${JWT:0:20}..."

# Step 2: Listar tabelas DEPOIS do restart
echo ""
echo "→ Step 2: Listar tabelas (Deve conter 'persist_test' com 1 linha)"
AFTER_TABLES=$(curl -s "$API/v1/playground/easy-crud/tables" \
  -H "Authorization: Bearer $JWT")
echo "  $AFTER_TABLES"

if echo "$AFTER_TABLES" | grep -q '"name":"persist_test"'; then
  echo "  ✅ SUCESSO: Tabela 'persist_test' persistiu o restart!"
else
  echo "  ❌ FALHA: Tabela 'persist_test' não encontrada."
  exit 1
fi

# Step 3: Ler os dados da tabela
echo ""
echo "→ Step 3: Ler dados da tabela (Deve conter os dados inseridos antes)"
AFTER_ROWS=$(curl -s "$API/v1/playground/easy-crud/data/persist_test" \
  -H "Authorization: Bearer $JWT")
echo "  $AFTER_ROWS"

if echo "$AFTER_ROWS" | grep -q 'Dados que persistem!'; then
  echo "  ✅ SUCESSO: Os registros persistem e a descriptografia funcionou!"
else
  echo "  ❌ FALHA: Registros não encontrados."
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ TODOS OS TESTES PASSARAM! PERSISTÊNCIA OK!"
echo "═══════════════════════════════════════════════════"
