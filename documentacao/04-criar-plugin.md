# 04 — Criar um Novo Plugin

## Visão Geral

Um plugin é um **binário independente** que se comunica com o Core via gRPC. O Core descobre plugins automaticamente escaneando a pasta `plugins/`.

```
plugins/
└── meu-plugin/
    ├── manifest.json    # Metadados (nome, rotas, custo)
    ├── main.go          # Wrapper gRPC (boilerplate)
    ├── handler.go       # Sua lógica de negócio
    ├── go.mod           # Módulo Go
    └── meu-plugin       # Binário compilado (gitignored)
```

---

## Método 1: Scaffolding Automático (Recomendado)

```bash
# Plugin 100% Go
./tools/create-plugin.sh meu-plugin --lang=go

# Plugin Go + Python
./tools/create-plugin.sh meu-plugin --lang=python

# Plugin Go + Node.js
./tools/create-plugin.sh meu-plugin --lang=node

# Plugin Go + Bash
./tools/create-plugin.sh meu-plugin --lang=bash
```

Isso cria a pasta `plugins/meu-plugin/` com todos os arquivos necessários.

---

## Método 2: Manual (Passo a Passo)

### 1. Criar `manifest.json`

```json
{
  "slug": "meu-plugin",
  "name": "Meu Plugin Incrível",
  "version": "1.0.0",
  "description": "Faz coisas incríveis",
  "author": "CROM",
  "credit_cost": 5,
  "required_secrets": ["api_key_externa"],
  "routes": [
    {
      "method": "GET",
      "path": "/status",
      "description": "Retorna o status",
      "scope": "read"
    },
    {
      "method": "POST",
      "path": "/execute",
      "description": "Executa a ação principal",
      "scope": "write"
    }
  ]
}
```

**Campos importantes:**
- `slug`: identificador único (usado na URL: `/v1/meu-plugin/status`)
- `credit_cost`: créditos consumidos por chamada (0 = grátis)
- `required_secrets`: secrets que o dev precisa configurar
- `routes`: define os endpoints disponíveis e permissões

### 2. Criar `go.mod`

```bash
cd plugins/meu-plugin
go mod init github.com/crom/crom-cloud/plugins/meu-plugin
```

Edite o `go.mod`:
```go
module github.com/crom/crom-cloud/plugins/meu-plugin

go 1.25.0

require (
    github.com/crom/crom-cloud/core v0.0.0
    github.com/hashicorp/go-plugin v1.8.0
    google.golang.org/grpc v1.81.0
)

replace github.com/crom/crom-cloud/core => ../../core
```

Depois: `go mod tidy`

### 3. Criar `main.go` (wrapper gRPC)

```go
package main

import (
    "github.com/hashicorp/go-plugin"
    pb "github.com/crom/crom-cloud/core/proto"
    shared "github.com/hashicorp/go-plugin"
)

type MeuPlugin struct{}

func (p *MeuPlugin) Execute(req *pb.PluginRequest) (*pb.PluginResponse, error) {
    // Roteamento interno
    switch req.Action {
    case "GET:/status":
        return p.handleStatus(req)
    case "POST:/execute":
        return p.handleExecute(req)
    default:
        return &pb.PluginResponse{
            StatusCode: 404,
            Body:       []byte(`{"error":"rota não encontrada"}`),
        }, nil
    }
}

func (p *MeuPlugin) handleStatus(req *pb.PluginRequest) (*pb.PluginResponse, error) {
    return &pb.PluginResponse{
        StatusCode: 200,
        Body:       []byte(`{"status":"online"}`),
    }, nil
}

func (p *MeuPlugin) handleExecute(req *pb.PluginRequest) (*pb.PluginResponse, error) {
    // Acessar secrets injetados pelo Core
    apiKey := req.Secrets["api_key_externa"]
    
    // Sua lógica aqui...
    result := map[string]string{"result": "ok", "key_used": apiKey[:8] + "..."}
    
    body, _ := json.Marshal(result)
    return &pb.PluginResponse{
        StatusCode: 200,
        Body:       body,
    }, nil
}

func main() {
    plugin.Serve(&plugin.ServeConfig{
        HandshakeConfig: shared.HandshakeConfig{
            ProtocolVersion:  1,
            MagicCookieKey:   "CROM_PLUGIN",
            MagicCookieValue: "crom",
        },
        Plugins: map[string]plugin.Plugin{
            "plugin": &MyGRPCPlugin{Impl: &MeuPlugin{}},
        },
        GRPCServer: plugin.DefaultGRPCServer,
    })
}
```

### 4. Compilar

```bash
cd plugins/meu-plugin
go build -o meu-plugin .
```

### 5. Adicionar ao go.work

```go
// go.work (raiz do projeto)
go 1.25.0

use (
    ./core
    ./plugins/echo
    ./plugins/meu-plugin    // ← adicionar
)
```

### 6. Reiniciar o Core

O Core detecta automaticamente ao iniciar. Ou use hot reload:

```bash
curl -X POST http://localhost:8080/v1/system/reload \
  -H "Authorization: Bearer <jwt_admin>"
```

---

## Testar o Plugin

```bash
# 1. Criar key com permissão
curl -X POST http://localhost:8080/v1/account/keys \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"label":"Test","permissions":[{"plugin_slug":"meu-plugin","scope":"write"}]}'

# 2. Configurar secret obrigatório
curl -X POST http://localhost:8080/v1/account/secrets \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"plugin_slug":"meu-plugin","secret_name":"api_key_externa","value":"sk-minha-chave"}'

# 3. Usar
curl http://localhost:8080/v1/meu-plugin/status \
  -H "Authorization: Bearer crom_sk_live_..."

curl -X POST http://localhost:8080/v1/meu-plugin/execute \
  -H "Authorization: Bearer crom_sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{"input":"dados"}'
```

---

**Próximo:** [05-api-uso.md](05-api-uso.md) — Usar a API
