#!/usr/bin/env bash
# ══════════════════════════════════════════════════════
# Crom Cloud — Plugin Scaffolding Tool
# Uso: ./tools/create-plugin.sh <slug> [--lang=go|python|node|bash] [--name="Nome"]
# ══════════════════════════════════════════════════════
set -euo pipefail

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Diretórios
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEMPLATES_DIR="$PROJECT_ROOT/templates"
PLUGINS_DIR="$PROJECT_ROOT/plugins"

# Defaults
LANG="go"
NAME=""
SLUG=""

# ─── Parse argumentos ───────────────────────────────
usage() {
    echo -e "${CYAN}Crom Cloud — Plugin Scaffolding${NC}"
    echo ""
    echo "Uso: $0 <slug> [opções]"
    echo ""
    echo "Argumentos:"
    echo "  slug              Identificador do plugin (kebab-case, ex: dns-manager)"
    echo ""
    echo "Opções:"
    echo "  --lang=LANG       Linguagem: go, python, node, bash (default: go)"
    echo "  --name=NAME       Nome amigável do plugin (default: slug capitalizado)"
    echo "  --help            Mostra esta ajuda"
    echo ""
    echo "Exemplos:"
    echo "  $0 dns-manager"
    echo "  $0 ai-proxy --lang=python --name=\"AI Proxy\""
    echo "  $0 web-scraper --lang=node"
}

if [ $# -lt 1 ]; then
    usage
    exit 1
fi

for arg in "$@"; do
    case $arg in
        --lang=*)
            LANG="${arg#*=}"
            ;;
        --name=*)
            NAME="${arg#*=}"
            ;;
        --help)
            usage
            exit 0
            ;;
        -*)
            echo -e "${RED}Erro: Flag desconhecida: $arg${NC}"
            exit 1
            ;;
        *)
            SLUG="$arg"
            ;;
    esac
done

# ─── Validações ─────────────────────────────────────
if [ -z "$SLUG" ]; then
    echo -e "${RED}Erro: slug é obrigatório${NC}"
    usage
    exit 1
fi

# Validar kebab-case
if ! echo "$SLUG" | grep -qP '^[a-z0-9][a-z0-9\-]{0,98}[a-z0-9]$'; then
    echo -e "${RED}Erro: slug '$SLUG' inválido. Use kebab-case (ex: meu-plugin)${NC}"
    exit 1
fi

# Validar linguagem
case $LANG in
    go|python|node|bash) ;;
    *)
        echo -e "${RED}Erro: linguagem '$LANG' não suportada. Use: go, python, node, bash${NC}"
        exit 1
        ;;
esac

# Verificar se já existe
if [ -d "$PLUGINS_DIR/$SLUG" ]; then
    echo -e "${RED}Erro: Plugin '$SLUG' já existe em $PLUGINS_DIR/$SLUG${NC}"
    exit 1
fi

# Nome default: slug capitalizado
if [ -z "$NAME" ]; then
    NAME=$(echo "$SLUG" | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')
fi

# Extensão do script
case $LANG in
    python) EXT="py" ;;
    node)   EXT="js" ;;
    bash)   EXT="sh" ;;
    go)     EXT="go" ;;
esac

# ─── Determinar template ────────────────────────────
if [ "$LANG" = "go" ]; then
    TEMPLATE_DIR="$TEMPLATES_DIR/template-go"
else
    TEMPLATE_DIR="$TEMPLATES_DIR/template-multilang"
fi

if [ ! -d "$TEMPLATE_DIR" ]; then
    echo -e "${RED}Erro: Template não encontrado em $TEMPLATE_DIR${NC}"
    exit 1
fi

# ─── Criar plugin ───────────────────────────────────
PLUGIN_DIR="$PLUGINS_DIR/$SLUG"
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  Criando plugin: $NAME ($SLUG)${NC}"
echo -e "${CYAN}  Linguagem: $LANG${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"

mkdir -p "$PLUGIN_DIR"

