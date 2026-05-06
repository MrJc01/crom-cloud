#!/usr/bin/env bash
# ══════════════════════════════════════════════════════
# Crom Cloud Monitor — Config Library
# Editor interativo de .env, perfis e migrações
# ══════════════════════════════════════════════════════

config_edit_env() {
    local env_file="$PROJECT_ROOT/.env"

    ui_header "Configuração — .env"

    if [ ! -f "$env_file" ]; then
        ui_warn "Arquivo .env não encontrado"
        if ui_confirm "Criar a partir do .env.example?"; then
            cp "$PROJECT_ROOT/.env.example" "$env_file"
            ui_success ".env criado a partir do template"
        else
            return 1
        fi
    fi

    echo -e "  ${BOLD}Valores atuais:${NC}"
    ui_separator
    while IFS='=' read -r key value; do
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        # Mascarar chaves sensíveis
        if echo "$key" | grep -qiE "(key|secret|password|token)"; then
            local masked="${value:0:6}...${value: -4}"
            printf "  %-20s = ${YELLOW}%s${NC}\n" "$key" "$masked"
        else
            printf "  %-20s = ${GREEN}%s${NC}\n" "$key" "$value"
        fi
    done < <(grep -v '^#' "$env_file" | grep -v '^$')
    ui_separator
    echo ""

    echo -e "  ${GREEN}1${NC}) Editar variável individual"
    echo -e "  ${GREEN}2${NC}) Abrir no editor (\$EDITOR)"
    echo -e "  ${GREEN}3${NC}) Regenerar VAULT_KEY"
    echo -e "  ${GREEN}4${NC}) Regenerar JWT_SECRET"
    echo -e "  ${GREEN}5${NC}) Resetar para .env.example"
    echo -e "  ${DIM}0) Voltar${NC}"
    echo ""
    echo -ne "  ${BOLD}Escolha:${NC} "
    read -r choice

    case "$choice" in
        1) config_edit_var "$env_file" ;;
        2)
            local editor="${EDITOR:-nano}"
            $editor "$env_file"
            ui_success ".env atualizado"
            ;;
        3)
            local new_key=$(openssl rand -hex 32)
            sed -i "s|^VAULT_KEY=.*|VAULT_KEY=${new_key}|" "$env_file"
            ui_success "VAULT_KEY regenerada"
            ui_warn "Reinicie o sistema para aplicar"
            ;;
        4)
            local new_jwt=$(openssl rand -hex 32)
            sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${new_jwt}|" "$env_file"
            ui_success "JWT_SECRET regenerado"
            ui_warn "Reinicie o sistema para aplicar"
            ;;
        5)
            if ui_confirm "Isso vai sobrescrever o .env atual. Continuar?"; then
                cp "$PROJECT_ROOT/.env.example" "$env_file"
                ui_success ".env resetado para defaults"
            fi
            ;;
        0|"") return ;;
    esac
}

config_edit_var() {
    local env_file="$1"
    echo -ne "  ${BOLD}Variável:${NC} "
    read -r var_name
    var_name=$(echo "$var_name" | xargs | tr '[:lower:]' '[:upper:]')

    if grep -q "^${var_name}=" "$env_file"; then
        local current
        current=$(grep "^${var_name}=" "$env_file" | cut -d= -f2-)
        echo -e "  Atual: ${DIM}${current}${NC}"
        echo -ne "  ${BOLD}Novo valor:${NC} "
        read -r new_value
        if [ -n "$new_value" ]; then
            sed -i "s|^${var_name}=.*|${var_name}=${new_value}|" "$env_file"
            ui_success "${var_name} atualizado"
        fi
    else
        ui_warn "Variável '${var_name}' não encontrada"
        if ui_confirm "Adicionar como nova variável?"; then
            echo -ne "  ${BOLD}Valor:${NC} "
            read -r new_value
            echo "${var_name}=${new_value}" >> "$env_file"
            ui_success "${var_name} adicionada"
        fi
    fi
}

