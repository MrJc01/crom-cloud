# 06 — Dashboard Web

## Visão Geral

O dashboard é uma **SPA (Single Page Application)** em HTML/CSS/JS vanilla, embutida no binário Go via `embed.FS`. Não precisa de Node.js, Webpack ou framework.

**Acesso:** `http://localhost:8080/`

---

## Arquitetura do Frontend

```
web/                          ← Fonte (editável)
├── index.html                ← Entry point HTML
└── static/
    ├── style.css             ← Estilos globais (dark theme)
    ├── router.js             ← SPA router (hash-based)
    ├── api.js                ← Fetch helpers
    ├── app.js                ← Bootstrap da aplicação
    └── pages/
        ├── home.js           ← Landing page
        ├── auth.js           ← Login / Register
        ├── dashboard.js      ← Painel principal
        ├── keys.js           ← Gerenciar API Keys
        ├── secrets.js        ← Cofre de secrets
        ├── billing.js        ← Créditos e uso
        ├── plugins.js        ← Lista de plugins
        └── docs.js           ← Documentação inline
```

---

## Como Funciona o Embed

1. `web/` contém os fontes editáveis
2. `make sync-web` copia para `core/web/`
3. `core/web/embed.go` usa `embed.FS` para embutir no binário
4. O servidor serve os arquivos via `web.Handler()`

**Fluxo de edição:**
```bash
# 1. Edite arquivos em web/
vim web/static/pages/dashboard.js

# 2. Sincronize
make sync-web

# 3. Reinicie o servidor
# (ou use make dev que faz automaticamente)
```

---

## Como Editar uma Página

### Exemplo: adicionar uma nova seção ao Dashboard

Edite `web/static/pages/dashboard.js`:

```javascript
export function render() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="dashboard">
      <h1>Dashboard</h1>
      
      <!-- Seção existente -->
      <div class="card" id="balance-card">
        <h3>Saldo</h3>
        <p id="balance">Carregando...</p>
      </div>
      
      <!-- Nova seção -->
      <div class="card" id="minha-secao">
        <h3>Minha Nova Seção</h3>
        <p>Conteúdo aqui</p>
      </div>
    </div>
  `;
  
  loadBalance();
}

async function loadBalance() {
  const data = await api.get('/v1/account/balance');
  document.getElementById('balance').textContent = data.balance + ' créditos';
}
```

### Exemplo: adicionar estilo

Edite `web/static/style.css`:

```css
/* Nova seção */
#minha-secao {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 1.5rem;
}
```

---

## Como Criar uma Nova Página

### 1. Criar o arquivo JS

```javascript
// web/static/pages/minha-pagina.js
import { api } from '../api.js';

export function render() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="page">
      <h1>Minha Página</h1>
      <p>Conteúdo da página</p>
    </div>
  `;
}
```

### 2. Registrar a rota

Edite `web/static/router.js`:

```javascript
import { render as minhaPageRender } from './pages/minha-pagina.js';

const routes = {
  // ... rotas existentes
  'minha-pagina': minhaPageRender,
};
```

### 3. Adicionar link na navegação

Edite `web/index.html` ou o componente de navegação:

```html
<a href="#minha-pagina">Minha Página</a>
```

---

## Design System

O dashboard usa um tema **dark premium** com estas variáveis:

```css
:root {
  --bg-primary: #0a0a0f;
  --bg-card: #12121a;
  --text-primary: #e4e4e7;
  --text-secondary: #a1a1aa;
  --accent: #6366f1;
  --accent-hover: #818cf8;
  --success: #22c55e;
  --danger: #ef4444;
  --border: #27272a;
  --radius: 12px;
}
```

**Ícones:** Lucide Icons via CDN (`<i data-lucide="icon-name"></i>`)

**Fonte:** Inter (Google Fonts)

---

## Responsividade

Breakpoints implementados:
- **Desktop:** > 1024px
- **Tablet:** 768px - 1024px
- **Mobile:** < 768px
- **Small mobile:** < 480px

---

**Próximo:** [07-configuracao.md](07-configuracao.md) — Configuração
