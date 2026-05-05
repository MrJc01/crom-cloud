# Arquitetura Técnica — Core + Plugins Multi-Linguagem

> **Padrão Arquitetural:** Microkernel (Core + Plugins) via gRPC
> **Referências do Mercado:** Terraform, Vault, Grafana (todos usam `hashicorp/go-plugin`)

---

## 1. Princípio Fundamental

O sistema é dividido em duas esferas totalmente desacopladas:

| Componente | Responsabilidade | Linguagem |
|------------|-----------------|-----------|
| **Core** | Autenticação, API Keys, Créditos, Roteamento, Discovery | Go (100%) |
| **Plugin** | Lógica de negócio da ferramenta específica | Go (wrapper obrigatório) + Qualquer linguagem (lógica) |

> **Regra de Ouro:** Para adicionar uma nova ferramenta, você **nunca** precisa alterar o código do Core. Basta criar um plugin na pasta `/plugins/` e o Core o descobre automaticamente.

---

## 2. Diagrama de Componentes do Core

```mermaid
graph TD
    subgraph Core ["Core (Go) — O Cérebro"]
        direction TB
        API["HTTP Server<br/>(Gin/Chi/Echo)"]
        MW["Middlewares<br/>(CORS, Rate Limit, Logging)"]
        AuthMW["Auth Middleware<br/>(Valida API Key)"]
        BillingMW["Billing Middleware<br/>(Debita Créditos)"]
        Router["Router Dinâmico<br/>(/v1/{slug}/{action})"]
        Disc["Plugin Discovery<br/>(Escaneia /plugins/)"]
        Vault["Cofre de Secrets<br/>(AES-256)"]

        API --> MW --> AuthMW --> BillingMW --> Router
        Router --> Disc
        AuthMW -.-> Vault
    end

    subgraph DB ["Persistência"]
        PG[(PostgreSQL<br/>Devs, Keys, Créditos)]
        RD[(Redis<br/>Cache, Rate Limit)]
    end

    subgraph Plugins ["Plugins Ativos"]
        P1["dns-manager.bin"]
        P2["ai-proxy.bin"]
        P3["web-scraper.bin"]
    end

    Disc -- "gRPC" --> P1
    Disc -- "gRPC" --> P2
    Disc -- "gRPC" --> P3
    AuthMW --> PG
    BillingMW --> PG
    MW --> RD

    style Core fill:#16213e,stroke:#e94560,color:#fff
    style DB fill:#0d1117,stroke:#58a6ff,color:#c9d1d9
    style Plugins fill:#1a1a2e,stroke:#00d2ff,color:#fff
```

---

## 3. Modelo de Plugin: Go Puro vs Multi-Linguagem

### Plugin 100% Go

Quando a ferramenta é escrita inteiramente em Go, o plugin é um único binário que implementa diretamente a interface gRPC.

```mermaid
graph LR
    Core -- "gRPC" --> Wrapper["main.go<br/>(Wrapper gRPC)"]
    Wrapper --> Handler["handler.go<br/>(Lógica de Negócio)"]
    Handler --> ExtAPI(("API Externa"))

    style Wrapper fill:#1a1a2e,stroke:#00d2ff,color:#fff
    style Handler fill:#1a1a2e,stroke:#00d2ff,color:#fff
```

**Vantagem:** Performance máxima. Sem overhead de subprocesso.
**Quando usar:** Ferramentas simples de CRUD contra APIs REST externas (DNS, Domains, etc).

---

### Plugin Multi-Linguagem (Go + Python/Node/Bash/etc)

Quando a lógica real é mais natural em outra linguagem (ex: ML em Python, Scraping em Node), o plugin Go atua como **ponte**: recebe a requisição via gRPC e executa um subprocesso na linguagem escolhida.

```mermaid
graph LR
    Core -- "gRPC" --> Wrapper["main.go<br/>(Wrapper gRPC)"]
    Wrapper --> Bridge["bridge.go<br/>(Executor de Subprocesso)"]
    Bridge --> Script["scripts/engine.py<br/>(Python)"]
    Script --> ExtAPI(("API Externa"))

    style Wrapper fill:#1a1a2e,stroke:#ffd700,color:#fff
    style Bridge fill:#1a1a2e,stroke:#ffd700,color:#fff
    style Script fill:#1a1a2e,stroke:#ffd700,color:#fff
```

**Vantagem:** Usa o ecossistema ideal de cada linguagem (numpy, puppeteer, etc).
**Quando usar:** ML/AI (Python), Scraping com headless browser (Node), automação de infra (Bash).

---

## 4. Comunicação Core ↔ Plugin: Contrato gRPC

Todos os plugins implementam a mesma interface definida em `core/proto/plugin.proto`:

