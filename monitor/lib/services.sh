#!/usr/bin/env bash
# ══════════════════════════════════════════════════════
# Crom Cloud Monitor — Services Library
# Gerenciamento de serviços Go (localhost mode)
# ══════════════════════════════════════════════════════

# Arquivo de PID da API
API_PID_FILE="${MONITOR_DIR}/tmp/api.pid"
API_LOG_FILE="${MONITOR_DIR}/logs/api.log"

# ── Carregar variáveis de ambiente ───────────────────
services_load_env() {
    local env_file="${1:-$PROJECT_ROOT/.env}"

    if [ ! -f "$env_file" ]; then
        ui_error "Arquivo .env não encontrado: $env_file"
        return 1
    fi

    # Exportar variáveis (ignorar comentários e linhas vazias)
    set -a
    while IFS='=' read -r key value; do
        # Ignorar comentários e linhas vazias
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue
        # Remover espaços em branco
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        [ -n "$key" ] && export "$key=$value"
    done < <(grep -v '^#' "$env_file" | grep -v '^$')
    set +a

    ui_success "Variáveis carregadas de: $(basename "$env_file")"
}

# ── Iniciar API Go em background ─────────────────────
services_start_api() {
    local profile="${1:-localhost}"

    # Verificar se já está rodando
    if services_api_is_running; then
        local running_pid="desconhecido"
        [ -f "$API_PID_FILE" ] && running_pid=$(cat "$API_PID_FILE")
        ui_warn "API já está rodando (PID: ${running_pid})"
        return 0
    fi

    # Carregar .env
    services_load_env "$PROJECT_ROOT/.env" || return 1

    # Sincronizar frontend
    ui_step "Sincronizando frontend..."
    if [ -f "$PROJECT_ROOT/web/index.html" ]; then
        mkdir -p "$PROJECT_ROOT/core/web/static"
        cp "$PROJECT_ROOT/web/index.html" "$PROJECT_ROOT/core/web/index.html" 2>/dev/null
        cp -r "$PROJECT_ROOT/web/static/"* "$PROJECT_ROOT/core/web/static/" 2>/dev/null
        ui_success "Frontend sincronizado"
    fi

    # Iniciar API
    ui_step "Iniciando Crom Cloud API..."

    # Criar log file
    mkdir -p "$(dirname "$API_LOG_FILE")"

    cd "$PROJECT_ROOT/core"
    nohup go run ./cmd/crom-cloud > "$API_LOG_FILE" 2>&1 &
    local pid=$!
    cd "$PROJECT_ROOT"

    echo "$pid" > "$API_PID_FILE"

    # Aguardar startup (máx 15s)
    ui_step "Aguardando API responder..."
    local port="${PORT:-8080}"
    local attempts=0
    local max_attempts=15

    while [ $attempts -lt $max_attempts ]; do
        sleep 1
        attempts=$((attempts + 1))

        # Verificar se o processo ainda está vivo
        if ! kill -0 "$pid" 2>/dev/null; then
            ui_error "API encerrou inesperadamente"
            echo ""
            ui_error "Últimas linhas do log:"
            tail -10 "$API_LOG_FILE" 2>/dev/null | while read -r line; do
                echo -e "    ${DIM}${line}${NC}"
            done
            rm -f "$API_PID_FILE"
            return 1
        fi

        # Testar se HTTP responde
        if curl -s -o /dev/null -w '' "http://localhost:${port}/v1/system/health" 2>/dev/null; then
            ui_success "API rodando em http://localhost:${port} (PID: $pid)"
            return 0
        fi

        printf "\r  ${CYAN}⏳${NC} Aguardando API... ${BOLD}${attempts}/${max_attempts}${NC}  "
    done

    echo ""
    ui_error "API não respondeu após ${max_attempts}s"
    ui_warn "Verifique os logs: ${API_LOG_FILE}"
    return 1
}

