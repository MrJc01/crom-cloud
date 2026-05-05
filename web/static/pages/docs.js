// Crom Cloud — Plugin Documentation
Router.register('/docs', async (app) => {
  try {
    const res = await API.listPlugins();
    const plugins = res.data || [];
    const isAuth = API.isAuth();
    const wrap = isAuth ? (c) => dashboardLayout('Documentação', c, 'docs') : (c) => `
      <nav class="home-nav"><div class="logo"><span>☁ Crom Cloud</span></div><div class="nav-links"><a onclick="Router.navigate('/plugins')">Plugins</a><a onclick="Router.navigate('/login')">Login</a></div></nav>
      <div style="padding-top:calc(var(--header-height)+2rem);max-width:1000px;margin:0 auto;padding:2rem">${c}</div>`;
    app.innerHTML = wrap(`
      <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:2rem">📚 Documentação da API</h2>
      <div class="docs-grid">
        <div class="doc-card" onclick="Router.navigate('/docs/getting-started')"><div class="doc-icon">🚀</div><h3>Getting Started</h3><p>Primeiros passos com a Crom Cloud API</p></div>
        <div class="doc-card" onclick="Router.navigate('/docs/authentication')"><div class="doc-icon">🔑</div><h3>Autenticação</h3><p>JWT, API Keys e permissões</p></div>
        ${plugins.map(p=>`<div class="doc-card" onclick="Router.navigate('/docs/${p.slug}')"><div class="doc-icon">📡</div><h3>${p.name}</h3><p>v${p.version} — ${p.routes.length} endpoints</p><div class="doc-meta">${p.routes.map(r=>`<span class="doc-tag">${r.method}</span>`).join('')}</div></div>`).join('')}
      </div>
    `);
  } catch(e){ toast(e.message,'error'); }
});

// Getting Started
Router.register('/docs/getting-started', async (app) => {
  const wrap = API.isAuth() ? (c) => dashboardLayout('Docs', c, 'docs') : (c) => `<nav class="home-nav"><div class="logo"><span>☁ Crom Cloud</span></div></nav><div style="padding:calc(var(--header-height)+2rem) 2rem;max-width:800px;margin:0 auto">${c}</div>`;
  app.innerHTML = wrap(`<div class="plugin-doc">
    <a onclick="Router.navigate('/docs')" style="color:var(--text-muted);font-size:0.85rem">← Voltar</a>
    <h1 style="margin-top:1rem">🚀 Getting Started</h1>
    <p class="plugin-meta">Comece a usar a Crom Cloud em 3 minutos</p>
    <section><h2>1. Criar Conta</h2><div class="code-block">curl -X POST https://api.crom.cloud/v1/account/register \\<br>&nbsp;&nbsp;-H "Content-Type: application/json" \\<br>&nbsp;&nbsp;-d '{"email":"dev@ex.com","name":"Dev","password":"123456"}'</div></section>
    <section><h2>2. Fazer Login</h2><div class="code-block">curl -X POST https://api.crom.cloud/v1/account/login \\<br>&nbsp;&nbsp;-d '{"email":"dev@ex.com","password":"123456"}'<br><br><span class="comment"># Resposta: {"data":{"token":"eyJ..."}}</span></div></section>
    <section><h2>3. Criar API Key</h2><div class="code-block">curl -X POST https://api.crom.cloud/v1/account/keys \\<br>&nbsp;&nbsp;-H "Authorization: Bearer JWT_TOKEN" \\<br>&nbsp;&nbsp;-d '{"label":"minha-key","permissions":[{"plugin":"*","scope":"read"}]}'<br><br><span class="comment"># Resposta: {"data":{"key":"crom_sk_live_..."}}</span></div></section>
    <section><h2>4. Chamar um Plugin</h2><div class="code-block">curl https://api.crom.cloud/v1/echo/ping \\<br>&nbsp;&nbsp;-H "Authorization: Bearer crom_sk_live_..."<br><br><span class="comment"># {"success":true,"data":{"message":"pong"}}</span></div></section>
  </div>`);
});

