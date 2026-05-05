#!/usr/bin/env bash
# ══════════════════════════════════════════════════════
# Crom Cloud Monitor — Tests Library
# Runner de testes unitários e E2E
# ══════════════════════════════════════════════════════

tests_unit_core() {
    ui_header "Testes Unitários — Core"
    ui_step "Executando: go test ./..."
    cd "$PROJECT_ROOT/core"
    go test ./... -v 2>&1 | while read -r line; do
        if echo "$line" | grep -q "^--- PASS"; then
            echo -e "  ${GREEN}✓${NC} ${line}"
        elif echo "$line" | grep -q "^--- FAIL"; then
            echo -e "  ${RED}✗${NC} ${line}"
        elif echo "$line" | grep -q "^PASS"; then
            echo -e "  ${GREEN}${BOLD}${line}${NC}"
        elif echo "$line" | grep -q "^FAIL"; then
            echo -e "  ${RED}${BOLD}${line}${NC}"
        else
            echo -e "  ${DIM}${line}${NC}"
        fi
    done
    local rc=${PIPESTATUS[0]}
    cd "$PROJECT_ROOT"
    echo ""
    [ $rc -eq 0 ] && ui_success "Testes unitários passaram" || ui_error "Testes unitários falharam"
    return $rc
}

tests_unit_external() {
    ui_header "Testes Unitários — Externos"
    if [ -d "$PROJECT_ROOT/tests/core" ]; then
        cd "$PROJECT_ROOT/tests"
        go test ./core/... -v 2>&1 | while read -r line; do
            if echo "$line" | grep -q "PASS"; then
                echo -e "  ${GREEN}${line}${NC}"
            elif echo "$line" | grep -q "FAIL"; then
                echo -e "  ${RED}${line}${NC}"
            else
                echo -e "  ${DIM}${line}${NC}"
            fi
        done
        local rc=${PIPESTATUS[0]}
        cd "$PROJECT_ROOT"
        return $rc
    else
        ui_warn "Diretório tests/core/ não encontrado"
        return 0
    fi
}

tests_e2e() {
    ui_header "Testes E2E (curl)"

    if ! services_api_is_running; then
        ui_error "API não está rodando. Inicie o sistema primeiro."
        return 1
    fi

    if [ -f "$PROJECT_ROOT/tests/run_all.sh" ]; then
        ui_step "Executando: tests/run_all.sh"
        bash "$PROJECT_ROOT/tests/run_all.sh" 2>&1
        return $?
    elif [ -f "$PROJECT_ROOT/tests/e2e_curl_test.sh" ]; then
        ui_step "Executando: tests/e2e_curl_test.sh"
        bash "$PROJECT_ROOT/tests/e2e_curl_test.sh" 2>&1
        return $?
    else
        ui_error "Nenhum script de teste E2E encontrado"
        return 1
    fi
}

tests_all() {
    ui_header "Suite Completa de Testes"
    local total_pass=0 total_fail=0

    ui_step "Fase 1: Testes unitários do core"
    tests_unit_core
    [ $? -eq 0 ] && total_pass=$((total_pass + 1)) || total_fail=$((total_fail + 1))

    ui_step "Fase 2: Testes unitários externos"
    tests_unit_external
    [ $? -eq 0 ] && total_pass=$((total_pass + 1)) || total_fail=$((total_fail + 1))

    ui_step "Fase 3: Testes E2E"
    tests_e2e
    [ $? -eq 0 ] && total_pass=$((total_pass + 1)) || total_fail=$((total_fail + 1))

    echo ""
    ui_separator
    echo -e "  ${BOLD}Resultado: ${GREEN}${total_pass} OK${NC} | ${RED}${total_fail} FALHA${NC}"
    ui_separator
}

tests_menu() {
    ui_header "Testes"
    echo -e "  ${GREEN}1${NC}) Testes unitários (core)"
    echo -e "  ${GREEN}2${NC}) Testes unitários (externos)"
    echo -e "  ${GREEN}3${NC}) Testes E2E (curl)"
    echo -e "  ${GREEN}4${NC}) Suite completa"
    echo -e "  ${DIM}0) Voltar${NC}"
    echo ""
    echo -ne "  ${BOLD}Escolha:${NC} "
    read -r choice
    case "$choice" in
        1) tests_unit_core ;;
        2) tests_unit_external ;;
        3) tests_e2e ;;
        4) tests_all ;;
        0|"") return ;;
        *) ui_error "Opção inválida" ;;
    esac
}