```protobuf
syntax = "proto3";
package cromcloud;

option go_package = "github.com/crom/crom-cloud/core/proto";

// Serviço que TODO plugin deve implementar
service CromPlugin {
  // Retorna informações sobre o plugin (lido do manifest)
  rpc GetManifest(Empty) returns (Manifest);

  // Health check
  rpc HealthCheck(Empty) returns (HealthResponse);

  // Executa uma ação do plugin
  rpc ExecuteAction(ActionRequest) returns (ActionResponse);
}

message Empty {}

message Manifest {
  string slug = 1;
  string name = 2;
  string version = 3;
  string description = 4;
  string icon = 5;
  repeated RouteInfo routes = 6;
}

message RouteInfo {
  string method = 1;   // GET, POST, PUT, DELETE
  string path = 2;     // /zones, /generate
  string scope = 3;    // read, write, admin
}

message ActionRequest {
  string action = 1;           // Nome da rota/ação solicitada
  string method = 2;           // HTTP method original
  bytes payload = 3;           // Body da requisição (JSON)
  map<string, string> headers = 4;
  map<string, string> secrets = 5; // Tokens injetados pelo Core (do cofre)
  string developer_id = 6;    // ID do dev autenticado
}

message ActionResponse {
  int32 status_code = 1;       // HTTP status code de resposta
  bytes data = 2;              // JSON de resposta
  string error_message = 3;    // Vazio se sucesso
}

message HealthResponse {
  bool healthy = 1;
  string message = 2;
}
```

---

## 5. Fluxo de Comunicação Multi-Linguagem (Detalhado)

```mermaid
sequenceDiagram
    participant Client as Cliente (HTTP)
    participant Core as Core (Go)
    participant DB as PostgreSQL
    participant Wrapper as Wrapper Go (Plugin)
    participant Script as engine.py (Python)
    participant ExtAPI as API Externa

    Client->>Core: POST /v1/ai/generate<br/>Header: Bearer crom_sk_xxxx

    rect rgb(30, 30, 60)
        Note over Core,DB: Pipeline de Validação no Core
        Core->>DB: 1. Valida API Key (hash lookup)
        DB-->>Core: Key OK, developer_id=uuid-123
        Core->>DB: 2. Verifica permissão: key tem scope "ai:write"?
        DB-->>Core: Permitido
        Core->>DB: 3. Verifica créditos: saldo >= 50?
        DB-->>Core: Saldo: 4900 (OK)
        Core->>DB: 4. Busca secrets: openai_api_key do dev uuid-123
        DB-->>Core: Retorna token descriptografado
        Core->>DB: 5. Debita 50 créditos (transação atômica)
    end

    rect rgb(40, 40, 20)
        Note over Core,Script: Despacho para Plugin via gRPC
        Core->>Wrapper: gRPC ExecuteAction(action="generate", secrets={openai_key: "sk-xxx"})
        Wrapper->>Script: exec: python3 engine.py<br/>stdin: {"action":"generate","payload":{...},"secrets":{...}}
        Script->>ExtAPI: openai.chat.completions.create(...)
        ExtAPI-->>Script: Resposta da OpenAI
        Script-->>Wrapper: stdout: {"status":200,"data":{"text":"..."}}
        Wrapper-->>Core: gRPC ActionResponse
    end

    Core->>DB: 6. Registra no usage_log
    Core-->>Client: HTTP 200 {"success":true,"data":{...},"meta":{"credits_remaining":4850}}
```

---

## 6. Plugin Discovery — Como o Core Encontra os Plugins

Ao iniciar, o Core executa o seguinte processo:

```text
1. Escaneia a pasta /plugins/ procurando subdiretórios
2. Para cada subdiretório, procura um arquivo manifest.json
3. Valida o manifest contra o schema esperado
4. Inicia o binário do plugin como subprocesso
5. Conecta via gRPC e chama GetManifest() para confirmar
6. Registra o plugin no router dinâmico:
   /v1/{manifest.slug}/* → dispatcher → este plugin
7. O dashboard lê GET /v1/system/plugins para montar o menu
```

```mermaid
flowchart LR
    A["Core inicia"] --> B["Escaneia /plugins/"]
    B --> C["Encontra<br/>dns-manager/"]
    B --> D["Encontra<br/>ai-proxy/"]
    B --> E["Encontra<br/>web-scraper/"]

    C --> F["Lê manifest.json"]
    D --> G["Lê manifest.json"]
    E --> H["Lê manifest.json"]

    F --> I["Inicia dns-manager.bin<br/>via go-plugin"]
    G --> J["Inicia ai-proxy.bin<br/>via go-plugin"]
    H --> K["Inicia web-scraper.bin<br/>via go-plugin"]

    I --> L["Registra no Router:<br/>/v1/dns/*"]
    J --> M["Registra no Router:<br/>/v1/ai/*"]
    K --> N["Registra no Router:<br/>/v1/scraper/*"]

    style A fill:#16213e,stroke:#e94560,color:#fff
    style L fill:#00b894,color:#fff
    style M fill:#00b894,color:#fff
    style N fill:#00b894,color:#fff
```

---

## Documentos Relacionados

- **Anterior:** [00-visao-geral.md](./00-visao-geral.md)
- **Próximo:** [02-database-schema.md](./02-database-schema.md)
