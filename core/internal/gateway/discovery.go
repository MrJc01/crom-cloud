package gateway

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"

	"github.com/hashicorp/go-hclog"
	"github.com/hashicorp/go-plugin"
	"google.golang.org/grpc"

	pb "github.com/crom/crom-cloud/core/proto"
)

// Handshake é a configuração de segurança entre Core e Plugins.
var Handshake = plugin.HandshakeConfig{
	ProtocolVersion:  1,
	MagicCookieKey:   "CROM_CLOUD_PLUGIN",
	MagicCookieValue: "crom-2026",
}

// PluginInstance representa um plugin ativo com seu client e manifest.
type PluginInstance struct {
	Manifest *PluginManifest
	Client   *plugin.Client
	Service  pb.CromPluginClient
}

// PluginManager gerencia todos os plugins ativos.
type PluginManager struct {
	mu         sync.RWMutex
	plugins    map[string]*PluginInstance
	pluginsDir string
}

// NewPluginManager cria um novo gerenciador de plugins.
func NewPluginManager(pluginsDir string) *PluginManager {
	return &PluginManager{
		plugins:    make(map[string]*PluginInstance),
		pluginsDir: pluginsDir,
	}
}

// Discover escaneia a pasta de plugins, carrega manifests e inicia os binários.
func (pm *PluginManager) Discover(disabledPlugins string) error {
	manifests, errs := DiscoverManifests(pm.pluginsDir)
	for _, err := range errs {
		slog.Warn("erro ao carregar plugin", "error", err)
	}

	// Criar map de plugins desativados globalmente via .env
	disabledMap := make(map[string]bool)
	if disabledPlugins != "" {
		for _, slug := range strings.Split(disabledPlugins, ",") {
			disabledMap[strings.TrimSpace(slug)] = true
		}
	}

	for _, m := range manifests {
		if disabledMap[m.Slug] {
			m.Status = "disabled" // Força o status para desabilitado
		}

		if m.Status == "disabled" {
			// Apenas armazena no map para o ListPlugins, mas sem cliente ativo
			pm.mu.Lock()
			pm.plugins[m.Slug] = &PluginInstance{
				Manifest: m,
			}
			pm.mu.Unlock()
			slog.Info("plugin inativo registrado", "slug", m.Slug)
			continue
		}

		if err := pm.loadPlugin(m); err != nil {
			slog.Error("falha ao iniciar plugin", "slug", m.Slug, "error", err)
			continue
		}
		slog.Info("plugin registrado", "slug", m.Slug, "name", m.Name, "version", m.Version)
	}

	slog.Info("discovery completo", "plugins_ativos", len(pm.plugins))
	return nil
}

// loadPlugin inicia um plugin como subprocesso e conecta via gRPC.
func (pm *PluginManager) loadPlugin(m *PluginManifest) error {
	binaryPath := filepath.Join(pm.pluginsDir, m.Slug, m.Runtime.Binary)

	// Verifica se o binário existe
	if _, err := os.Stat(binaryPath); os.IsNotExist(err) {
		return fmt.Errorf("binário não encontrado: %s", binaryPath)
	}

	// Configura o logger do plugin (silencioso)
	logger := hclog.New(&hclog.LoggerOptions{
		Name:   m.Slug,
		Output: os.Stderr,
		Level:  hclog.Warn,
	})

	// Inicia o plugin como subprocesso via hashicorp/go-plugin
	client := plugin.NewClient(&plugin.ClientConfig{
		HandshakeConfig: Handshake,
		Plugins: map[string]plugin.Plugin{
			"crom": &CromGRPCPlugin{},
		},
		Cmd:              exec.Command(binaryPath),
		AllowedProtocols: []plugin.Protocol{plugin.ProtocolGRPC},
		Logger:           logger,
	})

	// Conecta via RPC
	rpcClient, err := client.Client()
	if err != nil {
		client.Kill()
		return fmt.Errorf("falha ao conectar ao plugin %s: %w", m.Slug, err)
	}

	// Obtém a interface do serviço gRPC
	raw, err := rpcClient.Dispense("crom")
	if err != nil {
		client.Kill()
		return fmt.Errorf("falha ao dispensar plugin %s: %w", m.Slug, err)
	}

	service, ok := raw.(pb.CromPluginClient)
	if !ok {
		client.Kill()
		return fmt.Errorf("plugin %s não implementa CromPluginClient", m.Slug)
	}

	pm.mu.Lock()
	pm.plugins[m.Slug] = &PluginInstance{
		Manifest: m,
		Client:   client,
		Service:  service,
	}
	pm.mu.Unlock()

	return nil
}

// GetPlugin retorna um plugin ativo pelo slug.
func (pm *PluginManager) GetPlugin(slug string) (*PluginInstance, bool) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	p, ok := pm.plugins[slug]
	return p, ok
}

// ListPlugins retorna os manifests de todos os plugins ativos.
func (pm *PluginManager) ListPlugins() []*PluginManifest {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	var list []*PluginManifest
	for _, p := range pm.plugins {
		list = append(list, p.Manifest)
	}
	return list
}

// Shutdown mata todos os subprocessos de plugins.
func (pm *PluginManager) Shutdown() {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	for slug, p := range pm.plugins {
		if p.Client != nil {
			p.Client.Kill()
			slog.Info("plugin encerrado", "slug", slug)
		}
	}
	pm.plugins = make(map[string]*PluginInstance)
}

// ========================================================================
// hashicorp/go-plugin — Implementação do GRPCPlugin interface
// ========================================================================

// CromGRPCPlugin implementa a interface plugin.GRPCPlugin do hashicorp/go-plugin.
type CromGRPCPlugin struct {
	plugin.NetRPCUnsupportedPlugin
}

func (p *CromGRPCPlugin) GRPCServer(broker *plugin.GRPCBroker, s *grpc.Server) error {
	// Lado do plugin — implementado no binário do plugin, não no Core
	return nil
}

func (p *CromGRPCPlugin) GRPCClient(_ context.Context, broker *plugin.GRPCBroker, c *grpc.ClientConn) (interface{}, error) {
	// Lado do Core — cria o client gRPC
	return pb.NewCromPluginClient(c), nil
}
