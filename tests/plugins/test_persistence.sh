#!/bin/bash
# ================================================================
# Teste de Persistência do Easy CRUD
# Valida que dados sobrevivem a reinicializações do servidor
# ================================================================
set -e

API="http://localhost:8080"
EMAIL="persistence@test.dev"
PASS="Persist@2026"

echo "═══════════════════════════════════════════════════"
echo "  TESTE DE PERSISTÊNCIA — Easy CRUD"
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

# Step 2: Limpar tabela anterior (se existir)
echo ""
echo "→ Step 2: Limpar tabela anterior (se existir)"
curl -s -X POST "$API/v1/playground/easy-crud/tables/drop" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"name":"persist_test"}' > /dev/null 2>&1 || true
echo "  ✅ Limpeza feita"

# Step 3: Criar tabela
echo ""
echo "→ Step 3: Criar tabela 'persist_test'"
CREATE_RESP=$(curl -s -X POST "$API/v1/playground/easy-crud/tables/create" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"name":"persist_test","columns":[{"name":"titulo","type":"string"},{"name":"nota","type":"number"}]}')
echo "  $CREATE_RESP"

# Step 4: Inserir registro
echo ""
echo "→ Step 4: Inserir registro"
INSERT_RESP=$(curl -s -X POST "$API/v1/playground/easy-crud/data/persist_test" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Dados que persistem!","nota":42}')
echo "  $INSERT_RESP"

# Step 5: Verificar antes do restart
echo ""
echo "→ Step 5: Listar tabelas ANTES do restart"
BEFORE=$(curl -s "$API/v1/playground/easy-crud/tables" \
  -H "Authorization: Bearer $JWT")
echo "  $BEFORE"

# Step 6: Verificar arquivo no disco
echo ""
echo "→ Step 6: Verificar arquivo de persistência"
DATA_DIR="plugins/easy-crud/data"
if [ -d "$DATA_DIR" ]; then
  echo "  ✅ Diretório $DATA_DIR existe"
  ls -la "$DATA_DIR/"
else
  echo "  ❌ Diretório $DATA_DIR NÃO foi criado!"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "  AGORA REINICIE O SERVIDOR E RODE:"
echo "  ./tests/plugins/test_persistence_after.sh"
echo "═══════════════════════════════════════════════════"