// Auth docs
Router.register('/docs/authentication', async (app) => {
  const wrap = API.isAuth() ? (c) => dashboardLayout('Docs', c, 'docs') : (c) => `<nav class="home-nav"><div class="logo"><span>☁ Crom Cloud</span></div></nav><div style="padding:calc(var(--header-height)+2rem) 2rem;max-width:800px;margin:0 auto">${c}</div>`;
  app.innerHTML = wrap(`<div class="plugin-doc">
    <a onclick="Router.navigate('/docs')" style="color:var(--text-muted);font-size:0.85rem">← Voltar</a>
    <h1 style="margin-top:1rem">🔑 Autenticação</h1>
    <p class="plugin-meta">Dois tipos de autenticação: JWT (dashboard) e API Key (API)</p>
    <section><h2>JWT (Dashboard)</h2><p>Usado para gerenciar conta, keys e secrets. Obtido via <code>/v1/account/login</code>. Expira em 24h.</p>
    <div class="code-block">Authorization: Bearer eyJhbGciOiJIUzI1NiI...</div></section>
    <section><h2>API Key (Plugin Access)</h2><p>Usado para acessar plugins. Formato: <code>crom_sk_live_&lt;64hex&gt;</code>. Hash SHA-256 armazenado.</p>
    <div class="code-block">Authorization: Bearer crom_sk_live_a890...</div></section>
    <section><h2>Permissões</h2><p>Cada key tem permissões por plugin com scopes: <strong>read</strong>, <strong>write</strong>, <strong>admin</strong>. Hierarquia: admin > write > read. Use <code>*</code> para todos os plugins.</p></section>
  </div>`);
});

// Plugin doc (dynamic)
Router.register('/docs/:slug', async (app, params) => {
  try {
    const res = await API.listPlugins();
    const plugin = (res.data||[]).find(p => p.slug === params.slug);
    if (!plugin) return app.innerHTML = '<div style="padding:4rem;text-align:center">Plugin não encontrado</div>';
    const wrap = API.isAuth() ? (c) => dashboardLayout('Docs', c, 'docs') : (c) => `<nav class="home-nav"><div class="logo"><span>☁ Crom Cloud</span></div></nav><div style="padding:calc(var(--header-height)+2rem) 2rem;max-width:800px;margin:0 auto">${c}</div>`;
    app.innerHTML = wrap(`<div class="plugin-doc">
      <a onclick="Router.navigate('/docs')" style="color:var(--text-muted);font-size:0.85rem">← Voltar</a>
      <h1 style="margin-top:1rem">${plugin.name}</h1>
      <p class="plugin-meta">v${plugin.version} · ${plugin.routes.length} endpoints · ${plugin.credit_cost===0?'Grátis':plugin.credit_cost+' cr/req'}</p>
      <section><h2>Base URL</h2><div class="code-block">https://api.crom.cloud/v1/${plugin.slug}/</div></section>
      <section><h2>Autenticação</h2><div class="code-block">Authorization: Bearer crom_sk_live_YOUR_KEY</div></section>
      <section><h2>Endpoints</h2>
        ${plugin.routes.map(r => {
          const methodFlag = r.method === 'GET' ? '' : '-X ' + r.method + ' ';
          const bodyFlag = r.method === 'POST' ? ' \\\\<br>&nbsp;&nbsp;-d \'{"key":"value"}\'' : '';
          return '<div class="endpoint-card">' +
            '<span class="method method-' + r.method.toLowerCase() + '">' + r.method + '</span> ' +
            '<strong>/v1/' + plugin.slug + r.path + '</strong>' +
            '<span style="color:var(--text-muted);margin-left:1rem">' + (r.description||'') + '</span>' +
            '<span class="doc-tag" style="margin-left:auto">' + r.scope + '</span>' +
            '<div style="margin-top:0.75rem"><div class="code-block">curl ' + methodFlag +
            'https://api.crom.cloud/v1/' + plugin.slug + r.path + ' \\\\<br>&nbsp;&nbsp;-H "Authorization: Bearer crom_sk_live_..."' +
            bodyFlag + '</div></div></div>';
        }).join('')}
      </section>
    </div>`);
  } catch(e){ toast(e.message,'error'); }
});
