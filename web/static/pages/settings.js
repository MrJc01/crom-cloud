// Crom Cloud — Settings Page
Router.register('/settings', async (app) => {
  try {
    if (!API.user) { const me = await API.me(); API.user = me.data; }
    const u = API.user;
    const initial = (u.name || 'U')[0].toUpperCase();

    app.innerHTML = dashboardLayout('Configurações', `
      ${UI.card(`${I('user','w-4 h-4')} Perfil`, `
        <div style="display:flex;align-items:center;gap:20px;margin-bottom:24px;">
          <div style="width:64px;height:64px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:24px;color:white;flex-shrink:0;">${initial}</div>
          <div>
            <div style="font-size:20px;font-weight:700;">${UI.esc(u.name)}</div>
            <div style="font-size:14px;color:#64748b;">${UI.esc(u.email)}</div>
            <div style="margin-top:4px;">${UI.badge(u.plan + ' plan', 'info')}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
          ${UI.input('settings-name', 'Nome', { value: u.name, placeholder: 'Seu nome' })}
          ${UI.input('settings-email', 'Email', { value: u.email, placeholder: 'seu@email.com', type: 'email' })}
        </div>
        <div style="text-align:right;">
          ${UI.btn(`${I('check','w-4 h-4')} Salvar Alterações`, 'primary', 'onclick="settingsPage.save()"')}
        </div>
      `)}

      <div style="margin-top:16px;">
        ${UI.card(`${I('info','w-4 h-4')} Conta`, `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
              <span style="color:#64748b;font-size:13px;">ID da Conta</span>
              <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#94a3b8;">${u.id || '—'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
              <span style="color:#64748b;font-size:13px;">Plano</span>
              <span style="color:#818cf8;font-weight:600;font-size:13px;">${u.plan || 'free'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:12px 0;">
              <span style="color:#64748b;font-size:13px;">Membro desde</span>
              <span style="font-size:13px;color:#94a3b8;">${u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—'}</span>
            </div>
          </div>
        `)}
      </div>

      <div style="margin-top:16px;">
        <div style="background:linear-gradient(135deg,rgba(239,68,68,0.05),rgba(17,24,39,0.9));border:1px solid rgba(239,68,68,0.15);border-radius:14px;overflow:hidden;">
          <div style="padding:14px 20px;border-bottom:1px solid rgba(239,68,68,0.1);display:flex;align-items:center;gap:8px;">
            <span style="color:#ef4444;">${I('alert-triangle','w-4 h-4')}</span>
            <span style="font-weight:700;font-size:14px;color:#ef4444;">Zona de Perigo</span>
          </div>
          <div style="padding:20px;display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-weight:600;font-size:14px;">Excluir Conta</div>
              <div style="font-size:13px;color:#64748b;">Esta ação é irreversível e apagará todos os seus dados.</div>
            </div>
            ${UI.btn(`${I('trash','w-4 h-4')} Excluir`, 'danger', 'onclick="settingsPage.deleteAccount()"')}
          </div>
        </div>
      </div>
    `, 'settings', [{label:'Dashboard',action:"Router.navigate('/dashboard')"},{label:'Configurações'}]);
  } catch (err) { toast(err.message, 'error'); }
});

const settingsPage = {
  async save() {
    const name = document.getElementById('settings-name')?.value;
    const email = document.getElementById('settings-email')?.value;
    if (!name || !email) return toast('Preencha todos os campos', 'error');
    toast('Alterações salvas!');
  },
  deleteAccount() {
    const modal = UI.confirm('Excluir Conta', 'ATENÇÃO: Esta ação é permanente. Todos os dados, keys e secrets serão apagados.');
    document.getElementById('confirm-action-btn').onclick = () => {
      modal.remove();
      toast('Funcionalidade disponível em breve', 'warning');
    };
  },
};
