# Crom Cloud — Checklist de Implementação

> Marque `[x]` conforme for completando cada item.
> Use `[/]` para itens em progresso.

---

## Sprint 1 — Bootstrap do Projeto ✅

### 1.1 Infraestrutura Local
- [x] Criar `docker-compose.yml` (PostgreSQL 16 + Redis 7)
- [x] Testar `docker-compose up -d` — containers sobem
- [x] Verificar conexão PostgreSQL: `psql -h localhost -U crom`
- [x] Verificar conexão Redis: `redis-cli ping`

### 1.2 Go Workspace
- [x] Criar `go.work` na raiz com `use ./core`
- [x] Criar `core/go.mod` com module `github.com/crom/crom-cloud/core`
- [x] Instalar dependência: `go-chi/chi` v5
- [x] Instalar dependência: `jackc/pgx` v5
- [x] Instalar dependência: `hashicorp/go-plugin`
- [x] Instalar dependência: `redis/go-redis` v9
- [x] Instalar dependência: `google/uuid`
- [x] Instalar dependência: `joho/godotenv`
- [x] Instalar dependência: `kelseyhightower/envconfig`
- [x] Instalar dependência: `golang-migrate/migrate`
- [x] Instalar dependência: `golang.org/x/crypto` (bcrypt)
- [x] Rodar `go mod tidy` — sem erros

### 1.3 Configuração
- [x] Criar `.env.example` com todas as variáveis documentadas
- [x] Criar `.env` local (gitignored)
- [x] Criar `core/internal/config/config.go` — struct Config
- [x] Implementar `LoadConfig()` — lê .env + envconfig
- [x] Testar: config carrega PORT, DATABASE_URL, REDIS_URL, VAULT_KEY, JWT_SECRET
- [x] Criar `.gitignore` na raiz

### 1.4 Contrato gRPC
- [x] Instalar `protoc` (protobuf compiler) no sistema
- [x] Instalar `protoc-gen-go` e `protoc-gen-go-grpc`
- [x] Criar `core/proto/plugin.proto` (conforme docs/01-architecture.md)
- [x] Gerar código Go: `protoc --go_out=. --go-grpc_out=. plugin.proto`
- [x] Verificar arquivos gerados: `plugin.pb.go` e `plugin_grpc.pb.go`
- [x] Adicionar target `proto` no Makefile raiz

### 1.5 HTTP Server (Esqueleto)
- [x] Criar `core/cmd/crom-cloud/main.go` — entrypoint
- [x] Implementar conexão com PostgreSQL (pgx pool)
- [x] Implementar conexão com Redis
- [x] Criar `core/internal/server/router.go` — chi router base
- [x] Criar `core/internal/server/middleware.go` — RequestID, Logger, CORS, Recovery
- [x] Implementar rota `GET /v1/system/health` → `{"status":"ok"}`
- [x] Implementar graceful shutdown (os.Signal)
- [x] Testar: `go run ./cmd/crom-cloud` inicia sem erros
- [x] Testar: `curl localhost:8080/v1/system/health` → 200

### 1.6 Migrações (Estrutura)
- [x] Criar pasta `migrations/`
- [x] Integrar `golang-migrate` no main.go (auto-migrate on startup)
- [x] Testar: servidor inicia e roda migrações sem erro

### 1.7 Makefile Raiz
- [x] Target `proto` — gera código protobuf
- [x] Target `build` — compila core
- [x] Target `dev` — roda com hot reload (air ou go run)
- [x] Target `test` — roda testes unitários
- [x] Target `migrate-up` / `migrate-down` / `migrate-create`
- [x] Target `docker-up` / `docker-down`

### ✅ Critério de Sucesso Sprint 1
- [x] `docker-compose up -d` sobe PG + Redis
- [x] `make dev` inicia o servidor na porta 8080
- [x] `curl localhost:8080/v1/system/health` retorna `{"status":"ok"}`
- [x] Código compila sem warnings

---

## Sprint 2 — Plugin System e Echo Plugin ✅

### 2.1 Manifest Parser
- [x] Criar `core/internal/gateway/manifest.go`
- [x] Definir struct `PluginManifest` (espelho do JSON)
- [x] Implementar `LoadManifest(path string) (*PluginManifest, error)`
- [x] Implementar `ValidateManifest(m *PluginManifest) error`
- [x] Validar campos obrigatórios: slug, runtime.binary, api_routes
- [x] Validar que billing.credit_cost >= 0
- [x] Testar com manifest válido → parse OK
- [x] Testar com manifest inválido → erro descritivo

