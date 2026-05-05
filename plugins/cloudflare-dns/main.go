package main

import (
	"context"
	"fmt"
	"os"

	"github.com/hashicorp/go-hclog"
	"github.com/hashicorp/go-plugin"
	"google.golang.org/grpc"

	pb "github.com/crom/crom-cloud/core/proto"
)

// Handshake DEVE ser idêntico ao do Core.
var Handshake = plugin.HandshakeConfig{
	ProtocolVersion:  1,
	MagicCookieKey:   "CROM_CLOUD_PLUGIN",
	MagicCookieValue: "crom-2026",
}

func main() {
	logger := hclog.New(&hclog.LoggerOptions{
		Name:   "cloudflare-dns",
		Output: os.Stderr,
		Level:  hclog.Info,
	})

	plugin.Serve(&plugin.ServeConfig{
		HandshakeConfig: Handshake,
		Plugins: map[string]plugin.Plugin{
			"crom": &PluginGRPC{Impl: NewHandler()},
		},
		GRPCServer: plugin.DefaultGRPCServer,
		Logger:     logger,
	})
}

// PluginGRPC implementa a interface plugin.GRPCPlugin.
type PluginGRPC struct {
	plugin.NetRPCUnsupportedPlugin
	Impl *Handler
}

func (p *PluginGRPC) GRPCServer(broker *plugin.GRPCBroker, s *grpc.Server) error {
	pb.RegisterCromPluginServer(s, p.Impl)
	return nil
}

func (p *PluginGRPC) GRPCClient(ctx context.Context, broker *plugin.GRPCBroker, c *grpc.ClientConn) (interface{}, error) {
	return pb.NewCromPluginClient(c), nil
}

func init() {
	_ = fmt.Sprintf // Evitar import não usado
}
