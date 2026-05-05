# ══════════════════════════════════════════════════════
# Crom Cloud — Multi-Stage Dockerfile
# Compatível com Docker e Podman (Buildah)
# ══════════════════════════════════════════════════════

# Stage 1: Build do Core e Plugins
FROM docker.io/library/golang:1.25-alpine AS builder

RUN apk add --no-cache git make

WORKDIR /app

# Copiar go.work e módulos para cache de dependências
COPY go.work go.work.sum* ./
COPY core/go.mod core/go.sum ./core/
COPY plugins/echo/go.mod plugins/echo/go.sum ./plugins/echo/

RUN cd core && go mod download
RUN cd plugins/echo && go mod download

# Copiar código-fonte (inclui web/ para embed.FS)
COPY core/ ./core/
COPY plugins/ ./plugins/
COPY web/ ./web/

# Sincronizar frontend para embed.FS
RUN mkdir -p core/web/static && \
    cp web/index.html core/web/index.html && \
    cp -r web/static/* core/web/static/

# Compilar Core (frontend embutido via embed.FS)
RUN cd core && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/bin/crom-cloud ./cmd/crom-cloud

# Compilar Plugin Echo
RUN cd plugins/echo && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/bin/plugins/echo/echo .

# Copiar manifest do plugin
RUN cp plugins/echo/manifest.json /app/bin/plugins/echo/

# ──────────────────────────────────────────────────────
# Stage 2: Runtime minimal
FROM docker.io/library/alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

# Criar usuário não-root (segurança)
RUN addgroup -g 1000 crom && adduser -u 1000 -G crom -s /bin/sh -D crom

WORKDIR /app

# Copiar binário e artefatos do builder
COPY --from=builder /app/bin/crom-cloud ./crom-cloud
COPY --from=builder /app/bin/plugins/ ./plugins/

# Copiar migrações
COPY migrations/ ./migrations/

# Ownership
RUN chown -R crom:crom /app

# Usar usuário não-root
USER crom

# Porta padrão
EXPOSE 8080

# Variáveis de ambiente com defaults
ENV PORT=8080 \
    PLUGINS_DIR=./plugins \
    MIGRATIONS_DIR=./migrations \
    REDIS_URL=redis:6379

# Health check (compatível Docker + Podman)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/v1/system/health || exit 1

ENTRYPOINT ["./crom-cloud"]
