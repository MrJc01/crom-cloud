// Crom Cloud — Activity Page
Router.register('/activity', async (app) => {
  try {
    if (!API.user) { const me = await API.me(); API.user = me.data; }

    // Buscar plugins para filtro
    const pluginsRes = await API.listPlugins();
    const plugins = pluginsRes.data || [];

    app.innerHTML = dashboardLayout('Atividade', `
      <div style="margin-bottom:20px;" class="anim-fade">
        <p style="font-size:14px;color:#64748b;">Log de atividades e chamadas de API da sua conta.</p>
      </div>

      <!-- Filtros -->
      <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;" class="anim-fade">
        <select id="filter-plugin" style="padding:8px 12px;background:#0f1520;border:1px solid rgba(255,255,255,0.06);border-radius:8px;font-size:13px;color:#e2e8f0;font-family:Inter,sans-serif;outline:none;" onchange="activityPage.reload()">
          <option value="">Todos os Plugins</option>
          ${plugins.map(p => `<option value="${p.slug}">${UI.esc(p.name)}</option>`).join('')}
        </select>
        <select id="filter-status" style="padding:8px 12px;background:#0f1520;border:1px solid rgba(255,255,255,0.06);border-radius:8px;font-size:13px;color:#e2e8f0;font-family:Inter,sans-serif;outline:none;" onchange="activityPage.reload()">
          <option value="">Todos os Status</option>
          <option value="success">Sucesso (2xx)</option>
          <option value="client_error">Erro Cliente (4xx)</option>
          <option value="server_error">Erro Servidor (5xx)</option>
        </select>
        <div style="margin-left:auto;display:flex;align-items:center;gap:8px;">
          <span style="font-size:12px;color:#64748b;">Exibindo:</span>
          <span id="activity-count" style="font-size:12px;font-weight:600;color:#94a3b8;">...</span>
        </div>
      </div>

      <div id="activity-list"></div>
      <div id="activity-load-more" style="text-align:center;margin-top:16px;"></div>
    `, 'activity', [{label:'Dashboard',action:"Router.navigate('/dashboard')"},{label:'Atividade'}]);

    activityPage.offset = 0;
    activityPage.allLogs = [];
    activityPage.reload();
  } catch (err) { toast(err.message, 'error'); }
});

const activityPage = {
  offset: 0,
  allLogs: [],

  async reload() {
    this.offset = 0;
    this.allLogs = [];
    document.getElementById('activity-list').innerHTML = '';
    await this.loadMore();
  },

  async loadMore() {
    const pluginFilter = document.getElementById('filter-plugin')?.value || '';
    let url = `/account/usage?limit=30&offset=${this.offset}`;
    if (pluginFilter) url += `&plugin=${pluginFilter}`;

    try {
      const res = await API.get(url);
      const logs = res.data?.logs || [];
      this.allLogs = this.allLogs.concat(logs);

      // Filtrar por status no client-side
      const statusFilter = document.getElementById('filter-status')?.value || '';
      let filtered = this.allLogs;
      if (statusFilter === 'success') filtered = filtered.filter(l => (l.status_code || 200) < 300);
      else if (statusFilter === 'client_error') filtered = filtered.filter(l => l.status_code >= 400 && l.status_code < 500);
      else if (statusFilter === 'server_error') filtered = filtered.filter(l => l.status_code >= 500);

      this.renderLogs(filtered);

      // Atualizar contagem
      const countEl = document.getElementById('activity-count');
      if (countEl) countEl.textContent = `${filtered.length} registros`;

      // Load more button
      const loadMoreEl = document.getElementById('activity-load-more');
      if (loadMoreEl) {
        if (logs.length >= 30) {
          this.offset += 30;
          loadMoreEl.innerHTML = `<button onclick="activityPage.loadMore()" style="padding:10px 24px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;color:#94a3b8;font-size:13px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;transition:all 0.2s;" onmouseover="this.style.borderColor='#6366f1'" onmouseout="this.style.borderColor='rgba(255,255,255,0.06)'">${I('chevron-down','w-4 h-4')} Carregar mais</button>`;
        } else {
          loadMoreEl.innerHTML = filtered.length > 0 ? '<p style="font-size:12px;color:#64748b;margin-top:8px;">Todos os registros carregados.</p>' : '';
        }
      }
    } catch (err) { toast(err.message, 'error'); }
  },

  renderLogs(logs) {
    const listEl = document.getElementById('activity-list');
    if (!listEl) return;

    const colorMap = { 'GET': '#22c55e', 'POST': '#3b82f6', 'DELETE': '#ef4444', 'PUT': '#f59e0b' };
    const iconMap = { 'echo': 'zap', 'key': 'key', 'secret': 'lock', 'credit': 'credit-card' };

    if (logs.length === 0) {
      listEl.innerHTML = UI.empty('activity', 'Nenhuma atividade', 'As chamadas de API aparecerão aqui conforme você usar os plugins.');
      return;
    }

    listEl.innerHTML = `<div style="display:flex;flex-direction:column;gap:2px;">
      ${logs.map((l, i) => {
        const ic = iconMap[l.plugin_slug] || 'activity';
        const methodColor = colorMap[l.method] || '#818cf8';
        const statusCode = l.status_code || 200;
        const isSuccess = statusCode < 300;
        const isClientErr = statusCode >= 400 && statusCode < 500;
        const statusColor = isSuccess ? '#22c55e' : isClientErr ? '#f59e0b' : '#ef4444';
        const statusBadge = `<span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;background:${statusColor}15;color:${statusColor};">${statusCode}</span>`;
        const methodBadge = `<span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;background:${methodColor}15;color:${methodColor};">${l.method || 'GET'}</span>`;
        return `<div style="display:flex;align-items:flex-start;gap:16px;padding:16px 20px;background:linear-gradient(135deg,rgba(26,34,51,0.6),rgba(17,24,39,0.7));border:1px solid rgba(255,255,255,0.04);border-radius:10px;transition:all 0.2s;animation:fadeIn 0.3s ease-out both;animation-delay:${Math.min(i*0.03, 0.5)}s;" onmouseover="this.style.borderColor='rgba(255,255,255,0.1)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.04)'">
          <div style="width:36px;height:36px;border-radius:10px;background:${methodColor}10;display:flex;align-items:center;justify-content:center;color:${methodColor};flex-shrink:0;">${I(ic,'w-4 h-4')}</div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              ${methodBadge}
              ${statusBadge}
              <span style="font-weight:600;font-size:13px;">/v1/${UI.esc(l.plugin_slug || '')}${UI.esc(l.path || '')}</span>
              <span style="margin-left:auto;font-size:12px;color:#64748b;">${UI.relTime(l.created_at)}</span>
            </div>
            <div style="display:flex;gap:16px;font-size:12px;color:#64748b;">
              <span>Latência: <strong style="color:#94a3b8;">${l.latency_ms || 0}ms</strong></span>
              <span>Custo: <strong style="color:#94a3b8;">${l.credit_cost || 0} cr</strong></span>
              ${l.request_id ? `<span style="font-family:'JetBrains Mono',monospace;font-size:11px;">${l.request_id.slice(0,12)}...</span>` : ''}
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }
};
