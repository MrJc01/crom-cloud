# Azure & DigitalOcean — Mapeamento e Roadmap de Plugins

Este documento detalha as oportunidades de integração com Microsoft Azure (Enterprise Cloud) e DigitalOcean (Developer Cloud).

---

## 🟦 Microsoft Azure (Enterprise Cloud)

O Azure é a segunda maior nuvem pública, com forte presença em ambientes corporativos e integração nativa com o ecossistema Microsoft.

### Categorias de Serviço:
*   **Compute:** Virtual Machines, App Service (PaaS para web apps), Azure Functions (Serverless), AKS (Kubernetes).
*   **Databases:** Azure SQL Database, Cosmos DB (NoSQL distribuído globalmente), Azure Database for PostgreSQL.
*   **Storage:** Azure Blob Storage, Azure Files.
*   **AI & ML:** Azure OpenAI Service (acesso direto aos modelos GPT da OpenAI), Azure Cognitive Services.

### 🎯 Candidatos a Plugins (Azure)
1.  **Azure Blob Storage (`azure-blob`)**: Gestão de arquivos e containers de armazenamento.
2.  **Azure App Service Monitor (`azure-appservice`)**: Restart de aplicações web, visualização de logs em tempo real.
3.  **Azure OpenAI Bridge (`azure-openai`)**: Um proxy seguro no Crom Cloud para consumir modelos GPT, controlando limites e cobrança (billing).

---

## 🌊 DigitalOcean (Developer Cloud)

Conhecida por sua simplicidade e foco no desenvolvedor, a DigitalOcean oferece infraestrutura acessível e fácil de usar. Recentemente, expandiu fortemente para **AI-Native Cloud**.

### Categorias de Serviço:
*   **Compute:** Droplets (VMs Linux, incluindo GPUs Nvidia/AMD), App Platform (PaaS), DOKS (Managed Kubernetes).
*   **Databases:** Managed PostgreSQL, Redis, MySQL, MongoDB, e Bancos de Dados Vetoriais.
*   **Storage:** Spaces (Object Storage compatível com S3), Volumes (Block storage).
*   **AI-Native Cloud:** Inference Engine (roteador de inferência LLM), GPU Droplets, Model Catalog.

### 🎯 Candidatos a Plugins (DigitalOcean)
1.  **Droplet Manager (`do-droplets`)**
    *   **Ações:** Listar Droplets, Power On/Off, Reboot, Snapshot.
    *   **Valor:** Gestão rápida de servidores linux.
2.  **Spaces Storage (`do-spaces`)**
    *   **Ações:** Gerenciar buckets S3-compatíveis e gerir CDN nativa do DO Spaces.
    *   **Valor:** Gerenciamento de arquivos e assets.
3.  **Managed Database Monitor (`do-databases`)**
    *   **Ações:** Ver status do cluster, obter string de conexão, forçar failover.
    *   **Valor:** Monitoramento rápido da saúde do banco de dados sem abrir o painel da DO.
4.  **AI Inference Proxy (`do-inference`)**
    *   **Ações:** Roteamento de requests de IA para o DigitalOcean Inference Engine através do gateway do Crom Cloud.
