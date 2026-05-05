// Crom Cloud — Plugin Detail Page
Router.register('/plugins/:slug', async (app, params) => {
  const slug = params.slug;

  const loadAndRender = async () => {
    try {
      const res = await API.listPlugins();
      const plugin = (res.data || []).find(p => p.slug === slug);
      
      if (!plugin) {
        throw new Error('Plugin não encontrado');
      }

      const isAuth = API.isAuth();
      let isEnabled = false;

      if (isAuth) {
        try {
          const resEnabled = await API.listEnabledPlugins();
          isEnabled = (resEnabled.data?.enabled_plugins || []).includes(slug);
        } catch (e) {
          console.error('Erro ao buscar status do plugin', e);
        }
      }

      // Funções do Dashboard layout ou Landing nav
      const wrap = isAuth ? (c) => dashboardLayout(plugin.name, c, 'plugins') : (c) => `
        <nav style="position:fixed;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:0 24px;height:64px;background:rgba(0,0,0,0.8);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="font-weight:800;font-size:16px;display:flex;align-items:center;gap:8px;cursor:pointer;" onclick="Router.navigate('/')">
            <div style="width:32px;height:32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;color:white;font-size:14px;">C</div>
            <span style="background:linear-gradient(90deg,#818cf8,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Crom Cloud</span>
          </div>
          <a style="color:#818cf8;font-weight:600;font-size:14px;cursor:pointer;" onclick="Router.navigate('/login')">Login</a>
        </nav>
        <div style="padding-top:88px;padding-left:24px;padding-right:24px;max-width:1100px;margin:0 auto;padding-bottom:48px;">${c}</div>`;

      window.toggleCurrentPlugin = async (action) => {
        if (!isAuth) {
          Router.navigate('/login');
          return;
        }
        try {
          await API.toggleAccountPlugin(slug, action);
          toast(`Plugin ${action === 'enable' ? 'habilitado' : 'desabilitado'} no Workspace.`, 'success');
          loadAndRender();
        } catch (err) {
          toast(err.message, 'error');
        }
      };

      window.testPluginEndpoint = async (e, method, path) => {
        e.preventDefault();
        const form = e.target;
        const resultEl = document.getElementById(`res-${path.replace(/\W/g, '-')}`);
        
        if (!isAuth) {
          toast("Faça login para testar", "error");
          return;
        }

        const payloadStr = form.payload ? form.payload.value : '';
        let payload = null;
        if (payloadStr) {
          try {
            payload = JSON.parse(payloadStr);
          } catch(err) {
            toast("Payload JSON inválido", "error");
            return;
          }
        }

        // Buscar API Keys do usuário e encontrar uma que tenha permissão para este plugin
        let keysRes;
        try {
          keysRes = await API.listKeys();
        } catch(err) {
          toast("Erro ao carregar API Keys", "error");
          return;
        }
        
        const validKey = (keysRes.data || []).find(k => k.is_active && (k.permissions || []).some(p => p.plugin_slug === slug || p.plugin_slug === '*'));
        
        if (!validKey) {
          resultEl.innerHTML = `<div style="color:#ef4444;font-size:12px;margin-bottom:8px;">Você não tem uma API Key válida para este plugin.</div>
          <button onclick="Router.navigate('/keys')" style="background:#6366f1;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;">Criar API Key</button>`;
          resultEl.style.display = 'block';
          return;
        }

        resultEl.innerHTML = '<div style="color:#64748b;">Enviando requisição...</div>';
        resultEl.style.display = 'block';

        try {
          // Precisamos fazer fetch manualmente pois o API client usa o JWT por padrão
          const apiUrl = `/v1/${slug}${path}`;
          const options = {
            method: method.toUpperCase(),
            headers: {
              'Authorization': `Bearer ${validKey.key_prefix}`, // Simulação, no mundo real o backend precisaria de uma test key real se não exibirmos ela, ou usar JWT no backend.
            }
          };
          if (payload) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(payload);
          }

          // Como o usuário não tem a key inteira salva no DB (só o hash/prefix), no web playground o ideal é que o gateway suporte o JWT para testes (com DeveloperID).
          // Para contornar e validar o Gateway via código, vamos usar o token JWT e ajustar o Gateway.
          const res = await API[method.toLowerCase()](apiUrl.replace('/v1',''), payload);
          
          resultEl.innerHTML = `<pre style="margin:0;color:#22c55e;font-size:12px;white-space:pre-wrap;word-wrap:break-word;">${JSON.stringify(res, null, 2)}</pre>`;
        } catch (err) {
          resultEl.innerHTML = `<pre style="margin:0;color:#ef4444;font-size:12px;white-space:pre-wrap;word-wrap:break-word;">${err.message}</pre>`;
        }
      };

      const bgIconColor = isEnabled ? 'rgba(34,197,94,0.1)' : 'rgba(167,139,250,0.1)';
      const iconColor = isEnabled ? '#22c55e' : '#a78bfa';

      const routesHtml = (plugin.routes || []).map(r => {
        const id = r.path.replace(/\W/g, '-');
        return `
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:20px;margin-bottom:16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="font-family:monospace;font-weight:700;font-size:12px;padding:4px 8px;border-radius:6px;background:rgba(255,255,255,0.1);color:#fff;">${r.method}</span>
              <span style="font-family:monospace;font-size:14px;color:#cbd5e1;">/v1/${slug}${r.path}</span>
            </div>
            ${UI.badge(r.scope, 'default')}
          </div>
          <p style="color:#94a3b8;font-size:14px;margin-bottom:20px;">${UI.esc(r.description || 'Nenhuma descrição fornecida.')}</p>
          
          <div style="background:#0f172a;border-radius:8px;padding:16px;border:1px solid rgba(255,255,255,0.05);">
            <div style="font-size:12px;font-weight:700;color:#64748b;margin-bottom:12px;text-transform:uppercase;">Playground de Teste</div>
            <form onsubmit="window.testPluginEndpoint(event, '${r.method}', '${r.path}')" style="display:flex;flex-direction:column;gap:12px;">
              ${r.method !== 'GET' ? `
                <textarea name="payload" rows="3" placeholder='{"exemplo": "dado"}' style="width:100%;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:12px;color:white;font-family:monospace;font-size:13px;resize:vertical;"></textarea>
              ` : ''}
              <div>
                ${UI.btn(`${I('play', 'w-4 h-4')} Executar Call`, 'primary')}
              </div>
            </form>
            <div id="res-${id}" style="display:none;margin-top:16px;background:rgba(0,0,0,0.8);border-radius:6px;padding:12px;border:1px solid rgba(255,255,255,0.05);overflow-x:auto;"></div>
          </div>
        </div>
      `}).join('');

      const content = `
        <div class="anim-fade">
          <div style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;color:#818cf8;font-size:13px;font-weight:600;margin-bottom:24px;" onclick="Router.navigate('/plugins')">
            ${I('arrow-left', 'w-4 h-4')} Voltar para Marketplace
          </div>

          <!-- Header -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:48px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:20px;padding:32px;">
            <div style="display:flex;gap:24px;">
              <div style="width:80px;height:80px;border-radius:20px;background:${bgIconColor};display:flex;align-items:center;justify-content:center;color:${iconColor};">${I('puzzle','w-10 h-10')}</div>
              <div>
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
                  <h1 style="font-size:28px;font-weight:900;">${UI.esc(plugin.name)}</h1>
                  ${isEnabled ? `<span style="background:rgba(34,197,94,0.1);color:#22c55e;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:800;display:flex;align-items:center;gap:4px;">${I('check','w-3 h-3')} Habilitado</span>` : ''}
                </div>
                <div style="font-size:14px;color:#64748b;margin-bottom:16px;font-family:monospace;">ID: ${plugin.slug} · v${plugin.version}</div>
                <p style="color:#cbd5e1;font-size:16px;line-height:1.6;max-width:600px;">${UI.esc(plugin.description || 'Nenhuma descrição detalhada fornecida para este plugin.')}</p>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:12px;align-items:flex-end;">
              <div style="text-align:right;margin-bottom:8px;">
                <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:4px;">Custo por Requisição</div>
                <div style="font-size:24px;font-weight:800;color:#fff;">${plugin.credit_cost === 0 ? 'Grátis' : plugin.credit_cost + ' cr'}</div>
              </div>
              ${isEnabled ? 
                `<button onclick="window.toggleCurrentPlugin('disable')" style="background:transparent;border:1px solid #ef4444;color:#ef4444;padding:10px 24px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;transition:0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.background='transparent'">Desabilitar API</button>` :
                `<button onclick="window.toggleCurrentPlugin('enable')" style="background:#22c55e;border:none;color:white;padding:10px 24px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;transition:0.2s;box-shadow:0 4px 14px rgba(34,197,94,0.3);" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(34,197,94,0.4)'" onmouseout="this.style.transform='';this.style.boxShadow='0 4px 14px rgba(34,197,94,0.3)'">Habilitar API</button>`
              }
            </div>
          </div>

          <!-- Documentation & Endpoints -->
          <div style="display:grid;grid-template-columns:300px 1fr;gap:48px;">
            <div>
              <h3 style="font-size:16px;font-weight:800;margin-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:12px;">Sobre esta API</h3>
              <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin-bottom:24px;">Esta API é executada no gateway seguro do Crom Cloud. Ao habilitá-la, você permite que suas API Keys (Tokens) com escopo adequado possam realizar requisições para os endpoints listados.</p>
              
              <h3 style="font-size:16px;font-weight:800;margin-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:12px;">Autenticação</h3>
              <p style="color:#94a3b8;font-size:14px;line-height:1.6;">Todas as chamadas (exceto as realizadas pelo Playground nesta página) devem incluir o Header:</p>
              <pre style="background:#0f172a;padding:12px;border-radius:8px;font-size:12px;color:#a78bfa;margin-top:8px;border:1px solid rgba(255,255,255,0.05);">Authorization: Bearer crom_sk_...</pre>
            </div>

            <div>
              <h3 style="font-size:20px;font-weight:800;margin-bottom:24px;display:flex;align-items:center;gap:8px;">${I('terminal','w-5 h-5')} Endpoints & Documentação</h3>
              ${plugin.routes && plugin.routes.length > 0 ? routesHtml : '<div style="color:#64748b;">Este plugin não possui rotas públicas registradas.</div>'}
            </div>
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
