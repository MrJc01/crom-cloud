# Referência da API Pública

> **Base URL:** `https://api.cromcloud.com/v1`
> **Autenticação:** Bearer Token (API Key)

---

## 1. Autenticação

Toda requisição deve incluir a API Key no header `Authorization`:

```bash
curl -H "Authorization: Bearer crom_sk_live_7f3a8b2c..." \
     https://api.cromcloud.com/v1/dns/zones
```

### Formato da API Key

| Prefixo | Ambiente | Exemplo |
|---------|----------|---------|
| `crom_sk_live_` | Produção | `crom_sk_live_7f3a8b2c4d5e...` |
| `crom_sk_test_` | Sandbox/Teste | `crom_sk_test_a1b2c3d4e5f6...` |

---

## 2. Formato de Resposta Padrão

### Sucesso
```json
{
  "success": true,
  "data": { "...resultado do plugin..." },
  "meta": {
    "plugin": "ai-proxy",
    "credits_consumed": 50,
    "credits_remaining": 4800,
    "request_id": "req_abc123def456",
    "latency_ms": 342
  }
}
```

### Erro
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Saldo insuficiente. Necessário: 50. Saldo atual: 12.",
    "plugin": "ai-proxy"
  },
  "meta": {
    "credits_remaining": 12,
    "request_id": "req_def456ghi789"
  }
}
```

---

## 3. Códigos de Erro HTTP

| Status | Código | Descrição |
|--------|--------|-----------|
| 400 | `BAD_REQUEST` | Payload inválido ou campos obrigatórios ausentes |
| 401 | `UNAUTHORIZED` | API Key inválida, expirada ou ausente |
| 402 | `INSUFFICIENT_CREDITS` | Saldo de créditos insuficiente para a operação |
| 403 | `FORBIDDEN` | API Key não tem permissão para este plugin/ação |
| 404 | `PLUGIN_NOT_FOUND` | Plugin solicitado não existe ou está desativado |
| 429 | `RATE_LIMITED` | Excedeu o limite de requisições por minuto |
| 500 | `INTERNAL_ERROR` | Erro interno do Core |
| 502 | `PLUGIN_ERROR` | Plugin retornou um erro inesperado |
| 503 | `PLUGIN_UNAVAILABLE` | Plugin está em manutenção ou não respondeu ao health check |

---

## 4. Endpoints Públicos (Sem Autenticação)

### `POST /v1/account/register` — Registrar Desenvolvedor
```json
// Request
{"email": "dev@example.com", "name": "João Dev", "password": "minha_senha_segura"}

// Response (201)
{"success": true, "data": {"id": "uuid-123", "email": "dev@example.com", "name": "João Dev"}}
```

### `POST /v1/account/login` — Autenticar e Obter JWT
```json
// Request
{"email": "dev@example.com", "password": "minha_senha_segura"}

// Response (200)
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "developer": {"id": "uuid-123", "email": "dev@example.com", "name": "João Dev"}
  }
}
```

### `GET /v1/system/health` — Status do Sistema
```json
{"success": true, "data": {"status": "ok", "version": "0.1.0", "active_plugins": 1}}
```

### `GET /v1/system/plugins` — Listar Plugins Disponíveis
### `GET /v1/system/health/plugins` — Status de Saúde dos Plugins

---

## 5. Endpoints do Dashboard (JWT Auth)

> Autenticação: `Authorization: Bearer <jwt_token>`

### `GET /v1/account/me`
Retorna informações da conta autenticada.

### `GET /v1/account/balance`
Retorna saldo atual de créditos.

### `GET /v1/account/credits`
Retorna saldo com informações detalhadas.
```json
{"success": true, "data": {"balance": 4850.00, "currency": "credits"}}
```

### `GET /v1/account/credits/history`
Retorna histórico de transações.
**Query Params:** `?type=debit|credit|refund&limit=50&offset=0`
```json
{
  "success": true,
  "data": {
    "transactions": [
      {"id": "uuid", "amount": -1.0, "type": "debit", "description": "echo:ping", "balance_after": 99.0, "created_at": "..."}
    ],
    "limit": 50, "offset": 0
  }
}
```

### `POST /v1/account/credits` — Adicionar Créditos
```json
// Request
{"amount": 100.0, "type": "purchase", "description": "Compra via PIX"}
```

### `GET /v1/account/usage`
Retorna histórico de uso com filtros.
**Query Params:** `?plugin=echo&from=2026-05-01&to=2026-05-05&limit=50&offset=0`
```json
{
  "success": true,
  "data": {
    "logs": [{"plugin_slug": "echo", "action": "ping", "credits_charged": 1.0, "status_code": 200, "latency_ms": 15}],
    "total_records": 342,
    "total_credits": 342.0,
    "limit": 50, "offset": 0
  }
}
```

### `GET /v1/account/usage/summary` — Resumo Mensal
**Query Params:** `?from=2026-05-01&to=2026-05-31`
```json
{
  "success": true,
  "data": {
    "period": {"from": "2026-05-01", "to": "2026-05-31"},
    "total_calls": 1200,
    "total_credits": 1200.0,
    "by_plugin": [
      {"plugin_slug": "echo", "total_calls": 1200, "total_credits": 1200.0, "avg_latency_ms": 12.5}
    ]
  }
}
```

---

## 6. Endpoints de API Keys (JWT Auth)

### `POST /v1/account/keys` — Criar Nova Key
```json
// Request
{
  "label": "Backend Produção",
  "permissions": [
    {"plugin_slug": "echo", "scope": "write"},
    {"plugin_slug": "dns", "scope": "read"}
  ]
}

// Response (a key completa só aparece UMA VEZ)
{
  "success": true,
  "data": {
    "id": "uuid-key-456",
    "key": "crom_sk_live_7f3a8b2c4d5e6f7g8h9i0j...",
    "label": "Backend Produção",
    "permissions": [...]
  }
}
```

### `GET /v1/account/keys` — Listar Keys
### `DELETE /v1/account/keys/{id}` — Revogar Key

---

## 7. Endpoints de Secrets (JWT Auth)

### `POST /v1/account/secrets` — Cadastrar Secret
```json
// Formato preferível
{"plugin_slug": "ai", "secret_name": "openai_api_key", "value": "sk-proj-abc123..."}

// Formato alternativo (também aceito)
{"plugin": "ai", "key": "openai_api_key", "value": "sk-proj-abc123..."}
```

### `GET /v1/account/secrets` — Listar Secrets (sem valores)
### `DELETE /v1/account/secrets/{plugin}/{key}` — Remover Secret

---

## 8. Endpoints Admin (JWT Auth)

### `POST /v1/system/reload` — Hot Reload de Plugins
Re-escaneia a pasta de plugins e atualiza o registry.
```json
{"success": true, "data": {"added": ["new-plugin"], "removed": [], "unchanged": ["echo"]}}
```

---



## Documentos Relacionados

- **Anterior:** [02-database-schema.md](./02-database-schema.md)
- **Próximo:** [04-plugin-development-guide.md](./04-plugin-development-guide.md)
