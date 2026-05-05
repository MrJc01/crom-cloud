// Crom Cloud — Billing Page
Router.register('/billing', async (app) => {
  try {
    if (!API.user) { const me = await API.me(); API.user = me.data; }
    const balRes = await API.getBalance();
    const balance = balRes.data.balance;

    const amounts = [10, 50, 100, 250, 500, 1000];

    app.innerHTML = dashboardLayout('Créditos & Billing', `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:24px;" class="anim-fade">
        ${UI.stat('Saldo Atual', '$'+balance.toFixed(2), { icon: 'wallet', color: '#818cf8' })}
        ${UI.stat('Plano', API.user.plan || 'free', { icon: 'crown', color: '#22c55e' })}
        ${UI.stat('Gasto Este Mês', '$0.00', { icon: 'trending-up', color: '#f1f5f9' })}
      </div>

      ${UI.card(`${I('credit-card','w-4 h-4')} Adicionar Créditos`, `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:8px;margin-bottom:16px;">
          ${amounts.map(a => `<button style="padding:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#e2e8f0;font-size:14px;font-weight:700;cursor:pointer;transition:all 0.2s;font-family:Inter,sans-serif;" onmouseover="this.style.borderColor='#6366f1';this.style.background='rgba(99,102,241,0.08)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)';this.style.background='rgba(255,255,255,0.03)'" onclick="document.getElementById('credit-amount').value=${a}">$${a}</button>`).join('')}
        </div>
        <div style="margin-bottom:16px;">
          <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:500;color:#94a3b8;">Valor personalizado</label>
          <input type="number" id="credit-amount" value="100" min="1" style="width:100%;padding:10px 16px;background:#0f1520;border:1px solid rgba(255,255,255,0.06);border-radius:8px;font-size:14px;color:#e2e8f0;outline:none;font-family:Inter,sans-serif;" onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='rgba(255,255,255,0.06)'">
        </div>
        <button style="width:100%;padding:14px;background:linear-gradient(135deg,#6366f1,#7c3aed);color:white;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 6px 20px rgba(99,102,241,0.3);display:flex;align-items:center;justify-content:center;gap:8px;font-family:Inter,sans-serif;transition:all 0.2s;" onmouseover="this.style.boxShadow='0 10px 30px rgba(99,102,241,0.5)'" onmouseout="this.style.boxShadow='0 6px 20px rgba(99,102,241,0.3)'" onclick="billingPage.addCredits()">${I('plus','w-4 h-4')} Adicionar Créditos</button>
      `)}

      <div style="margin-top:16px;" id="billing-history"></div>
    `, 'billing', [{label:'Dashboard',action:"Router.navigate('/dashboard')"},{label:'Créditos'}]);

    try {
      const histRes = await API.get('/account/credits/history?limit=10');
      const txns = histRes.data?.transactions || [];
      if (txns.length > 0) {
        const th = (t) => `<th style="text-align:left;padding:10px 20px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;background:rgba(0,0,0,0.2);border-bottom:1px solid rgba(255,255,255,0.06);">${t}</th>`;
        document.getElementById('billing-history').innerHTML = UI.card(`${I('activity','w-4 h-4')} Histórico`, `
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr>${th('Tipo')}${th('Valor')}${th('Descrição')}${th('Data')}</tr></thead>
            <tbody>${txns.map(t => `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
              <td style="padding:12px 20px;">${UI.badge(t.type, t.type === 'purchase' ? 'active' : 'info')}</td>
              <td style="padding:12px 20px;font-weight:700;color:${t.amount > 0 ? '#22c55e' : '#ef4444'};">$${Math.abs(t.amount).toFixed(2)}</td>
              <td style="padding:12px 20px;font-size:13px;color:#94a3b8;">${UI.esc(t.description || '')}</td>
              <td style="padding:12px 20px;font-size:13px;color:#64748b;">${UI.relTime(t.created_at)}</td>
            </tr>`).join('')}</tbody>
          </table>`, { noPad: true });
      }
    } catch(e) {}
  } catch (err) { toast(err.message, 'error'); }
});

const billingPage = {
  async addCredits() {
    const amount = parseFloat(document.getElementById('credit-amount')?.value);
    if (!amount || amount < 1) return toast('Informe um valor válido', 'error');
    try {
      await API.addCredits(amount, 'purchase', 'Créditos adicionados via dashboard');
      toast(`$${amount.toFixed(2)} adicionados!`);
      Router.navigate('/billing');
    } catch (err) { toast(err.message, 'error'); }
  },
};
