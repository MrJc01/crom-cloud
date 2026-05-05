package integration_test

// =============================================================================
// TESTES DE INTEGRAÇÃO: Ciclo de Vida do Plugin
// =============================================================================
//
// Cenários cobertos:
//   1. Plugin registrado → chamável via API
//   2. Plugin em manutenção → retorna 503
//   3. Plugin desativado → retorna 404
//   4. Health check falha → marca como unavailable
//   5. Hot reload → novo plugin aparece sem reiniciar

import (
	"testing"
)

func TestPluginRegistrationAndCall(t *testing.T) {
	t.Skip("Requer sistema completo. Rodar com: make test-integration")

	// TODO: Implementar quando o Core estiver pronto
	// 1. Colocar plugin echo na pasta /plugins/
	// 2. Iniciar o Core
	// 3. GET /v1/system/plugins → echo deve aparecer na lista
	// 4. GET /v1/echo/ping → 200 + {"data": "pong"}
}

func TestPluginMaintenanceMode(t *testing.T) {
	t.Skip("Requer sistema completo. Rodar com: make test-integration")

	// TODO: Implementar quando o Core estiver pronto
	// 1. Plugin com status "maintenance" no manifest
	// 2. GET /v1/system/plugins → status = "maintenance"
	// 3. GET /v1/echo/ping → 503 Service Unavailable
}

func TestPluginDisabled(t *testing.T) {
	t.Skip("Requer sistema completo. Rodar com: make test-integration")

	// TODO: Implementar quando o Core estiver pronto
	// 1. Plugin com status "disabled" no manifest
	// 2. GET /v1/system/plugins → NÃO deve aparecer
	// 3. GET /v1/echo/ping → 404 Plugin Not Found
}

func TestPluginHealthCheckFailure(t *testing.T) {
	t.Skip("Requer sistema completo. Rodar com: make test-integration")

	// TODO: Implementar quando o Core estiver pronto
	// 1. Iniciar plugin echo
	// 2. Matar o processo do plugin
	// 3. Aguardar health check interval
	// 4. GET /v1/echo/ping → 503 Plugin Unavailable
}

func TestPluginHotReload(t *testing.T) {
	t.Skip("Requer sistema completo. Rodar com: make test-integration")

	// TODO: Implementar quando o Core estiver pronto
	// 1. Core rodando com plugin echo
	// 2. Copiar novo plugin "test-new" para /plugins/
	// 3. POST /v1/system/reload
	// 4. GET /v1/system/plugins → test-new deve aparecer
	// 5. GET /v1/test-new/ping → 200
}
