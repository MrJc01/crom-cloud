# 01 — Quickstart: Primeiro Uso em 5 Minutos

## Pré-requisitos

| Ferramenta | Versão | Verificar |
|------------|--------|-----------|
| Go | 1.25+ | `go version` |
| Docker ou Podman | Qualquer | `docker --version` ou `podman --version` |
| Docker Compose | v2+ | `docker compose version` |
| curl | Qualquer | `curl --version` |
| Git | Qualquer | `git --version` |

---

## Passo 1 — Clonar o Repositório

```bash
git clone https://github.com/crom/crom-cloud.git
cd crom-cloud
```

## Passo 2 — Configurar Ambiente

```bash
cp .env.example .env
```

O `.env` padrão já funciona para desenvolvimento local. Se precisar gerar chaves novas:

```bash
# Gerar VAULT_KEY
openssl rand -hex 32

# Gerar JWT_SECRET
openssl rand -hex 32
```

## Passo 3 — Subir o Banco e Redis

```bash
# Docker
docker compose up -d postgres redis

# Ou Podman
podman-compose up -d postgres redis
```

Aguarde os healthchecks (5-10 segundos):

```bash
docker compose ps
# STATUS deve mostrar "(healthy)" para ambos
```

## Passo 4 — Compilar o Plugin Echo

```bash
cd plugins/echo && go build -o echo . && cd ../..
```

## Passo 5 — Rodar o Servidor

```bash
cd core
export $(grep -v '^#' ../.env | grep -v '^$' | xargs)
go run ./cmd/crom-cloud
```

Saída esperada:
```
═══════════════════════════════════════
  Crom Cloud — API Gateway v0.1.0
═══════════════════════════════════════
INFO configuração carregada port=8080
INFO PostgreSQL conectado
INFO migrações aplicadas com sucesso
INFO Redis conectado
INFO plugin registrado slug=echo
INFO vault inicializado (AES-256-GCM)
INFO servidor iniciado addr=http://localhost:8080
```

## Passo 6 — Testar

```bash
# Health check
curl http://localhost:8080/v1/system/health

# Registrar
curl -X POST http://localhost:8080/v1/account/register \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@test.com","name":"Dev","password":"123456"}'

# Login
curl -X POST http://localhost:8080/v1/account/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@test.com","password":"123456"}'
# → copie o token da resposta

# Criar API Key (substitua <TOKEN>)
curl -X POST http://localhost:8080/v1/account/keys \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"label":"Minha Key","permissions":[{"plugin_slug":"echo","scope":"write"}]}'
# → copie a key (crom_sk_live_...)

# Usar o Plugin Echo
curl http://localhost:8080/v1/echo/ping \
  -H "Authorization: Bearer crom_sk_live_..."
# → {"success":true,"data":{"message":"pong"}}
```

## Passo 7 — Parar Tudo

```bash
# Ctrl+C no terminal do servidor
docker compose down
```

---

**Próximo:** [02-deploy.md](02-deploy.md) — Deploy em produção
