# Testes do Crom Cloud

Organização dos testes por camada e componente.

## Estrutura

```text
tests/
├── core/                  # Testes unitários do Core
│   ├── auth_test.go       # Validação de API Key, permissões
│   ├── billing_test.go    # Débito de créditos, reembolso
│   ├── discovery_test.go  # Descoberta de plugins
│   ├── vault_test.go      # Criptografia/descriptografia de secrets
│   └── dispatcher_test.go # Roteamento HTTP → gRPC
│
├── integration/           # Testes de integração (requer DB)
│   ├── apikey_flow_test.go    # Criar key → usar → revogar
│   ├── credit_flow_test.go    # Comprar créditos → consumir → verificar saldo
│   ├── plugin_lifecycle_test.go # Registrar → chamar → desativar plugin
│   └── docker-compose.test.yml # DB para testes
│
├── e2e/                   # Testes end-to-end (sistema completo)
│   ├── full_flow_test.go      # Registro → key → chamada → resposta
│   ├── error_scenarios_test.go # 401, 402, 403, 404, 429, 502
│   └── multi_plugin_test.go   # Múltiplos plugins simultâneos
│
└── plugins/               # Testes específicos de plugins
    ├── echo_test.go           # Plugin de teste básico
    └── bridge_test.go         # Teste do executor de subprocesso
```

## Como Rodar

```bash
# Todos os testes unitários
make test-unit

# Testes de integração (requer Docker para o DB)
make test-integration

# Testes E2E (requer sistema completo rodando)
make test-e2e

# Todos os testes
make test-all
```

## Cobertura Mínima Esperada

| Componente | Cobertura Alvo |
|------------|---------------|
| Auth (API Key) | 95% |
| Billing (Créditos) | 95% |
| Discovery | 90% |
| Vault (Secrets) | 95% |
| Dispatcher | 85% |
| Integração | 80% |
