// Crom Cloud — Dashboard (Premium inline styles)
Router.register('/dashboard', async (app) => {
  try {
    if (!API.user) { const me = await API.me(); API.user = me.data; }
    const [balRes, keysRes, pluginsRes, secretsRes] = await Promise.all([
      API.getBalance(), API.listKeys(), API.listPlugins(), API.listSecrets()
    ]);
    const balance = balRes.data.balance;
    const keys = keysRes.data || [];
    const plugins = pluginsRes.data || [];
    const secrets = secretsRes.data || [];
    const activeKeys = keys.filter(k => k.is_active).length;

    const statCard = (label, value, ic, color, sub) => `
      <div style="background:linear-gradient(135deg,rgba(26,34,51,0.8),rgba(17,24,39,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:20px;transition:all 0.3s;" onmouseover="this.style.borderColor='${color}30';this.style.boxShadow='0 8px 30px rgba(0,0,0,0.3)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.06)';this.style.boxShadow=''">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">${label}</span>
          <span style="color:#475569;">${I(ic, 'w-4 h-4')}</span>
        </div>
        <div style="font-size:28px;font-weight:800;letter-spacing:-0.02em;color:${color};" class="anim-count">${value}</div>
        ${sub ? `<div style="font-size:12px;color:#64748b;margin-top:4px;">${sub}</div>` : ''}
      </div>`;

    const actionBtn = (label, ic, route) => `
      <button onclick="Router.navigate('${route}')" style="width:100%;display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;color:#e2e8f0;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.2s;text-align:left;font-family:Inter,sans-serif;" onmouseover="this.style.background='rgba(99,102,241,0.08)';this.style.borderColor='rgba(99,102,241,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.06)'">${I(ic, 'w-4 h-4')} ${label}</button>`;

    const tableRow = (cells) => `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background=''">${cells}</tr>`;
    const td = (content, mono) => `<td style="padding:12px 20px;font-size:13px;${mono ? "font-family:'JetBrains Mono',monospace;color:#64748b;font-size:12px;" : ''}">${content}</td>`;
    const th = (label) => `<th style="text-align:left;padding:10px 20px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;background:rgba(0,0,0,0.2);border-bottom:1px solid rgba(255,255,255,0.06);">${label}</th>`;

    const badge = (text, color) => `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:100px;font-size:11px;font-weight:600;background:${color}15;color:${color};">${text}</span>`;
    const tag = (text) => `<span style="display:inline-block;padding:2px 8px;font-size:11px;font-weight:600;background:rgba(99,102,241,0.12);color:#818cf8;border-radius:4px;margin-right:4px;">${text}</span>`;

    app.innerHTML = dashboardLayout('Dashboard', `
      <div style="margin-bottom:24px;" class="anim-fade">
        <h2 style="font-size:20px;font-weight:700;">${I('zap','w-5 h-5 inline')} Bem-vindo, ${UI.esc(API.user.name)}</h2>
        <p style="font-size:14px;color:#64748b;margin-top:4px;">Aqui está o resumo da sua conta.</p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:24px;">
        ${statCard('Saldo de Créditos', '$'+balance.toFixed(2), 'wallet', '#818cf8', API.user.plan+' plan')}
        ${statCard('API Keys Ativas', activeKeys, 'key', '#f1f5f9', keys.length+' total')}
        ${statCard('Plugins Disponíveis', plugins.length, 'puzzle', '#22c55e', 'Todos ativos')}
        ${statCard('Secrets Configurados', secrets.length, 'lock', '#f1f5f9', 'AES-256-GCM')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <!-- Quick Actions -->
        <div style="background:linear-gradient(135deg,rgba(26,34,51,0.8),rgba(17,24,39,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;">
          <div style="display:flex;align-items:center;gap:8px;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="color:#818cf8;">${I('zap','w-4 h-4')}</span>
            <span style="font-size:14px;font-weight:700;">Ações Rápidas</span>
          </div>
          <div style="padding:12px;display:flex;flex-direction:column;gap:8px;">
            ${actionBtn('Criar nova API Key', 'key', '/keys')}
            ${actionBtn('Adicionar Créditos', 'credit-card', '/billing')}
            ${actionBtn('Configurar Secret', 'lock', '/secrets')}
            ${actionBtn('Ver Documentação', 'book-open', '/docs')}
          </div>
        </div>

        <!-- Plugins Table -->
        <div style="background:linear-gradient(135deg,rgba(26,34,51,0.8),rgba(17,24,39,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;">
          <div style="display:flex;align-items:center;gap:8px;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="color:#818cf8;">${I('puzzle','w-4 h-4')}</span>
            <span style="font-size:14px;font-weight:700;">Plugins Ativos</span>
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr>${th('Plugin')}${th('Versão')}${th('Rotas')}${th('Status')}</tr></thead>
            <tbody>
              ${plugins.length > 0 ? plugins.map(p => tableRow(
                td(`<strong>${UI.esc(p.name)}</strong>`) +
                td('v'+p.version, true) +
                td(p.routes.length+' endpoints') +
                td(badge('● Ativo', '#22c55e'))
              )).join('') : `<tr><td colspan="4" style="padding:40px;text-align:center;">
                <div style="color:#475569;margin-bottom:8px;">${I('puzzle','w-10 h-10')}</div>
                <div style="font-weight:600;color:#94a3b8;">Nenhum plugin</div>
                <div style="font-size:13px;color:#64748b;">Nenhum plugin ativo</div>
              </td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent Keys -->
      <div style="background:linear-gradient(135deg,rgba(26,34,51,0.8),rgba(17,24,39,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="color:#818cf8;">${I('key','w-4 h-4')}</span>
            <span style="font-size:14px;font-weight:700;">API Keys Recentes</span>
          </div>
          <button onclick="Router.navigate('/keys')" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:none;border:none;color:#64748b;font-size:12px;font-weight:600;cursor:pointer;transition:color 0.2s;font-family:Inter,sans-serif;" onmouseover="this.style.color='#818cf8'" onmouseout="this.style.color='#64748b'">Gerenciar ${I('chevron-right','w-3.5 h-3.5')}</button>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr>${th('Label')}${th('Prefixo')}${th('Permissões')}${th('Último Uso')}${th('Status')}</tr></thead>
          <tbody>
            ${keys.length > 0 ? keys.slice(0,5).map(k => tableRow(
              td(`<strong>${UI.esc(k.label)}</strong>`) +
              td(k.key_prefix+'...', true) +
              td((k.permissions||[]).map(p => tag(p.plugin_slug+':'+p.scope)).join('')) +
              td(UI.relTime(k.last_used_at)) +
              td(k.is_active ? badge('Ativa','#22c55e') : badge('Revogada','#ef4444'))
            )).join('') : `<tr><td colspan="5" style="padding:40px;text-align:center;">
              <div style="color:#475569;margin-bottom:8px;">${I('key','w-10 h-10')}</div>
              <div style="font-weight:600;color:#94a3b8;">Nenhuma API Key</div>
              <div style="font-size:13px;color:#64748b;">Crie sua primeira key</div>
            </td></tr>`}
          </tbody>
        </table>
      </div>
    `, 'dashboard');
  } catch (err) { toast(err.message, 'error'); Router.navigate('/login'); }
});
