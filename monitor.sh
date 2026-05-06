#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
#
#   ██████╗██████╗  ██████╗ ███╗   ███╗
#  ██╔════╝██╔══██╗██╔═══██╗████╗ ████║
#  ██║     ██████╔╝██║   ██║██╔████╔██║
#  ██║     ██╔══██╗██║   ██║██║╚██╔╝██║
#  ╚██████╗██║  ██║╚██████╔╝██║ ╚═╝ ██║
#   ╚═════╝╚═╝  ╚═╝ ╚═════╝╚═╝     ╚═╝
#
#  Cloud Monitor — Centro de Controle v1.0.0
#  Uso: ./monitor.sh [comando] [--profile=<perfil>]
#
# ══════════════════════════════════════════════════════════════
set -euo pipefail

# ── Diretórios base ──────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PROJECT_ROOT="$SCRIPT_DIR"
export MONITOR_DIR="$SCRIPT_DIR/monitor"

# ── Carregar bibliotecas ─────────────────────────────────────
source "$MONITOR_DIR/lib/ui.sh"
source "$MONITOR_DIR/lib/docker.sh"
source "$MONITOR_DIR/lib/services.sh"
source "$MONITOR_DIR/lib/health.sh"
source "$MONITOR_DIR/lib/build.sh"
source "$MONITOR_DIR/lib/tests.sh"
source "$MONITOR_DIR/lib/config.sh"

# ── Carregar configurações padrão ────────────────────────────
source "$MONITOR_DIR/config/defaults.conf"

# ── Perfil ativo (default: localhost) ────────────────────────
ACTIVE_PROFILE="localhost"
if [ -f "$MONITOR_DIR/tmp/active_profile" ]; then
    ACTIVE_PROFILE=$(cat "$MONITOR_DIR/tmp/active_profile")
fi
export ACTIVE_PROFILE

# ── Carregar .env se existir ─────────────────────────────────
if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    while IFS='=' read -r key value; do
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        [ -n "$key" ] && export "$key=$value"
    done < <(grep -v '^#' "$PROJECT_ROOT/.env" | grep -v '^$')
    set +a
fi

# ── Parse de argumentos CLI ──────────────────────────────────
CLI_COMMAND=""
CLI_PROFILE=""
CLI_ARGS=()

for arg in "$@"; do
    case "$arg" in
        --profile=*)
            CLI_PROFILE="${arg#*=}"
            ACTIVE_PROFILE="$CLI_PROFILE"
            export ACTIVE_PROFILE
            ;;
        --help|-h)
            CLI_COMMAND="help"
            ;;
        *)
            CLI_COMMAND="$arg"
            ;;
    esac
done

# ── Comando: help ────────────────────────────────────────────
show_help() {
    echo -e "${CYAN}Crom Cloud Monitor${NC} — Centro de Controle v1.0.0"
    echo ""
    echo -e "${BOLD}Uso:${NC} ./monitor.sh [comando] [--profile=<perfil>]"
    echo ""
    echo -e "${BOLD}Comandos:${NC}"
    echo -e "  ${GREEN}start${NC}       Inicia o sistema (infra + API)"
    echo -e "  ${GREEN}stop${NC}        Para todo o sistema"
    echo -e "  ${GREEN}restart${NC}     Restart rápido da API"
    echo -e "  ${GREEN}status${NC}      Mostra status dos serviços"
    echo -e "  ${GREEN}health${NC}      Diagnóstico completo de saúde"
    echo -e "  ${GREEN}logs${NC}        Mostra logs da API em tempo real"
    echo -e "  ${GREEN}test${NC}        Roda suite completa de testes"
    echo -e "  ${GREEN}build${NC}       Compila core + plugins"
    echo -e "  ${GREEN}deploy${NC}      Build Docker + compose up (produção)"
    echo -e "  ${GREEN}config${NC}      Editar configurações (.env)"
    echo -e "  ${GREEN}plugins${NC}     Gerenciar plugins"
    echo -e "  ${GREEN}migrate${NC}     Gerenciar migrações do banco"
    echo -e "  ${GREEN}clean${NC}       Remover containers e volumes"
    echo ""
    echo -e "${BOLD}Perfis:${NC} localhost (default), production, staging"
    echo ""
    echo -e "${BOLD}Exemplos:${NC}"
    echo -e "  ./monitor.sh start                    # Inicia em localhost"
    echo -e "  ./monitor.sh deploy --profile=production  # Deploy produção"
    echo -e "  ./monitor.sh                          # Menu interativo"
}

# ── Status compacto ──────────────────────────────────────────
show_status() {
    ui_header "Status dos Serviços"

    echo -e "  ${BOLD}Perfil:${NC} $(ui_profile_badge "$ACTIVE_PROFILE")"
    echo -e "  ${BOLD}Health:${NC} [$(health_quick)]"
    echo ""

    # PostgreSQL
    local pg_st=$(docker_container_status "crom-cloud-db")
    if [ "$pg_st" = "running" ]; then
        ui_status_line "PostgreSQL" "${GREEN}● running${NC}" "${ICON_DB}"
    else
        ui_status_line "PostgreSQL" "${RED}● ${pg_st}${NC}" "${ICON_DB}"
    fi

    # Redis
    local rd_st=$(docker_container_status "crom-cloud-redis")
    if [ "$rd_st" = "running" ]; then
        ui_status_line "Redis" "${GREEN}● running${NC}" "${ICON_NET}"
    else
        ui_status_line "Redis" "${RED}● ${rd_st}${NC}" "${ICON_NET}"
    fi

    # API
    local api_st=$(services_api_status)
    ui_status_line "API Gateway" "$api_st" "${ICON_ROCKET}"

    echo ""

    # Portas
    local port="${PORT:-8080}"
    echo -e "  ${BOLD}Endpoints:${NC}"
    if services_api_is_running; then
        ui_info "Dashboard:  ${CYAN}http://localhost:${port}${NC}"
        ui_info "API:        ${CYAN}http://localhost:${port}/v1${NC}"
        ui_info "Health:     ${CYAN}http://localhost:${port}/v1/system/health${NC}"
    else
        ui_info "API offline — nenhum endpoint disponível"
    fi
    echo ""
}

