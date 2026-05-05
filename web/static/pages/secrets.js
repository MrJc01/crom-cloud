// Crom Cloud — Secrets Page
Router.register('/secrets', async (app) => {
  try {
    if (!API.user) { const me = await API.me(); API.user = me.data; }
    const [secRes, plugRes, enabledRes] = await Promise.all([API.listSecrets(), API.listPlugins(), API.listEnabledPlugins()]);
    const secrets = secRes.data || [];
    const plugins = plugRes.data || [];
    const enabledSlugs = enabledRes.data?.enabled_plugins || [];
    const enabledPlugins = plugins.filter(p => enabledSlugs.includes(p.slug));

    // Agrupar secrets por plugin
    const grouped = {};
    secrets.forEach(s => {
      if (!grouped[s.plugin_slug]) grouped[s.plugin_slug] = [];
      grouped[s.plugin_slug].push(s);
    });

    const th = (t) => `<th style="text-align:left;padding:10px 20px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;background:rgba(0,0,0,0.2);border-bottom:1px solid rgba(255,255,255,0.06);">${t}</th>`;

    app.innerHTML = dashboardLayout('Secrets', `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;" class="anim-fade">
        <div>
          <p style="font-size:14px;color:#64748b;">Vault de secrets criptografados com AES-256-GCM. Injetados automaticamente nos plugins.</p>
        </div>
        ${UI.btn(`${I('plus','w-4 h-4')} Novo Secret`, 'primary', 'onclick="secretsPage.showCreate()"')}
      </div>

      ${enabledPlugins.length > 0 && secrets.length === 0 ? `
      <div style="padding:16px 20px;margin-bottom:16px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:10px;display:flex;align-items:center;gap:10px;" class="anim-fade">
        <span style="color:#f59e0b;">${I('alert-triangle','w-4 h-4')}</span>
        <span style="font-size:13px;color:#94a3b8;">Você tem <strong style="color:#f59e0b;">${enabledPlugins.length} plugins habilitados</strong> mas nenhum secret configurado. Alguns plugins precisam de tokens externos para funcionar.</span>
      </div>` : ''}

      <div style="background:linear-gradient(135deg,rgba(26,34,51,0.8),rgba(17,24,39,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;" class="anim-fade">
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr>${th('Nome')}${th('Plugin')}${th('Valor')}${th('Criado')}${th('Ações')}</tr></thead>
          <tbody>
            ${secrets.length > 0 ? secrets.map(s => `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background=''">
              <td style="padding:12px 20px;font-weight:600;display:flex;align-items:center;gap:8px;"><span style="color:#f59e0b;">${I('lock','w-4 h-4')}</span> ${UI.esc(s.secret_name)}</td>
              <td style="padding:12px 20px;">${UI.tag(s.plugin_slug)}</td>
              <td style="padding:12px 20px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#64748b;">••••••••</td>
              <td style="padding:12px 20px;font-size:13px;color:#64748b;">${UI.relTime(s.created_at)}</td>
              <td style="padding:12px 20px;">
                <button style="padding:5px 10px;border-radius:6px;background:rgba(99,102,241,0.08);border:none;color:#818cf8;font-size:11px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;margin-right:4px;" onclick="secretsPage.showUpdate('${s.plugin_slug}','${UI.esc(s.secret_name)}')">Atualizar</button>
                <button style="padding:5px 10px;border-radius:6px;background:rgba(239,68,68,0.08);border:none;color:#ef4444;font-size:11px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;" onclick="secretsPage.delete('${s.plugin_slug}','${UI.esc(s.secret_name)}')">Excluir</button>
              </td>
            </tr>`).join('') : `<tr><td colspan="5" style="text-align:center;padding:48px;">
              <div style="color:#475569;margin-bottom:12px;">${I('lock','w-10 h-10')}</div>
              <div style="font-weight:600;color:#94a3b8;">Nenhum secret</div>
              <div style="font-size:13px;color:#64748b;">Adicione secrets para injetar nos plugins automaticamente.</div>
            </td></tr>`}
          </tbody>
        </table>
      </div>
    `, 'secrets', [{label:'Dashboard',action:"Router.navigate('/dashboard')"},{label:'Secrets'}]);
  } catch (err) { toast(err.message, 'error'); }
});