# Copiar e substituir placeholders
for tmpl in "$TEMPLATE_DIR"/*.tmpl; do
    filename=$(basename "$tmpl" .tmpl)
    echo -e "  ${GREEN}→${NC} Criando $filename..."
    sed -e "s/{{PLUGIN_SLUG}}/$SLUG/g" \
        -e "s/{{PLUGIN_NAME}}/$NAME/g" \
        -e "s/{{PLUGIN_LANG}}/$LANG/g" \
        -e "s/{{PLUGIN_EXT}}/$EXT/g" \
        "$tmpl" > "$PLUGIN_DIR/$filename"
done

# Para multi-linguagem: criar diretório de scripts com exemplo
if [ "$LANG" != "go" ]; then
    mkdir -p "$PLUGIN_DIR/scripts"

    case $LANG in
        python)
            cat > "$PLUGIN_DIR/scripts/main.py" << 'PYEOF'
#!/usr/bin/env python3
"""Plugin script — lê JSON da stdin, processa, retorna JSON na stdout."""
import sys
import json

def main():
    data = json.loads(sys.stdin.read())
    action = data.get("action", "index")

    if action in ("ping", "index"):
        result = {
            "status_code": 200,
            "data": {
                "message": "pong from python!",
                "developer_id": data.get("developer_id", ""),
                "action": action
            }
        }
    elif action == "execute":
        result = {
            "status_code": 200,
            "data": {
                "message": "Executado com sucesso!",
                "input": data.get("payload"),
                "secrets_count": len(data.get("secrets", {}))
            }
        }
    else:
        result = {
            "status_code": 404,
            "error": f"Ação '{action}' não encontrada"
        }

    print(json.dumps(result))

if __name__ == "__main__":
    main()
PYEOF
            chmod +x "$PLUGIN_DIR/scripts/main.py"
            ;;
        node)
            cat > "$PLUGIN_DIR/scripts/main.js" << 'JSEOF'
#!/usr/bin/env node
// Plugin script — lê JSON da stdin, processa, retorna JSON na stdout.
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    const data = JSON.parse(input);
    const action = data.action || 'index';

    let result;
    if (action === 'ping' || action === 'index') {
        result = {
            status_code: 200,
            data: { message: 'pong from node!', developer_id: data.developer_id, action }
        };
    } else if (action === 'execute') {
        result = {
            status_code: 200,
            data: { message: 'Executado com sucesso!', input: data.payload }
        };
    } else {
        result = { status_code: 404, error: `Ação '${action}' não encontrada` };
    }

    console.log(JSON.stringify(result));
});
JSEOF
            chmod +x "$PLUGIN_DIR/scripts/main.js"
            ;;
        bash)
            cat > "$PLUGIN_DIR/scripts/main.sh" << 'SHEOF'
#!/usr/bin/env bash
# Plugin script — lê JSON da stdin, processa, retorna JSON na stdout.
INPUT=$(cat)
ACTION=$(echo "$INPUT" | python3 -c "import sys,json; print(json.loads(sys.stdin.read()).get('action','index'))" 2>/dev/null || echo "index")

case "$ACTION" in
    ping|index)
        echo '{"status_code":200,"data":{"message":"pong from bash!"}}'
        ;;
    execute)
        echo '{"status_code":200,"data":{"message":"Executado com sucesso!"}}'
        ;;
    *)
        echo "{\"status_code\":404,\"error\":\"Ação '$ACTION' não encontrada\"}"
        ;;
esac
SHEOF
            chmod +x "$PLUGIN_DIR/scripts/main.sh"
            ;;
    esac
fi

# ─── Inicializar Go module ──────────────────────────
echo -e "  ${GREEN}→${NC} Inicializando go module..."
cd "$PLUGIN_DIR"

# Renomear go.mod.tmpl output para go.mod real
if [ -f "go.mod" ]; then
    # go.mod já foi criado pelo template, agora rodar tidy
    cd "$PROJECT_ROOT"
    # Adicionar ao go.work
    if ! grep -q "$SLUG" go.work 2>/dev/null; then
        echo -e "  ${GREEN}→${NC} Adicionando ao go.work..."
        sed -i "/^)/i\\	./plugins/$SLUG" go.work
    fi
fi

# ─── Finalização ────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Plugin '$SLUG' criado com sucesso!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Próximos passos:${NC}"
echo -e "  1. ${CYAN}cd plugins/$SLUG${NC}"
if [ "$LANG" = "go" ]; then
    echo -e "  2. ${CYAN}go mod tidy${NC}"
    echo -e "  3. Edite ${CYAN}handler.go${NC} com sua lógica"
    echo -e "  4. ${CYAN}make build${NC}"
else
    echo -e "  2. ${CYAN}go mod tidy${NC}"
    echo -e "  3. Edite ${CYAN}scripts/main.$EXT${NC} com sua lógica"
    echo -e "  4. ${CYAN}make build${NC}"
fi
echo -e "  5. Reinicie o Core ou use ${CYAN}POST /v1/system/reload${NC}"
echo ""