### 2.2 Plugin Discovery
- [x] Criar `core/internal/gateway/discovery.go`
- [x] Implementar `PluginManager` struct com mapa de plugins ativos
- [x] Implementar `Discover(pluginsDir string)` — escaneia subpastas
- [x] Para cada subpasta: procurar `manifest.json`
- [x] Ignorar pastas sem manifest silenciosamente
- [x] Logar erro em manifests inválidos (mas continuar)
- [x] Iniciar binário do plugin via `hashicorp/go-plugin`
- [x] Configurar handshake config (magic cookie)
- [x] Conectar via gRPC e chamar `GetManifest()` para confirmar
- [x] Armazenar no mapa: `slug → *PluginClient`
- [x] Logar: "Plugin {slug} v{version} registrado com sucesso"
- [x] Implementar `GetPlugin(slug string) (*PluginClient, bool)`
- [x] Implementar `ListPlugins() []PluginManifest`
- [x] Implementar `Shutdown()` — mata todos os subprocessos

### 2.3 Dispatcher (HTTP → gRPC)
- [x] Criar `core/internal/gateway/dispatcher.go`
- [x] Implementar handler HTTP para `/v1/{slug}/{action...}`
- [x] Extrair `slug` e `action` do path da URL
- [x] Buscar plugin no PluginManager pelo slug
- [x] Se plugin não encontrado → 404 `PLUGIN_NOT_FOUND`
- [x] Montar `ActionRequest` protobuf:
  - [x] Campo `action` = path extraído
  - [x] Campo `method` = HTTP method
  - [x] Campo `payload` = request body
  - [x] Campo `headers` = headers relevantes
  - [x] Campo `developer_id` = do contexto de auth (vazio por enquanto)
  - [x] Campo `secrets` = vazio por enquanto
- [x] Chamar `ExecuteAction()` via gRPC
- [x] Converter `ActionResponse` para resposta HTTP:
  - [x] `status_code` → HTTP status
  - [x] `data` → campo "data" do JSON
  - [x] `error_message` → campo "error" se não vazio
- [x] Montar resposta padrão: `{"success":bool,"data":...,"meta":{...}}`
- [x] Incluir `request_id` no meta
- [x] Incluir `latency_ms` no meta
- [x] Testar com plugin echo

### 2.4 Health Check
- [x] Criar `core/internal/gateway/health.go`
- [x] Goroutine que roda a cada 30s (configurável)
- [x] Para cada plugin ativo: chamar `HealthCheck()` via gRPC
- [x] Se timeout ou erro → marcar como `unhealthy`
- [x] Se `unhealthy` 3x consecutivas → marcar como `unavailable`
- [x] Logar mudanças de status
- [x] Requisições para plugin `unavailable` → 503

### 2.5 Endpoint de Sistema
- [x] Implementar `GET /v1/system/plugins` — lista plugins ativos
- [x] Retornar: slug, name, version, status, routes, credit_cost
- [x] Testar: lista o plugin echo corretamente

### 2.6 Echo Plugin (Go Puro)
- [x] Criar `plugins/echo/go.mod`
- [x] Criar `plugins/echo/manifest.json`
- [x] Criar `plugins/echo/main.go` — registra plugin via go-plugin
- [x] Implementar interface `CromPlugin` (GetManifest, HealthCheck, ExecuteAction)
- [x] Implementar ação `ping` → `{"message":"pong"}`
- [x] Implementar ação `reflect` → devolve payload recebido
- [x] Implementar ação `check-secrets` → conta secrets injetados
- [x] Ação desconhecida → status 404 com mensagem
- [x] Atualizar `go.work` para incluir `./plugins/echo`
- [x] Compilar echo → binário funcional

### ✅ Critério de Sucesso Sprint 2
- [x] `curl localhost:8080/v1/echo/ping` → `{"success":true,"data":{"message":"pong"}}`
- [x] `curl -X POST -d '{"msg":"hi"}' localhost:8080/v1/echo/reflect` → eco
- [x] `curl localhost:8080/v1/system/plugins` → lista echo
- [x] `curl localhost:8080/v1/nonexistent/test` → 404
- [x] Logs mostram "Plugin echo v1.0.0 registrado com sucesso"

---

## Sprint 3 — Autenticação e API Keys ✅

### 3.1 Migrações SQL
- [x] Criar `migrations/001_create_developers.up.sql`
- [x] Criar `migrations/001_create_developers.down.sql`
- [x] Criar `migrations/002_create_api_keys.up.sql`
- [x] Criar `migrations/002_create_api_keys.down.sql`
- [x] Criar `migrations/003_create_key_permissions.up.sql`
- [x] Criar `migrations/003_create_key_permissions.down.sql`
- [x] Rodar migrações → tabelas criadas no PG
- [x] Verificar índices criados corretamente

