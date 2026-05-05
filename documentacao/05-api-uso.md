# 05 — Usar a API

## Autenticação

O Crom Cloud usa **dois tipos de autenticação**:

| Tipo | Formato | Usado para |
|------|---------|------------|
| **JWT** | `Bearer eyJhbG...` | Dashboard: gerenciar conta, keys, secrets, billing |
| **API Key** | `Bearer crom_sk_live_...` | Consumir plugins via API |

---

## Fluxo Completo

### 1. Registrar Conta

```bash
curl -X POST http://localhost:8080/v1/account/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dev@empresa.com",
    "name": "João Dev",
    "password": "minha_senha_segura"
  }'
```

### 2. Login → Obter JWT

```bash
curl -X POST http://localhost:8080/v1/account/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dev@empresa.com",
    "password": "minha_senha_segura"
  }'
```
Resposta:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "developer": {"id": "uuid", "email": "dev@empresa.com"}
  }
}
```

### 3. Adicionar Créditos

```bash
curl -X POST http://localhost:8080/v1/account/credits \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "type": "purchase", "description": "Compra inicial"}'
```

### 4. Configurar Secrets (se o plugin exigir)

```bash
curl -X POST http://localhost:8080/v1/account/secrets \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "plugin_slug": "echo",
    "secret_name": "api_key",
    "value": "sk-minha-chave-externa"
  }'
```

### 5. Criar API Key

```bash
curl -X POST http://localhost:8080/v1/account/keys \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Backend Produção",
    "permissions": [
      {"plugin_slug": "echo", "scope": "write"},
      {"plugin_slug": "dns", "scope": "read"}
    ]
  }'
```

> ⚠️ **A key completa só aparece UMA VEZ.** Guarde-a em local seguro.

### 6. Usar Plugin (com API Key)

```bash
# GET
curl http://localhost:8080/v1/echo/ping \
  -H "Authorization: Bearer crom_sk_live_..."

# POST com payload
curl -X POST http://localhost:8080/v1/echo/reflect \
  -H "Authorization: Bearer crom_sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{"mensagem": "oi!"}'
```

Resposta com metadados:
```json
{
  "success": true,
  "data": {"message": "pong"},
  "meta": {
    "plugin": "echo",
    "credits_remaining": 995,
    "request_id": "req_abc123",
    "latency_ms": 15
  }
}
```

---

## Endpoints de Consulta (JWT)

```bash
# Ver minha conta
curl http://localhost:8080/v1/account/me -H "Authorization: Bearer <JWT>"

# Ver saldo
curl http://localhost:8080/v1/account/balance -H "Authorization: Bearer <JWT>"

# Histórico de créditos
curl "http://localhost:8080/v1/account/credits/history?limit=50" -H "Authorization: Bearer <JWT>"

# Histórico de uso
curl "http://localhost:8080/v1/account/usage?limit=50" -H "Authorization: Bearer <JWT>"

# Resumo mensal
curl "http://localhost:8080/v1/account/usage/summary?from=2026-05-01&to=2026-05-31" \
  -H "Authorization: Bearer <JWT>"

# Listar keys
curl http://localhost:8080/v1/account/keys -H "Authorization: Bearer <JWT>"

# Listar secrets (sem valores)
curl http://localhost:8080/v1/account/secrets -H "Authorization: Bearer <JWT>"

# Listar plugins
curl http://localhost:8080/v1/system/plugins
```

---

## Revogar e Deletar

```bash
# Revogar API Key
curl -X DELETE http://localhost:8080/v1/account/keys/<KEY_ID> \
  -H "Authorization: Bearer <JWT>"

# Deletar secret
curl -X DELETE http://localhost:8080/v1/account/secrets/echo/api_key \
  -H "Authorization: Bearer <JWT>"
```

---

## Códigos de Erro

| HTTP | Código | Quando |
|------|--------|--------|
| 400 | `INVALID_JSON` | Payload malformado |
| 401 | `UNAUTHORIZED` | Sem key ou key inválida |
| 402 | `INSUFFICIENT_CREDITS` | Saldo zerado |
| 403 | `FORBIDDEN` | Key sem permissão para o plugin |
| 404 | `NOT_FOUND` | Plugin ou recurso inexistente |
| 429 | `RATE_LIMITED` | Excedeu limite de requisições |

---

**Próximo:** [06-dashboard.md](06-dashboard.md) — Dashboard web
