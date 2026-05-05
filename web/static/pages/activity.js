// Crom Cloud — Activity Page
Router.register('/activity', async (app) => {
  try {
    if (!API.user) { const me = await API.me(); API.user = me.data; }
    const res = await API.get('/account/usage?limit=50');
    const logs = res.data?.logs || [];

    const iconMap = { 'echo': 'zap', 'key': 'key', 'secret': 'lock', 'credit': 'credit-card' };
    const colorMap = { 'GET': '#22c55e', 'POST': '#3b82f6', 'DELETE': '#ef4444', 'PUT': '#f59e0b' };

    app.innerHTML = dashboardLayout('Atividade', `
      <div style="margin-bottom:20px;" class="anim-fade">
        <p style="font-size:14px;color:#64748b;">Log de atividades e chamadas de API da sua conta.</p>
      </div>

      ${logs.length > 0 ? `<div style="display:flex;flex-direction:column;gap:2px;">
        ${logs.map((l, i) => {
          const ic = iconMap[l.plugin_slug] || 'activity';
          const color = colorMap[l.method] || '#818cf8';
          const methodBadge = `<span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;background:${color}15;color:${color};">${l.method || 'GET'}</span>`;
          return `<div style="display:flex;align-items:flex-start;gap:16px;padding:16px 20px;background:linear-gradient(135deg,rgba(26,34,51,0.6),rgba(17,24,39,0.7));border:1px solid rgba(255,255,255,0.04);border-radius:10px;transition:all 0.2s;animation:fadeIn 0.3s ease-out both;animation-delay:${i*0.03}s;" onmouseover="this.style.borderColor='rgba(255,255,255,0.1)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.04)'">
            <div style="width:36px;height:36px;border-radius:10px;background:${color}10;display:flex;align-items:center;justify-content:center;color:${color};flex-shrink:0;">${I(ic,'w-4 h-4')}</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                ${methodBadge}
                <span style="font-weight:600;font-size:13px;">/v1/${UI.esc(l.plugin_slug || '')}${UI.esc(l.path || '')}</span>
                <span style="margin-left:auto;font-size:12px;color:#64748b;">${UI.relTime(l.created_at)}</span>
              </div>
              <div style="display:flex;gap:16px;font-size:12px;color:#64748b;">
                <span>Latência: <strong style="color:#94a3b8;">${l.latency_ms || 0}ms</strong></span>
                <span>Custo: <strong style="color:#94a3b8;">${l.credit_cost || 0} cr</strong></span>
                ${l.request_id ? `<span style="font-family:'JetBrains Mono',monospace;font-size:11px;">${l.request_id.slice(0,8)}...</span>` : ''}
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>` : UI.empty('activity', 'Nenhuma atividade', 'As chamadas de API aparecerão aqui conforme você usar os plugins.')}
    `, 'activity', [{label:'Dashboard',action:"Router.navigate('/dashboard')"},{label:'Atividade'}]);
  } catch (err) { toast(err.message, 'error'); }
});
