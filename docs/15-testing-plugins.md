# Guia de Testes Automatizados para Plugins da Crom Cloud

Para garantir que os plugins da Crom Cloud funcionem de maneira determinística, segura e rápida, adotamos uma abordagem de **testes unitários isolados**. Como nossos plugins são servidores gRPC que implementam o `ExecuteAction`, podemos testá-los diretamente em Go sem precisar subir a rede ou rodar o Gateway principal.

Este documento explica como você, como desenvolvedor de plugins, pode criar testes rigorosos para a lógica, manipulação de dados e controle de acesso do seu plugin.

---

## Estrutura do Teste

Você deve criar um arquivo `handler_test.go` na raiz do seu plugin (ex: `plugins/meu-plugin/handler_test.go`).

Nós chamamos a função `ExecuteAction` passando uma requisição mockada do tipo `*pb.ActionRequest` e verificamos as asserções no `*pb.ActionResponse`.

### Exemplo Básico: Testando um Endpoint de Criação

```go
package main

import (
	"context"
	"testing"
	pb "github.com/crom/crom-cloud/core/proto"
)

func TestHandler_CreateTable(t *testing.T) {
	// 1. Instanciamos o Handler localmente (sem gRPC)
	h := NewHandler()
	ctx := context.Background()

	// 2. Mockamos a requisição como o Dispatcher da Crom Cloud faria
	payload := `{"name": "users", "columns": [{"name": "age", "type": "number"}]}`
	req := &pb.ActionRequest{
		DeveloperId: "dev-123",           // Identificador do workspace do usuário
		Method:      "POST",              // Método HTTP original
		Action:      "tables/create",     // Rota/Ação
		Payload:     []byte(payload),     // Body do JSON
	}

	// 3. Executamos a ação diretamente
	res, err := h.ExecuteAction(ctx, req)
	
	// 4. Verificamos o resultado
	if err != nil {
		t.Fatalf("Erro inesperado no gRPC: %v", err)
	}
	if res.StatusCode != 201 {
		t.Errorf("Esperado 201 Created, mas recebido %d. Erro: %s", res.StatusCode, res.ErrorMessage)
	}
}
```

---

## Cenários Comuns de Teste

### 1. Testando Falhas (Bad Requests)
Sempre teste as proteções contra payloads malformados ou regras de negócios violadas.

```go
func TestHandler_CreateTable_Duplicate(t *testing.T) {
	h := NewHandler()
	req := &pb.ActionRequest{ /* ... cria a tabela 'users' ... */ }
	
	h.ExecuteAction(context.Background(), req) // Primeira vez (sucesso)
	
	// Tentar criar a mesma tabela
	resDup, _ := h.ExecuteAction(context.Background(), req)
	if resDup.StatusCode != 409 {
		t.Errorf("Esperado erro 409 para tabela duplicada, recebido %d", resDup.StatusCode)
	}
}
```

### 2. Lendo e Processando Dados de Retorno
O `res.Data` retorna um JSON formatado em `[]byte`. Você pode desempacotá-lo para testar o conteúdo:

```go
import "encoding/json"

func TestHandler_ReadData(t *testing.T) {
    // ... setup ...
    res, _ := h.ExecuteAction(ctx, readReq)

    var data map[string]interface{}
    json.Unmarshal(res.Data, &data)

    total := int(data["total"].(float64))
    if total != 1 {
        t.Errorf("Esperado 1 registro, mas recebido %d", total)
    }
}
```

### 3. Testando o Controle de Acesso (`PermissionsMetadata`)
Plugins de ponta na Crom Cloud verificam permissões granulares usando o `resource_id`. Simulamos isso injetando o mapa de metadados:

```go
func TestHandler_ResourceAccessControl(t *testing.T) {
	h := NewHandler()
	ctx := context.Background()
	devID := "dev-123"

	// Mock de uma API Key que SÓ TEM PERMISSÃO para a tabela "users"
	restrictedReq := &pb.ActionRequest{
		DeveloperId: devID,
		Method:      "GET",
		Action:      "data/posts", // A API Key tenta ler a tabela "posts"
		PermissionsMetadata: map[string]string{
			"read": "users", // A restrição imposta pelo Crom Cloud Gateway
		},
	}
	
	resRestricted, _ := h.ExecuteAction(ctx, restrictedReq)
	
	// O Handler deve obrigatoriamente bloquear
	if resRestricted.StatusCode != 403 {
		t.Errorf("Esperado status 403 (Forbidden), recebido %d", resRestricted.StatusCode)
	}
}
```

---

## Executando os Testes

Para executar os testes do seu plugin, acesse a pasta do plugin e execute o comando de testes do Go:

```bash
cd plugins/seu-plugin
go test -v ./...
```

**Por que isso é poderoso?**
Porque a Crom Cloud se encarrega de toda a camada de HTTP, roteamento, API Keys, Redis e segurança. O seu plugin só recebe requisições pré-validadas via `ActionRequest`. Testar a função `ExecuteAction` em Go puro garante 100% de confiança no funcionamento da sua lógica!
