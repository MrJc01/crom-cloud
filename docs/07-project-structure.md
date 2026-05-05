# Estrutura de Arquivos e Pastas

> **Organização:** Monorepo com Go Workspace (`go.work`)
> **Convenção:** Cada plugin é um módulo Go independente

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
│   └── 08-roadmap.md                     # Checklist de execução
│
├── core/                                   # ══ CORE (Go) — O Cérebro ══
│   ├── cmd/
│   │   └── crom-cloud/
│   │       └── main.go                    # Entrypoint do servidor
│   │
│   ├── internal/
│   │   ├── server/
│   │   │   ├── router.go                 # Router dinâmico /v1/{slug}/*
│   │   │   └── middleware.go             # CORS, logging, recovery
│   │   │
│   │   ├── auth/
│   │   │   ├── apikey.go                 # Validação SHA-256 de API Key
│   │   │   ├── permissions.go            # Verifica scope da key vs plugin
│   │   │   └── session.go               # JWT para o Dashboard web
│   │   │
│   │   ├── billing/
│   │   │   ├── credits.go               # Débito/crédito atômico
│   │   │   ├── pricing.go               # Lê custos do manifest.json
│   │   │   └── usage.go                 # Registra no usage_log
│   │   │
│   │   ├── gateway/
│   │   │   ├── discovery.go             # Escaneia /plugins/*/manifest.json
│   │   │   ├── dispatcher.go            # Despacha HTTP → gRPC do plugin
│   │   │   └── health.go               # Health check periódico
│   │   │
│   │   ├── vault/
│   │   │   └── secrets.go              # CRUD + AES-256-GCM de secrets
│   │   │
│   │   └── models/
│   │       ├── developer.go             # Model: Developer
│   │       ├── apikey.go                # Model: API Key + Permissions
│   │       ├── usage.go                 # Model: Usage Log
│   │       ├── secret.go               # Model: Dev Secret
│   │       ├── credit.go               # Model: Credit Transaction
│   │       └── plugin.go               # Model: Plugin Registry
│   │
│   ├── proto/
│   │   ├── plugin.proto                 # Contrato gRPC (fonte de verdade)
│   │   └── plugin_grpc.pb.go           # Gerado: protoc --go_out
│   │
│   ├── web/                             # Dashboard Frontend
│   │   ├── index.html                   # SPA entry point
│   │   ├── assets/
│   │   │   ├── css/style.css
│   │   │   └── js/app.js
│   │   └── pages/
│   │       ├── dashboard.html           # Visão geral (créditos, uso)
│   │       ├── api-keys.html            # CRUD de API Keys
│   │       ├── secrets.html             # Cofre de tokens externos
│   │       └── usage.html               # Logs de consumo
│   │
│   ├── go.mod
│   └── go.sum
│
├── plugins/                               # ══ PLUGINS ATIVOS ══
│   │                                      # (Core escaneia ao iniciar)
│   │
│   ├── dns-manager/                       # ── Plugin 100% Go ──
│   │   ├── manifest.json
│   │   ├── main.go                       # Wrapper gRPC
│   │   ├── handler.go                    # Lógica: list_zones, create_record
│   │   ├── go.mod
│   │   ├── Makefile
│   │   └── dns-manager.bin              # (gitignored)
│   │
│   ├── ai-proxy/                          # ── Plugin Go + Python ──
│   │   ├── manifest.json
│   │   ├── main.go                       # Wrapper gRPC
│   │   ├── bridge.go                     # Executor de subprocesso
│   │   ├── go.mod
│   │   ├── Makefile
│   │   ├── ai-proxy.bin                  # (gitignored)
│   │   └── scripts/
│   │       ├── requirements.txt
│   │       ├── engine.py                 # Lógica real (Python)
│   │       └── models/
│   │           └── openai_adapter.py
│   │
│   ├── web-scraper/                       # ── Plugin Go + Node.js ──
│   │   ├── manifest.json
│   │   ├── main.go
│   │   ├── bridge.go
│   │   ├── go.mod
│   │   ├── Makefile
│   │   ├── web-scraper.bin              # (gitignored)
│   │   └── scripts/
│   │       ├── package.json
│   │       ├── scraper.js
│   │       └── utils/
│   │           └── parser.js
│   │
│   └── backup-tool/                       # ── Plugin Go + Bash ──
│       ├── manifest.json
│       ├── main.go
│       ├── bridge.go
│       ├── go.mod
│       ├── Makefile
│       ├── backup-tool.bin
│       └── scripts/
│           ├── backup.sh
│           └── restore.sh
│
├── templates/                             # ══ FÁBRICA DE PLUGINS ══
│   │
│   ├── template-go/                      # Template: Plugin 100% Go
│   │   ├── manifest.json.tmpl
│   │   ├── main.go.tmpl
│   │   ├── handler.go.tmpl
│   │   ├── go.mod.tmpl
│   │   └── Makefile
│   │
│   └── template-multilang/               # Template: Go + Outra Linguagem
│       ├── manifest.json.tmpl
│       ├── main.go.tmpl
│       ├── bridge.go.tmpl
│       ├── go.mod.tmpl
│       ├── Makefile
│       └── scripts/
│           └── .gitkeep
│
├── tests/                                 # ══ TESTES ══
│   ├── README.md
│   ├── core/                             # Testes unitários do Core
│   ├── integration/                      # Testes de integração
│   ├── e2e/                              # Testes end-to-end
│   └── plugins/                          # Testes de plugins
│
├── tools/                                 # Scripts de automação
│   └── create-plugin.sh                  # Scaffolding de novos plugins
│
├── migrations/                            # Migrações SQL
│   ├── 001_create_developers.up.sql
│   ├── 001_create_developers.down.sql
│   ├── 002_create_api_keys.up.sql
│   └── ...
│
├── docker-compose.yml                     # Core + PostgreSQL + Redis
├── Dockerfile                             # Build do Core
├── go.work                                # Go Workspace
├── .env.example                           # Variáveis de ambiente
├── .gitignore
├── Makefile                               # Comandos globais
└── README.md
```

---

## Convenções de Nomenclatura

| Item | Convenção | Exemplo |
|------|-----------|---------|
| Pasta de plugin | `kebab-case` | `dns-manager`, `ai-proxy` |
| Slug do plugin | `kebab-case` | `dns`, `ai`, `web-scraper` |
| Binário compilado | `{slug}.bin` | `dns-manager.bin` |
| Arquivos Go | `snake_case.go` | `api_key.go`, `handler.go` |
| Scripts externos | Convenção da linguagem | `engine.py`, `scraper.js` |
| Migrações SQL | `NNN_description.{up\|down}.sql` | `001_create_developers.up.sql` |

---

## .gitignore Sugerido

```gitignore
# Binários compilados dos plugins
plugins/**/*.bin

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
