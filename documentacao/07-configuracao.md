# 07 — Configuração

## Variáveis de Ambiente

Todas as configurações ficam no `.env` (raiz do projeto).

| Variável | Obrigatória | Default | Descrição |
|----------|-------------|---------|-----------|
| `PORT` | ❌ | `8080` | Porta do servidor HTTP |
| `DATABASE_URL` | ✅ | — | Connection string PostgreSQL |
| `REDIS_URL` | ✅ | — | Endereço do Redis (`host:port`) |
| `VAULT_KEY` | ✅ | — | Chave mestra AES-256 (64 chars hex) |
| `JWT_SECRET` | ✅ | — | Chave para assinar JWT (64 chars hex) |
| `PLUGINS_DIR` | ❌ | `../plugins` | Diretório de plugins (relativo ao `core/`) |
| `MIGRATIONS_DIR` | ❌ | `../migrations` | Diretório de migrações SQL |

---

## Gerar Chaves Seguras

```bash
# VAULT_KEY (32 bytes = 64 chars hex)
openssl rand -hex 32

# JWT_SECRET
openssl rand -hex 32
```

> ⚠️ **NUNCA** commite o `.env` com chaves reais. O `.gitignore` já protege.

---

## Exemplo de `.env` para Desenvolvimento

```env
PORT=8080
DATABASE_URL=postgres://crom:crom_dev_2026@localhost:5432/crom_cloud?sslmode=disable
REDIS_URL=localhost:6379
VAULT_KEY=18c19cbe945c9d29a4d2483c37c281e2039198223c04203c31ee847cc4491d9f
JWT_SECRET=53e479335ea006337c5d52d17b77d0ecfb50f1d5c646229be042064e139fb51b
PLUGINS_DIR=../plugins
MIGRATIONS_DIR=../migrations
```

---

## Exemplo de `.env` para Produção

```env
PORT=8080
DATABASE_URL=postgres://crom:SENHA_FORTE_AQUI@crom-cloud-db:5432/crom_cloud?sslmode=disable
REDIS_URL=crom-cloud-redis:6379
VAULT_KEY=<openssl rand -hex 32>
JWT_SECRET=<openssl rand -hex 32>
PLUGINS_DIR=../plugins
MIGRATIONS_DIR=../migrations
```

---

## Docker Compose

O `docker-compose.yml` define 3 serviços:

| Serviço | Imagem | Porta | Healthcheck |
|---------|--------|-------|-------------|
| `postgres` | `postgres:16-alpine` | 5432 | `pg_isready` |
| `redis` | `redis:7-alpine` | 6379 | `redis-cli ping` |
| `core` | Build local | 8080 | — |

### Customizar no compose:

```yaml
services:
  postgres:
    environment:
      POSTGRES_PASSWORD: minha_senha_forte    # ← mudar
    volumes:
      - pgdata:/var/lib/postgresql/data       # persistência
```

---

## Migrações

As migrações SQL são aplicadas **automaticamente** ao iniciar o Core.

```bash
# Ver versão atual (no log do servidor)
# "migrações — versão atual version=7"

# Aplicar manualmente
make migrate-up

# Reverter última
make migrate-down

# Criar nova migração
make migrate-create NAME=add_nova_tabela
# → cria migrations/008_add_nova_tabela.{up,down}.sql
```

---

## Rate Limiting

Configurado no `core/cmd/crom-cloud/main.go`:

```go
rateLimiter := server.NewRateLimiter(rdb, 1000) // 1000 req/min por IP
```

Para alterar, modifique o valor `1000` e reinicie.

---

**Próximo:** [08-editar-projeto.md](08-editar-projeto.md) — Editar o projeto