config_switch_profile() {
    local profiles_file="$MONITOR_DIR/config/profiles.conf"

    ui_header "Trocar Perfil"

    # Listar perfis
    local profiles=()
    while IFS= read -r line; do
        if [[ "$line" =~ ^\[([a-zA-Z]+)\]$ ]]; then
            profiles+=("${BASH_REMATCH[1]}")
        fi
    done < "$profiles_file"

    local i=1
    for p in "${profiles[@]}"; do
        local badge=$(ui_profile_badge "$p")
        if [ "$p" = "$ACTIVE_PROFILE" ]; then
            echo -e "  ${GREEN}${i}${NC}) ${badge} ${BOLD}(ativo)${NC}"
        else
            echo -e "  ${GREEN}${i}${NC}) ${badge}"
        fi
        i=$((i + 1))
    done
    echo ""
    echo -ne "  ${BOLD}Escolha:${NC} "
    read -r choice

    if [ "$choice" -ge 1 ] 2>/dev/null && [ "$choice" -le "${#profiles[@]}" ]; then
        local idx=$((choice - 1))
        ACTIVE_PROFILE="${profiles[$idx]}"
        export ACTIVE_PROFILE
        # Salvar perfil ativo
        echo "$ACTIVE_PROFILE" > "$MONITOR_DIR/tmp/active_profile"
        ui_success "Perfil alterado para: $(ui_profile_badge "$ACTIVE_PROFILE")"
    else
        ui_error "Opção inválida"
    fi
}

config_migrations_menu() {
    ui_header "Migrações do Banco"

    echo -e "  ${GREEN}1${NC}) Aplicar migrações pendentes (up)"
    echo -e "  ${GREEN}2${NC}) Reverter última migração (down 1)"
    echo -e "  ${GREEN}3${NC}) Criar nova migração"
    echo -e "  ${GREEN}4${NC}) Listar migrações existentes"
    echo -e "  ${DIM}0) Voltar${NC}"
    echo ""
    echo -ne "  ${BOLD}Escolha:${NC} "
    read -r choice

    case "$choice" in
        1)
            ui_step "Aplicando migrações..."
            services_load_env "$PROJECT_ROOT/.env"
            cd "$PROJECT_ROOT/core"
            go run ./cmd/crom-cloud 2>/dev/null &
            local pid=$!
            sleep 5
            kill $pid 2>/dev/null
            cd "$PROJECT_ROOT"
            ui_success "Migrações aplicadas (via auto-migrate)"
            ;;
        2)
            if ui_confirm "Reverter última migração? Isso pode causar perda de dados."; then
                services_load_env "$PROJECT_ROOT/.env"
                if command -v migrate &>/dev/null; then
                    migrate -path "$PROJECT_ROOT/migrations" -database "$DATABASE_URL" down 1
                    ui_success "Migração revertida"
                else
                    ui_error "CLI 'migrate' não instalada"
                    ui_info "Instale com: go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"
                fi
            fi
            ;;
        3)
            echo -ne "  ${BOLD}Nome da migração:${NC} "
            read -r mig_name
            if [ -n "$mig_name" ]; then
                if command -v migrate &>/dev/null; then
                    migrate create -ext sql -dir "$PROJECT_ROOT/migrations" -seq "$mig_name"
                    ui_success "Migração criada: $mig_name"
                else
                    # Criar manualmente
                    local next_seq
                    next_seq=$(ls "$PROJECT_ROOT/migrations/"*.up.sql 2>/dev/null | wc -l)
                    next_seq=$((next_seq + 1))
                    local pad=$(printf "%03d" $next_seq)
                    touch "$PROJECT_ROOT/migrations/${pad}_${mig_name}.up.sql"
                    touch "$PROJECT_ROOT/migrations/${pad}_${mig_name}.down.sql"
                    ui_success "Criados: ${pad}_${mig_name}.{up,down}.sql"
                fi
            fi
            ;;
        4)
            ui_step "Migrações existentes:"
            ls -1 "$PROJECT_ROOT/migrations/"*.up.sql 2>/dev/null | while read -r f; do
                echo -e "  ${CYAN}→${NC} $(basename "$f")"
            done
            ;;
        0|"") return ;;
    esac
}

