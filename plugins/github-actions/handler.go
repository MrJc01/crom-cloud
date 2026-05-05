package main

import (
	"context"
	"encoding/json"
	"fmt"

	pb "github.com/crom/crom-cloud/core/proto"
)

// Handler implementa o serviço CromPlugin.
type Handler struct {
	pb.UnimplementedCromPluginServer
}

// NewHandler cria um novo handler do plugin.
func NewHandler() *Handler {
	return &Handler{}
}

// GetManifest retorna informações sobre o plugin.
func (h *Handler) GetManifest(ctx context.Context, _ *pb.Empty) (*pb.Manifest, error) {
	return &pb.Manifest{
		Slug:        "github-actions",
		Name:        "GitHub Actions",
		Version:     "0.1.0",
		Description: "Plugin GitHub Actions para Crom Cloud",
		Icon:        "🔧",
	}, nil
}

// HealthCheck verifica se o plugin está ativo.
func (h *Handler) HealthCheck(ctx context.Context, _ *pb.Empty) (*pb.HealthResponse, error) {
	return &pb.HealthResponse{
		Healthy: true,
		Message: "github-actions is running",
	}, nil
}

// ExecuteAction processa as ações do plugin.
func (h *Handler) ExecuteAction(ctx context.Context, req *pb.ActionRequest) (*pb.ActionResponse, error) {
	switch req.Action {
	case "ping", "index":
		return h.handlePing(req)
	case "execute":
		return h.handleExecute(req)
	default:
		return &pb.ActionResponse{
			StatusCode:   404,
			ErrorMessage: fmt.Sprintf("Ação '%s' não encontrada", req.Action),
		}, nil
	}
}

// handlePing retorna um pong simples.
func (h *Handler) handlePing(req *pb.ActionRequest) (*pb.ActionResponse, error) {
	data, _ := json.Marshal(map[string]interface{}{
		"message":      "pong from github-actions",
		"developer_id": req.DeveloperId,
		"action":       req.Action,
	})
	return &pb.ActionResponse{
		StatusCode: 200,
		Data:       data,
	}, nil
}

// handleExecute é a ação principal do plugin.
// TODO: Implemente sua lógica aqui!
func (h *Handler) handleExecute(req *pb.ActionRequest) (*pb.ActionResponse, error) {
	// Parse do payload recebido
	var input map[string]interface{}
	if len(req.Payload) > 0 {
		json.Unmarshal(req.Payload, &input)
	}

	// Acessar secrets injetados pelo Core
	// Exemplo: apiToken := req.Secrets["API_TOKEN"]

	result := map[string]interface{}{
		"message":      "Ação executada com sucesso!",
		"developer_id": req.DeveloperId,
		"input":        input,
		"secrets_keys": func() []string {
			keys := []string{}
			for k := range req.Secrets {
				keys = append(keys, k)
			}
			return keys
		}(),
	}

	data, _ := json.Marshal(result)
	return &pb.ActionResponse{
		StatusCode: 200,
		Data:       data,
	}, nil
}
