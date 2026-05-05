package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"

	"github.com/crom/crom-cloud/core/internal/auth"
	"github.com/crom/crom-cloud/core/internal/billing"
	"github.com/crom/crom-cloud/core/internal/config"
	"github.com/crom/crom-cloud/core/internal/gateway"
	"github.com/crom/crom-cloud/core/internal/handlers"
	"github.com/crom/crom-cloud/core/internal/models"
	"github.com/crom/crom-cloud/core/internal/server"
	"github.com/crom/crom-cloud/core/internal/vault"
	"github.com/crom/crom-cloud/core/web"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// runMigrations executa todas as migrações SQL pendentes automaticamente.
func runMigrations(databaseURL, migrationsDir string) {
	absPath, err := filepath.Abs(migrationsDir)
	if err != nil {
		slog.Error("caminho de migrações inválido", "dir", migrationsDir, "error", err)
		return
	}

	sourceURL := "file://" + absPath
	m, err := migrate.New(sourceURL, databaseURL)
	if err != nil {
		slog.Error("falha ao inicializar migrações", "source", sourceURL, "error", err)
		return
	}
	defer m.Close()

	version, dirty, _ := m.Version()
	slog.Info("migrações — versão atual", "version", version, "dirty", dirty)

	if err := m.Up(); err != nil {
		if err == migrate.ErrNoChange {
			slog.Info("migrações — banco já está atualizado")
		} else {
			slog.Error("falha ao executar migrações", "error", err)
			os.Exit(1)
		}
	} else {
		newVersion, _, _ := m.Version()
		slog.Info("migrações aplicadas com sucesso", "old_version", version, "new_version", newVersion)
	}
}

