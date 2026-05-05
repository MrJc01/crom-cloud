package integration_test

// =============================================================================
// TESTES DE INTEGRAÇÃO: Fluxo completo de API Key
// =============================================================================
//
// Estes testes requerem banco de dados PostgreSQL rodando.
// Use: docker-compose -f tests/integration/docker-compose.test.yml up -d
//
// Cenários cobertos:
//   1. Registrar desenvolvedor → Criar API Key → Usar Key → Verificar acesso
//   2. Criar Key com escopo limitado → Tentar acesso fora do escopo → Verificar 403
//   3. Revogar Key → Tentar usar → Verificar 401
//   4. Key expirada → Tentar usar → Verificar 401
//   5. Múltiplas keys para o mesmo dev → Permissões independentes

import (
	"testing"
)

func TestAPIKeyCreationFlow(t *testing.T) {
	t.Skip("Requer banco de dados. Rodar com: make test-integration")

	// TODO: Implementar quando o Core estiver pronto
	// 1. POST /v1/account/register
	// 2. POST /v1/account/login → obter session token
	// 3. POST /v1/account/keys → criar key com permissões
	// 4. Usar a key criada para chamar GET /v1/echo/ping
	// 5. Verificar HTTP 200 e resposta correta
}

func TestAPIKeyScopedAccess(t *testing.T) {
	t.Skip("Requer banco de dados. Rodar com: make test-integration")

	// TODO: Implementar quando o Core estiver pronto
	// 1. Criar key com scope: echo:read
	// 2. GET /v1/echo/ping → 200 OK
	// 3. POST /v1/echo/create → 403 Forbidden (scope insuficiente)
	// 4. GET /v1/dns/zones → 403 Forbidden (plugin não permitido)
}

func TestAPIKeyRevocation(t *testing.T) {
	t.Skip("Requer banco de dados. Rodar com: make test-integration")

	// TODO: Implementar quando o Core estiver pronto
	// 1. Criar key
	// 2. Usar key → 200 OK
	// 3. DELETE /v1/account/keys/{id} → revogar
	// 4. Usar key novamente → 401 Unauthorized
}

func TestAPIKeyExpiration(t *testing.T) {
	t.Skip("Requer banco de dados. Rodar com: make test-integration")

	// TODO: Implementar quando o Core estiver pronto
	// 1. Criar key com expires_at no passado
	// 2. Usar key → 401 Unauthorized
}

func TestMultipleKeysPerDeveloper(t *testing.T) {
	t.Skip("Requer banco de dados. Rodar com: make test-integration")

	// TODO: Implementar quando o Core estiver pronto
	// 1. Criar key A (scope: dns)
	// 2. Criar key B (scope: ai)
	// 3. Key A → GET /v1/dns/zones → 200
	// 4. Key A → POST /v1/ai/generate → 403
	// 5. Key B → POST /v1/ai/generate → 200
	// 6. Key B → GET /v1/dns/zones → 403
}