# ── Logs da API ──────────────────────────────────────────────
show_logs() {
    local log_file="${MONITOR_DIR}/logs/api.log"

    ui_header "Logs — Crom Cloud API"

    if [ -f "$log_file" ]; then
        ui_info "Exibindo: ${log_file}"
        ui_info "Pressione ${BOLD}Ctrl+C${NC} para sair"
        ui_separator
        echo ""
        tail -f "$log_file" 2>/dev/null | while read -r line; do
            if echo "$line" | grep -qi "error"; then
                echo -e "  ${RED}${line}${NC}"
            elif echo "$line" | grep -qi "warn"; then
                echo -e "  ${YELLOW}${line}${NC}"
            elif echo "$line" | grep -qi "info"; then
                echo -e "  ${GREEN}${line}${NC}"
            else
                echo -e "  ${DIM}${line}${NC}"
            fi
        done
    else
        ui_warn "Arquivo de log não encontrado: ${log_file}"
        ui_info "Inicie o sistema primeiro com: ./monitor.sh start"
    fi
}

# ── Deploy (modo produção) ───────────────────────────────────
do_deploy() {
    ui_header "Deploy — Modo Produção"

    ui_warn "Isso vai construir a imagem Docker e subir todo o stack"
    echo ""
    if ! ui_confirm "Continuar com deploy em produção?"; then
        ui_info "Cancelado"
        return 0
    fi

    # 1. Sync frontend
    ui_step "Fase 1: Sincronizar frontend"
    build_sync_web

    # 2. Build imagem
    ui_step "Fase 2: Build da imagem Docker"
    build_docker_image || return 1

    # 3. Compose up (completo)
    ui_step "Fase 3: Subindo stack completo"
    docker_compose_up "" "$PROJECT_ROOT/docker-compose.yml" || return 1

    # 4. Aguardar health
    ui_step "Fase 4: Verificando saúde..."
    sleep 5
    local port="${PORT:-8080}"
    local attempts=0
    while [ $attempts -lt 20 ]; do
        local hc=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${port}/v1/system/health" 2>/dev/null)
        if [ "$hc" = "200" ]; then
            echo ""
            ui_success "${BOLD}Deploy concluído com sucesso!${NC}"
            ui_info "Sistema rodando em: ${CYAN}http://localhost:${port}${NC}"
            return 0
        fi
        sleep 1
        attempts=$((attempts + 1))
        printf "\r  ${CYAN}⏳${NC} Aguardando API... ${BOLD}${attempts}/20${NC}  "
    done

    echo ""
    ui_error "API não respondeu após deploy"
    ui_warn "Verifique os logs: docker compose logs core"
}

# ── Loop principal do menu interativo ────────────────────────
interactive_menu() {
    while true; do
        ui_banner
        echo -e "  ${BOLD}Health:${NC} [$(health_quick)]   ${BOLD}Perfil:${NC} $(ui_profile_badge "$ACTIVE_PROFILE")"
        echo ""
        ui_main_menu "$ACTIVE_PROFILE"
        read -r choice

        case "$choice" in
            1)
                if [ "$ACTIVE_PROFILE" = "production" ]; then
                    do_deploy
                else
                    services_start_all "$ACTIVE_PROFILE"
                fi
                ;;
            2) services_stop_all ;;
            3) show_status ;;
            4) show_logs ;;
            5) health_full_check ;;
            6) build_all ;;
            7) tests_menu ;;
            8) do_deploy ;;
            9) config_plugins_menu ;;
            c|C) config_edit_env ;;
            p|P) config_switch_profile ;;
            m|M) config_migrations_menu ;;
            r|R) services_restart_api "$ACTIVE_PROFILE" ;;
            q|Q)
                echo ""
                ui_info "Até logo! ${ICON_ROCKET}"
                echo ""
                exit 0
                ;;
            "")
                continue
                ;;
            *)
                ui_error "Opção inválida: $choice"
                ;;
        esac

        echo ""
        echo -ne "  ${DIM}Pressione ENTER para voltar ao menu...${NC}"
        read -r
    done
}

# ══════════════════════════════════════════════════════════════
# PONTO DE ENTRADA
# ══════════════════════════════════════════════════════════════

# Desativar o set -e para o menu interativo
set +e

case "${CLI_COMMAND}" in
    start)      services_start_all "$ACTIVE_PROFILE" ;;
    stop)       services_stop_all ;;
    restart)    services_restart_api "$ACTIVE_PROFILE" ;;
    status)     show_status ;;
    health)     health_full_check ;;
    logs)       show_logs ;;
    test)       tests_all ;;
    build)      build_all ;;
    deploy)     do_deploy ;;
    config)     config_edit_env ;;
    plugins)    config_plugins_menu ;;
    migrate)    config_migrations_menu ;;
    clean)      docker_clean_all ;;
    help)       show_help ;;
    "")         interactive_menu ;;
    *)
        ui_error "Comando desconhecido: ${CLI_COMMAND}"
        echo ""
        show_help
        exit 1
        ;;
esac
