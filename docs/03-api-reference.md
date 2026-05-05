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

## 4. Endpoints do Sistema (Conta do Desenvolvedor)

### `GET /v1/account/me`
Retorna informações da conta autenticada.
```json
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "email": "dev@example.com",
    "name": "João Dev",
    "plan": "pro",
    "credit_balance": 4850.00,
    "created_at": "2026-01-15T10:00:00Z"
  }
}
```

### `GET /v1/account/credits`
Retorna saldo e histórico de transações de créditos.
```json
{
  "success": true,
  "data": {
    "balance": 4850.00,
    "transactions": [
      {"type": "purchase", "amount": 5000, "description": "Compra via PIX", "created_at": "..."},
      {"type": "consumption", "amount": -50, "description": "ai-proxy: generate", "created_at": "..."}
    ]
  }
}
```

### `GET /v1/account/usage`
Retorna histórico de uso com filtros.

**Query Params:** `?plugin=dns&from=2026-05-01&to=2026-05-04&limit=100`
```json
{
  "success": true,
  "data": {
    "total_calls": 342,
    "total_credits": 1250,
    "logs": [
      {
        "plugin": "dns",
        "action": "list_zones",
        "credits": 1,
        "status": 200,
        "latency_ms": 89,
        "created_at": "2026-05-04T14:30:00Z"
      }
    ]
  }
}
```

---

## 5. Endpoints de API Keys

### `POST /v1/account/keys` — Criar Nova Key
```json
// Request
{
  "label": "Backend Produção",
  "permissions": [
    {"plugin": "dns", "scope": "write"},
    {"plugin": "storage", "scope": "read"},
    {"plugin": "ai", "scope": "write"}
  ],
  "expires_at": "2027-01-01T00:00:00Z",
  "rate_limit_rpm": 120
}

// Response (a key completa só aparece UMA VEZ)
{
  "success": true,
  "data": {
    "id": "uuid-key-456",
    "key": "crom_sk_live_7f3a8b2c4d5e6f7g8h9i0j...",
    "label": "Backend Produção",
    "permissions": [...],
    "created_at": "2026-05-04T22:00:00Z"
  }
}
```

### `GET /v1/account/keys` — Listar Keys
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-key-456",
      "key_prefix": "crom_sk_live_7f3a",
      "label": "Backend Produção",
      "is_active": true,
      "permissions": [{"plugin": "dns", "scope": "write"}],
      "last_used_at": "2026-05-04T21:30:00Z"
    }
  ]
}
```

### `DELETE /v1/account/keys/{id}` — Revogar Key
```json
{"success": true, "data": {"message": "Key revogada com sucesso"}}
```

---

## 6. Endpoints de Secrets (Cofre)

### `POST /v1/account/secrets` — Cadastrar Token Externo
```json
// Request
{
  "plugin_slug": "ai",
  "secret_name": "openai_api_key",
  "secret_label": "Minha chave OpenAI",
  "value": "sk-proj-abc123..."
}

// Response (o valor NUNCA é retornado)
{
  "success": true,
  "data": {
    "id": "uuid-secret-789",
    "plugin_slug": "ai",
    "secret_name": "openai_api_key",
    "secret_label": "Minha chave OpenAI",
    "created_at": "2026-05-04T22:00:00Z"
  }
}
```

### `GET /v1/account/secrets` — Listar Secrets (sem valores)
### `DELETE /v1/account/secrets/{id}` — Remover Secret

---

## 7. Endpoints de Plugins (Dinâmicos)

### `GET /v1/system/plugins` — Listar Plugins Disponíveis
```json
{
  "success": true,
  "data": [
    {
      "slug": "dns",
      "name": "DNS Manager",
      "version": "1.0.0",
      "status": "active",
      "credit_cost": 1,
      "required_secrets": ["cloudflare_api_key"],
      "routes": [
        {"method": "GET", "path": "/zones", "scope": "read"},
        {"method": "POST", "path": "/records", "scope": "write"}
      ]
    }
  ]
}
```

### Rotas de Plugin (Geradas Dinamicamente)
```text
# Formato: /v1/{plugin_slug}/{action_path}
GET    /v1/dns/zones          → Listar zonas DNS
POST   /v1/dns/records        → Criar registro DNS
POST   /v1/ai/generate        → Gerar texto via LLM
GET    /v1/ai/models          → Listar modelos disponíveis
POST   /v1/storage/upload     → Upload de arquivo
GET    /v1/scraper/extract    → Scrape de URL
```

---

## Documentos Relacionados

- **Anterior:** [02-database-schema.md](./02-database-schema.md)
- **Próximo:** [04-plugin-development-guide.md](./04-plugin-development-guide.md)