# ── Parar API ────────────────────────────────────────
services_stop_api() {
    if [ ! -f "$API_PID_FILE" ]; then
        # Tentar encontrar pelo processo
        local pid
        pid=$(pgrep -f "go run ./cmd/crom-cloud" 2>/dev/null | head -1)
        if [ -n "$pid" ]; then
            ui_step "Encontrado processo API (PID: $pid)"
            kill "$pid" 2>/dev/null
            sleep 2
            kill -9 "$pid" 2>/dev/null
            # Matar processos filhos do go run (o binário compilado)
            pkill -f "crom-cloud" 2>/dev/null
            ui_success "API parada"
            return 0
        fi
        ui_info "API não está rodando"
        return 0
    fi

    local pid
    pid=$(cat "$API_PID_FILE")

    if kill -0 "$pid" 2>/dev/null; then
        ui_step "Parando API (PID: $pid)..."

        # Enviar SIGINT para graceful shutdown
        kill -INT "$pid" 2>/dev/null
        sleep 2

        # Se ainda estiver rodando, SIGKILL
        if kill -0 "$pid" 2>/dev/null; then
            ui_warn "Forçando encerramento..."
            kill -9 "$pid" 2>/dev/null
            sleep 1
        fi

        # Matar processos filhos do go run
        pkill -f "crom-cloud" 2>/dev/null

        ui_success "API parada"
    else
        ui_info "API já estava parada"
    fi

    rm -f "$API_PID_FILE"
}

# ── Verificar se API está rodando ────────────────────
services_api_is_running() {
    if [ -f "$API_PID_FILE" ]; then
        local pid
        pid=$(cat "$API_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
        # PID file stale — remover
        rm -f "$API_PID_FILE"
    fi

    # Fallback: verificar pelo nome exato do processo go run
    pgrep -f "go run \./cmd/crom-cloud" &>/dev/null && return 0
    # Verificar binário compilado rodando (não match em paths)
    pgrep -x "crom-cloud" &>/dev/null && return 0

    return 1
}

# ── Status da API ────────────────────────────────────
services_api_status() {
    if services_api_is_running; then
        local pid="?"
        if [ -f "$API_PID_FILE" ]; then
            pid=$(cat "$API_PID_FILE")
        else
            pid=$(pgrep -x "crom-cloud" 2>/dev/null | head -1)
            [ -z "$pid" ] && pid=$(pgrep -f "go run \./cmd/crom-cloud" 2>/dev/null | head -1)
        fi
        echo -e "${GREEN}● RODANDO${NC} (PID: ${pid})"
    else
        echo -e "${RED}● PARADO${NC}"
    fi
}

# ── Restart rápido da API ────────────────────────────
services_restart_api() {
    ui_step "Reiniciando API..."
    services_stop_api
    sleep 1
    services_start_api "$@"
}

# ── Iniciar sistema completo (localhost) ─────────────
services_start_all() {
    local profile="${1:-localhost}"

    ui_header "Iniciando Crom Cloud [${profile}]"

    # 1. Subir containers de infra
    ui_step "Fase 1: Infraestrutura (PostgreSQL + Redis)"
    docker_compose_up "postgres redis" "$PROJECT_ROOT/docker-compose.yml" || {
        ui_error "Falha ao iniciar infraestrutura"
        return 1
    }

    # 2. Aguardar PostgreSQL ficar healthy
    ui_step "Fase 2: Aguardando PostgreSQL..."
    local attempts=0
    while [ $attempts -lt 15 ]; do
        if docker_check_postgres; then
            ui_success "PostgreSQL pronto"
            break
        fi
        sleep 1
        attempts=$((attempts + 1))
        printf "\r  ${CYAN}⏳${NC} PostgreSQL... ${BOLD}${attempts}/15${NC}  "
    done
    echo ""

    if [ $attempts -ge 15 ]; then
        ui_error "PostgreSQL não ficou pronto a tempo"
        return 1
    fi

    # 3. Aguardar Redis
    ui_step "Fase 3: Aguardando Redis..."
    attempts=0
    while [ $attempts -lt 10 ]; do
        if docker_check_redis; then
            ui_success "Redis pronto"
            break
        fi
        sleep 1
        attempts=$((attempts + 1))
    done

    # 4. Iniciar API
    ui_step "Fase 4: API Gateway"
    services_start_api "$profile" || return 1

    echo ""
    ui_separator
    ui_success "${BOLD}Sistema Crom Cloud ONLINE${NC}"
    local port="${PORT:-8080}"
    ui_info "Dashboard: ${CYAN}http://localhost:${port}${NC}"
    ui_info "API Base:   ${CYAN}http://localhost:${port}/v1${NC}"
    ui_info "Health:     ${CYAN}http://localhost:${port}/v1/system/health${NC}"
    ui_separator
}

# ── Parar sistema completo ───────────────────────────
services_stop_all() {
    ui_header "Parando Crom Cloud"

    # 1. Parar API
    services_stop_api

    # 2. Parar containers
    docker_compose_down "$PROJECT_ROOT/docker-compose.yml"

    echo ""
    ui_success "${BOLD}Sistema Crom Cloud OFFLINE${NC}"
}
