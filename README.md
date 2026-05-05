# Crom Cloud — API Gateway

> **Plataforma SaaS** que expõe ferramentas e serviços diversos através de uma **API única e centralizada**.
> Inspirado no modelo do [OpenRouter](https://openrouter.ai), mas aplicado a **qualquer tipo de ferramenta/serviço**.

---

## 🚀 Quick Start

### Pré-requisitos

- Go 1.25+
- Docker & Docker Compose
- PostgreSQL 16+ (via Docker)
- Redis 7+ (via Docker)

### 1. Clonar e configurar

```bash
git clone https://github.com/crom/crom-cloud.git
cd crom-cloud
cp .env.example .env
# Edite o .env com suas configurações
```

### 2. Subir infraestrutura

```bash
# Sobe PostgreSQL + Redis
make docker-up

# Compilar plugin echo
make build-echo

# Rodar em modo dev (compila e inicia)
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
├── core/                 # Core (Go) — API Gateway
│   ├── cmd/crom-cloud/   # Entrypoint
│   ├── internal/         # Packages internos
│   │   ├── auth/         # API Key + JWT middleware
│   │   ├── billing/      # Sistema de créditos
│   │   ├── gateway/      # Plugin discovery, dispatch, health
│   │   ├── handlers/     # HTTP handlers (account, keys, billing)
│   │   ├── models/       # Data models (developer, apikey)
│   │   ├── server/       # Router, middlewares, responses
│   │   └── vault/        # Cofre de secrets (AES-256-GCM)
│   └── proto/            # Contrato gRPC (.proto + gerado)
├── plugins/              # Plugins ativos
│   └── echo/             # Plugin de teste
├── migrations/           # SQL migrations (auto-migrate)
├── web/                  # Dashboard SPA
├── tests/                # Testes (unit, integration, e2e)
├── docs/                 # Documentação completa
├── Dockerfile            # Multi-stage build
├── docker-compose.yml    # Core + PG + Redis
└── Makefile              # Comandos de automação
```

---

## 📚 Documentação

| Documento | Descrição |
|-----------|-----------|
| [Visão Geral](docs/00-visao-geral.md) | O que é o Crom Cloud |
| [Arquitetura](docs/01-architecture.md) | Core + Plugins via gRPC |
| [Database Schema](docs/02-database-schema.md) | Modelagem de dados |
| [API Reference](docs/03-api-reference.md) | Endpoints da API |
| [Plugin Guide](docs/04-plugin-development-guide.md) | Como criar plugins |
| [Credit System](docs/05-credit-system.md) | Sistema de billing |
| [Security](docs/06-security.md) | Segurança e isolamento |
| [Project Structure](docs/07-project-structure.md) | Árvore de arquivos |
| [Roadmap](docs/08-roadmap.md) | Fases de implementação |
| [Checklist](docs/09-checklist.md) | Checklist detalhado |

---

## 🛠 Comandos (Makefile)

| Comando | Descrição |
|---------|-----------|
| `make dev` | Roda o servidor em modo desenvolvimento |
| `make build` | Compila o binário do Core |
| `make build-all` | Compila Core + todos os plugins |
| `make test` | Testes unitários do Core |
| `make test-all` | Todos os testes (unit + integration + e2e) |
| `make docker-up` | Sobe PostgreSQL + Redis |
| `make docker-down` | Para os containers |
| `make migrate-up` | Aplica migrações pendentes |
| `make migrate-down` | Reverte última migração |
| `make proto` | Regenera código gRPC |

---

## 📜 Licença

Projeto privado — CROM Ecosystem.
