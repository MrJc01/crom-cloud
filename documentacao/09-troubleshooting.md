# 09 — Troubleshooting

## Problemas Comuns e Soluções

---

### ❌ `panic: chi: all middlewares must be defined before routes`

**Causa:** Tentou adicionar `router.Use()` depois de definir rotas.

**Solução:** Todos os middlewares globais devem ficar dentro de `NewRouter()` em `router.go`, **antes** de retornar o router.

```go
// ✅ CERTO — middleware dentro de NewRouter
func NewRouter() *chi.Mux {
    r := chi.NewRouter()
    r.Use(middleware.Logger)   // ← antes de qualquer rota
    return r
}

// ❌ ERRADO — middleware depois de rota
router := NewRouter()
router.Get("/health", healthHandler)
router.Use(myMiddleware)      // ← PANIC!
```

---

### ❌ `duplicate key value violates unique constraint "developers_email_key"`

**Causa:** Tentou registrar um email que já existe.

**Solução:** Use um email diferente ou limpe o banco:

```bash
# Opção 1: usar email diferente
# Opção 2: resetar o banco
docker compose down -v && docker compose up -d postgres redis
```

---

### ❌ `MISSING_FIELDS: plugin_slug e secret_name são obrigatórios`

**Causa:** O endpoint de secrets aceita dois formatos de campos.

**Solução:**
```bash
# Formato preferível
curl -d '{"plugin_slug":"echo","secret_name":"key","value":"xxx"}'

# Formato alternativo (também aceito)
curl -d '{"plugin":"echo","key":"key","value":"xxx"}'
```

---

### ❌ `connection refused` ao conectar no PostgreSQL

**Causa:** O container do banco não subiu ou não está healthy.

**Diagnóstico:**
```bash
# Verificar se os containers estão rodando
docker compose ps

# Ver logs do postgres
docker compose logs postgres

# Testar conexão
docker compose exec postgres pg_isready
```

**Solução:**
```bash
# Reiniciar containers
docker compose down && docker compose up -d postgres redis

# Aguardar healthcheck (5-10s)
sleep 10 && docker compose ps
```

---

### ❌ CSS/JS retorna `Content-Type: application/json`

**Causa:** O middleware `ContentTypeJSON` está forçando JSON em rotas estáticas.

**Solução:** O middleware já exclui `/` e `/static/*`. Se adicionou novas rotas estáticas, atualize `ContentTypeJSON` em `router.go`:

```go
if path == "/" || strings.HasPrefix(path, "/static/") || strings.HasPrefix(path, "/assets/") {
    next.ServeHTTP(w, r)
    return
}
```

---

### ❌ Plugin não aparece em `GET /v1/system/plugins`

**Diagnóstico:**
```bash
# 1. Verificar se o manifest existe e é válido
cat plugins/meu-plugin/manifest.json | python3 -m json.tool

# 2. Verificar se o binário existe
ls -la plugins/meu-plugin/meu-plugin

# 3. Verificar se o PLUGINS_DIR está correto
grep PLUGINS_DIR .env
# Deve ser: PLUGINS_DIR=../plugins (relativo ao core/)

# 4. Verificar logs do servidor
# Procure por: "plugin registrado slug=meu-plugin"
```

**Soluções:**
- Compilar o plugin: `cd plugins/meu-plugin && go build -o meu-plugin .`
- Corrigir o path: `PLUGINS_DIR=../plugins`
- Hot reload: `curl -X POST localhost:8080/v1/system/reload -H "Authorization: Bearer <jwt>"`

---

### ❌ `UNAUTHORIZED` mesmo com API Key válida

**Diagnóstico:**
```bash
# 1. Verificar se a key não foi revogada
curl http://localhost:8080/v1/account/keys -H "Authorization: Bearer <JWT>"
# → procure is_active=true

# 2. Verificar formato do header
# ✅ CERTO:
curl -H "Authorization: Bearer crom_sk_live_..."

# ❌ ERRADO (sem "Bearer"):
curl -H "Authorization: crom_sk_live_..."
```

---

### ❌ `FORBIDDEN` — key sem permissão

**Causa:** A API Key não tem permissão para o plugin/scope solicitado.

```bash
# Ver permissões da key
curl http://localhost:8080/v1/account/keys -H "Authorization: Bearer <JWT>"
# → verifique o array "permissions"

# Se precisa de write mas só tem read, crie uma nova key
```

---

### ❌ Migrações falhando

```bash
# Ver versão atual
cd core && export $(grep -v '^#' ../.env | grep -v '^$' | xargs) && go run ./cmd/crom-cloud
# → log mostra "migrações — versão atual version=X dirty=false"

# Se dirty=true (migração incompleta):
# Acessar o banco diretamente
docker compose exec postgres psql -U crom -d crom_cloud
# > SELECT * FROM schema_migrations;
# > UPDATE schema_migrations SET dirty=false;
```

---

### ❌ `go: module not found` ao compilar plugin

**Solução:**
```bash
# Verificar go.work
cat go.work
# Deve listar o plugin:
# use (
#     ./core
#     ./plugins/meu-plugin
# )

# Verificar replace no go.mod do plugin
grep "replace" plugins/meu-plugin/go.mod
# Deve ter: replace github.com/crom/crom-cloud/core => ../../core

# Tidy
cd plugins/meu-plugin && go mod tidy
```

---

### ❌ Porta 8080 já em uso

```bash
# Descobrir quem está usando
lsof -ti:8080

# Matar o processo
lsof -ti:8080 | xargs kill -9

# Ou usar outra porta
PORT=9090 make dev
```

---

## Logs Úteis

```bash
# Servidor com logs detalhados
cd core && export $(grep -v '^#' ../.env | grep -v '^$' | xargs) && go run ./cmd/crom-cloud 2>&1 | tee server.log

# Filtrar apenas erros
grep -i "error\|fail\|panic" server.log

# Logs do Docker
docker compose logs -f --tail=100
```

---

## Reset Completo (Desenvolvimento)

```bash
# Parar tudo
docker compose down -v

# Limpar binários
make clean

# Recomeçar do zero
docker compose up -d postgres redis
sleep 10
make build-all
make dev
```
