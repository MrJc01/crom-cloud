package gateway

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"

	"github.com/go-chi/chi/v5"

	"github.com/crom/crom-cloud/core/internal/server"
)

type ToggleRequest struct {
	Enabled bool `json:"enabled"`
}

// HandleTogglePlugin ativa ou desativa um plugin alterando seu manifest.json e recarregando.
func (d *Dispatcher) HandleTogglePlugin(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	var req ToggleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		server.WriteError(w, http.StatusBadRequest, "INVALID_PAYLOAD", "Payload inválido")
		return
	}

	manifestPath := filepath.Join(d.Manager.pluginsDir, slug, "manifest.json")
	if _, err := os.Stat(manifestPath); os.IsNotExist(err) {
		server.WriteError(w, http.StatusNotFound, "NOT_FOUND", "Plugin não encontrado em disco")
		return
	}

	m, err := LoadManifest(manifestPath)
	if err != nil {
		server.WriteError(w, http.StatusInternalServerError, "MANIFEST_ERROR", "Erro ao ler manifest")
		return
	}

	newStatus := "active"
	if !req.Enabled {
		newStatus = "disabled"
	}

	if m.Status == newStatus {
		server.WriteSuccess(w, map[string]string{"message": "Plugin já está no status solicitado"})
		return
	}

	m.Status = newStatus

	// Salvar manifest no disco
	data, err := json.MarshalIndent(m, "", "  ")
	if err != nil {
		server.WriteError(w, http.StatusInternalServerError, "JSON_ERROR", "Erro ao compilar novo manifest")
		return
	}

	if err := os.WriteFile(manifestPath, data, 0644); err != nil {
		server.WriteError(w, http.StatusInternalServerError, "IO_ERROR", "Erro ao salvar manifest")
		return
	}

	// Atualizar no banco de dados (se o Store estiver disponível)
	if d.Store != nil {
		if err := d.Store.UpdateStatus(r.Context(), slug, newStatus); err != nil {
			slog.Warn("Falha ao atualizar status no DB", "slug", slug, "error", err)
		}
	}

	// Reaplicar status no Manager (mata ou inicia o processo)
	d.Manager.mu.Lock()
	plugin, exists := d.Manager.plugins[slug]
	d.Manager.mu.Unlock()

	if newStatus == "disabled" {
		if exists && plugin.Client != nil {
			plugin.Client.Kill()
			plugin.Client = nil
			plugin.Service = nil
			slog.Info("plugin desativado e morto", "slug", slug)
		}
	} else {
		// Iniciar o plugin
		if err := d.Manager.loadPlugin(m); err != nil {
			server.WriteError(w, http.StatusInternalServerError, "PLUGIN_ERROR", "Erro ao iniciar plugin")
			return
		}
		slog.Info("plugin ativado e iniciado", "slug", slug)
	}

	server.WriteSuccess(w, map[string]interface{}{
		"message": fmt.Sprintf("Plugin %s alterado para %s", slug, newStatus),
		"slug":    slug,
		"status":  newStatus,
	})
}
