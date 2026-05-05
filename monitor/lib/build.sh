#!/usr/bin/env bash
# ══════════════════════════════════════════════════════
# Crom Cloud Monitor — Build Library
# Compilação do core e plugins
# ══════════════════════════════════════════════════════

build_sync_web() {
    ui_step "Sincronizando frontend para embed.FS..."
    mkdir -p "$PROJECT_ROOT/core/web/static"
    cp "$PROJECT_ROOT/web/index.html" "$PROJECT_ROOT/core/web/index.html" 2>/dev/null
    cp -r "$PROJECT_ROOT/web/static/"* "$PROJECT_ROOT/core/web/static/" 2>/dev/null
    ui_success "Frontend sincronizado"
}

build_core() {
    ui_header "Build — Core"
    build_sync_web
    ui_step "Compilando core/cmd/crom-cloud..."
    cd "$PROJECT_ROOT/core"
    go build -o crom-cloud ./cmd/crom-cloud 2>&1
    local rc=$?
    cd "$PROJECT_ROOT"
    if [ $rc -eq 0 ]; then
        local size=$(du -h "$PROJECT_ROOT/core/crom-cloud" | cut -f1)
        ui_success "Core compilado (${size})"
    else
        ui_error "Falha na compilação do core"
    fi
    return $rc
}

build_plugins() {
    ui_header "Build — Plugins"
    local built=0 failed=0
    for manifest in "$PROJECT_ROOT/plugins/"*/manifest.json; do
        [ -f "$manifest" ] || continue
        local dir=$(dirname "$manifest")
        local slug=$(basename "$dir")
        ui_step "Compilando plugin: $slug"
        if [ -f "$dir/main.go" ] || [ -f "$dir/handler.go" ]; then
            cd "$dir"
            go build -o "$slug" . 2>&1
            if [ $? -eq 0 ]; then
                ui_success "$slug compilado"; built=$((built + 1))
            else
                ui_error "$slug falhou"; failed=$((failed + 1))
            fi
            cd "$PROJECT_ROOT"
        elif [ -d "$dir/cmd" ]; then
            cd "$dir"
            go build -o "$slug" ./cmd/... 2>&1
            if [ $? -eq 0 ]; then
                ui_success "$slug compilado"; built=$((built + 1))
            else
                ui_error "$slug falhou"; failed=$((failed + 1))
            fi
            cd "$PROJECT_ROOT"
        else
            ui_warn "$slug — sem main.go (multilang?)"
            built=$((built + 1))
        fi
    done
    echo ""
    ui_info "Plugins: ${built} compilados, ${failed} falharam"
}

build_all() {
    ui_header "Build Completo"
    build_core || return 1
    build_plugins
    echo ""
    ui_success "${BOLD}Build completo!${NC}"
}

build_docker_image() {
    ui_header "Build — Docker Image"
    detect_container_runtime || return 1
    ui_step "Construindo imagem crom-cloud:latest..."
    $CONTAINER_RT build -t crom-cloud:latest "$PROJECT_ROOT" 2>&1
    if [ $? -eq 0 ]; then
        ui_success "Imagem Docker construída"
    else
        ui_error "Falha no build Docker"
        return 1
    fi
}
