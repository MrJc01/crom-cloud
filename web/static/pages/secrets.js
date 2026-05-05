// Crom Cloud — Secrets Page
Router.register('/secrets', async (app) => {
  try {
    if (!API.user) { const me = await API.me(); API.user = me.data; }
    const [secRes, plugRes] = await Promise.all([API.listSecrets(), API.listPlugins()]);
    const secrets = secRes.data || [];
    const plugins = plugRes.data || [];

    const th = (t) => `<th style="text-align:left;padding:10px 20px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;background:rgba(0,0,0,0.2);border-bottom:1px solid rgba(255,255,255,0.06);">${t}</th>`;

    app.innerHTML = dashboardLayout('Secrets', `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;" class="anim-fade">
        <div>
          <p style="font-size:14px;color:#64748b;">Vault de secrets criptografados com AES-256-GCM. Injetados automaticamente nos plugins.</p>
        </div>
        ${UI.btn(`${I('plus','w-4 h-4')} Novo Secret`, 'primary', 'onclick="secretsPage.showCreate()"')}
      </div>
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
                <button style="padding:6px 12px;border-radius:6px;background:rgba(239,68,68,0.08);border:none;color:#ef4444;font-size:11px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;" onclick="secretsPage.delete('${s.plugin_slug}','${UI.esc(s.secret_name)}')">Excluir</button>
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
  showCreate() {
    const el = document.createElement('div');
    el.innerHTML = UI.modal(`${I('lock','w-5 h-5')} Novo Secret`, `
      ${UI.input('secret-plugin', 'Plugin Slug', { placeholder: 'echo', required: true })}
      ${UI.input('secret-name', 'Nome do Secret', { placeholder: 'API_KEY', required: true })}
      ${UI.input('secret-value', 'Valor', { placeholder: 'valor-secreto', required: true, type: 'password' })}
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
    if (!slug || !name || !val) return toast('Preencha todos os campos', 'error');
    try {
      await API.setSecret(slug, name, val);
      document.getElementById('modal')?.remove();
      toast('Secret armazenado!');
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
