// Crom Cloud — Dashboard Overview (GCP Style)

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

    app.innerHTML = dashboardLayout('Dashboard', `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Saldo de Créditos</div>
          <div class="stat-value accent">$${balance.toFixed(2)}</div>
          <div class="stat-change up">💳 ${API.user.plan} plan</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">API Keys Ativas</div>
          <div class="stat-value">${activeKeys}</div>
          <div class="stat-change">${keys.length} total</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Plugins Disponíveis</div>
          <div class="stat-value success">${plugins.length}</div>
          <div class="stat-change up">Todos ativos</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Secrets Configurados</div>
          <div class="stat-value">${secrets.length}</div>
          <div class="stat-change">AES-256-GCM</div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        <!-- Quick Actions -->
        <div class="table-container">
          <div class="table-header"><h3>⚡ Ações Rápidas</h3></div>
          <div style="padding:1.5rem; display:flex; flex-direction:column; gap:0.75rem;">
            <button class="btn btn-secondary" onclick="Router.navigate('/keys')" style="justify-content:flex-start">🔑 Criar nova API Key</button>
            <button class="btn btn-secondary" onclick="Router.navigate('/billing')" style="justify-content:flex-start">💳 Adicionar Créditos</button>
            <button class="btn btn-secondary" onclick="Router.navigate('/secrets')" style="justify-content:flex-start">🔒 Configurar Secret</button>
            <button class="btn btn-secondary" onclick="Router.navigate('/docs')" style="justify-content:flex-start">📚 Ver Documentação</button>
          </div>
        </div>

        <!-- Active Plugins -->
        <div class="table-container">
          <div class="table-header"><h3>🧩 Plugins Ativos</h3></div>
          <table>
            <thead><tr><th>Plugin</th><th>Versão</th><th>Rotas</th><th>Status</th></tr></thead>
            <tbody>
              ${plugins.map(p => `<tr>
                <td><strong>${p.name}</strong></td>
                <td style="color:var(--text-muted)">${p.version}</td>
                <td>${p.routes.length} endpoints</td>
                <td><span class="badge badge-active">● Ativo</span></td>
              </tr>`).join('')}
              ${plugins.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">Nenhum plugin ativo</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </div>

      <!-- API Keys -->
      <div class="table-container" style="margin-top:1.5rem">
        <div class="table-header">
          <h3>🔑 API Keys Recentes</h3>
          <button class="btn btn-primary btn-sm" onclick="Router.navigate('/keys')">Gerenciar →</button>
        </div>
        <table>
          <thead><tr><th>Label</th><th>Prefixo</th><th>Permissões</th><th>Último Uso</th><th>Status</th></tr></thead>
          <tbody>
            ${keys.slice(0, 5).map(k => `<tr>
              <td><strong>${k.label}</strong></td>
              <td style="font-family:monospace;color:var(--text-muted)">${k.key_prefix}...</td>
              <td>${(k.permissions||[]).map(p => `<span class="doc-tag">${p.plugin_slug}:${p.scope}</span>`).join(' ')}</td>
              <td style="color:var(--text-muted)">${k.last_used_at ? new Date(k.last_used_at).toLocaleString('pt-BR') : 'Nunca'}</td>
              <td>${k.is_active ? '<span class="badge badge-active">Ativa</span>' : '<span class="badge badge-inactive">Revogada</span>'}</td>
            </tr>`).join('')}
            ${keys.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem">Nenhuma API Key criada</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    `, 'dashboard');
  } catch (err) { toast(err.message, 'error'); Router.navigate('/login'); }
});
