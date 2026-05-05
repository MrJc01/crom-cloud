// Crom Cloud — API Keys Page
Router.register('/keys', async (app) => {
  try {
    if (!API.user) { const me = await API.me(); API.user = me.data; }
    const res = await API.listKeys();
    const keys = res.data || [];
    const plugins = (await API.listPlugins()).data || [];

    const badge = (text, color) => `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:100px;font-size:11px;font-weight:600;background:${color}15;color:${color};">${text}</span>`;
    const tag = (text) => `<span style="display:inline-block;padding:2px 8px;font-size:11px;font-weight:600;background:rgba(99,102,241,0.12);color:#818cf8;border-radius:4px;margin-right:4px;">${text}</span>`;
    const th = (t) => `<th style="text-align:left;padding:10px 20px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;background:rgba(0,0,0,0.2);border-bottom:1px solid rgba(255,255,255,0.06);">${t}</th>`;

    app.innerHTML = dashboardLayout('API Keys', `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;" class="anim-fade">
        <div>
          <p style="font-size:14px;color:#64748b;">Gerencie suas API Keys para acessar os plugins via API.</p>
        </div>
        ${UI.btn(`${I('plus','w-4 h-4')} Nova API Key`, 'primary', 'onclick="keysPage.showCreate()"')}
      </div>
      <div style="background:linear-gradient(135deg,rgba(26,34,51,0.8),rgba(17,24,39,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;" class="anim-fade">
        <div style="padding:12px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="position:relative;">
            <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#64748b;">${I('search','w-4 h-4')}</span>
            <input type="text" style="width:100%;padding:10px 16px 10px 40px;background:#0f1520;border:1px solid rgba(255,255,255,0.06);border-radius:8px;font-size:13px;color:#e2e8f0;outline:none;font-family:Inter,sans-serif;" placeholder="Buscar..." onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='rgba(255,255,255,0.06)'" onkeyup="document.querySelectorAll('#keys-table tbody tr').forEach(r=>r.style.display=r.textContent.toLowerCase().includes(this.value.toLowerCase())?'':'none')">
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;" id="keys-table">
          <thead><tr>${th('Label')}${th('Prefixo')}${th('Permissões')}${th('Rate Limit')}${th('Último Uso')}${th('Status')}${th('Ações')}</tr></thead>
          <tbody>
            ${keys.length > 0 ? keys.map(k => `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background=''">
              <td style="padding:12px 20px;font-size:13px;font-weight:600;">${UI.esc(k.label)}</td>
              <td style="padding:12px 20px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#64748b;">${k.key_prefix}...</td>
              <td style="padding:12px 20px;">${(k.permissions||[]).map(p => tag(p.plugin_slug)).join('')}</td>
              <td style="padding:12px 20px;font-size:13px;color:#94a3b8;">${k.rate_limit || '100/min'}</td>
              <td style="padding:12px 20px;font-size:13px;color:#94a3b8;">${UI.relTime(k.last_used_at)}</td>
              <td style="padding:12px 20px;">${k.is_active ? badge('● Ativa','#22c55e') : badge('Revogada','#ef4444')}</td>
              <td style="padding:12px 20px;">${k.is_active ? `<button style="padding:6px 12px;border-radius:6px;background:rgba(239,68,68,0.08);border:none;color:#ef4444;font-size:11px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;" onclick="keysPage.revoke('${k.id}','${UI.esc(k.label)}')">Revogar</button>` : ''}</td>
            </tr>`).join('') : `<tr><td colspan="7" style="text-align:center;padding:48px;">
              <div style="color:#475569;margin-bottom:12px;">${I('key','w-10 h-10')}</div>
              <div style="font-weight:600;color:#94a3b8;">Nenhuma API Key</div>
              <div style="font-size:13px;color:#64748b;">Crie sua primeira key para começar</div>
            </td></tr>`}
          </tbody>
        </table>
      </div>
    `, 'keys', [{label:'Dashboard',action:"Router.navigate('/dashboard')"},{label:'API Keys'}]);
  } catch (err) { toast(err.message, 'error'); }
});

