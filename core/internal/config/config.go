package config

import (
	"encoding/hex"
	"fmt"
	"os"

	"github.com/joho/godotenv"
	"github.com/kelseyhightower/envconfig"
)

// Config contém toda a configuração do Crom Cloud.
type Config struct {
	Port          string `envconfig:"PORT" default:"8080"`
	DatabaseURL   string `envconfig:"DATABASE_URL" required:"true"`
	RedisURL      string `envconfig:"REDIS_URL" default:"localhost:6379"`
	VaultKeyHex   string `envconfig:"VAULT_KEY" required:"true"`
	JWTSecret     string `envconfig:"JWT_SECRET" required:"true"`
	PluginsDir    string `envconfig:"PLUGINS_DIR" default:"./plugins"`
	MigrationsDir string `envconfig:"MIGRATIONS_DIR" default:"./migrations"`
}

// VaultKey retorna a chave do cofre como bytes (32 bytes para AES-256).
func (c *Config) VaultKey() ([]byte, error) {
	key, err := hex.DecodeString(c.VaultKeyHex)
	if err != nil {
		return nil, fmt.Errorf("VAULT_KEY inválida (deve ser hex): %w", err)
	}
	if len(key) != 32 {
		return nil, fmt.Errorf("VAULT_KEY deve ter 32 bytes (64 chars hex), tem %d", len(key))
	}
	return key, nil
}

// Load carrega a configuração a partir do .env e variáveis de ambiente.
func Load() (*Config, error) {
	// Tenta carregar .env (ignora se não existir)
	if _, err := os.Stat(".env"); err == nil {
		if err := godotenv.Load(); err != nil {
			return nil, fmt.Errorf("erro ao carregar .env: %w", err)
		}
	}

	var cfg Config
	if err := envconfig.Process("", &cfg); err != nil {
		return nil, fmt.Errorf("erro ao processar variáveis de ambiente: %w", err)
	}

	// Valida a vault key
	if _, err := cfg.VaultKey(); err != nil {
		return nil, err
	}

	return &cfg, nil
}
