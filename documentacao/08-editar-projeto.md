# 08 — Editar o Projeto

## Arquitetura Interna do Core

```
Requisição HTTP
      │
      ▼
┌─────────────────┐
│   chi Router    │ ← middlewares: RealIP, Logger, CORS, Security, RateLimit
│                 │
│  /v1/account/*  │──→ handlers/account.go  (Register, Login, Me)
│  /v1/account/   │──→ handlers/keys.go     (Create, List, Revoke)
│    keys/*       │
│  /v1/account/   │──→ handlers/billing.go  (Credits, Secrets, Usage)
│    credits/*    │
│  /v1/system/*   │──→ gateway/reload.go    (Health, Plugins, Reload)
│  /v1/{plugin}/  │──→ gateway/dispatcher.go (Auth→Billing→gRPC→Plugin)
│    {action}     │
│  /static/*      │──→ web/embed.go          (Frontend SPA)
│  /*             │──→ web/embed.go          (SPA fallback)
└─────────────────┘
```

---

## Mapa dos Pacotes

| Pacote | Responsabilidade | Arquivo principal |
|--------|-----------------|-------------------|
| `config` | Carregar `.env` e variáveis | `config.go` |
| `server` | Router, middlewares, respostas | `router.go`, `middleware.go`, `response.go` |
| `auth` | API Key (SHA-256), JWT, permissões | `apikey.go`, `jwt_middleware.go`, `session.go` |
| `billing` | Créditos, débito atômico, uso | `credits.go` |
| `gateway` | Descoberta de plugins, dispatch gRPC, health | `discovery.go`, `dispatcher.go`, `health.go` |
| `vault` | Criptografia AES-256-GCM | `secrets.go` |
| `handlers` | HTTP handlers (camada fina) | `account.go`, `keys.go`, `billing.go` |
| `models` | Acesso a dados (PostgreSQL) | `developer.go`, `apikey.go` |
| `web` | Frontend embed.FS | `embed.go` |

---

## Como Adicionar um Novo Endpoint

### 1. Criar o handler

```go
// core/internal/handlers/meu_handler.go
package handlers

import (
    "net/http"
    "github.com/crom/crom-cloud/core/internal/server"
)

type MeuHandler struct {
    // dependências
}

func NewMeuHandler() *MeuHandler {
    return &MeuHandler{}
}

func (h *MeuHandler) MinhaAcao(w http.ResponseWriter, r *http.Request) {
    // lógica
    server.WriteSuccess(w, map[string]string{"resultado": "ok"})
}
```

### 2. Registrar a rota no main.go

```go
// core/cmd/crom-cloud/main.go

// Rota pública (sem auth)
meuHandler := handlers.NewMeuHandler()
router.Get("/v1/minha/rota", meuHandler.MinhaAcao)

// Rota com JWT (dashboard)
router.Group(func(r chi.Router) {
    r.Use(auth.JWTMiddleware(cfg.JWTSecret))
    r.Get("/v1/minha/rota-protegida", meuHandler.MinhaAcao)
})
```

### 3. Testar

```bash
curl http://localhost:8080/v1/minha/rota
```

---

## Como Adicionar um Novo Middleware

```go
// core/internal/server/meu_middleware.go
package server

import "net/http"

func MeuMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // antes do handler
        // ...
        
        next.ServeHTTP(w, r)
        
        // depois do handler
        // ...
    })
}
```

Registrar em `NewRouter()` dentro de `router.go`:
```go
r.Use(MeuMiddleware)
```

---

## Como Adicionar uma Nova Migração

```bash
# Criar arquivos
make migrate-create NAME=add_tabela_webhooks
```

Edite os arquivos gerados:

```sql
-- migrations/008_add_tabela_webhooks.up.sql
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_id UUID NOT NULL REFERENCES developers(id),
    url TEXT NOT NULL,
    events TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- migrations/008_add_tabela_webhooks.down.sql
DROP TABLE IF EXISTS webhooks;
```

A migração é aplicada automaticamente ao reiniciar o Core.

---

## Como Adicionar um Novo Model

```go
// core/internal/models/webhook.go
package models

import (
    "context"
    "github.com/google/uuid"
    "github.com/jackc/pgx/v5/pgxpool"
)

type Webhook struct {
    ID          uuid.UUID `json:"id"`
    DeveloperID uuid.UUID `json:"developer_id"`
    URL         string    `json:"url"`
    Events      []string  `json:"events"`
    IsActive    bool      `json:"is_active"`
}

type WebhookStore struct {
    DB *pgxpool.Pool
}

func (s *WebhookStore) Create(ctx context.Context, devID uuid.UUID, url string, events []string) (*Webhook, error) {
    w := &Webhook{}
    err := s.DB.QueryRow(ctx,
        `INSERT INTO webhooks (developer_id, url, events)
         VALUES ($1, $2, $3)
         RETURNING id, developer_id, url, events, is_active`,
        devID, url, events,
    ).Scan(&w.ID, &w.DeveloperID, &w.URL, &w.Events, &w.IsActive)
    return w, err
}
```

---

## Padrão de Respostas

Sempre use os helpers de `server/response.go`:

```go
// Sucesso
server.WriteSuccess(w, data)

// Sucesso com status custom
server.WriteJSON(w, http.StatusCreated, server.APIResponse{Success: true, Data: data})

// Erro
server.WriteError(w, http.StatusBadRequest, "INVALID_INPUT", "Campo X é obrigatório")
```

Formato de resposta:
```json
{"success": true, "data": {...}}
{"success": false, "error": {"code": "INVALID_INPUT", "message": "..."}}
```

---

**Próximo:** [09-troubleshooting.md](09-troubleshooting.md) — Problemas comuns
