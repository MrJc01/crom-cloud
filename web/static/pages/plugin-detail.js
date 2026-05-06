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
          const playgroundUrl = apiUrl.replace('/v1', '/v1/playground');
          const res = await API.request(method, playgroundUrl.replace('/v1',''), payload);
          
          resultEl.innerHTML = `<pre style="margin:0;color:#22c55e;font-size:12px;white-space:pre-wrap;word-wrap:break-word;">${JSON.stringify(res, null, 2)}</pre>`;
        } catch (err) {
          resultEl.innerHTML = `<pre style="margin:0;color:#ef4444;font-size:12px;white-space:pre-wrap;word-wrap:break-word;">${err.message}</pre>`;
        }
      };

      const bgIconColor = isEnabled ? 'rgba(34,197,94,0.1)' : 'rgba(167,139,250,0.1)';
      const iconColor = isEnabled ? '#22c55e' : '#a78bfa';

      const routesHtml = (plugin.routes || []).map(r => {
        const id = r.path.replace(/\W/g, '-');
        const defaultPayload = r.documentation?.request_body ? JSON.stringify(r.documentation.request_body, null, 2) : '{"exemplo": "dado"}';
        
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
          
          ${r.documentation ? `
            <div style="background:rgba(0,0,0,0.2);padding:16px;border-radius:8px;margin-bottom:20px;border:1px solid rgba(255,255,255,0.03);">
              <p style="color:#e2e8f0;font-size:13px;line-height:1.5;margin-bottom:16px;">${UI.esc(r.documentation.summary)}</p>
              
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                ${r.documentation.request_body ? `
                <div>
                  <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Payload (Exemplo)</span>
                  <pre style="background:#0f172a;padding:12px;border-radius:6px;font-size:12px;color:#38bdf8;margin-top:4px;border:1px solid rgba(255,255,255,0.05);white-space:pre-wrap;">${JSON.stringify(r.documentation.request_body, null, 2)}</pre>
                </div>` : '<div></div>'}
                
                ${r.documentation.response_example ? `
                <div>
                  <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Resposta (Exemplo)</span>
                  <pre style="background:#0f172a;padding:12px;border-radius:6px;font-size:12px;color:#22c55e;margin-top:4px;border:1px solid rgba(255,255,255,0.05);white-space:pre-wrap;">${JSON.stringify(r.documentation.response_example, null, 2)}</pre>
                </div>` : ''}
              </div>
            </div>
          ` : ''}

          <div style="background:#0f172a;border-radius:8px;padding:16px;border:1px solid rgba(255,255,255,0.05);">
            <div style="font-size:12px;font-weight:700;color:#64748b;margin-bottom:12px;text-transform:uppercase;">Playground de Teste</div>
            <form onsubmit="window.testPluginEndpoint(event, '${r.method}', '${r.path}')" style="display:flex;flex-direction:column;gap:12px;">
              ${r.method !== 'GET' ? `
                <textarea name="payload" rows="4" style="width:100%;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:12px;color:white;font-family:monospace;font-size:13px;resize:vertical;">${defaultPayload}</textarea>
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
              <div style="width:80px;height:80px;border-radius:20px;background:${plugin.status === 'disabled' ? 'rgba(239,68,68,0.1)' : 'rgba(167,139,250,0.1)'};display:flex;align-items:center;justify-content:center;color:${plugin.status === 'disabled' ? '#ef4444' : '#a78bfa'};">${I('puzzle','w-10 h-10')}</div>
              <div>
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
                  <h1 style="font-size:28px;font-weight:900;">${UI.esc(plugin.name)}</h1>
                  ${plugin.status === 'disabled' ? `<span style="background:rgba(239,68,68,0.1);color:#ef4444;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:800;display:flex;align-items:center;gap:4px;"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg> Desabilitado pelo Sistema</span>` : (isEnabled ? `<span style="background:rgba(34,197,94,0.1);color:#22c55e;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:800;display:flex;align-items:center;gap:4px;">${I('check','w-3 h-3')} Habilitado</span>` : '')}
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
              ${plugin.status === 'disabled' ? 
                `<div style="color:#ef4444;font-size:13px;font-weight:600;padding:8px 12px;background:rgba(239,68,68,0.1);border-radius:8px;border:1px solid rgba(239,68,68,0.2);">Indisponível Temporariamente</div>` :
                (isEnabled ? 
                  `<button onclick="window.toggleCurrentPlugin('disable')" style="background:transparent;border:1px solid #ef4444;color:#ef4444;padding:10px 24px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;transition:0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.background='transparent'">Desabilitar API</button>` :
                  `<button onclick="window.toggleCurrentPlugin('enable')" style="background:#22c55e;border:none;color:white;padding:10px 24px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;transition:0.2s;box-shadow:0 4px 14px rgba(34,197,94,0.3);" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(34,197,94,0.4)'" onmouseout="this.style.transform='';this.style.boxShadow='0 4px 14px rgba(34,197,94,0.3)'">Habilitar API</button>`
                )
              }
            </div>
          </div>

          <!-- Documentation & Endpoints -->
          <div style="display:grid;grid-template-columns:300px 1fr;gap:48px;">
            <div>
              <h3 style="font-size:16px;font-weight:800;margin-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:12px;">Sobre esta API</h3>
              <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin-bottom:24px;">${plugin.documentation?.overview ? UI.esc(plugin.documentation.overview) : 'Esta API é executada no gateway seguro do Crom Cloud. Ao habilitá-la, você permite que suas API Keys (Tokens) com escopo adequado possam realizar requisições para os endpoints listados.'}</p>
              
              ${plugin.documentation?.use_cases && plugin.documentation.use_cases.length > 0 ? `
              <h3 style="font-size:16px;font-weight:800;margin-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:12px;">Casos de Uso</h3>
              <ul style="color:#94a3b8;font-size:14px;line-height:1.6;margin-bottom:24px;padding-left:20px;">
                ${plugin.documentation.use_cases.map(uc => `<li>${UI.esc(uc)}</li>`).join('')}
              </ul>
              ` : ''}

              ${plugin.documentation?.getting_started ? `
              <h3 style="font-size:16px;font-weight:800;margin-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:12px;">Como Começar</h3>
              <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin-bottom:24px;">${UI.esc(plugin.documentation.getting_started)}</p>
              ` : ''}

              <h3 style="font-size:16px;font-weight:800;margin-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:12px;">Autenticação</h3>
              <p style="color:#94a3b8;font-size:14px;line-height:1.6;">Todas as chamadas devem incluir o Header:</p>
              <pre style="background:#0f172a;padding:12px;border-radius:8px;font-size:12px;color:#a78bfa;margin-top:8px;border:1px solid rgba(255,255,255,0.05);">Authorization: Bearer crom_sk_...</pre>

              ${isAuth && isEnabled ? `
              <div style="margin-top:24px;">
                <h3 style="font-size:16px;font-weight:800;margin-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:12px;">Secrets Necessários</h3>
                <div id="plugin-secrets-status" style="font-size:13px;color:#64748b;">Carregando...</div>
              </div>
              
              <div style="margin-top:24px;" id="create-key-cta"></div>
              ` : ''}
            </div>

            <div>
              <h3 style="font-size:20px;font-weight:800;margin-bottom:24px;display:flex;align-items:center;gap:8px;">${I('terminal','w-5 h-5')} Endpoints & Documentação</h3>
              ${plugin.routes && plugin.routes.length > 0 ? routesHtml : '<div style="color:#64748b;">Este plugin não possui rotas públicas registradas.</div>'}
            </div>
          </div>

        </div>
      `;

      app.innerHTML = wrap(content);

      // Post-render: verificar secrets e keys (apenas se logado e habilitado)
      if (isAuth && isEnabled) {
        // Secrets status
        try {
          const secretsRes = await API.listSecrets();
          const mySecrets = (secretsRes.data || []).filter(s => s.plugin_slug === slug);
          const reqSecrets = plugin.required_secrets || [];
          const statusEl = document.getElementById('plugin-secrets-status');
          if (statusEl) {
            if (reqSecrets.length > 0) {
              statusEl.innerHTML = reqSecrets.map(s => {
                const found = mySecrets.some(ms => ms.secret_name === s.key);
                return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.03);">
                  <span style="color:${found ? '#22c55e' : '#ef4444'};">${found ? I('check','w-4 h-4') : I('x','w-4 h-4')}</span>
                  <div style="display:flex;flex-direction:column;gap:2px;">
                    <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#e2e8f0;font-weight:600;">${UI.esc(s.key)}</span>
                    <span style="font-size:11px;color:#64748b;">${UI.esc(s.label)}</span>
                  </div>
                  ${!found ? `<a style="color:#818cf8;font-size:11px;cursor:pointer;margin-left:auto;font-weight:600;padding:4px 8px;background:rgba(99,102,241,0.1);border-radius:4px;" onclick="Router.navigate('/secrets')">Configurar</a>` : ''}
                </div>`;
              }).join('');
            } else {
              if (mySecrets.length > 0) {
                statusEl.innerHTML = mySecrets.map(s => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;">
                  <span style="color:#22c55e;">${I('check','w-4 h-4')}</span>
                  <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#94a3b8;">${UI.esc(s.secret_name)}</span>
                </div>`).join('');
              } else {
                statusEl.innerHTML = '<p style="color:#64748b;font-size:13px;">Este plugin não exige secrets obrigatórios, mas você pode configurá-los em <a style="color:#818cf8;cursor:pointer;" onclick="Router.navigate(\'/secrets\')">Secrets</a> se necessário.</p>';
              }
            }
          }
        } catch(e) {}

        // Key CTA
        try {
          const keysRes = await API.listKeys();
          const hasKey = (keysRes.data || []).some(k => k.is_active && (k.permissions || []).some(p => p.plugin_slug === slug || p.plugin_slug === '*'));
          const ctaEl = document.getElementById('create-key-cta');
          if (ctaEl && !hasKey) {
            ctaEl.innerHTML = `
              <div style="padding:16px;background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.15);border-radius:12px;">
                <p style="font-size:13px;color:#94a3b8;margin-bottom:12px;">Você ainda não tem uma API Key com acesso a este plugin.</p>
                <button onclick="Router.navigate('/keys')" style="width:100%;padding:10px;background:linear-gradient(135deg,#6366f1,#7c3aed);color:white;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;font-family:Inter,sans-serif;">${I('key','w-4 h-4')} Criar API Key para ${UI.esc(plugin.name)}</button>
              </div>`;
          }
        } catch(e) {}
      }
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  loadAndRender();
});
