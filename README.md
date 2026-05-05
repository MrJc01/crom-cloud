# Crom Cloud — API Gateway

> **Plataforma SaaS** que expõe ferramentas e serviços diversos através de uma **API única e centralizada**.
> Inspirado no modelo do [OpenRouter](https://openrouter.ai), mas aplicado a **qualquer tipo de ferramenta/serviço**.
>
> **Status:** ✅ MVP Completo — 315/315 checklist | 25/25 E2E | 24 unit tests Go

---

## 🚀 Quick Start

### Pré-requisitos

- Go 1.25+
- Docker / Podman + Compose
- PostgreSQL 16+ (via container)
- Redis 7+ (via container)

### 1. Clonar e configurar

```bash
git clone https://github.com/crom/crom-cloud.git
cd crom-cloud
cp .env.example .env
# Edite o .env com suas configurações (ou use defaults para dev)
```

### 2. Subir infraestrutura

```bash
# Sobe PostgreSQL + Redis (compatível Docker e Podman)
docker compose up -d postgres redis

# Compilar tudo (core com frontend embed + plugins)
make build-all

# Rodar em modo dev
make dev
```

### 3. Testar

```bash
# Health check
curl http://localhost:8080/v1/system/health

# Registrar um desenvolvedor
curl -X POST http://localhost:8080/v1/account/register \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","name":"Dev","password":"123456"}'

# Login → obter JWT
curl -X POST http://localhost:8080/v1/account/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"123456"}'

# Criar API Key (com JWT do login)
curl -X POST http://localhost:8080/v1/account/keys \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"label":"Test Key","permissions":[{"plugin_slug":"echo","scope":"write"}]}'

# Usar plugin echo (com API Key)
curl http://localhost:8080/v1/echo/ping \
  -H "Authorization: Bearer crom_sk_live_..."
```

### 4. Rodar testes

```bash
make test       # Testes unitários Go (auth, gateway, server, vault)
make test-e2e   # 25 testes E2E via curl (requer servidor rodando)
make test-all   # Todos os testes
```

---

## 📐 Arquitetura

```
┌─────────────┐     ┌──────────────────────────────────┐     ┌────────────┐
│   Cliente    │────▶│        Crom Cloud Core           │────▶│  Plugin A  │
│  (API Key)   │     │  Auth → Billing → Dispatch       │     │  (gRPC)    │
└─────────────┘     │  ┌──────┐ ┌───────┐ ┌──────────┐ │     ├────────────┤
                    │  │ Auth │ │Billing│ │  Vault   │ │────▶│  Plugin B  │
                    │  └──────┘ └───────┘ └──────────┘ │     │  (gRPC)    │
                    └──────────────────────────────────┘     └────────────┘
                         │              │
                    ┌────┴────┐    ┌────┴────┐
                    │  PG 16  │    │ Redis 7 │
                    └─────────┘    └─────────┘
```

**Princípio:** O Core é um roteador inteligente. Plugins são processos independentes que se comunicam via gRPC.

---

## 📁 Estrutura do Projeto

```
crom-cloud/
├── core/                  # Core (Go) — API Gateway
│   ├── cmd/crom-cloud/    # Entrypoint (auto-migrate, router, shutdown)
│   ├── internal/          # Packages internos
│   │   ├── auth/          # API Key + JWT middleware + HasPermission
│   │   ├── billing/       # Sistema de créditos (débito atômico)
│   │   ├── gateway/       # Plugin discovery, dispatch, health, reload
│   │   ├── handlers/      # HTTP handlers (account, keys, billing, secrets)
│   │   ├── models/        # Data models (developer, apikey, plugin)
│   │   ├── server/        # Router, middlewares, responses, sanitize
│   │   └── vault/         # Cofre de secrets (AES-256-GCM)
│   ├── proto/             # Contrato gRPC (.proto + gerado)
│   └── web/               # Frontend SPA (embed.FS — embutido no binário)
│       ├── embed.go       # Handler HTTP que serve o SPA
│       ├── index.html
│       └── static/        # CSS, JS, pages/
├── plugins/               # Plugins ativos
│   └── echo/              # Plugin de teste (ping, reflect, check-secrets)
├── templates/             # Templates para scaffolding de plugins
│   ├── template-go/       # Plugin 100% Go
│   └── template-multilang/# Go bridge + Python/Node/Bash
├── web/                   # Fonte do frontend (copiado para core/web/ no build)
├── tests/                 # Testes
│   ├── e2e_curl_test.sh   # 25 testes E2E via curl
│   ├── core/              # Testes unitários
│   └── e2e/               # Testes E2E (Go)
├── tools/                 # Scripts de automação
│   └── create-plugin.sh   # Scaffolding de novos plugins
├── migrations/            # SQL migrations (001-007, auto-migrate)
├── docs/                  # Documentação completa (00-09)
├── Dockerfile             # Multi-stage build (Go → Alpine, non-root)
├── docker-compose.yml     # Core + PG + Redis (Docker/Podman)
├── Makefile               # Comandos de automação
└── go.work                # Go Workspace (core + plugins)
```

---

## 📚 Documentação

| Documento | Descrição |
|-----------|-----------|
| [Visão Geral](docs/00-visao-geral.md) | O que é o Crom Cloud |
| [Arquitetura](docs/01-architecture.md) | Core + Plugins via gRPC |
| [Database Schema](docs/02-database-schema.md) | 7 tabelas, diagrama ER |
| [API Reference](docs/03-api-reference.md) | Todos os endpoints da API |
| [Plugin Guide](docs/04-plugin-development-guide.md) | Como criar plugins |
| [Credit System](docs/05-credit-system.md) | Sistema de billing |
| [Security](docs/06-security.md) | Segurança e isolamento |
| [Project Structure](docs/07-project-structure.md) | Árvore de arquivos |
| [Roadmap](docs/08-roadmap.md) | Fases de implementação |
| [Checklist](docs/09-checklist.md) | 315/315 ✅ |

---

## 🛠 Comandos (Makefile)

| Comando | Descrição |
|---------|-----------|
| `make dev` | Roda o servidor em modo desenvolvimento |
| `make build` | Compila Core (com frontend embed) |
| `make build-all` | Compila Core + todos os plugins |
| `make sync-web` | Sincroniza `web/` → `core/web/` para embed |
| `make test` | Testes unitários Go (24 testes) |
| `make test-e2e` | 25 testes E2E via curl (servidor deve estar rodando) |
| `make test-all` | Todos os testes |
| `make docker-up` | Sobe PostgreSQL + Redis |
| `make docker-down` | Para os containers |
| `make proto` | Regenera código gRPC |

---

## 🐳 Docker / Podman

```bash
# Docker
docker compose up -d --build

# Podman
podman-compose up -d --build
```

O `Dockerfile` e `docker-compose.yml` são compatíveis com ambos:
- Imagens com FQDNs (`docker.io/library/...`)
- Sem features Docker-only
- Usuário não-root no runtime
- Multi-stage build otimizado

---

## 🔒 Segurança

- **AES-256-GCM** com nonce único para criptografia de secrets
- **SHA-256** para hash de API Keys (never stored in plain)
- **JWT HS256** com expiração para sessões do dashboard
- **Rate limiting** via Redis (por IP e por key)
- **Security headers** (HSTS, CSP, X-Frame-Options, nosniff)
- **Sanitização** de todos os inputs (email, slug, nome, UUID)
- **Usuário não-root** no container de produção

---

## 📜 Licença

**Crom Sustainable Use License v1.0** — [LICENSE.md](LICENSE.md)

- ✅ Uso pessoal e educacional
- ✅ Uso comercial interno (sua empresa/infra)
- ✅ Projetos para clientes (onde o software não é o produto principal)
- ✅ Modificar e criar forks privados
- ❌ Revender ou redistribuir como produto sem permissão
- ❌ Criar produto concorrente
- ⚠️ Atribuição obrigatória: `Powered by Crom Cloud — © CROM Ecosystem`

Para licenciamento comercial: **license@crom.dev**
