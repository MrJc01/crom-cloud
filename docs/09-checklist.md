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
- [ ] Instalar dependência: `golang-migrate/migrate`
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
- [ ] Instalar `protoc` (protobuf compiler) no sistema
- [ ] Instalar `protoc-gen-go` e `protoc-gen-go-grpc`
- [x] Criar `core/proto/plugin.proto` (conforme docs/01-architecture.md)
- [ ] Gerar código Go: `protoc --go_out=. --go-grpc_out=. plugin.proto`
- [ ] Verificar arquivos gerados: `plugin.pb.go` e `plugin_grpc.pb.go`
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
- [ ] Criar pasta `migrations/`
- [ ] Integrar `golang-migrate` no main.go (auto-migrate on startup)
- [ ] Testar: servidor inicia e roda migrações sem erro

### 1.7 Makefile Raiz
- [x] Target `proto` — gera código protobuf
- [x] Target `build` — compila core
- [x] Target `dev` — roda com hot reload (air ou go run)
- [x] Target `test` — roda testes unitários
- [ ] Target `migrate-up` / `migrate-down`
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
- [ ] Criar `core/internal/gateway/health.go`
- [ ] Goroutine que roda a cada 30s (configurável)
- [ ] Para cada plugin ativo: chamar `HealthCheck()` via gRPC
- [ ] Se timeout ou erro → marcar como `unhealthy`
- [ ] Se `unhealthy` 3x consecutivas → marcar como `unavailable`
- [ ] Logar mudanças de status
- [ ] Requisições para plugin `unavailable` → 503

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
- [ ] Criar `templates/template-go/manifest.json.tmpl`
- [ ] Criar `templates/template-go/main.go.tmpl`
- [ ] Criar `templates/template-go/handler.go.tmpl`
- [ ] Criar `templates/template-go/go.mod.tmpl`
- [ ] Criar `templates/template-go/Makefile`
- [ ] Usar placeholders: `{{PLUGIN_SLUG}}`, `{{PLUGIN_NAME}}`
- [ ] Testar: copiar manualmente, substituir, compilar → funciona

### 5.2 Template Multi-Linguagem
- [ ] Criar `templates/template-multilang/manifest.json.tmpl`
- [ ] Criar `templates/template-multilang/main.go.tmpl`
- [ ] Criar `templates/template-multilang/bridge.go.tmpl`
- [ ] Criar `templates/template-multilang/go.mod.tmpl`
- [ ] Criar `templates/template-multilang/Makefile`
- [ ] Criar `templates/template-multilang/scripts/.gitkeep`
- [ ] bridge.go genérico: lê stdin/stdout do subprocesso
- [ ] Testar: copiar, adicionar script Python, compilar → funciona

### 5.3 Script de Scaffolding
- [ ] Criar `tools/create-plugin.sh`
- [ ] Argumento 1: slug do plugin (obrigatório)
- [ ] Flag `--lang=go|python|node|bash` (default: go)
- [ ] Flag `--name="Nome Amigável"` (default: slug capitalizado)
- [ ] Validar que slug não existe em /plugins/
- [ ] Copiar template adequado para `plugins/<slug>/`
- [ ] Substituir todos os placeholders
- [ ] Inicializar `go.mod`
- [ ] Adicionar ao `go.work`
- [ ] Imprimir instruções de próximos passos
- [ ] `chmod +x tools/create-plugin.sh`
- [ ] Testar: `./tools/create-plugin.sh test-go`
- [ ] Testar: `./tools/create-plugin.sh test-py --lang=python`
- [ ] Testar: compilar e rodar ambos → Core detecta

### 5.4 Hot Reload de Plugins
- [ ] Criar `core/internal/gateway/reload.go`
- [ ] `POST /v1/system/reload` (autenticado, admin only)
- [ ] Para plugins antigos: manter os que não mudaram
- [ ] Para plugins novos: iniciar e registrar
- [ ] Para plugins removidos: shutdown graceful
- [ ] Testar: adicionar plugin novo → reload → aparece no /system/plugins

### ✅ Critério de Sucesso Sprint 5
- [ ] `./tools/create-plugin.sh meu-plugin` → pasta criada
- [ ] `cd plugins/meu-plugin && make build` → compila
- [ ] `POST /v1/system/reload` → detecta novo plugin
- [ ] `curl /v1/meu-plugin/ping` → funciona
- [ ] Template multi-lang: Python script executa via bridge

