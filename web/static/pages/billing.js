// Crom Cloud — Billing
Router.register('/billing', async (app) => {
  try {
    if (!API.user) { const me = await API.me(); API.user = me.data; }
    const balRes = await API.getBalance();
    const balance = balRes.data.balance;
    app.innerHTML = dashboardLayout('Créditos & Billing', `
      <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
        <div class="stat-card"><div class="stat-label">Saldo Atual</div><div class="stat-value accent">$${balance.toFixed(2)}</div></div>
        <div class="stat-card"><div class="stat-label">Plano</div><div class="stat-value">${API.user.plan}</div></div>
        <div class="stat-card"><div class="stat-label">Gasto Este Mês</div><div class="stat-value">$0.00</div></div>
      </div>
      <div class="table-container">
        <div class="table-header"><h3>💳 Adicionar Créditos</h3></div>
        <div style="padding:1.5rem">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.75rem;margin-bottom:1rem">
            ${[10,50,100,250,500,1000].map(v=>`<button class="btn btn-secondary" onclick="document.getElementById('creditAmount').value=${v}" style="justify-content:center;font-size:1.2rem;font-weight:700;padding:1rem">$${v}</button>`).join('')}
          </div>
          <div class="form-group"><label>Valor</label><input type="number" class="form-input" id="creditAmount" placeholder="100" min="1"></div>
          <button class="btn btn-primary" style="width:100%" id="btnAddCredit">Adicionar</button>
        </div>
      </div>
    `, 'billing');
    document.getElementById('btnAddCredit').onclick = async () => {
      const amount = parseFloat(document.getElementById('creditAmount').value);
      if (!amount||amount<=0) return toast('Valor inválido','error');
      try { await API.addCredits(amount); toast(`$${amount} adicionados!`); Router.navigate('/billing'); } catch(e){ toast(e.message,'error'); }
    };
  } catch(e){ toast(e.message,'error'); }
});
