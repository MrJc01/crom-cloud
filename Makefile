.PHONY: proto build dev test test-unit test-all docker-up docker-down clean migrate-up migrate-down migrate-create sync-web

# Gera código Go a partir do .proto
proto:
	cd core/proto && protoc --go_out=. --go_out=paths=source_relative \
		--go-grpc_out=. --go-grpc_out=paths=source_relative \
		plugin.proto

# Sincroniza frontend para embed.FS
sync-web:
	@mkdir -p core/web/static
	@cp web/index.html core/web/index.html
	@cp -r web/static/* core/web/static/
	@echo "✅ Frontend sincronizado para core/web/"

# Compila o binário do Core (inclui frontend embed)
build: sync-web
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

# Testes E2E via curl (requer servidor rodando)
test-e2e:
	bash tests/e2e_curl_test.sh

# Roda todos os testes
test-all: test test-e2e

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
