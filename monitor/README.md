# 🖥️ Crom Cloud — Monitor (Centro de Controle)

Sistema interativo de gestão completa do Crom Cloud via terminal.

## Uso

```bash
# Iniciar o painel interativo
./monitor.sh

# Atalhos diretos (sem menu)
./monitor.sh start        # Inicia em modo localhost
./monitor.sh stop         # Para tudo
./monitor.sh status       # Mostra status dos serviços
./monitor.sh logs         # Mostra logs em tempo real
./monitor.sh test         # Roda suite de testes
./monitor.sh build        # Compila binários
./monitor.sh deploy       # Modo produção (Docker)
```

## Estrutura

```
monitor/
├── monitor.sh          # Ponto de entrada principal
├── README.md           # Esta documentação
├── config/
│   ├── profiles.conf   # Perfis de ambiente (localhost, prod, staging)
│   └── defaults.conf   # Configurações padrão do monitor
├── lib/
│   ├── ui.sh           # Funções de interface (cores, banners, menus)
│   ├── docker.sh       # Gerenciamento de containers Docker
│   ├── services.sh     # Start/stop de serviços Go (localhost)
│   ├── health.sh       # Health checks e diagnósticos
│   ├── build.sh        # Compilação e build do projeto
│   ├── tests.sh        # Runner de testes (unit, e2e, all)
│   └── config.sh       # Editor interativo de .env e perfis
├── logs/
│   └── .gitkeep        # Diretório para logs do monitor
└── tmp/
    └── .gitkeep        # Diretório para PIDs e locks
```

## Funcionalidades

| Módulo        | Descrição                                      |
|---------------|-------------------------------------------------|
| **Start**     | Liga PostgreSQL, Redis e API em localhost       |
| **Stop**      | Desliga tudo de forma graceful                  |
| **Status**    | Painel em tempo real de todos os serviços       |
| **Logs**      | Visualização unificada de logs                  |
| **Build**     | Compila core + plugins com validação            |
| **Test**      | Roda testes unitários e E2E                     |
| **Config**    | Editor interativo do .env e perfis              |
| **Deploy**    | Build Docker + compose up (produção)            |
| **Health**    | Diagnóstico completo de saúde do sistema        |
