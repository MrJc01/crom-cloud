# 03 — Testes

## Visão Geral

| Tipo | Comando | Quantidade | Requer servidor? |
|------|---------|------------|-------------------|
| Unitários Go | `make test` | 24 testes | ❌ Não |
| E2E (curl) | `make test-e2e` | 25 testes | ✅ Sim |
| Todos | `make test-all` | 49 testes | ✅ Sim |

---

## 1. Testes Unitários (Go)

Testam lógica pura sem dependências externas.

```bash
make test
# ou diretamente:
cd core && go test ./... -v -count=1
```

### Suítes de testes:

| Pacote | Arquivo | O que testa |
|--------|---------|-------------|
| `auth` | `auth_test.go` | HasPermission, wildcards, admin scope (9 testes) |
| `gateway` | `manifest_test.go` | LoadManifest, JSON inválido, arquivo não encontrado (3 testes) |
| `server` | `sanitize_test.go` | Email, Slug, Name, Label, UUID, String (6 suítes) |
| `vault` | `secrets_test.go` | Encrypt/Decrypt, nonce, chave inválida (6 testes) |

### Rodar um pacote específico:

```bash
cd core && go test ./internal/auth/... -v
cd core && go test ./internal/vault/... -v
```

### Rodar um teste específico:

```bash
cd core && go test ./internal/auth/... -run TestHasPermission -v
```

---

## 2. Testes E2E (curl)

Testam o sistema completo via HTTP. **O servidor deve estar rodando.**

### Setup:

```bash
# Terminal 1: subir infra + servidor
docker compose up -d postgres redis
cd core && export $(grep -v '^#' ../.env | grep -v '^$' | xargs) && go run ./cmd/crom-cloud

# Terminal 2: rodar testes
make test-e2e
```

### O que testa (25 testes):

```
 1. Health check
 2. Lista plugins
 3. Health plugins
 4. Register dev
 5. Login (JWT)
 6. GET /me
 7. Add créditos
 8. Balance
 9. Create API Key
10. List keys
11. Echo/ping (via API Key)
12. Echo/reflect (via API Key)
13. Sem key → 401
14. Set secret
15. List secrets
16. Delete secret
17. Credits history
18. Usage logs
19. Usage summary
20. Revoke key
21. Revoked key → falha
22. Dashboard HTML
23. CSS Content-Type
24. SPA fallback
25. JS Content-Type
```

### Idempotência:

O script usa um email com timestamp (`e2e-{unix}@test.dev`), então pode ser executado múltiplas vezes sem falhar por dados duplicados.

---

## 3. Criar um Novo Teste Unitário

### Exemplo: testar uma nova função de sanitização

```go
// core/internal/server/sanitize_test.go

func TestMinhaNovaFuncao(t *testing.T) {
    tests := []struct {
        name     string
        input    string
        expected string
    }{
        {"caso normal", "hello", "hello"},
        {"caso vazio", "", ""},
        {"caso especial", "<script>", ""},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := MinhaNovaFuncao(tt.input)
            if got != tt.expected {
                t.Errorf("MinhaNovaFuncao(%q) = %q, want %q", tt.input, got, tt.expected)
            }
        })
    }
}
```

Rodar:
```bash
cd core && go test ./internal/server/... -run TestMinhaNovaFuncao -v
```

---

## 4. Adicionar Teste ao E2E

Edite `tests/e2e_curl_test.sh` e adicione:

```bash
# 26. Meu novo teste
R=$(curl -s http://localhost:8080/v1/minha/rota)
test_endpoint "26. Descrição do teste" '"campo_esperado"' "$R"
```

---

**Próximo:** [04-criar-plugin.md](04-criar-plugin.md) — Criar um plugin
