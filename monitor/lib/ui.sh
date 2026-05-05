#!/usr/bin/env bash
# ══════════════════════════════════════════════════════
# Crom Cloud Monitor — UI Library
# Funções de interface: cores, banners, menus, spinners
# ══════════════════════════════════════════════════════

# ── Cores ────────────────────────────────────────────
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export MAGENTA='\033[0;35m'
export CYAN='\033[0;36m'
export WHITE='\033[1;37m'
export GRAY='\033[0;90m'
export BOLD='\033[1m'
export DIM='\033[2m'
export NC='\033[0m'

# ── Ícones ───────────────────────────────────────────
export ICON_OK="✅"
export ICON_FAIL="❌"
export ICON_WARN="⚠️"
export ICON_INFO="ℹ️"
export ICON_ROCKET="🚀"
export ICON_STOP="🛑"
export ICON_GEAR="⚙️"
export ICON_DB="🗄️"
export ICON_NET="🌐"
export ICON_KEY="🔑"
export ICON_LOCK="🔒"
export ICON_CHART="📊"
export ICON_TEST="🧪"
export ICON_BUILD="🔨"
export ICON_LOG="📋"
export ICON_HEART="💚"
export ICON_DEAD="💀"
export ICON_PLUG="🔌"

# ── Banner Principal ─────────────────────────────────
ui_banner() {
    clear
    echo -e "${CYAN}"
    cat << 'EOF'
   ██████╗██████╗  ██████╗ ███╗   ███╗
  ██╔════╝██╔══██╗██╔═══██╗████╗ ████║
  ██║     ██████╔╝██║   ██║██╔████╔██║
  ██║     ██╔══██╗██║   ██║██║╚██╔╝██║
  ╚██████╗██║  ██║╚██████╔╝██║ ╚═╝ ██║
   ╚═════╝╚═╝  ╚═╝ ╚═════╝╚═╝     ╚═╝
EOF
    echo -e "${WHITE}  ──── Cloud Monitor v1.0.0 ────${NC}"
    echo ""
}

# ── Banner Compacto ──────────────────────────────────
ui_header() {
    local title="$1"
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
    printf "${CYAN}║${WHITE}  %-42s  ${CYAN}║${NC}\n" "$title"
    echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
    echo ""
}

# ── Separador ────────────────────────────────────────
ui_separator() {
    echo -e "${GRAY}──────────────────────────────────────────────${NC}"
}

# ── Mensagens formatadas ─────────────────────────────
ui_info() {
    echo -e "  ${BLUE}${ICON_INFO}${NC}  $1"
}

ui_success() {
    echo -e "  ${GREEN}${ICON_OK}${NC} $1"
}

ui_error() {
    echo -e "  ${RED}${ICON_FAIL}${NC} $1"
}

ui_warn() {
    echo -e "  ${YELLOW}${ICON_WARN}${NC}  $1"
}

ui_step() {
    echo -e "  ${CYAN}→${NC} $1"
}

# ── Status inline ────────────────────────────────────
ui_status_line() {
    local label="$1" status="$2" icon="$3"
    echo -e "  ${icon}  ${label}$(printf '%*s' $((30 - ${#label})) '') ${status}"
}

# ── Spinner ──────────────────────────────────────────
ui_spinner() {
    local pid=$1
    local msg="${2:-Processando...}"
    local spin='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    local i=0
    while kill -0 "$pid" 2>/dev/null; do
        i=$(( (i+1) % ${#spin} ))
        printf "\r  ${CYAN}${spin:$i:1}${NC}  ${msg}" >&2
        sleep 0.1
    done
    printf "\r  ${GREEN}✓${NC}  ${msg}\n" >&2
}

# ── Confirmação ──────────────────────────────────────
ui_confirm() {
    local msg="${1:-Continuar?}"
    echo -ne "  ${YELLOW}?${NC}  ${msg} [s/N] "
    read -r resp
    [[ "$resp" =~ ^[sS]$ ]]
}

# ── Menu Principal ───────────────────────────────────
ui_main_menu() {
    local profile="${1:-localhost}"
    echo -e "  ${BOLD}Perfil ativo:${NC} ${GREEN}${profile}${NC}"
    echo ""
    ui_separator
    echo -e "  ${BOLD}${WHITE}SERVIÇOS${NC}"
    ui_separator
    echo -e "  ${GREEN}1${NC}) ${ICON_ROCKET} Iniciar sistema           ${GREEN}6${NC}) ${ICON_BUILD} Build (core + plugins)"
    echo -e "  ${RED}2${NC}) ${ICON_STOP} Parar sistema              ${GREEN}7${NC}) ${ICON_TEST} Rodar testes"
    echo -e "  ${CYAN}3${NC}) ${ICON_CHART} Status dos serviços       ${GREEN}8${NC}) ${ICON_NET} Deploy (produção)"
    echo -e "  ${BLUE}4${NC}) ${ICON_LOG} Logs em tempo real         ${GREEN}9${NC}) ${ICON_PLUG} Gerenciar plugins"
    echo -e "  ${MAGENTA}5${NC}) ${ICON_HEART} Health check              "
    echo ""
    ui_separator
    echo -e "  ${BOLD}${WHITE}CONFIGURAÇÃO${NC}"
    ui_separator
    echo -e "  ${YELLOW}c${NC}) ${ICON_GEAR} Configurar .env            ${YELLOW}p${NC}) ${ICON_KEY} Trocar perfil"
    echo -e "  ${YELLOW}m${NC}) ${ICON_DB} Migrações do banco          ${YELLOW}r${NC}) ${ICON_ROCKET} Restart rápido"
    echo ""
    ui_separator
    echo -e "  ${DIM}q) Sair${NC}"
    ui_separator
    echo ""
    echo -ne "  ${BOLD}Escolha:${NC} "
}

# ── Exibir perfil com cor ────────────────────────────
ui_profile_badge() {
    local profile="$1"
    case "$profile" in
        localhost)  echo -e "${GREEN}● LOCALHOST${NC}" ;;
        production) echo -e "${RED}● PRODUCTION${NC}" ;;
        staging)    echo -e "${YELLOW}● STAGING${NC}" ;;
        *)          echo -e "${GRAY}● ${profile}${NC}" ;;
    esac
}

# ── Barra de progresso ───────────────────────────────
ui_progress_bar() {
    local current=$1 total=$2 width=30
    local pct=$(( current * 100 / total ))
    local filled=$(( current * width / total ))
    local empty=$(( width - filled ))
    printf "  ["
    printf "${GREEN}%0.s█${NC}" $(seq 1 $filled) 2>/dev/null
    printf "${GRAY}%0.s░${NC}" $(seq 1 $empty) 2>/dev/null
    printf "] %3d%%\n" "$pct"
}

# ── Tabela de status ─────────────────────────────────
ui_status_table() {
    echo -e "  ${BOLD}${WHITE}Serviço              Status              Porta${NC}"
    ui_separator
}

# ── Countdown ────────────────────────────────────────
ui_countdown() {
    local secs=$1
    local msg="${2:-Aguardando}"
    for ((i=secs; i>0; i--)); do
        printf "\r  ${CYAN}⏳${NC} ${msg}... ${BOLD}${i}s${NC}  "
        sleep 1
    done
    printf "\r  ${GREEN}✓${NC}  ${msg}... pronto!           \n"
}
