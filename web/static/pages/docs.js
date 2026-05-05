// Crom Cloud — Docs Page
Router.register('/docs', async (app) => {
  try {
    const res = await API.listPlugins();
    const plugins = res.data || [];
    const isAuth = API.isAuth();

    const wrap = isAuth ? (c) => dashboardLayout('Documentação', c, 'docs') : (c) => `
      <nav style="position:fixed;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:0 24px;height:64px;background:rgba(0,0,0,0.8);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="font-weight:800;font-size:16px;display:flex;align-items:center;gap:8px;cursor:pointer;" onclick="Router.navigate('/')">
          <div style="width:32px;height:32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;color:white;font-size:14px;">C</div>
          <span style="background:linear-gradient(90deg,#818cf8,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Crom Cloud</span>
        </div>
        <a style="color:#818cf8;font-weight:600;font-size:14px;cursor:pointer;" onclick="Router.navigate('/login')">Login</a>
      </nav>
      <div style="padding-top:88px;padding-left:24px;padding-right:24px;max-width:800px;margin:0 auto;padding-bottom:48px;">${c}</div>`;

    app.innerHTML = wrap(`
      <div class="anim-fade">
        <h2 style="font-size:22px;font-weight:800;margin-bottom:4px;display:flex;align-items:center;gap:10px;">${I('book-open','w-6 h-6')} Documentação</h2>
        <p style="color:#64748b;font-size:14px;margin-bottom:32px;">Referência completa da API para cada plugin.</p>
      </div>

      <!-- Quick Start -->
      <div style="background:linear-gradient(135deg,rgba(26,34,51,0.8),rgba(17,24,39,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;margin-bottom:24px;" class="anim-fade">
        <div style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:8px;">
          <span style="color:#818cf8;">${I('rocket','w-4 h-4')}</span>
          <span style="font-weight:700;font-size:14px;">Quick Start</span>
        </div>
        <div style="padding:20px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:12px;padding:16px;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid rgba(255,255,255,0.04);">
              <div style="width:32px;height:32px;border-radius:50%;background:rgba(99,102,241,0.1);color:#818cf8;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;">1</div>
              <div><div style="font-weight:600;font-size:13px;">Crie uma conta</div><div style="font-size:12px;color:#64748b;">Registro gratuito</div></div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;padding:16px;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid rgba(255,255,255,0.04);">
              <div style="width:32px;height:32px;border-radius:50%;background:rgba(99,102,241,0.1);color:#818cf8;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;">2</div>
              <div><div style="font-weight:600;font-size:13px;">Gere uma API Key</div><div style="font-size:12px;color:#64748b;">Com permissões granulares</div></div>
            </div>
          </div>
          ${UI.code(`curl https://api.crom.cloud/v1/echo/ping \\
  -H "Authorization: Bearer crom_sk_live_..."

# Response: {"success": true, "data": {"message": "pong"}}`)}
        </div>
      </div>

      <!-- Auth Section -->
      <div style="background:linear-gradient(135deg,rgba(26,34,51,0.8),rgba(17,24,39,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;margin-bottom:24px;" class="anim-fade">
        <div style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:8px;">
          <span style="color:#f59e0b;">${I('shield','w-4 h-4')}</span>
          <span style="font-weight:700;font-size:14px;">Autenticação</span>
        </div>
        <div style="padding:20px;">
          <p style="font-size:14px;color:#94a3b8;margin-bottom:16px;">Todas as requisições precisam de uma API Key no header <code style="background:rgba(99,102,241,0.12);padding:2px 6px;border-radius:4px;font-size:12px;color:#818cf8;font-family:'JetBrains Mono',monospace;">Authorization</code>:</p>
          ${UI.code('Authorization: Bearer crom_sk_live_YOUR_API_KEY')}
        </div>
      </div>

      <!-- Plugins Reference -->
      ${plugins.length > 0 ? `<h3 style="font-size:16px;font-weight:700;margin-bottom:16px;">Plugins Disponíveis</h3>
      <div style="display:grid;gap:12px;">
        ${plugins.map(p => `<a style="display:flex;align-items:center;gap:16px;padding:20px;background:linear-gradient(135deg,rgba(26,34,51,0.8),rgba(17,24,39,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:14px;cursor:pointer;transition:all 0.3s;text-decoration:none;color:inherit;" onmouseover="this.style.borderColor='#818cf840'" onmouseout="this.style.borderColor='rgba(255,255,255,0.06)'" onclick="Router.navigate('/docs/${p.slug}')">
          <div style="width:44px;height:44px;border-radius:12px;background:rgba(99,102,241,0.1);display:flex;align-items:center;justify-content:center;color:#818cf8;">${I('puzzle','w-5 h-5')}</div>
          <div style="flex:1;">
            <div style="font-weight:700;margin-bottom:2px;">${UI.esc(p.name)}</div>
            <div style="font-size:13px;color:#64748b;">v${p.version} · ${p.routes.length} endpoints · ${p.credit_cost === 0 ? 'Grátis' : p.credit_cost + ' cr/req'}</div>
          </div>
          <span style="color:#475569;">${I('chevron-right','w-5 h-5')}</span>
        </a>`).join('')}
      </div>` : `<div style="text-align:center;padding:40px;color:#64748b;">
        <p>Nenhum plugin disponível. Instale plugins para ver a documentação.</p>
      </div>`}
    `);
  } catch (err) { toast(err.message, 'error'); }
});

// Plugin doc detail
Router.register('/docs/:slug', async (app, params) => {
  try {
    const res = await API.listPlugins();
    const plugin = (res.data || []).find(p => p.slug === params.slug);
    if (!plugin) {
      app.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;">' + UI.empty('search','Plugin não encontrado','O plugin solicitado não existe.', UI.btn(I('arrow-left','w-4 h-4') + ' Voltar','secondary','onclick="Router.navigate(\'/docs\')"')) + '</div>';
      return;
    }

    const isAuth = API.isAuth();
    const wrap = isAuth ? (c) => dashboardLayout('Docs', c, 'docs') : (c) => `
      <nav style="position:fixed;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:0 24px;height:64px;background:rgba(0,0,0,0.8);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="font-weight:800;font-size:16px;display:flex;align-items:center;gap:8px;cursor:pointer;" onclick="Router.navigate('/')">
          <div style="width:32px;height:32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;color:white;font-size:14px;">C</div>
          <span style="background:linear-gradient(90deg,#818cf8,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Crom Cloud</span>
        </div>
        <a style="color:#818cf8;font-weight:600;font-size:14px;cursor:pointer;" onclick="Router.navigate('/login')">Login</a>
      </nav>
      <div style="padding-top:88px;padding-left:24px;padding-right:24px;max-width:800px;margin:0 auto;padding-bottom:48px;">${c}</div>`;

    const methodColors = { GET: '#22c55e', POST: '#3b82f6', DELETE: '#ef4444', PUT: '#f59e0b' };

    app.innerHTML = wrap(`<div class="anim-fade">
      <a style="display:inline-flex;align-items:center;gap:4px;font-size:13px;color:#64748b;cursor:pointer;margin-bottom:16px;transition:color 0.2s;" onmouseover="this.style.color='#818cf8'" onmouseout="this.style.color='#64748b'" onclick="Router.navigate('/docs')">${I('arrow-left','w-4 h-4')} Voltar</a>
      <h1 style="font-size:24px;font-weight:800;margin-bottom:4px;">${UI.esc(plugin.name)}</h1>
      <p style="color:#64748b;margin-bottom:32px;">v${plugin.version} · ${plugin.routes.length} endpoints · ${plugin.credit_cost === 0 ? 'Grátis' : plugin.credit_cost + ' cr/req'}</p>

      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="background:linear-gradient(135deg,rgba(26,34,51,0.8),rgba(17,24,39,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;">
          <div style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:8px;">
            <span style="color:#818cf8;">${I('link','w-4 h-4')}</span>
            <span style="font-weight:700;">Base URL</span>
          </div>
          <div style="padding:16px 20px;">${UI.code('https://api.crom.cloud/v1/' + plugin.slug + '/')}</div>
        </div>

        <div style="background:linear-gradient(135deg,rgba(26,34,51,0.8),rgba(17,24,39,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;">
          <div style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:8px;">
            <span style="color:#f59e0b;">${I('shield','w-4 h-4')}</span>
            <span style="font-weight:700;">Autenticação</span>
          </div>
          <div style="padding:16px 20px;">${UI.code('Authorization: Bearer crom_sk_live_YOUR_KEY')}</div>
        </div>

        <div style="background:linear-gradient(135deg,rgba(26,34,51,0.8),rgba(17,24,39,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;">
          <div style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:8px;">
            <span style="color:#22c55e;">${I('terminal','w-4 h-4')}</span>
            <span style="font-weight:700;">Endpoints</span>
          </div>
          <div style="padding:16px 20px;display:flex;flex-direction:column;gap:16px;">
            ${plugin.routes.map(r => {
              const color = methodColors[r.method] || '#818cf8';
              return `<div style="background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.04);border-radius:12px;padding:16px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                  <span style="padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;font-family:'JetBrains Mono',monospace;background:${color}15;color:${color};">${r.method}</span>
                  <strong style="font-size:14px;">/v1/${plugin.slug}${r.path}</strong>
                  <span style="font-size:12px;color:#64748b;margin-left:auto;">${r.description || ''}</span>
                  ${UI.tag(r.scope)}
                </div>
                ${UI.code(`curl ${r.method !== 'GET' ? '-X ' + r.method + ' ' : ''}https://api.crom.cloud/v1/${plugin.slug}${r.path} \\
  -H "Authorization: Bearer crom_sk_live_..."${r.method === 'POST' ? ` \\
  -d '{"key":"value"}'` : ''}`)}
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>`);
  } catch (e) { toast(e.message, 'error'); }
});