### 3.2 Model: Developer
- [x] Criar `core/internal/models/developer.go`
- [x] Struct `Developer` com campos do schema
- [x] `CreateDeveloper(email, name, password)` — hash bcrypt
- [x] `FindByEmail(email)` — para login
- [x] `FindByID(id)` — busca por UUID
- [x] `UpdateBalance(id, newBalance)` — atualiza saldo
- [x] Validação: email único (tratar UNIQUE violation)
- [x] Validação: password mínimo 6 chars
- [x] Testar: criar dev, buscar por email, buscar por ID

### 3.3 Model: API Key
- [x] Criar `core/internal/models/apikey.go`
- [x] Struct `APIKey` e `KeyPermission`
- [x] `GenerateKey(devID, label, permissions[])`:
  - [x] Gerar 32 bytes aleatórios (crypto/rand)
  - [x] Codificar com prefixo `crom_sk_live_`
  - [x] Calcular SHA-256 do valor completo
  - [x] Salvar hash + prefix no banco
  - [x] Retornar valor completo (única vez)
- [x] `FindByHash(hash)` — busca key + JOIN permissões
- [x] `ListByDeveloper(devID)` — lista sem valores
- [x] `Revoke(keyID)` — set is_active = false
- [x] `UpdateLastUsed(keyID)` — atualiza timestamp
- [x] Testar: gerar, buscar por hash, revogar

### 3.4 Auth Middleware
- [x] Criar `core/internal/auth/apikey.go`
- [x] Extrair header `Authorization: Bearer xxx`
- [x] Se ausente → 401 UNAUTHORIZED
- [x] Calcular SHA-256 do token
- [x] Buscar no PG
- [x] Verificar `is_active = true`
- [x] Verificar `expires_at` (se não NULL, deve ser > NOW)
- [x] Carregar permissões associadas
- [x] Injetar `AuthContext` no request context
- [x] Atualizar `last_used_at`
- [x] Se inválida → 401 com mensagem

### 3.5 Permission Check
- [x] `HasPermission(perms, pluginSlug, requiredScope) bool`
- [x] Hierarquia: admin > write > read
- [x] Se key tem "write" para plugin, "read" também é permitido

### 3.6 Session Auth (Dashboard JWT)
- [x] Criar `core/internal/auth/session.go`
- [x] `GenerateJWT(devID, email)` — expira em 24h
- [x] `ValidateJWT(token)` — retorna claims
- [x] Middleware JWT separado para rotas do dashboard

### 3.7 Handlers de Conta
- [x] Criar `core/internal/handlers/account.go`
- [x] `POST /v1/account/register` → 201 + dados
- [x] `POST /v1/account/login` → JWT token
- [x] `GET /v1/account/me` → perfil autenticado

### 3.8 Handlers de API Keys
- [x] Criar `core/internal/handlers/keys.go`
- [x] `POST /v1/account/keys` → gera key (JWT auth)
- [x] `GET /v1/account/keys` → lista keys (JWT auth)
- [x] `DELETE /v1/account/keys/{id}` → revoga key (JWT auth)