const secretsPage = {
  async showCreate() {
    let pluginOptions = '<option value="">Selecione um plugin...</option>';
    try {
      const [resPlugins, resEnabled] = await Promise.all([API.listPlugins(), API.listEnabledPlugins()]);
      const enabledSlugs = resEnabled.data?.enabled_plugins || [];
      const enabled = (resPlugins.data || []).filter(p => enabledSlugs.includes(p.slug));
      pluginOptions += enabled.map(p => `<option value="${p.slug}">${UI.esc(p.name)} (${p.slug})</option>`).join('');
    } catch(e) {}

    const el = document.createElement('div');
    el.innerHTML = UI.modal(`${I('lock','w-5 h-5')} Novo Secret`, `
      <div style="margin-bottom:16px;">
        <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600;color:#94a3b8;">Plugin</label>
        <select id="secret-plugin" style="width:100%;padding:10px 16px;background:#0f1520;border:1px solid rgba(255,255,255,0.06);border-radius:8px;font-size:14px;color:#e2e8f0;outline:none;font-family:Inter,sans-serif;appearance:none;cursor:pointer;" onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='rgba(255,255,255,0.06)'">
          ${pluginOptions}
        </select>
      </div>
      ${UI.input('secret-name', 'Nome do Secret', { placeholder: 'Ex: CLOUDFLARE_API_TOKEN', required: true })}
      ${UI.input('secret-value', 'Valor', { placeholder: 'Valor secreto...', required: true, type: 'password' })}
      <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px;">
        ${UI.btn('Cancelar', 'secondary', 'onclick="document.getElementById(\'modal\').remove()"')}
        ${UI.btn(`${I('lock','w-4 h-4')} Salvar`, 'primary', 'onclick="secretsPage.create()"')}
      </div>`);
    document.body.appendChild(el.firstElementChild);
  },
  async create() {
    const slug = document.getElementById('secret-plugin')?.value;
    const name = document.getElementById('secret-name')?.value;
    const val = document.getElementById('secret-value')?.value;
    if (!slug) return toast('Selecione um plugin', 'error');
    if (!name || !val) return toast('Preencha todos os campos', 'error');
    try {
      await API.setSecret(slug, name, val);
      document.getElementById('modal')?.remove();
      toast('Secret armazenado!');
      Router.navigate('/secrets');
    } catch (err) { toast(err.message, 'error'); }
  },
  showUpdate(slug, name) {
    const el = document.createElement('div');
    el.innerHTML = UI.modal(`${I('edit','w-5 h-5')} Atualizar Secret: ${name}`, `
      <p style="font-size:13px;color:#64748b;margin-bottom:16px;">Plugin: <strong style="color:#818cf8;">${slug}</strong></p>
      ${UI.input('update-secret-value', 'Novo Valor', { placeholder: 'Novo valor secreto...', required: true, type: 'password' })}
      <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px;">
        ${UI.btn('Cancelar', 'secondary', 'onclick="document.getElementById(\'modal\').remove()"')}
        ${UI.btn(`${I('check','w-4 h-4')} Atualizar`, 'primary', `onclick="secretsPage.doUpdate('${slug}','${name}')"`)}</div>`);
    document.body.appendChild(el.firstElementChild);
  },
  async doUpdate(slug, name) {
    const val = document.getElementById('update-secret-value')?.value;
    if (!val) return toast('Informe o novo valor', 'error');
    try {
      await API.setSecret(slug, name, val);
      document.getElementById('modal')?.remove();
      toast('Secret atualizado!');
      Router.navigate('/secrets');
    } catch (err) { toast(err.message, 'error'); }
  },
  async delete(slug, name) {
    const modal = UI.confirm('Excluir Secret', `Tem certeza que deseja excluir "${name}"?`);
    document.getElementById('confirm-action-btn').onclick = async () => {
      try { await API.deleteSecret(slug, name); modal.remove(); toast('Secret removido!'); Router.navigate('/secrets'); } catch (e) { toast(e.message, 'error'); }
    };
  },
};
