#!/usr/bin/env bash
# ══════════════════════════════════════════════════════
# Crom Cloud Monitor — Health Check Library
# ══════════════════════════════════════════════════════

health_full_check() {
    local port="${PORT:-8080}"
    ui_header "Diagnóstico de Saúde"
    local total=0 passed=0

    echo -e "  ${BOLD}Runtime de Containers${NC}"
    total=$((total + 1))
    detect_container_runtime && { ui_success "Runtime: ${CONTAINER_RT}"; passed=$((passed + 1)); } || ui_error "Nenhum runtime"
    echo ""

    echo -e "  ${BOLD}PostgreSQL${NC}"
    total=$((total + 1))
    if [ "$(docker_container_status crom-cloud-db)" = "running" ]; then
        ui_success "Container: running"; passed=$((passed + 1))
        total=$((total + 1))
        docker_check_postgres && { ui_success "Conexão: OK"; passed=$((passed + 1)); } || ui_error "pg_isready falhou"
    else
        ui_error "Container: parado"
    fi
    echo ""

    echo -e "  ${BOLD}Redis${NC}"
    total=$((total + 1))
    if [ "$(docker_container_status crom-cloud-redis)" = "running" ]; then
        ui_success "Container: running"; passed=$((passed + 1))
        total=$((total + 1))
        docker_check_redis && { ui_success "Conexão: PONG"; passed=$((passed + 1)); } || ui_error "redis-cli falhou"
    else
        ui_error "Container: parado"
    fi
    echo ""

    echo -e "  ${BOLD}API Gateway${NC}"
    total=$((total + 1))
    if services_api_is_running; then
        ui_success "Processo: ativo"; passed=$((passed + 1))
        total=$((total + 1))
        local hc=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${port}/v1/system/health" 2>/dev/null)
        [ "$hc" = "200" ] && { ui_success "Health: HTTP 200"; passed=$((passed + 1)); } || ui_error "Health: HTTP ${hc}"
        total=$((total + 1))
        local pc=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${port}/v1/system/plugins" 2>/dev/null)
        [ "$pc" = "200" ] && { ui_success "Plugins: HTTP 200"; passed=$((passed + 1)); } || ui_error "Plugins: HTTP ${pc}"
    else
        ui_error "Processo: offline"
    fi
    echo ""

    echo -e "  ${BOLD}Frontend${NC}"
    total=$((total + 1))
    if services_api_is_running; then
        local fc=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${port}/" 2>/dev/null)
        [ "$fc" = "200" ] && { ui_success "Dashboard: HTTP 200"; passed=$((passed + 1)); } || ui_error "Dashboard: HTTP ${fc}"
    else
        ui_warn "API offline"
    fi
    echo ""

    echo -e "  ${BOLD}Portas${NC}"
    for entry in "${port}:API" "5432:PostgreSQL" "6379:Redis"; do
        local p="${entry%%:*}" label="${entry##*:}"
        total=$((total + 1))
        if ss -tlnp 2>/dev/null | grep -q ":${p} "; then
            ui_success "Porta ${p} (${label}): aberta"; passed=$((passed + 1))
        else
            ui_error "Porta ${p} (${label}): fechada"
        fi
    done
    echo ""

    echo -e "  ${BOLD}Disco${NC}"
    total=$((total + 1))
    local du=$(df -h "$PROJECT_ROOT" 2>/dev/null | tail -1 | awk '{print $5}' | tr -d '%')
    [ -n "$du" ] && [ "$du" -lt 90 ] && { ui_success "Uso: ${du}%"; passed=$((passed + 1)); } || ui_warn "Uso: ${du}%"
    echo ""

    ui_separator
    local pct=0; [ $total -gt 0 ] && pct=$((passed * 100 / total))
    if [ $pct -ge 80 ]; then
        echo -e "  ${GREEN}${BOLD}SAÚDE: ${passed}/${total} OK (${pct}%)${NC}"
    elif [ $pct -ge 50 ]; then
        echo -e "  ${YELLOW}${BOLD}SAÚDE: ${passed}/${total} OK (${pct}%)${NC}"
    else
        echo -e "  ${RED}${BOLD}SAÚDE: ${passed}/${total} OK (${pct}%)${NC}"
    fi
    ui_progress_bar $passed $total
    echo ""
}

health_quick() {
    local port="${PORT:-8080}" r=""
    docker_is_running "crom-cloud-db" && r+="${GREEN}PG${NC} " || r+="${RED}PG${NC} "
    docker_is_running "crom-cloud-redis" && r+="${GREEN}RD${NC} " || r+="${RED}RD${NC} "
    services_api_is_running && r+="${GREEN}API${NC}" || r+="${RED}API${NC}"
    echo -e "$r"
}
