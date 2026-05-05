// Crom Cloud — Sidebar (Inline styles for reliability)
const Sidebar = {
  collapsed: localStorage.getItem('sidebar_collapsed') === 'true',
  mobileOpen: false,

  toggle() {
    this.collapsed = !this.collapsed;
    localStorage.setItem('sidebar_collapsed', this.collapsed);
    this.update();
  },

  toggleMobile() {
    this.mobileOpen = !this.mobileOpen;
    this.update();
  },

  update() {
    const sb = document.getElementById('sidebar');
    const mc = document.getElementById('main-content');
    if (!sb) return;
    if (window.innerWidth > 768) {
      sb.style.width = this.collapsed ? '64px' : '256px';
      mc.style.marginLeft = this.collapsed ? '64px' : '256px';
      document.querySelectorAll('.sb-label').forEach(el => el.style.display = this.collapsed ? 'none' : '');
      document.querySelectorAll('.sb-section').forEach(el => el.style.display = this.collapsed ? 'none' : '');
      const lt = document.querySelector('.sb-logo-text');
      if (lt) lt.style.display = this.collapsed ? 'none' : '';
      const ui = document.querySelector('.sb-user-info');
      if (ui) ui.style.display = this.collapsed ? 'none' : '';
    }
  },

  render(activeNav = '') {
    const user = API.user || { name: 'User', email: '', plan: 'free' };
    const initial = (user.name || 'U')[0].toUpperCase();
    const w = this.collapsed ? 64 : 256;

    const navItem = (iconName, route, label) => {
      const active = activeNav === route;
      const bg = active ? 'background:rgba(99,102,241,0.1);color:#818cf8;border-left:2px solid #6366f1;' : 'color:#94a3b8;border-left:2px solid transparent;';
      return `<a style="display:flex;align-items:center;gap:12px;padding:10px 16px;margin:2px 8px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.15s;${bg}" onmouseover="if(!${active})this.style.background='rgba(255,255,255,0.04)'" onmouseout="if(!${active})this.style.background=''" onclick="Router.navigate('/${route}')">
        <span style="flex-shrink:0;">${I(iconName, 'w-[18px] h-[18px]')}</span>
        <span class="sb-label" ${this.collapsed ? 'style="display:none"' : ''}>${label}</span>
      </a>`;
    };

    return `
    <aside id="sidebar" style="width:${w}px;position:fixed;top:0;left:0;bottom:0;z-index:199;background:#111827;border-right:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;transition:width 0.3s;">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:12px;padding:16px;border-bottom:1px solid rgba(255,255,255,0.06);min-height:65px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:900;color:white;font-size:14px;flex-shrink:0;cursor:pointer;" onclick="Router.navigate('/dashboard')">C</div>
        <div class="sb-logo-text" ${this.collapsed ? 'style="display:none"' : ''}>
          <div style="font-weight:700;font-size:14px;">Crom Cloud</div>
          <div style="font-size:10px;color:#64748b;">API Gateway</div>
        </div>
        <button style="margin-left:auto;padding:6px;border-radius:8px;background:none;border:none;color:#64748b;cursor:pointer;transition:color 0.2s;display:${window.innerWidth > 768 ? 'flex' : 'none'}" onmouseover="this.style.color='#f1f5f9'" onmouseout="this.style.color='#64748b'" onclick="Sidebar.toggle()">${I('panel-left', 'w-4 h-4')}</button>
      </div>

      <!-- Nav -->
      <nav style="flex:1;padding:12px 0;overflow-y:auto;">
        <div style="margin-bottom:16px;">
          <div class="sb-section" style="padding:0 16px;margin-bottom:8px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#475569;${this.collapsed ? 'display:none' : ''}">Geral</div>
          ${navItem('dashboard', 'dashboard', 'Overview')}
          ${navItem('puzzle', 'plugins', 'Plugins')}
          ${navItem('book-open', 'docs', 'Documentação')}
        </div>
        <div style="margin-bottom:16px;">
          <div class="sb-section" style="padding:0 16px;margin-bottom:8px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#475569;${this.collapsed ? 'display:none' : ''}">Conta</div>
          ${navItem('key', 'keys', 'API Keys')}
          ${navItem('credit-card', 'billing', 'Créditos')}
          ${navItem('lock', 'secrets', 'Secrets')}
        </div>
        <div>
          <div class="sb-section" style="padding:0 16px;margin-bottom:8px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#475569;${this.collapsed ? 'display:none' : ''}">Sistema</div>
          ${navItem('activity', 'activity', 'Atividade')}
          ${navItem('settings', 'settings', 'Configurações')}
        </div>
      </nav>

      <!-- Footer -->
      <div style="padding:12px;border-top:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:#6366f1;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:white;flex-shrink:0;">${initial}</div>
        <div class="sb-user-info" style="flex:1;min-width:0;${this.collapsed ? 'display:none' : ''}">
          <div style="font-weight:600;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${UI.esc(user.name)}</div>
          <div style="font-size:10px;color:#64748b;">${user.plan} plan</div>
        </div>
        <button style="padding:6px;border-radius:8px;background:none;border:none;color:#64748b;cursor:pointer;flex-shrink:0;${this.collapsed ? 'display:none' : ''}" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#64748b'" onclick="API.clearToken();Router.navigate('/')" title="Sair">${I('log-out','w-4 h-4')}</button>
      </div>
    </aside>`;
  },
};
