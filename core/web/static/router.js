// Crom Cloud — SPA Router
const Router = {
  routes: {},
  current: null,

  register(path, handler) { this.routes[path] = handler; },

  async navigate(path) {
    // Guard: rotas de dashboard requerem auth
    const dashRoutes = ['/dashboard', '/keys', '/billing', '/secrets'];
    if (dashRoutes.some(r => path.startsWith(r)) && !API.isAuth()) {
      return this.navigate('/login');
    }
    this.current = path;
    window.history.pushState({}, '', '#' + path);
    const app = document.getElementById('app');
    // Match route
    const route = Object.keys(this.routes).find(r => {
      if (r === path) return true;
      if (r.includes(':')) {
        const rParts = r.split('/'), pParts = path.split('/');
        return rParts.length === pParts.length && rParts.every((p, i) => p.startsWith(':') || p === pParts[i]);
      }
      return false;
    });
    if (route) {
      const params = {};
      const rParts = route.split('/'), pParts = path.split('/');
      rParts.forEach((p, i) => { if (p.startsWith(':')) params[p.slice(1)] = pParts[i]; });
      app.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;color:var(--text-muted)">Carregando...</div>';
      try { await this.routes[route](app, params); } catch (e) { console.error(e); }
    } else {
      app.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh"><h1>404</h1></div>';
    }
  },

  init() {
    window.addEventListener('hashchange', () => {
      const path = window.location.hash.slice(1) || '/';
      this.navigate(path);
    });
    const path = window.location.hash.slice(1) || '/';
    this.navigate(path);
  }
};

// Helpers
function toast(msg, type = 'success') {
  let c = document.querySelector('.toast-container');
  if (!c) { c = document.createElement('div'); c.className = 'toast-container'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function dashboardLayout(title, content, activeNav = '') {
  const user = API.user || { name: 'User', email: '', plan: 'free' };
  const initial = (user.name || 'U')[0].toUpperCase();
  return `
  <div class="dashboard">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo-icon">C</div>
        <div class="logo-text">Crom Cloud<small>API Gateway</small></div>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-section">
          <div class="nav-section-title">Geral</div>
          <a class="nav-item ${activeNav==='dashboard'?'active':''}" onclick="Router.navigate('/dashboard')">📊 Overview</a>
          <a class="nav-item ${activeNav==='plugins'?'active':''}" onclick="Router.navigate('/plugins')">🧩 Plugins</a>
          <a class="nav-item ${activeNav==='docs'?'active':''}" onclick="Router.navigate('/docs')">📚 Documentação</a>
        </div>
        <div class="nav-section">
          <div class="nav-section-title">Conta</div>
          <a class="nav-item ${activeNav==='keys'?'active':''}" onclick="Router.navigate('/keys')">🔑 API Keys</a>
          <a class="nav-item ${activeNav==='billing'?'active':''}" onclick="Router.navigate('/billing')">💳 Créditos</a>
          <a class="nav-item ${activeNav==='secrets'?'active':''}" onclick="Router.navigate('/secrets')">🔒 Secrets</a>
        </div>
      </nav>
      <div class="sidebar-footer">
        <div class="user-avatar">${initial}</div>
        <div class="user-info">
          <div class="name">${user.name}</div>
          <div class="plan">${user.plan} plan</div>
        </div>
        <a onclick="API.clearToken(); Router.navigate('/')" style="cursor:pointer;color:var(--text-muted)" title="Sair">⏻</a>
      </div>
    </aside>
    <div class="main-content">
      <header class="top-bar">
        <h1>${title}</h1>
        <div class="top-bar-actions">
          <span style="color:var(--text-muted);font-size:0.85rem">${user.email}</span>
        </div>
      </header>
      <div class="content-area">${content}</div>
    </div>
  </div>`;
}
