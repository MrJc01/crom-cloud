#!/usr/bin/env bash
# ══════════════════════════════════════════════════════
# Crom Cloud Monitor — Docker Management Library
# Gerenciamento de containers Docker/Podman
# ══════════════════════════════════════════════════════

# ── Detectar runtime de container ────────────────────
detect_container_runtime() {
    if command -v docker &>/dev/null; then
        # Verificar se docker compose (v2) existe
        if docker compose version &>/dev/null 2>&1; then
            CONTAINER_RT="docker"
            COMPOSE_CMD="docker compose"
        elif command -v docker-compose &>/dev/null; then
            CONTAINER_RT="docker"
            COMPOSE_CMD="docker-compose"
        else
            CONTAINER_RT="docker"
            COMPOSE_CMD="docker compose"
        fi
    elif command -v podman &>/dev/null; then
        CONTAINER_RT="podman"
        if command -v podman-compose &>/dev/null; then
            COMPOSE_CMD="podman-compose"
        else
            COMPOSE_CMD="podman compose"
        fi
    else
        ui_error "Nenhum runtime de container encontrado (docker/podman)"
        return 1
    fi
    export CONTAINER_RT COMPOSE_CMD
}

# ── Subir containers via compose ─────────────────────
docker_compose_up() {
    local services="${1:-}"
    local compose_file="${2:-$PROJECT_ROOT/docker-compose.yml}"

    detect_container_runtime || return 1

    ui_step "Subindo containers: ${services:-todos}"
    ui_step "Runtime: ${CONTAINER_RT} | Compose: ${COMPOSE_CMD}"

    if [ -n "$services" ]; then
        $COMPOSE_CMD -f "$compose_file" up -d $services 2>&1
    else
        $COMPOSE_CMD -f "$compose_file" up -d 2>&1
    fi

    local rc=$?
    if [ $rc -eq 0 ]; then
        ui_success "Containers iniciados"
    else
        ui_error "Falha ao iniciar containers (exit: $rc)"
    fi
    return $rc
}

# ── Parar containers via compose ─────────────────────
docker_compose_down() {
    local compose_file="${1:-$PROJECT_ROOT/docker-compose.yml}"

    detect_container_runtime || return 1

    ui_step "Parando containers..."
    $COMPOSE_CMD -f "$compose_file" down --remove-orphans 2>&1

    local rc=$?
    if [ $rc -eq 0 ]; then
        ui_success "Containers parados"
    else
        ui_warn "Compose down retornou código $rc"
    fi
    return $rc
}

# ── Status de um container específico ────────────────
docker_container_status() {
    local name="$1"
    detect_container_runtime || return 1

    local status
    status=$($CONTAINER_RT inspect --format '{{.State.Status}}' "$name" 2>/dev/null)

    if [ -z "$status" ]; then
        echo "not_found"
    else
        echo "$status"
    fi
}

# ── Verificar se container existe e está rodando ─────
docker_is_running() {
    local name="$1"
    local status
    status=$(docker_container_status "$name")
    [ "$status" = "running" ]
}

# ── Listar containers do projeto ─────────────────────
docker_list_project_containers() {
    detect_container_runtime || return 1

    echo -e "  ${BOLD}${WHITE}Container                Status              Portas${NC}"
    ui_separator

    local containers
    containers=$($CONTAINER_RT ps -a --filter "name=crom-cloud" --format "{{.Names}}|{{.Status}}|{{.Ports}}" 2>/dev/null)

    if [ -z "$containers" ]; then
        ui_info "Nenhum container crom-cloud encontrado"
        return 0
    fi

    while IFS='|' read -r name status ports; do
        local icon="${ICON_DEAD}"
        local color="${RED}"
        if echo "$status" | grep -qi "up"; then
            icon="${ICON_HEART}"
            color="${GREEN}"
        fi
        printf "  ${icon}  %-22s ${color}%-18s${NC} %s\n" "$name" "$status" "$ports"
    done <<< "$containers"
}

# ── Logs de um container ─────────────────────────────
docker_logs() {
    local name="${1:-}"
    local lines="${2:-50}"

    detect_container_runtime || return 1

    if [ -z "$name" ]; then
        # Logs de todos os containers do compose
        local compose_file="${PROJECT_ROOT}/docker-compose.yml"
        $COMPOSE_CMD -f "$compose_file" logs --tail="$lines" -f 2>&1
    else
        $CONTAINER_RT logs --tail="$lines" -f "$name" 2>&1
    fi
}

# ── Verificar conectividade PostgreSQL via container ─
docker_check_postgres() {
    detect_container_runtime || return 1

    if docker_is_running "crom-cloud-db"; then
        # Testar se aceita conexões
        $CONTAINER_RT exec crom-cloud-db pg_isready -U crom &>/dev/null
        return $?
    fi
    return 1
}

# ── Verificar conectividade Redis via container ──────
docker_check_redis() {
    detect_container_runtime || return 1

    if docker_is_running "crom-cloud-redis"; then
        $CONTAINER_RT exec crom-cloud-redis redis-cli ping &>/dev/null
        return $?
    fi
    return 1
}

# ── Restart de container específico ──────────────────
docker_restart_container() {
    local name="$1"
    detect_container_runtime || return 1

    ui_step "Reiniciando container: $name"
    $CONTAINER_RT restart "$name" 2>&1

    if [ $? -eq 0 ]; then
        ui_success "Container $name reiniciado"
    else
        ui_error "Falha ao reiniciar $name"
    fi
}

# ── Limpar volumes e dados ───────────────────────────
docker_clean_all() {
    detect_container_runtime || return 1

    if ui_confirm "Isso vai APAGAR todos os dados (volumes PostgreSQL). Continuar?"; then
        local compose_file="${PROJECT_ROOT}/docker-compose.yml"
        ui_step "Removendo containers e volumes..."
        $COMPOSE_CMD -f "$compose_file" down -v --remove-orphans 2>&1
        ui_success "Tudo limpo (containers + volumes removidos)"
    else
        ui_info "Cancelado"
    fi
}

# ── Build da imagem Docker ───────────────────────────
docker_build_image() {
    local tag="${1:-crom-cloud:latest}"

    detect_container_runtime || return 1

    ui_step "Construindo imagem: $tag"
    $CONTAINER_RT build -t "$tag" "$PROJECT_ROOT" 2>&1

    if [ $? -eq 0 ]; then
        ui_success "Imagem $tag construída com sucesso"
    else
        ui_error "Falha no build da imagem"
        return 1
    fi
}
