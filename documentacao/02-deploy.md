# 02 — Deploy

## Opção A: Desenvolvimento Local (sem Docker para o Core)

```bash
# 1. Subir apenas banco + redis
docker compose up -d postgres redis

# 2. Compilar plugin
cd plugins/echo && go build -o echo . && cd ../..

# 3. Carregar env e rodar
cd core
export $(grep -v '^#' ../.env | grep -v '^$' | xargs)
go run ./cmd/crom-cloud
```

---

## Opção B: Docker Compose Completo

Sobe tudo (Core + PostgreSQL + Redis) num comando:

```bash
# Build + start
docker compose up -d --build

# Ver logs
docker compose logs -f core

# Parar
docker compose down

# Parar e limpar volumes (reset total do banco)
docker compose down -v
```

### Verificar saúde:
```bash
docker compose ps
# Todos devem estar "healthy" ou "running"

curl http://localhost:8080/v1/system/health
```

---

## Opção C: Podman (sem Docker)

O projeto é 100% compatível com Podman:

```bash
# Instalar podman-compose (se não tiver)
pip install podman-compose

# Subir
podman-compose up -d --build

# Verificar
podman ps

# Parar
podman-compose down
```

**Por que funciona:** todas as imagens usam FQDNs (`docker.io/library/...`), não há features Docker-only.

---

## Opção D: VPS de Produção

### 1. Preparar o servidor

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git

# Criar diretório
sudo mkdir -p /opt/crom-cloud
cd /opt/crom-cloud
```

### 2. Clonar e configurar

```bash
git clone https://github.com/crom/crom-cloud.git .

# Gerar chaves seguras para produção
cp .env.example .env
sed -i "s/VAULT_KEY=.*/VAULT_KEY=$(openssl rand -hex 32)/" .env
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 32)/" .env

# Ajustar senha do banco
sed -i "s/crom_dev_2026/$(openssl rand -hex 16)/" .env
```

### 3. Build e deploy

```bash
docker compose up -d --build
```

### 4. Configurar Nginx (reverse proxy + HTTPS)

```nginx
server {
    listen 80;
    server_name api.cromcloud.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.cromcloud.com;

    ssl_certificate /etc/letsencrypt/live/api.cromcloud.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.cromcloud.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Instalar certbot
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.cromcloud.com
```

### 5. Atualizar em produção

```bash
cd /opt/crom-cloud
git pull
docker compose up -d --build
```

---

## Variáveis de Ambiente para Produção

| Variável | Dev | Produção |
|----------|-----|----------|
| `PORT` | 8080 | 8080 (atrás do Nginx) |
| `DATABASE_URL` | localhost | container network |
| `REDIS_URL` | localhost:6379 | container network |
| `VAULT_KEY` | dev key | `openssl rand -hex 32` |
| `JWT_SECRET` | dev key | `openssl rand -hex 32` |

---

**Próximo:** [03-testes.md](03-testes.md) — Testes