const keysPage = {
  async showCreate() {
    let pluginsHTML = '<div style="color:#64748b;font-size:12px;">Carregando plugins habilitados...</div>';
    try {
      const [resEnabled, resPlugins] = await Promise.all([
        API.listEnabledPlugins(),
        API.listPlugins()
      ]);
      const enabledSlugs = resEnabled.data?.enabled_plugins || [];
      const allPlugins = resPlugins.data || [];
      
      const available = allPlugins.filter(p => enabledSlugs.includes(p.slug));
      
      if (available.length === 0) {
        pluginsHTML = '<div style="color:#ef4444;font-size:12px;padding:8px;background:rgba(239,68,68,0.1);border-radius:6px;">Você não tem nenhum plugin habilitado no seu Workspace. Habilite-os primeiro no Marketplace.</div>';
      } else {
        pluginsHTML = available.map(p => `
          <label style="display:flex;align-items:center;gap:8px;padding:8px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px;cursor:pointer;">
            <input type="checkbox" name="plugin_scopes" value="${p.slug}" style="accent-color:#6366f1;">
            <span style="font-size:13px;color:#e2e8f0;font-weight:600;">${UI.esc(p.name)} <span style="color:#64748b;font-weight:400;font-size:11px;">(${p.slug})</span></span>
          </label>
        `).join('');
      }
    } catch (e) {
      pluginsHTML = '<div style="color:#ef4444;font-size:12px;">Erro ao carregar plugins.</div>';
    }

    const el = document.createElement('div');
    el.innerHTML = UI.modal(`${I('key','w-5 h-5')} Nova API Key`, `
      ${UI.input('key-label', 'Nome da Key', { placeholder: 'Ex: Production Key', required: true })}
      <div style="margin-bottom:16px;">
        <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600;color:#94a3b8;">Escopo de Plugins</label>
        <div id="key-perms" style="display:flex;flex-direction:column;gap:8px;max-height:200px;overflow-y:auto;padding-right:8px;">
          ${pluginsHTML}
        </div>
      </div>
      <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px;">
        ${UI.btn('Cancelar', 'secondary', 'onclick="document.getElementById(\'modal\').remove()"')}
        ${UI.btn(`${I('plus','w-4 h-4')} Criar Key`, 'primary', 'onclick="keysPage.create()"')}
      </div>`);
    document.body.appendChild(el.firstElementChild);
  },
  async create() {
    const label = document.getElementById('key-label')?.value;
    if (!label) return toast('Informe o nome da key', 'error');
    
    const checkboxes = document.querySelectorAll('input[name="plugin_scopes"]:checked');
    const permissions = Array.from(checkboxes).map(cb => ({
      plugin_slug: cb.value,
      scope: 'read'
    }));

    if (permissions.length === 0) {
      return toast('Selecione ao menos um plugin.', 'error');
    }

    try {
      const res = await API.createKey(label, permissions);
      document.getElementById('modal')?.remove();
      const keyModal = document.createElement('div');
      keyModal.innerHTML = UI.modal(`${I('check-circle','w-5 h-5')} Key Criada!`, `
        <p style="font-size:14px;color:#f59e0b;margin-bottom:16px;display:flex;align-items:center;gap:8px;">${I('alert-triangle','w-4 h-4')} Copie agora — esta key não será exibida novamente.</p>
        ${UI.keyDisplay(res.data.key)}
        <div style="text-align:right;margin-top:20px;">${UI.btn('Fechar', 'secondary', 'onclick="document.getElementById(\'modal\').remove();Router.navigate(\'/keys\')"')}</div>`);
      document.body.appendChild(keyModal.firstElementChild);
    } catch (err) { toast(err.message, 'error'); }
  },
  async revoke(id, label) {
    const modal = UI.confirm('Revogar Key', `Tem certeza que deseja revogar a key "${label}"? Esta ação é irreversível.`);
    document.getElementById('confirm-action-btn').onclick = async () => {
      try { await API.revokeKey(id); modal.remove(); toast('Key revogada!'); Router.navigate('/keys'); } catch (e) { toast(e.message, 'error'); }
    };
  },
};
