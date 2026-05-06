package main

import (
	"context"
	"encoding/json"
	"testing"

	pb "github.com/crom/crom-cloud/core/proto"
)

func TestHandler_CreateTable(t *testing.T) {
	h := NewHandler()
	ctx := context.Background()

	// Teste de criação com sucesso
	payload := `{"name": "users", "columns": [{"name": "age", "type": "number"}]}`
	req := &pb.ActionRequest{
		DeveloperId: "dev-123",
		Method:      "POST",
		Action:      "tables/create",
		Payload:     []byte(payload),
	}

	res, err := h.ExecuteAction(ctx, req)
	if err != nil {
		t.Fatalf("Erro inesperado: %v", err)
	}
	if res.StatusCode != 201 {
		t.Errorf("Esperado status 201, recebido %d. Erro: %s", res.StatusCode, res.ErrorMessage)
	}

	// Teste de criação duplicada
	resDup, _ := h.ExecuteAction(ctx, req)
	if resDup.StatusCode != 409 {
		t.Errorf("Esperado erro 409 para tabela duplicada, recebido %d", resDup.StatusCode)
	}

	// Teste sem colunas personalizadas (deve ser criado apenas com id e created_at)
	payloadNoCols := `{"name": "posts", "columns": []}`
	reqNoCols := &pb.ActionRequest{
		DeveloperId: "dev-123",
		Method:      "POST",
		Action:      "tables/create",
		Payload:     []byte(payloadNoCols),
	}
	resNoCols, _ := h.ExecuteAction(ctx, reqNoCols)
	if resNoCols.StatusCode != 201 {
		t.Errorf("Esperado status 201 para tabela sem colunas extras, recebido %d", resNoCols.StatusCode)
	}
}

func TestHandler_InsertAndReadData(t *testing.T) {
	h := NewHandler()
	ctx := context.Background()
	devID := "dev-123"

	// Setup: Criar tabela
	h.ExecuteAction(ctx, &pb.ActionRequest{
		DeveloperId: devID,
		Method:      "POST",
		Action:      "tables/create",
		Payload:     []byte(`{"name": "users", "columns": [{"name": "age", "type": "number"}]}`),
	})

	// Teste de Inserção
	insertReq := &pb.ActionRequest{
		DeveloperId: devID,
		Method:      "POST",
		Action:      "data/users",
		Payload:     []byte(`{"age": 30}`),
	}
	resInsert, err := h.ExecuteAction(ctx, insertReq)
	if err != nil || resInsert.StatusCode != 201 {
		t.Fatalf("Falha ao inserir dado: %d %s", resInsert.StatusCode, resInsert.ErrorMessage)
	}

	// Teste de Leitura
	readReq := &pb.ActionRequest{
		DeveloperId: devID,
		Method:      "GET",
		Action:      "data/users",
	}
	resRead, err := h.ExecuteAction(ctx, readReq)
	if err != nil || resRead.StatusCode != 200 {
		t.Fatalf("Falha ao ler dados: %d %s", resRead.StatusCode, resRead.ErrorMessage)
	}

	var data map[string]interface{}
	json.Unmarshal(resRead.Data, &data)

	total := int(data["total"].(float64))
	if total != 1 {
		t.Errorf("Esperado 1 registro, recebido %d", total)
	}
}

func TestHandler_ResourceAccessControl(t *testing.T) {
	h := NewHandler()
	ctx := context.Background()
	devID := "dev-123"

	// Setup: Criar tabelas
	h.ExecuteAction(ctx, &pb.ActionRequest{
		DeveloperId: devID, Method: "POST", Action: "tables/create",
		Payload: []byte(`{"name": "users", "columns": [{"name": "age", "type": "number"}]}`),
	})
	h.ExecuteAction(ctx, &pb.ActionRequest{
		DeveloperId: devID, Method: "POST", Action: "tables/create",
		Payload: []byte(`{"name": "posts", "columns": [{"name": "title", "type": "string"}]}`),
	})

	// Cenário 1: API Key com acesso APENAS a 'users'
	restrictedReq := &pb.ActionRequest{
		DeveloperId: devID,
		Method:      "GET",
		Action:      "data/posts", // Tenta ler posts
		PermissionsMetadata: map[string]string{
			"read": "users", // Mas só tem acesso a users
		},
	}
	resRestricted, _ := h.ExecuteAction(ctx, restrictedReq)
	if resRestricted.StatusCode != 403 {
		t.Errorf("Esperado status 403 (Forbidden), recebido %d", resRestricted.StatusCode)
	}

	// Cenário 2: API Key com acesso permitido
	allowedReq := &pb.ActionRequest{
		DeveloperId: devID,
		Method:      "GET",
		Action:      "data/users", // Tenta ler users
		PermissionsMetadata: map[string]string{
			"read": "users",
		},
	}
	resAllowed, _ := h.ExecuteAction(ctx, allowedReq)
	if resAllowed.StatusCode != 200 {
		t.Errorf("Esperado status 200 (Permitido), recebido %d", resAllowed.StatusCode)
	}
}
