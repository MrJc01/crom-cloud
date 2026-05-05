package main

import (
	"context"
	"encoding/json"

	"github.com/hashicorp/go-plugin"
	"google.golang.org/grpc"

	pb "github.com/crom/crom-cloud/core/proto"
)

// EchoPlugin implementa o serviço CromPlugin.
type EchoPlugin struct {
	pb.UnimplementedCromPluginServer
}

func (e *EchoPlugin) GetManifest(ctx context.Context, req *pb.Empty) (*pb.Manifest, error) {
	return &pb.Manifest{
		Slug:        "echo",
		Name:        "Echo Test Plugin",
		Version:     "1.0.0",
		Description: "Plugin de teste que ecoa requisições",
		Icon:        "zap",
		Routes: []*pb.RouteInfo{
			{Method: "GET", Path: "/ping", Scope: "read"},
			{Method: "POST", Path: "/reflect", Scope: "write"},
			{Method: "GET", Path: "/check-secrets", Scope: "read"},
		},
	}, nil
}

func (e *EchoPlugin) HealthCheck(ctx context.Context, req *pb.Empty) (*pb.HealthResponse, error) {
	return &pb.HealthResponse{
		Healthy: true,
		Message: "Echo plugin is alive",
	}, nil
}

func (e *EchoPlugin) ExecuteAction(ctx context.Context, req *pb.ActionRequest) (*pb.ActionResponse, error) {
	switch req.Action {
	case "ping":
		return respondJSON(200, map[string]string{"message": "pong"})

	case "reflect":
		var payload interface{}
		if len(req.Payload) > 0 {
			json.Unmarshal(req.Payload, &payload)
		}
		return respondJSON(200, map[string]interface{}{
			"received": payload,
			"method":   req.Method,
			"headers":  req.Headers,
		})

	case "check-secrets":
		return respondJSON(200, map[string]interface{}{
			"secret_count": len(req.Secrets),
			"has_secrets":  len(req.Secrets) > 0,
			"secret_keys":  secretKeys(req.Secrets),
		})

	default:
		return &pb.ActionResponse{
			StatusCode:   404,
			ErrorMessage: "Ação desconhecida: " + req.Action,
		}, nil
	}
}

func respondJSON(status int, data interface{}) (*pb.ActionResponse, error) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return &pb.ActionResponse{
			StatusCode:   500,
			ErrorMessage: "Erro ao serializar resposta: " + err.Error(),
		}, nil
	}
	return &pb.ActionResponse{
		StatusCode: int32(status),
		Data:       jsonData,
	}, nil
}

func secretKeys(secrets map[string]string) []string {
	keys := make([]string, 0, len(secrets))
	for k := range secrets {
		keys = append(keys, k)
	}
	return keys
}

// ========================================================================
// hashicorp/go-plugin — Registro do plugin
// ========================================================================

// EchoGRPCPlugin implementa plugin.GRPCPlugin.
type EchoGRPCPlugin struct {
	plugin.NetRPCUnsupportedPlugin
	Impl *EchoPlugin
}

func (p *EchoGRPCPlugin) GRPCServer(broker *plugin.GRPCBroker, s *grpc.Server) error {
	pb.RegisterCromPluginServer(s, p.Impl)
	return nil
}

func (p *EchoGRPCPlugin) GRPCClient(_ context.Context, broker *plugin.GRPCBroker, c *grpc.ClientConn) (interface{}, error) {
	return pb.NewCromPluginClient(c), nil
}

func main() {
	plugin.Serve(&plugin.ServeConfig{
		HandshakeConfig: plugin.HandshakeConfig{
			ProtocolVersion:  1,
			MagicCookieKey:   "CROM_CLOUD_PLUGIN",
			MagicCookieValue: "crom-2026",
		},
		Plugins: map[string]plugin.Plugin{
			"crom": &EchoGRPCPlugin{Impl: &EchoPlugin{}},
		},
		GRPCServer: plugin.DefaultGRPCServer,
	})
}
