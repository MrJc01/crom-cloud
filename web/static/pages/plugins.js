// Crom Cloud — Plugins Page
Router.register('/plugins', async (app) => {
  try {
    const res = await API.listPlugins();
    const plugins = res.data || [];

    const comingSoon = [
      { name: 'Cloudflare DNS', slug: 'cloudflare', desc: 'Gerencie zonas DNS, registros e configurações de cache.', icon: 'globe', color: '#f59e0b' },
      { name: 'SSL Checker', slug: 'ssl', desc: 'Verifique certificados SSL, datas de expiração e chains.', icon: 'shield', color: '#22c55e' },
      { name: 'GitHub Actions', slug: 'github', desc: 'Dispare workflows, gerencie repos e PRs via API.', icon: 'git-branch', color: '#818cf8' },
      { name: 'AWS S3', slug: 's3', desc: 'Upload, download e gerenciamento de buckets S3.', icon: 'database', color: '#3b82f6' },
      { name: 'Docker Hub', slug: 'docker', desc: 'Gerencie imagens, tags e automações de deploy.', icon: 'cpu', color: '#06b6d4' },
      { name: 'Redis Manager', slug: 'redis', desc: 'Monitore e gerencie instâncias Redis remotamente.', icon: 'zap', color: '#ef4444' },
    ];

    const isAuth = API.isAuth();
    const wrap = isAuth ? (c) => dashboardLayout('Plugins', c, 'plugins') : (c) => `
      <nav style="position:fixed;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:0 24px;height:64px;background:rgba(0,0,0,0.8);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="font-weight:800;font-size:16px;display:flex;align-items:center;gap:8px;cursor:pointer;" onclick="Router.navigate('/')">
          <div style="width:32px;height:32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;color:white;font-size:14px;">C</div>
          <span style="background:linear-gradient(90deg,#818cf8,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Crom Cloud</span>
        </div>
        <a style="color:#818cf8;font-weight:600;font-size:14px;cursor:pointer;" onclick="Router.navigate('/login')">Login</a>
      </nav>
      <div style="padding-top:88px;padding-left:24px;padding-right:24px;max-width:1100px;margin:0 auto;padding-bottom:48px;">${c}</div>`;

    const content = `
      <div class="anim-fade">
        <h2 style="font-size:22px;font-weight:800;margin-bottom:4px;display:flex;align-items:center;gap:10px;">${I('puzzle','w-6 h-6')} Marketplace de Plugins</h2>
        <p style="color:#64748b;font-size:14px;margin-bottom:24px;">Explore ferramentas disponíveis via API unificada.</p>
      </div>

      ${plugins.length > 0 ? `<div style="margin-bottom:32px;">
        <h3 style="font-size:14px;font-weight:700;color:#22c55e;margin-bottom:12px;display:flex;align-items:center;gap:6px;">${I('check-circle','w-4 h-4')} Plugins Ativos</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;">
          ${plugins.map(p => `<div style="background:linear-gradient(135deg,rgba(26,34,51,0.8),rgba(17,24,39,0.9));border:1px solid rgba(34,197,94,0.2);border-radius:14px;padding:20px;transition:all 0.3s;cursor:pointer;" onmouseover="this.style.borderColor='#22c55e';this.style.boxShadow='0 8px 30px rgba(0,0,0,0.3)'" onmouseout="this.style.borderColor='rgba(34,197,94,0.2)';this.style.boxShadow=''" onclick="Router.navigate('/docs/${p.slug}')">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
              <div style="width:40px;height:40px;border-radius:10px;background:rgba(34,197,94,0.1);display:flex;align-items:center;justify-content:center;color:#22c55e;">${I('puzzle','w-5 h-5')}</div>
              <div><div style="font-weight:700;">${UI.esc(p.name)}</div><div style="font-size:12px;color:#64748b;">v${p.version} · ${p.routes.length} endpoints</div></div>
            </div>
            <div style="display:flex;gap:8px;">${UI.badge('● Ativo', 'active')} ${UI.badge(p.credit_cost === 0 ? 'Grátis' : p.credit_cost + ' cr/req', 'info')}</div>
          </div>`).join('')}
        </div>
      </div>` : ''}

      <h3 style="font-size:14px;font-weight:700;color:#f59e0b;margin-bottom:12px;display:flex;align-items:center;gap:6px;">${I('clock','w-4 h-4')} Em Breve</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;">
        ${comingSoon.map((p, i) => `<div style="background:linear-gradient(135deg,rgba(26,34,51,0.8),rgba(17,24,39,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:20px;transition:all 0.3s;opacity:0;animation:fadeIn 0.4s ease-out both;animation-delay:${i*0.06}s;" onmouseover="this.style.borderColor='${p.color}40';this.style.boxShadow='0 8px 30px rgba(0,0,0,0.3)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.06)';this.style.boxShadow=''">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <div style="width:40px;height:40px;border-radius:10px;background:${p.color}15;display:flex;align-items:center;justify-content:center;color:${p.color};">${I(p.icon,'w-5 h-5')}</div>
            <div><div style="font-weight:700;">${p.name}</div><div style="font-size:12px;color:#64748b;">Em breve</div></div>
          </div>
          <p style="font-size:13px;color:#94a3b8;margin-bottom:12px;">${p.desc}</p>
          ${UI.badge('Em Desenvolvimento', 'warning')}
        </div>`).join('')}
      </div>`;

    app.innerHTML = wrap(content);
  } catch (err) { toast(err.message, 'error'); }
});
