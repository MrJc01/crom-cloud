// Crom Cloud — Secrets Vault
Router.register('/secrets', async (app) => {
  try {
    if (!API.user) { const me = await API.me(); API.user = me.data; }
    const res = await API.listSecrets();
    const secrets = res.data || [];
    app.innerHTML = dashboardLayout('Vault de Secrets', `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
        <p style="color:var(--text-secondary)">Secrets criptografados com AES-256-GCM. Injetados automaticamente nos plugins.</p>
        <button class="btn btn-primary" id="btnNewSecret">+ Novo Secret</button>
      </div>
      <div class="table-container">
        <table><thead><tr><th>Plugin</th><th>Chave</th><th>Valor</th><th>Atualizado</th></tr></thead>
        <tbody>${secrets.map(s=>`<tr>
          <td><span class="doc-tag">${s.plugin}</span></td>
          <td><strong>${s.key}</strong></td>
          <td style="color:var(--text-muted)">••••••••</td>
          <td style="color:var(--text-muted);font-size:0.85rem">${new Date(s.updated_at).toLocaleString('pt-BR')}</td>
        </tr>`).join('')}
        ${secrets.length===0?'<tr><td colspan="4"><div class="empty-state"><div class="icon">🔒</div><h3>Nenhum secret</h3><p>Configure secrets para seus plugins</p></div></td></tr>':''}
        </tbody></table>
      </div>
      <div id="secretModal" style="display:none"></div>
    `, 'secrets');
    document.getElementById('btnNewSecret').onclick = () => {
      document.getElementById('secretModal').style.display = 'block';
      document.getElementById('secretModal').innerHTML = `
        <div class="modal-overlay" onclick="if(event.target===this)document.getElementById('secretModal').style.display='none'">
          <div class="modal">
            <h2>🔒 Novo Secret</h2>
            <form id="secretForm">
              <div class="form-group"><label>Plugin</label><input class="form-input" id="secPlugin" placeholder="cloudflare" required></div>
              <div class="form-group"><label>Chave</label><input class="form-input" id="secKey" placeholder="CF_API_TOKEN" required></div>
              <div class="form-group"><label>Valor</label><input type="password" class="form-input" id="secValue" placeholder="Seu token secreto" required></div>
              <div style="display:flex;gap:0.75rem"><button type="submit" class="btn btn-primary" style="flex:1">Salvar</button><button type="button" class="btn btn-secondary" onclick="document.getElementById('secretModal').style.display='none'">Cancelar</button></div>
            </form>
          </div>
        </div>`;
      document.getElementById('secretForm').onsubmit = async (e) => {
        e.preventDefault();
        try { await API.setSecret(document.getElementById('secPlugin').value, document.getElementById('secKey').value, document.getElementById('secValue').value); toast('Secret salvo!'); Router.navigate('/secrets'); } catch(e){ toast(e.message,'error'); }
      };
    };
  } catch(e){ toast(e.message,'error'); }
});