config_plugins_menu() {
    ui_header "Gerenciar Plugins"

    echo -e "  ${BOLD}Plugins instalados:${NC}"
    ui_separator
    
    # Pegar os plugins desabilitados do .env
    local disabled_str=""
    if grep -q "^DISABLED_PLUGINS=" "$PROJECT_ROOT/.env"; then
        disabled_str=$(grep "^DISABLED_PLUGINS=" "$PROJECT_ROOT/.env" | cut -d= -f2-)
    fi

    local plugin_slugs=()
    local i=1

    for manifest in "$PROJECT_ROOT/plugins/"*/manifest.json; do
        [ -f "$manifest" ] || continue
        local slug=$(basename "$(dirname "$manifest")")
        plugin_slugs+=("$slug")

        local name version
        name=$(grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' "$manifest" | head -1 | cut -d'"' -f4)
        version=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' "$manifest" | head -1 | cut -d'"' -f4)
        local has_bin="${RED}✗${NC}"
        [ -f "$(dirname "$manifest")/$slug" ] && has_bin="${GREEN}✓${NC}"
        
        local status="${GREEN}ON${NC}"
        if [[ ",$disabled_str," == *",$slug,"* ]]; then
            status="${RED}OFF${NC}"
        fi
        
        printf "  ${GREEN}%2d${NC}) ${ICON_PLUG}  %-20s %-20s v%-8s [bin: %b] [status: %b]\n" "$i" "$slug" "${name:-$slug}" "${version:-?}" "$has_bin" "$status"
        i=$((i + 1))
    done
    ui_separator
    echo ""

    echo -e "  ${CYAN}c${NC}) Criar novo plugin"
    echo -e "  ${CYAN}b${NC}) Rebuild plugins"
    echo -e "  ${DIM}0) Voltar${NC}"
    echo ""
    echo -ne "  ${BOLD}Escolha (número para alternar status):${NC} "
    read -r choice

    if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -gt 0 ] && [ "$choice" -le "${#plugin_slugs[@]}" ]; then
        local t_slug="${plugin_slugs[$((choice - 1))]}"
        if grep -q "^DISABLED_PLUGINS=" "$PROJECT_ROOT/.env"; then
            current=$(grep "^DISABLED_PLUGINS=" "$PROJECT_ROOT/.env" | cut -d= -f2-)
            if [[ ",$current," == *",$t_slug,"* ]]; then
                new_val=$(echo "$current" | sed -e "s/\b$t_slug\b//g" -e 's/,,/,/g' -e 's/^,//' -e 's/,$//')
                sed -i "s|^DISABLED_PLUGINS=.*|DISABLED_PLUGINS=${new_val}|" "$PROJECT_ROOT/.env"
                ui_success "Plugin '$t_slug' HABILITADO."
            else
                new_val="${current},${t_slug}"
                new_val=$(echo "$new_val" | sed 's/^,//')
                sed -i "s|^DISABLED_PLUGINS=.*|DISABLED_PLUGINS=${new_val}|" "$PROJECT_ROOT/.env"
                ui_success "Plugin '$t_slug' DESABILITADO."
            fi
        else
            echo "DISABLED_PLUGINS=$t_slug" >> "$PROJECT_ROOT/.env"
            ui_success "Plugin '$t_slug' DESABILITADO."
        fi
        ui_warn "Aviso: Após suas edições, use a opção 'r' no menu principal para reiniciar e aplicar no servidor."
        sleep 2
        config_plugins_menu # reload menu visualmente
        return
    fi

    case "$choice" in
        c|C)
            echo -ne "  ${BOLD}Slug (kebab-case):${NC} "
            read -r new_slug
            if [ -n "$new_slug" ]; then
                echo -ne "  ${BOLD}Linguagem (go/python/node/bash):${NC} "
                read -r new_lang
                bash "$PROJECT_ROOT/tools/create-plugin.sh" "$new_slug" --lang="${new_lang:-go}"
            fi
            ;;
        b|B) build_plugins ;;
        0|"") return ;;
    esac
}
