// Crom Cloud — SPA Router (Refactored)
const Router = {
  routes: {},
  current: null,

  register(path, handler) { this.routes[path] = handler; },

  async navigate(path) {
    // Auth guard
    const protectedRoutes = ['/dashboard', '/keys', '/billing', '/secrets', '/settings', '/activity'];
    if (protectedRoutes.some(r => path.startsWith(r)) && !API.isAuth()) {
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

      // Loading state with skeleton
      app.innerHTML = `<div class="flex items-center justify-center min-h-screen">
        <div class="flex flex-col items-center gap-3 text-slate-500">
          ${I('loader', 'w-8 h-8 anim-spin text-crom-500')}
          <span class="text-sm">Carregando...</span>
        </div>
      </div>`;

      try {
        await this.routes[route](app, params);
      } catch (e) {
        console.error('Router error:', e);
        app.innerHTML = `<div class="flex items-center justify-center min-h-screen">
          <div class="text-center anim-fade">
            <div class="mb-4 text-red-400">${I('alert-circle', 'w-12 h-12 mx-auto')}</div>
            <h2 class="text-xl font-bold mb-2">Erro ao carregar</h2>
            <p class="text-sm text-slate-500 mb-4">${UI.esc(e.message)}</p>
            ${UI.btn(`${I('arrow-left','w-4 h-4')} Tentar novamente`, 'primary', `onclick="Router.navigate('${path}')"`)}
          </div>
        </div>`;
      }
    } else {
      app.innerHTML = `<div class="flex items-center justify-center min-h-screen anim-fade">
        <div class="text-center">
          <div class="text-8xl font-black text-crom-500/20 mb-4">404</div>
          <h2 class="text-xl font-bold mb-2">Página não encontrada</h2>
          <p class="text-sm text-slate-500 mb-6">A rota <code class="px-2 py-0.5 bg-surface-card rounded text-crom-400">${path}</code> não existe.</p>
          ${UI.btn(`${I('arrow-left','w-4 h-4')} Voltar ao início`, 'primary', `onclick="Router.navigate('/')"`)}</div>
      </div>`;
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