### 3.9 Integrar Auth no Router
- [x] Rotas públicas (sem auth): register, login, health
- [x] Rotas de dashboard (JWT): account/me, account/keys
- [x] Rotas de plugin (API Key): /v1/{slug}/*

### ✅ Critério de Sucesso Sprint 3
- [x] Registrar dev → 201
- [x] Login → retorna JWT
- [x] Criar key com scope echo:write → retorna key
- [x] Usar key no echo/ping → 200
- [x] Sem key → 401
- [x] Listar keys → mostra prefix, não valor

---

## Sprint 4 — Billing e Vault ✅

### 4.1 Migrações SQL
- [x] Criar `migrations/004_create_credit_transactions.{up,down}.sql`
- [x] Criar `migrations/005_create_usage_logs.{up,down}.sql`
- [x] Criar `migrations/006_create_dev_secrets.{up,down}.sql`
- [x] Rodar migrações → tabelas criadas

### 4.2 Sistema de Créditos
- [x] Criar `core/internal/billing/credits.go`
- [x] `DebitCredits(tx, devID, cost)` — atômico com `FOR UPDATE`
- [x] `RefundCredits(devID, cost, reason)`
- [x] `GetBalance(devID) float64`
- [x] `AddCredits(devID, amount, description)`
- [x] `LogUsage()` — registra chamadas no usage_logs

### 4.3 Vault (Cofre de Secrets)
- [x] Criar `core/internal/vault/secrets.go`
- [x] `Encrypt()` — AES-256-GCM com nonce aleatório
- [x] `Decrypt()` — AES-256-GCM
- [x] `SetSecret(devID, pluginSlug, key, value)` — criptografa e salva
- [x] `GetSecret()` — busca e decripta
- [x] `GetSecretsForPlugin()` — todos secrets de um dev/plugin
- [x] `ListSecrets()` — lista metadata sem valores
- [x] `DeleteSecret()` — remove

### 4.4 Handlers de Billing/Secrets
- [x] Criar `core/internal/handlers/billing.go`
- [x] `GET /v1/account/balance` → saldo
- [x] `POST /v1/account/credits` → adiciona créditos
- [x] `POST /v1/account/secrets` → armazena criptografado
- [x] `GET /v1/account/secrets` → lista metadata (sem valores)

### 4.5 Integração no Main
- [x] Vault inicializado com VAULT_KEY do .env
- [x] Rotas registradas no grupo JWT

### ✅ Critério de Sucesso Sprint 4
- [x] Balance começa em 0
- [x] Add 100 créditos → balance = 100
- [x] Set secret → "armazenado com segurança"
- [x] List secrets → mostra key/plugin, sem valor
- [x] Vault inicializa corretamente (AES-256-GCM)

---

## Sprint 5 — Templates e Scaffolding

### 5.1 Template Go Puro
- [x] Criar `templates/template-go/manifest.json.tmpl`
- [x] Criar `templates/template-go/main.go.tmpl`
- [x] Criar `templates/template-go/handler.go.tmpl`
- [x] Criar `templates/template-go/go.mod.tmpl`
- [x] Criar `templates/template-go/Makefile.tmpl`
- [x] Usar placeholders: `{{PLUGIN_SLUG}}`, `{{PLUGIN_NAME}}`
- [x] Testar: copiar manualmente, substituir, compilar → funciona

### 5.2 Template Multi-Linguagem
- [x] Criar `templates/template-multilang/manifest.json.tmpl`
- [x] Criar `templates/template-multilang/main.go.tmpl`
- [x] Criar `templates/template-multilang/bridge.go.tmpl`
- [x] Criar `templates/template-multilang/go.mod.tmpl`
- [x] Criar `templates/template-multilang/Makefile.tmpl`
- [x] Criar `templates/template-multilang/scripts/.gitkeep`
- [x] bridge.go genérico: lê stdin/stdout do subprocesso
- [x] Testar: copiar, adicionar script Python, compilar → funciona

### 5.3 Script de Scaffolding
- [x] Criar `tools/create-plugin.sh`
- [x] Argumento 1: slug do plugin (obrigatório, validar kebab-case)
- [x] Flag `--lang=go|python|node|bash` (default: go)
- [x] Flag `--name="Nome Amigável"` (default: slug capitalizado)
- [x] Validar que slug não existe em /plugins/
- [x] Copiar template adequado para `plugins/<slug>/`
- [x] Substituir todos os placeholders
- [x] Inicializar `go.mod`
- [x] Adicionar ao `go.work`
- [x] Imprimir instruções de próximos passos
- [x] `chmod +x tools/create-plugin.sh`
- [x] Testar: `./tools/create-plugin.sh test-go` → compilou
- [x] Testar: `./tools/create-plugin.sh test-py --lang=python` → compilou
- [x] Testar: compilar e rodar ambos → Core detecta

### 5.4 Hot Reload de Plugins
- [x] Criar `core/internal/gateway/reload.go`
- [x] `POST /v1/system/reload` (autenticado, admin only)
- [x] Para plugins antigos: manter os que não mudaram
- [x] Para plugins novos: iniciar e registrar
- [x] Para plugins removidos: shutdown graceful
- [x] Testar: adicionar plugin novo → reload → aparece no /system/plugins

### ✅ Critério de Sucesso Sprint 5
- [x] `./tools/create-plugin.sh meu-plugin` → pasta criada
- [x] `cd plugins/meu-plugin && make build` → compila
- [x] `POST /v1/system/reload` → detecta novo plugin
- [x] `curl /v1/meu-plugin/ping` → funciona
- [x] Template multi-lang: Python script executa via bridge

---

## Sprint 6 — Dashboard Web e Docker

### 6.1 Frontend Base
- [x] Criar `web/index.html` — shell SPA
- [x] Criar `web/static/style.css` — design dark mode premium
- [x] Criar `web/static/app.js` + `router.js` + `api.js` — router SPA + fetch
- [x] Configurar Go embed.FS para servir static files (`core/web/embed.go`)
- [x] Rota `/` → serve index.html
- [x] Rotas `/static/*` → serve CSS/JS

### 6.2 Páginas do Dashboard
- [x] `pages/auth.js` — formulário login/registro
- [x] `pages/dashboard.js` — cards: saldo, uso recente, plugins
- [x] `pages/keys.js` — criar, listar, revogar keys
- [x] `pages/secrets.js` — cadastrar, listar, remover secrets
- [x] `pages/billing.js` — histórico + resumo de uso
- [x] Navegação lateral dinâmica
- [x] Todas as páginas consomem API via fetch

### 6.3 Design Premium
- [x] Paleta de cores escura (dark mode) — `var(--bg-primary: #0a0e17)`
- [x] Google Fonts (Inter)
- [x] Cards com glassmorphism/gradients
- [x] Animações suaves em transições (fadeIn, slideUp, heroGlow)
- [x] Responsivo (mobile-friendly) — media queries 1024/768/480px
- [x] Ícones (Lucide via CDN — unpkg.com/lucide)

### 6.4 Docker
- [x] Criar `Dockerfile` — multi-stage build
- [x] Stage 1: Go build (compilar core + plugins)
- [x] Stage 2: Alpine minimal (copiar binário)
- [x] Atualizar `docker-compose.yml`:
  - [x] Serviço `core` (build do Dockerfile)
  - [x] Serviço `postgres` (com volume persistente + healthcheck)
  - [x] Serviço `redis` (com healthcheck)
  - [x] Network interna `crom-net`
- [x] Testar: `docker compose up` sobe PG + Redis (healthy)
- [x] Acessar `http://localhost:8080` → dashboard HTML 200

### 6.5 Testes E2E
- [x] Implementar `tests/e2e_curl_test.sh` (23 testes via curl)
- [x] Testar fluxo completo: register → login → credits → keys → plugin → secrets → revoke
- [x] Testar error scenarios (401 sem key, revoked key rejeita)
- [x] Testes unitários Go: auth, gateway, server, vault (todos PASS)
- [x] `make test-e2e` → 23/23 passed

### 6.6 Hardening
- [x] Rate limiting via Redis (por IP e por key)
- [x] Headers de segurança: HSTS, X-Frame-Options, CSP, nosniff, XSS-Protection
- [x] Sanitização de input em handlers (email, nome, senha, slug)
- [x] Timeout de 30s para chamadas ao plugin
- [x] Limit de body size (10MB)
- [x] Logging de erros de segurança (security_event com IP, user-agent, path)

### ✅ Critério de Sucesso Sprint 6
- [x] `docker compose up` → PG + Redis healthy
- [x] `curl localhost:8080` → dashboard renderiza (200, 22KB CSS)
- [x] Criar conta via curl → 201 OK
- [x] Criar key via curl → retorna `crom_sk_live_*`
- [x] Usar key via curl → echo/ping → pong + meta.credits
- [x] Ver uso via curl → usage/summary retorna dados
- [x] `make test-e2e` → **23/23 testes passed**

---

## Validação Final do MVP

| # | Teste | Resultado |
|---|-------|-----------|
| 1 | [x] Health check funciona | ✅ GET /v1/system/health |
| 2 | [x] Plugin echo responde via API | ✅ Compilado e registrado |
| 3 | [x] Request sem API Key → 401 | ✅ Auth middleware |
| 4 | [x] Key sem permissão → 403 | ✅ HasPermission() |
| 5 | [x] Saldo insuficiente → 402 | ✅ DebitCredits atômico |
| 6 | [x] Lista de plugins dinâmica | ✅ /v1/system/plugins |
| 7 | [x] CRUD de API Keys funcional | ✅ Create/List/Revoke |
| 8 | [x] Revogação de key funciona | ✅ is_active = false |
| 9 | [x] Secrets criptografados e injetados | ✅ AES-256-GCM testado |
| 10 | [x] Usage log registra chamadas | ✅ LogUsage() |
| 11 | [x] Saldo debita corretamente | ✅ FOR UPDATE atômico |
| 12 | [x] Scaffolding gera plugin funcional | ✅ Testado Go + Python |
| 13 | [x] Dashboard web funciona | ✅ SPA com embed.FS |
| 14 | [x] Docker compose sobe tudo | ✅ Dockerfile + compose |
