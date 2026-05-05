package gateway

import (
	"context"
	"log/slog"
	"sync"
	"time"

	pb "github.com/crom/crom-cloud/core/proto"
)

// HealthStatus representa o estado de saúde de um plugin.
type HealthStatus string

const (
	StatusHealthy     HealthStatus = "healthy"
	StatusUnhealthy   HealthStatus = "unhealthy"
	StatusUnavailable HealthStatus = "unavailable"
)

// PluginHealth armazena o estado de saúde de um plugin.
type PluginHealth struct {
	Status          HealthStatus `json:"status"`
	ConsecutiveFail int          `json:"consecutive_failures"`
	LastCheck       time.Time    `json:"last_check"`
	LastMessage     string       `json:"last_message,omitempty"`
}

// HealthMonitor monitora a saúde dos plugins periodicamente.
type HealthMonitor struct {
	mu       sync.RWMutex
	manager  *PluginManager
	statuses map[string]*PluginHealth
	interval time.Duration
	stopCh   chan struct{}
	maxFails int // Número de falhas consecutivas antes de marcar unavailable
}

// NewHealthMonitor cria um novo monitor de saúde de plugins.
func NewHealthMonitor(manager *PluginManager, interval time.Duration) *HealthMonitor {
	if interval <= 0 {
		interval = 30 * time.Second
	}
	return &HealthMonitor{
		manager:  manager,
		statuses: make(map[string]*PluginHealth),
		interval: interval,
		stopCh:   make(chan struct{}),
		maxFails: 3,
	}
}

// Start inicia a goroutine de health check periódico.
func (hm *HealthMonitor) Start() {
	// Inicializar todos os plugins como healthy
	for _, m := range hm.manager.ListPlugins() {
		hm.statuses[m.Slug] = &PluginHealth{
			Status:    StatusHealthy,
			LastCheck: time.Now(),
		}
	}

	go func() {
		ticker := time.NewTicker(hm.interval)
		defer ticker.Stop()

		slog.Info("health monitor iniciado", "interval", hm.interval.String())

		for {
			select {
			case <-ticker.C:
				hm.checkAll()
			case <-hm.stopCh:
				slog.Info("health monitor encerrado")
				return
			}
		}
	}()
}

// Stop para o monitor de saúde.
func (hm *HealthMonitor) Stop() {
	close(hm.stopCh)
}

// GetStatus retorna o status de saúde de um plugin.
func (hm *HealthMonitor) GetStatus(slug string) HealthStatus {
	hm.mu.RLock()
	defer hm.mu.RUnlock()

	if h, ok := hm.statuses[slug]; ok {
		return h.Status
	}
	return StatusHealthy // Default se não monitorado
}

// GetAllStatuses retorna o status de todos os plugins.
func (hm *HealthMonitor) GetAllStatuses() map[string]*PluginHealth {
	hm.mu.RLock()
	defer hm.mu.RUnlock()

	result := make(map[string]*PluginHealth)
	for k, v := range hm.statuses {
		copied := *v
		result[k] = &copied
	}
	return result
}

// IsAvailable verifica se um plugin está disponível para receber requisições.
func (hm *HealthMonitor) IsAvailable(slug string) bool {
	return hm.GetStatus(slug) != StatusUnavailable
}

// checkAll executa health check em todos os plugins ativos.
func (hm *HealthMonitor) checkAll() {
	plugins := hm.manager.ListPlugins()

	for _, manifest := range plugins {
		plugin, ok := hm.manager.GetPlugin(manifest.Slug)
		if !ok {
			continue
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		resp, err := plugin.Service.HealthCheck(ctx, &pb.Empty{})
		cancel()

		hm.mu.Lock()

		if _, exists := hm.statuses[manifest.Slug]; !exists {
			hm.statuses[manifest.Slug] = &PluginHealth{
				Status:    StatusHealthy,
				LastCheck: time.Now(),
			}
		}

		health := hm.statuses[manifest.Slug]
		oldStatus := health.Status
		health.LastCheck = time.Now()

		if err != nil || (resp != nil && !resp.Healthy) {
			health.ConsecutiveFail++

			errMsg := "health check falhou"
			if err != nil {
				errMsg = err.Error()
			} else if resp != nil {
				errMsg = resp.Message
			}
			health.LastMessage = errMsg

			if health.ConsecutiveFail >= hm.maxFails {
				health.Status = StatusUnavailable
			} else {
				health.Status = StatusUnhealthy
			}

			if oldStatus != health.Status {
				slog.Warn("plugin status alterado",
					"slug", manifest.Slug,
					"old_status", string(oldStatus),
					"new_status", string(health.Status),
					"consecutive_failures", health.ConsecutiveFail,
					"message", errMsg,
				)
			}
		} else {
			// Plugin respondeu OK
			if oldStatus != StatusHealthy {
				slog.Info("plugin recuperado",
					"slug", manifest.Slug,
					"old_status", string(oldStatus),
				)
			}
			health.Status = StatusHealthy
			health.ConsecutiveFail = 0
			health.LastMessage = ""
			if resp != nil {
				health.LastMessage = resp.Message
			}
		}

		hm.mu.Unlock()
	}
}