---

## Sprint 6 — Dashboard Web e Docker

### 6.1 Frontend Base
- [ ] Criar `core/web/index.html` — shell SPA
- [ ] Criar `core/web/assets/css/style.css` — design dark mode premium
- [ ] Criar `core/web/assets/js/app.js` — router SPA + fetch helpers
- [ ] Configurar Go embed.FS para servir static files
- [ ] Rota `/` → serve index.html
- [ ] Rotas `/assets/*` → serve CSS/JS

### 6.2 Páginas do Dashboard
- [ ] `pages/login.html` — formulário login/registro
- [ ] `pages/dashboard.html` — cards: saldo, uso recente, plugins
- [ ] `pages/api-keys.html` — criar, listar, revogar keys
- [ ] `pages/secrets.html` — cadastrar, listar, remover secrets
- [ ] `pages/usage.html` — tabela de histórico + resumo
- [ ] Navegação lateral dinâmica
- [ ] Todas as páginas consomem API via fetch

### 6.3 Design Premium
- [ ] Paleta de cores escura (dark mode)
- [ ] Google Fonts (Inter ou Outfit)
- [ ] Cards com glassmorphism
- [ ] Animações suaves em transições
- [ ] Responsivo (mobile-friendly)
- [ ] Ícones (Lucide ou similar via CDN)

### 6.4 Docker
- [ ] Criar `Dockerfile` — multi-stage build
- [ ] Stage 1: Go build (compilar core + embed web)
- [ ] Stage 2: Alpine minimal (copiar binário)
- [ ] Atualizar `docker-compose.yml`:
  - [ ] Serviço `core` (build do Dockerfile)
  - [ ] Serviço `postgres` (com volume persistente)
  - [ ] Serviço `redis`
  - [ ] Network interna
- [ ] Testar: `docker-compose up --build` sobe tudo
- [ ] Acessar `http://localhost:8080` → dashboard funciona

### 6.5 Testes E2E
- [ ] Implementar helpers de test (setup DB, create dev, etc)
- [ ] Ativar `TestFullDeveloperFlow` (remover t.Skip)
- [ ] Ativar `TestErrorScenarios` (401, 402, 403, 404)
- [ ] Ativar `TestConcurrentCreditDebit` (race condition)
- [ ] Ativar testes de integração (API key flow, credit flow)
- [ ] Todos passam com `make test-all`

### 6.6 Hardening
- [ ] Rate limiting via Redis (por IP e por key)
- [ ] Headers de segurança: HSTS, X-Frame-Options, CSP
- [ ] Sanitização de input em todos os handlers
- [ ] Timeout de 30s para chamadas ao plugin
- [ ] Limit de body size (10MB)
- [ ] Logging de erros de segurança

### ✅ Critério de Sucesso Sprint 6
- [ ] `docker-compose up --build` → sistema completo sobe
- [ ] Browser `localhost:8080` → dashboard renderiza
- [ ] Criar conta pelo dashboard → funciona
- [ ] Criar key pelo dashboard → funciona
- [ ] Usar key via curl → resposta com créditos
- [ ] Ver uso no dashboard → aparece
- [ ] `make test-all` → todos os testes passam

---

## Validação Final do MVP

| # | Teste | Resultado |
|---|-------|-----------|
| 1 | [ ] Health check funciona | |
| 2 | [ ] Plugin echo responde via API | |
| 3 | [ ] Request sem API Key → 401 | |
| 4 | [ ] Key sem permissão → 403 | |
| 5 | [ ] Saldo insuficiente → 402 | |
| 6 | [ ] Lista de plugins dinâmica | |
| 7 | [ ] CRUD de API Keys funcional | |
| 8 | [ ] Revogação de key funciona | |
| 9 | [ ] Secrets criptografados e injetados | |
| 10 | [ ] Usage log registra chamadas | |
| 11 | [ ] Saldo debita corretamente | |
| 12 | [ ] Scaffolding gera plugin funcional | |
| 13 | [ ] Dashboard web funciona | |
| 14 | [ ] Docker compose sobe tudo | |
