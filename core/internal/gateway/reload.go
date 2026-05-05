package gateway

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/crom/crom-cloud/core/internal/server"
)

// ReloadResult contém o relatório de um hot-reload de plugins.
type ReloadResult struct {
	Added     []string `json:"added"`
	Removed   []string `json:"removed"`
	Unchanged []string `json:"unchanged"`
}

// HandleReload reescaneia a pasta de plugins e atualiza o registry em runtime.
// POST /v1/system/reload (protegido por JWT + admin check)
func (d *Dispatcher) HandleReload(w http.ResponseWriter, r *http.Request) {
	slog.Info("hot-reload de plugins iniciado")

	// Registrar slugs atuais antes do reload
	oldSlugs := make(map[string]bool)
	for _, m := range d.Manager.ListPlugins() {
		oldSlugs[m.Slug] = true
	}

	// Re-descobrir manifests
	manifests, errs := DiscoverManifests(d.Manager.pluginsDir)
	for _, err := range errs {
		slog.Warn("erro ao carregar plugin no reload", "error", err)
	}

	result := ReloadResult{}
	newSlugs := make(map[string]bool)

	for _, m := range manifests {
		newSlugs[m.Slug] = true

		if oldSlugs[m.Slug] {
			// Plugin já existia — manter ativo
			result.Unchanged = append(result.Unchanged, m.Slug)
		} else {
			// Plugin novo — iniciar
			if err := d.Manager.loadPlugin(m); err != nil {
				slog.Error("falha ao iniciar novo plugin", "slug", m.Slug, "error", err)
				continue
			}
			result.Added = append(result.Added, m.Slug)
			slog.Info("plugin adicionado via hot-reload", "slug", m.Slug, "version", m.Version)
		}
	}

	// Identificar plugins removidos (estavam antes, não estão mais)
	for slug := range oldSlugs {
		if !newSlugs[slug] {
			// Plugin removido — shutdown
			if plugin, ok := d.Manager.GetPlugin(slug); ok {
				plugin.Client.Kill()
				d.Manager.mu.Lock()
				delete(d.Manager.plugins, slug)
				d.Manager.mu.Unlock()
				slog.Info("plugin removido via hot-reload", "slug", slug)
			}
			result.Removed = append(result.Removed, slug)
		}
	}

	// Garantir arrays não nil para JSON limpo
	if result.Added == nil {
		result.Added = []string{}
	}
	if result.Removed == nil {
		result.Removed = []string{}
	}
	if result.Unchanged == nil {
		result.Unchanged = []string{}
	}

	slog.Info("hot-reload concluído",
		"added", len(result.Added),
		"removed", len(result.Removed),
		"unchanged", len(result.Unchanged),
	)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(server.APIResponse{
		Success: true,
		Data:    result,
	})
}