func main() {
	// Banner
	fmt.Println("═══════════════════════════════════════")
	fmt.Println("  Crom Cloud — API Gateway v0.1.0")
	fmt.Println("═══════════════════════════════════════")

	// Carregar configuração
	cfg, err := config.Load()
	if err != nil {
		slog.Error("falha ao carregar configuração", "error", err)
		os.Exit(1)
	}
	slog.Info("configuração carregada", "port", cfg.Port, "plugins_dir", cfg.PluginsDir)

	ctx := context.Background()

	// Conectar PostgreSQL
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("falha ao conectar PostgreSQL", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		slog.Error("PostgreSQL não responde", "error", err)
		os.Exit(1)
	}
	slog.Info("PostgreSQL conectado")

	// === Auto-Migrate: executa migrações SQL pendentes ===
	runMigrations(cfg.DatabaseURL, cfg.MigrationsDir)

	// Conectar Redis
	rdb := redis.NewClient(&redis.Options{
		Addr: cfg.RedisURL,
	})
	defer rdb.Close()

	if err := rdb.Ping(ctx).Err(); err != nil {
		slog.Warn("Redis não disponível (continuando sem cache)", "error", err)
	} else {
		slog.Info("Redis conectado")
	}

	// Criar router (middlewares de segurança incluídos no NewRouter)
	router := server.NewRouter()

	// Rate limiting por IP via Redis
	rateLimiter := server.NewRateLimiter(rdb, 1000) // 1000 req/min por IP
	router.Use(rateLimiter.RateLimitByIPMiddleware(1000))

	// Plugin Discovery
	pluginManager := gateway.NewPluginManager(cfg.PluginsDir)
	if err := pluginManager.Discover(); err != nil {
		slog.Error("erro no plugin discovery", "error", err)
	}
	defer pluginManager.Shutdown()

	pluginStore := &models.PluginStore{DB: pool}

	// Auto-registrar plugins descobertos no banco de dados
	for _, m := range pluginManager.ListPlugins() {
		p := &models.Plugin{
			Slug:              m.Slug,
			Name:              m.Name,
			Description:       m.Description,
			Version:           m.Version,
			Icon:              m.Icon,
			DefaultCreditCost: float64(m.Billing.CreditCost),
			Status:            m.Status,
		}
		if err := pluginStore.Register(ctx, p); err != nil {
			slog.Error("falha ao registrar plugin no banco", "slug", m.Slug, "error", err)
		}
	}

	// Health Monitor — verifica saúde dos plugins a cada 30s
	healthMonitor := gateway.NewHealthMonitor(pluginManager, 30*time.Second)
	healthMonitor.Start()
	defer healthMonitor.Stop()

	// Vault — cofre de secrets AES-256-GCM
	vaultKey, err := cfg.VaultKey()
	if err != nil {
		slog.Error("falha na vault key", "error", err)
		os.Exit(1)
	}
	secretStore, err := vault.NewSecretStore(pool, vaultKey)
	if err != nil {
		slog.Error("falha ao inicializar vault", "error", err)
		os.Exit(1)
	}
	slog.Info("vault inicializado (AES-256-GCM)")

	// === Rotas públicas (sem auth) ===
	accountHandler := handlers.NewAccountHandler(pool, cfg.JWTSecret)
	router.Post("/v1/account/register", accountHandler.Register)
	router.Post("/v1/account/login", accountHandler.Login)

	// Rotas de sistema (sem auth) — dispatcher leve sem billing/vault
	sysDispatcher := gateway.NewSystemDispatcher(pluginManager)
	router.Get("/v1/system/plugins", sysDispatcher.HandleListPlugins)
	router.Get("/v1/system/health", func(w http.ResponseWriter, r *http.Request) {
		server.WriteSuccess(w, map[string]interface{}{
			"status":         "ok",
			"version":        "0.1.0",
			"active_plugins": len(pluginManager.ListPlugins()),
		})
	})
	router.Get("/v1/system/health/plugins", func(w http.ResponseWriter, r *http.Request) {
		server.WriteSuccess(w, healthMonitor.GetAllStatuses())
	})

	// === Dashboard (JWT auth) — gerencia conta, keys, billing, secrets ===
	keysHandler := handlers.NewKeysHandler(pool)
	billingHandler := handlers.NewBillingHandler(pool, secretStore)
	router.Group(func(r chi.Router) {
		r.Use(auth.JWTMiddleware(cfg.JWTSecret))
		r.Get("/v1/account/me", accountHandler.Me)
		r.Post("/v1/account/keys", keysHandler.Create)
		r.Get("/v1/account/keys", keysHandler.List)
		r.Put("/v1/account/keys/{id}", keysHandler.Update)
		r.Delete("/v1/account/keys/{id}", keysHandler.Revoke)
		r.Get("/v1/account/balance", billingHandler.GetBalance)
		r.Get("/v1/account/credits", billingHandler.GetCredits)
		r.Get("/v1/account/credits/history", billingHandler.GetCreditHistory)
		r.Post("/v1/account/credits", billingHandler.AddCredits)
		r.Get("/v1/account/usage", billingHandler.GetUsage)
		r.Get("/v1/account/usage/summary", billingHandler.GetUsageSummary)
		r.Post("/v1/account/secrets", billingHandler.SetSecret)
		r.Get("/v1/account/secrets", billingHandler.ListSecrets)
		r.Delete("/v1/account/secrets/{plugin}/{key}", billingHandler.DeleteSecret)
		r.Post("/v1/account/plugins/{slug}/toggle", accountHandler.TogglePlugin)
		r.Get("/v1/account/plugins", accountHandler.ListEnabledPlugins)
	})

	// === Admin (JWT auth) — operações administrativas ===
	creditStore := &billing.CreditStore{DB: pool}
	router.Group(func(r chi.Router) {
		r.Use(auth.JWTMiddleware(cfg.JWTSecret))
		adminDispatcher := gateway.NewDispatcher(pluginManager, secretStore, creditStore, healthMonitor, pluginStore, accountHandler.DevStore)
		r.Post("/v1/system/reload", adminDispatcher.HandleReload)
		r.Post("/v1/system/plugins/{slug}/toggle", adminDispatcher.HandleTogglePlugin)
	})

	// === API (API Key auth) — acessa plugins com billing + secrets ===
	router.Group(func(r chi.Router) {
		r.Use(auth.APIKeyMiddleware(pool))
		dispatcher := gateway.NewDispatcher(pluginManager, secretStore, creditStore, healthMonitor, pluginStore, accountHandler.DevStore)
		dispatcher.RegisterRoutes(r)
	})
	// === Frontend SPA — embed.FS (embutido no binário) ===
	webHandler := web.Handler()
	router.Get("/static/*", webHandler.ServeHTTP)
	router.Get("/", webHandler.ServeHTTP)

	// SPA catch-all: rotas como /dashboard, /keys retornam index.html
	router.NotFound(webHandler.ServeHTTP)



	// Servidor HTTP
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Iniciar em goroutine
	go func() {
		slog.Info("servidor iniciado", "addr", "http://localhost:"+cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("erro no servidor", "error", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit
	slog.Info("sinal recebido, encerrando...", "signal", sig)

	shutdownCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("erro ao encerrar servidor", "error", err)
	}

	slog.Info("servidor encerrado com sucesso")
}
