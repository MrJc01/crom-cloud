// Crom Cloud — Plugins Page
Router.register('/plugins', async (app) => {
  const loadAndRender = async () => {
    try {
      const res = await API.listPlugins();
      const plugins = res.data || [];
      const isAuth = API.isAuth();
      
      let enabledSlugs = [];
      if (isAuth) {
        try {
          const resEnabled = await API.listEnabledPlugins();
          enabledSlugs = resEnabled.data?.enabled_plugins || [];
        } catch (e) {
          console.error('Erro ao buscar plugins habilitados', e);
        }
      }

      // Funções do Dashboard layout ou Landing nav
      const wrap = isAuth ? (c) => dashboardLayout('Plugins', c, 'plugins') : (c) => `
        <nav style="position:fixed;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:0 24px;height:64px;background:rgba(0,0,0,0.8);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="font-weight:800;font-size:16px;display:flex;align-items:center;gap:8px;cursor:pointer;" onclick="Router.navigate('/')">
            <div style="width:32px;height:32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;color:white;font-size:14px;">C</div>
            <span style="background:linear-gradient(90deg,#818cf8,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Crom Cloud</span>
          </div>
          <a style="color:#818cf8;font-weight:600;font-size:14px;cursor:pointer;" onclick="Router.navigate('/login')">Login</a>
        </nav>
        <div style="padding-top:88px;padding-left:24px;padding-right:24px;max-width:1100px;margin:0 auto;padding-bottom:48px;">${c}</div>`;

      const renderPluginCard = (p) => {
        const isEnabled = enabledSlugs.includes(p.slug);
        const borderColor = isEnabled ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)';
        const hoverColor = isEnabled ? '#22c55e' : '#818cf8';
        const iconColor = isEnabled ? '#22c55e' : '#a78bfa';
        const bgIconColor = isEnabled ? 'rgba(34,197,94,0.1)' : 'rgba(167,139,250,0.1)';
        
        return `
        <div style="background:linear-gradient(135deg,rgba(26,34,51,0.8),rgba(17,24,39,0.9));border:1px solid ${borderColor};border-radius:14px;padding:20px;transition:all 0.3s;cursor:pointer;" onmouseover="this.style.borderColor='${hoverColor}';this.style.boxShadow='0 8px 30px rgba(0,0,0,0.3)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='${borderColor}';this.style.boxShadow='';this.style.transform=''" onclick="Router.navigate('/plugins/${p.slug}')">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <div style="width:44px;height:44px;border-radius:12px;background:${bgIconColor};display:flex;align-items:center;justify-content:center;color:${iconColor};">${I('puzzle','w-6 h-6')}</div>
            <div style="flex:1;">
              <div style="font-weight:700;font-size:16px;">${UI.esc(p.name)}</div>
              <div style="font-size:12px;color:#64748b;">v${p.version}</div>
            </div>
            ${isEnabled ? `<div style="background:rgba(34,197,94,0.1);color:#22c55e;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;display:flex;align-items:center;gap:4px;">${I('check','w-3 h-3')} Habilitado</div>` : ''}
          </div>
          <p style="font-size:13px;color:#94a3b8;margin-bottom:16px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${UI.esc(p.description || 'Integração oficial Crom Cloud.')}</p>
          <div style="display:flex;gap:8px;align-items:center;">
            ${UI.badge(p.routes ? p.routes.length + ' rotas' : '0 rotas', 'default')}
            ${UI.badge(p.credit_cost === 0 ? 'Grátis' : p.credit_cost + ' cr/req', p.credit_cost === 0 ? 'success' : 'info')}
          </div>
        </div>`;
      };

      // Separamos os habilitados dos não habilitados (catálogo geral)
      const enabledPluginsList = plugins.filter(p => enabledSlugs.includes(p.slug));
      const catalogPluginsList = plugins.filter(p => !enabledSlugs.includes(p.slug) && p.status === 'active');

      const content = `
        <div class="anim-fade">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:32px;">
            <div>
              <h2 style="font-size:24px;font-weight:800;margin-bottom:8px;display:flex;align-items:center;gap:10px;">${I('puzzle','w-7 h-7')} Biblioteca de APIs</h2>
              <p style="color:#64748b;font-size:15px;max-width:600px;">Explore e habilite ferramentas no seu Workspace. Todas as APIs rodam de forma nativa e isolada no Crom Cloud.</p>
            </div>
          </div>

          ${isAuth && enabledPluginsList.length > 0 ? `
          <div style="margin-bottom:48px;">
            <h3 style="font-size:14px;font-weight:700;color:#22c55e;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
              ${I('check-circle','w-4 h-4')} Habilitados no Workspace
            </h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;">
              ${enabledPluginsList.map(renderPluginCard).join('')}
            </div>
          </div>` : ''}

          <div>
            <h3 style="font-size:14px;font-weight:700;color:#818cf8;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
              ${I('layers','w-4 h-4')} ${isAuth && enabledPluginsList.length > 0 ? 'Outras APIs Disponíveis' : 'Catálogo de APIs'}
            </h3>
            ${catalogPluginsList.length > 0 ? `
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;">
              ${catalogPluginsList.map(renderPluginCard).join('')}
            </div>` : '<div style="color:#64748b;padding:24px;background:rgba(255,255,255,0.02);border-radius:12px;text-align:center;">Não há novas APIs disponíveis no momento.</div>'}
          </div>
        </div>
      `;

      app.innerHTML = wrap(content);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  loadAndRender();
});
