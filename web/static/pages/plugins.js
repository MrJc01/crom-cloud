// Crom Cloud — Plugins Marketplace
Router.register('/plugins', async (app) => {
  try {
    const res = await API.listPlugins();
    const plugins = res.data || [];
    const isAuth = API.isAuth();
    const layout = isAuth ? (content) => dashboardLayout('Plugins', content, 'plugins') : (content) => `
      <nav class="home-nav"><div class="logo"><span>☁ Crom Cloud</span></div><div class="nav-links"><a onclick="Router.navigate('/docs')">Docs</a><a onclick="Router.navigate('/login')">Login</a></div></nav>
      <div style="padding-top:calc(var(--header-height)+2rem);max-width:1000px;margin:0 auto;padding-left:2rem;padding-right:2rem">${content}</div>`;
    app.innerHTML = layout(`
      <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:0.5rem">🧩 Marketplace de Plugins</h2>
      <p style="color:var(--text-secondary);margin-bottom:2rem">Explore ferramentas disponíveis via API unificada.</p>
      <div class="docs-grid">
        ${plugins.map(p => `<div class="doc-card" onclick="Router.navigate('/docs/${p.slug}')">
          <div class="doc-icon">${p.slug==='echo'?'📡':'🧩'}</div>
          <h3>${p.name}</h3>
          <p>v${p.version} — ${p.routes.length} endpoints</p>
          <div class="doc-meta">
            <span class="badge badge-active">● Ativo</span>
            <span class="doc-tag">${p.credit_cost===0?'Grátis':p.credit_cost+' cr/req'}</span>
          </div>
        </div>`).join('')}
        ${['Cloudflare DNS','SSL Checker','GitHub Actions','AWS S3','Docker Hub','Redis Manager'].map(n=>`<div class="doc-card" style="opacity:0.5;cursor:default">
          <div class="doc-icon">🔜</div><h3>${n}</h3><p>Em breve</p><div class="doc-meta"><span class="badge badge-warning">Em Desenvolvimento</span></div>
        </div>`).join('')}
      </div>
    `);
  } catch(e){ toast(e.message,'error'); }
});
