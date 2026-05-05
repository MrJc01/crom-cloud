.PHONY: proto build dev test test-unit test-all docker-up docker-down clean migrate-up migrate-down migrate-create

# Gera código Go a partir do .proto
proto:
	cd core/proto && protoc --go_out=. --go_out=paths=source_relative \
		--go-grpc_out=. --go-grpc_out=paths=source_relative \
		plugin.proto

# Compila o binário do Core
build:
	cd core && go build -o crom-cloud ./cmd/crom-cloud

# Compila o plugin echo
build-echo:
	cd plugins/echo && go build -o echo .

# Compila tudo (core + plugins)
build-all: build build-echo

# Roda em modo desenvolvimento
dev:
	cd core && go run ./cmd/crom-cloud

# Roda todos os testes unitários do core
test:
	cd core && go test ./...

# Testes unitários dos testes separados
test-unit:
	cd tests && go test ./core/... -v

# Testes de integração (requer docker-compose up)
test-integration:
	cd tests && go test ./integration/... -v -count=1

# Testes E2E (requer docker-compose up)
test-e2e:
	cd tests && go test ./e2e/... -v -count=1

# Roda todos os testes (unitários + integração + e2e)
test-all: test test-unit test-integration test-e2e

# === Migrações ===

# Aplica todas as migrações pendentes
migrate-up:
	@echo "Aplicando migrações..."
	cd core && go run ./cmd/crom-cloud migrate-up 2>/dev/null || \
	migrate -path ./migrations -database "$${DATABASE_URL}" up

# Reverte a última migração
migrate-down:
	migrate -path ./migrations -database "$${DATABASE_URL}" down 1

# Cria um novo par de arquivos de migração
# Uso: make migrate-create NAME=nome_da_migracao
migrate-create:
	migrate create -ext sql -dir ./migrations -seq $(NAME)

# Sobe containers de dev (PG + Redis)
docker-up:
	docker-compose up -d

# Para containers de dev
docker-down:
	docker-compose down

# Limpa binários
clean:
	rm -f core/crom-cloud
	find plugins -name "*.bin" -delete
	find plugins -name "echo" -not -path "*/echo/*" -delete 2>/dev/null || true
