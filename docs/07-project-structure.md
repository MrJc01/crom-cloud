# Estrutura de Arquivos e Pastas

> **Organização:** Monorepo com Go Workspace (`go.work`)
> **Convenção:** Cada plugin é um módulo Go independente
> **Última atualização:** 2026-05-05

---

## Árvore Completa do Projeto

```text
crom-cloud/
│
├── docs/                                   # ══ DOCUMENTAÇÃO ══
│   ├── 00-visao-geral.md                  # Visão geral do produto
│   ├── 01-architecture.md                 # Arquitetura técnica
│   ├── 02-database-schema.md             # Modelagem de dados e SQL
│   ├── 03-api-reference.md               # Referência da API pública
│   ├── 04-plugin-development-guide.md    # Guia para criar plugins
│   ├── 05-credit-system.md              # Sistema de créditos
│   ├── 06-security.md                    # Segurança e isolamento
│   ├── 07-project-structure.md           # Este documento
│   ├── 08-roadmap.md                     # Fases de implementação
│   └── 09-checklist.md                   # Checklist de execução
│
├── core/                                   # ══ CORE (Go) — O Cérebro ══
│   ├── cmd/
│   │   └── crom-cloud/
│   │       └── main.go                    # Entrypoint (auto-migrate, router, shutdown)
│   │
│   ├── internal/
│   │   ├── config/
│   │   │   └── config.go                 # Carrega .env + envconfig
│   │   │
│   │   ├── server/
│   │   │   ├── router.go                 # Router chi + middlewares padrão
│   │   │   ├── response.go              # APIResponse, WriteJSON, WriteError
│   │   │   ├── middleware.go            # SecurityHeaders, MaxBodySize
│   │   │   ├── ratelimit.go             # Rate limiting via Redis
│   │   │   └── sanitize.go             # Validação de input (email, slug, UUID)
│   │   │
│   │   ├── auth/
│   │   │   ├── apikey.go                 # Middleware API Key (SHA-256) + HasPermission()
│   │   │   ├── jwt_middleware.go        # Middleware JWT para Dashboard
│   │   │   └── session.go               # GenerateJWT, ValidateJWT
│   │   │
│   │   ├── billing/
│   │   │   └── credits.go               # DebitCredits, RefundCredits, AddCredits,
│   │   │                                 # GetBalance, LogUsage, GetCreditHistory,
│   │   │                                 # GetUsageLogs, GetUsageSummary
│   │   │
│   │   ├── gateway/
│   │   │   ├── manifest.go              # PluginManifest struct + LoadManifest + Validate
│   │   │   ├── discovery.go             # PluginManager: Discover, GetPlugin, Shutdown
│   │   │   ├── dispatcher.go            # HTTP → gRPC: auth, billing, secrets, dispatch
│   │   │   ├── health.go               # HealthMonitor: goroutine periódica 30s
│   │   │   └── reload.go               # Hot reload: POST /v1/system/reload
│   │   │
│   │   ├── vault/
│   │   │   └── secrets.go              # AES-256-GCM: Set/Get/Delete/ListSecrets
│   │   │
│   │   ├── handlers/
│   │   │   ├── account.go              # Register, Login, Me
│   │   │   ├── keys.go                 # Create, List, Revoke API Keys
│   │   │   └── billing.go             # GetBalance, AddCredits, GetCredits,
│   │   │                               # GetCreditHistory, GetUsage, GetUsageSummary,
│   │   │                               # SetSecret, ListSecrets, DeleteSecret
│   │   │
│   │   └── models/
│   │       ├── developer.go             # Model: Developer (Create, FindByEmail/ID)
│   │       └── apikey.go                # Model: APIKey + KeyPermission (Generate, FindByHash)
│   │
│   ├── proto/
│   │   ├── plugin.proto                 # Contrato gRPC (fonte de verdade)
│   │   ├── plugin.pb.go                # Gerado: protoc --go_out
│   │   └── plugin_grpc.pb.go           # Gerado: protoc --go-grpc_out
│   │
│   ├── go.mod
│   └── go.sum
│
├── plugins/                               # ══ PLUGINS ATIVOS ══
│   │                                      # (Core escaneia ao iniciar)
│   └── echo/                             # ── Plugin de Teste ──
│       ├── manifest.json
│       ├── main.go                       # Wrapper gRPC + handler
│       ├── go.mod
│       └── echo                          # Binário compilado (gitignored)
│
├── templates/                             # ══ FÁBRICA DE PLUGINS ══
│   ├── template-go/                      # Template: Plugin 100% Go
│   │   ├── manifest.json.tmpl
│   │   ├── main.go.tmpl
│   │   ├── handler.go.tmpl
│   │   ├── go.mod.tmpl
│   │   └── Makefile.tmpl
│   │
│   └── template-multilang/               # Template: Go + Outra Linguagem
│       ├── manifest.json.tmpl
│       ├── main.go.tmpl
│       ├── bridge.go.tmpl               # Executor de subprocesso stdin/stdout
│       ├── go.mod.tmpl
│       ├── Makefile.tmpl
│       └── scripts/
│           └── .gitkeep
│
├── web/                                   # ══ DASHBOARD SPA ══
│   ├── index.html                        # Entry point
│   └── static/
│       ├── style.css                     # Estilos globais
│       ├── router.js                     # SPA router (hash-based)
│       ├── api.js                        # Fetch helpers
│       ├── app.js                        # App bootstrap
│       └── pages/                        # Páginas da SPA
│           ├── home.js
│           ├── auth.js
│           ├── dashboard.js
│           ├── keys.js
│           ├── secrets.js
│           ├── billing.js
│           ├── plugins.js
│           └── docs.js
│
├── tests/                                 # ══ TESTES ══
│   ├── README.md
│   ├── run_all.sh                        # Script runner completo
│   ├── docker-compose.test.yml          # Infra para testes
│   ├── core/                             # Testes unitários do Core
│   ├── integration/                      # Testes de integração
│   ├── e2e/                              # Testes end-to-end
│   └── plugins/                          # Testes de plugins
│
├── tools/                                 # Scripts de automação
│   └── create-plugin.sh                  # Scaffolding de novos plugins
│
├── migrations/                            # Migrações SQL (auto-migrate)
│   ├── 001_create_developers.{up,down}.sql
│   ├── 002_create_api_keys.{up,down}.sql
│   ├── 003_create_key_permissions.{up,down}.sql
│   ├── 004_create_credit_transactions.{up,down}.sql
│   ├── 005_create_usage_logs.{up,down}.sql
│   ├── 006_create_dev_secrets.{up,down}.sql
│   └── 007_create_plugin_registry.{up,down}.sql
│
├── docker-compose.yml                     # Core + PostgreSQL + Redis
├── Dockerfile                             # Multi-stage build (Go → Alpine)
├── go.work                                # Go Workspace (core + plugins)
├── .env.example                           # Variáveis de ambiente
├── .env                                   # Config local (gitignored)
├── .gitignore
├── Makefile                               # Comandos globais
└── README.md                              # Documentação de entrada
```

---

## Convenções de Nomenclatura

| Item | Convenção | Exemplo |
|------|-----------|---------|
| Pasta de plugin | `kebab-case` | `echo`, `dns-manager` |
| Slug do plugin | `kebab-case` | `echo`, `ai-proxy` |
| Binário compilado | Nome do slug (sem extensão) | `echo`, `dns-manager` |
| Arquivos Go | `snake_case.go` | `apikey.go`, `handler.go` |
| Scripts externos | Convenção da linguagem | `main.py`, `main.js` |
| Migrações SQL | `NNN_description.{up\|down}.sql` | `001_create_developers.up.sql` |
| Templates | `nome.ext.tmpl` | `main.go.tmpl`, `manifest.json.tmpl` |

---

## .gitignore

```gitignore
# Binários compilados dos plugins
plugins/*/echo
plugins/*/*.bin

# Dependências
vendor/
node_modules/

# Ambiente
.env
*.env.local

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
Thumbs.db

# Build
dist/
tmp/
```

---

## Documentos Relacionados

- **Anterior:** [06-security.md](./06-security.md)
- **Próximo:** [08-roadmap.md](./08-roadmap.md)
