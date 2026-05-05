// Crom Cloud — API Keys Management

Router.register('/keys', async (app) => {
  try {
    if (!API.user) { const me = await API.me(); API.user = me.data; }
    const keysRes = await API.listKeys();
    const pluginsRes = await API.listPlugins();
    const keys = keysRes.data || [];
    const plugins = pluginsRes.data || [];

    app.innerHTML = dashboardLayout('API Keys', `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
        <div>
          <p style="color:var(--text-secondary)">Gerencie suas API Keys para acessar os plugins via API.</p>
        </div>
        <button class="btn btn-primary" id="btnNewKey">+ Nova API Key</button>
      </div>

      <div class="table-container">
        <table>
          <thead><tr><th>Label</th><th>Prefixo</th><th>Permissões</th><th>Rate Limit</th><th>Último Uso</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody id="keysBody">
            ${keys.map(k => `<tr>
              <td><strong>${k.label}</strong></td>
              <td style="font-family:monospace;font-size:0.8rem;color:var(--text-muted)">${k.key_prefix}...</td>
              <td>${(k.permissions||[]).map(p => `<span class="doc-tag">${p.plugin_slug}:${p.scope}</span>`).join(' ')}</td>
              <td>${k.rate_limit_rpm} rpm</td>
              <td style="color:var(--text-muted);font-size:0.85rem">${k.last_used_at ? new Date(k.last_used_at).toLocaleString('pt-BR') : '—'}</td>
              <td>${k.is_active ? '<span class="badge badge-active">● Ativa</span>' : '<span class="badge badge-inactive">Revogada</span>'}</td>
              <td>${k.is_active ? `<button class="btn btn-danger btn-sm" onclick="revokeKey('${k.id}')">Revogar</button>` : ''}</td>
            </tr>`).join('')}
            ${keys.length === 0 ? '<tr><td colspan="7"><div class="empty-state"><div class="icon">🔑</div><h3>Nenhuma API Key</h3><p>Crie sua primeira key para começar</p></div></td></tr>' : ''}
          </tbody>
        </table>
      </div>

      <div id="newKeyModal" style="display:none"></div>
    `, 'keys');

    // New Key modal
    document.getElementById('btnNewKey').onclick = () => {
      document.getElementById('newKeyModal').style.display = 'block';
      document.getElementById('newKeyModal').innerHTML = `
        <div class="modal-overlay" onclick="if(event.target===this)document.getElementById('newKeyModal').style.display='none'">
          <div class="modal">
            <h2>🔑 Nova API Key</h2>
            <form id="createKeyForm">
              <div class="form-group">
                <label>Label</label>
                <input type="text" class="form-input" id="keyLabel" placeholder="Minha key de produção" required>
              </div>
              <div class="form-group">
                <label>Permissões</label>
                ${plugins.map(p => `
                  <div style="display:flex;gap:0.75rem;align-items:center;margin-bottom:0.5rem;padding:0.5rem;background:var(--bg-secondary);border-radius:var(--radius-xs)">
                    <input type="checkbox" id="perm_${p.slug}" checked>
                    <label for="perm_${p.slug}" style="flex:1;margin:0;cursor:pointer">${p.name} (${p.slug})</label>
                    <select id="scope_${p.slug}" class="form-input" style="width:100px;padding:0.3rem 0.5rem">
                      <option value="read">read</option>
                      <option value="write" selected>write</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                `).join('')}
                <div style="display:flex;gap:0.75rem;align-items:center;margin-top:0.5rem;padding:0.5rem;background:var(--bg-secondary);border-radius:var(--radius-xs)">
                  <input type="checkbox" id="perm_wildcard">
                  <label for="perm_wildcard" style="flex:1;margin:0;cursor:pointer">Todos os plugins futuros (*)</label>
                  <select id="scope_wildcard" class="form-input" style="width:100px;padding:0.3rem 0.5rem">
                    <option value="read" selected>read</option>
                    <option value="write">write</option>
                  </select>
                </div>
              </div>
              <div style="display:flex;gap:0.75rem;margin-top:1rem">
                <button type="submit" class="btn btn-primary" style="flex:1">Criar Key</button>
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('newKeyModal').style.display='none'">Cancelar</button>
              </div>
            </form>
          </div>
        </div>`;

      document.getElementById('createKeyForm').onsubmit = async (e) => {
        e.preventDefault();
        const perms = [];
        plugins.forEach(p => {
          if (document.getElementById('perm_' + p.slug)?.checked) {
            perms.push({ plugin: p.slug, scope: document.getElementById('scope_' + p.slug).value });
          }
        });
        if (document.getElementById('perm_wildcard')?.checked) {
          perms.push({ plugin: '*', scope: document.getElementById('scope_wildcard').value });
        }
        try {
          const res = await API.createKey(document.getElementById('keyLabel').value, perms);
          document.getElementById('newKeyModal').innerHTML = `
            <div class="modal-overlay">
              <div class="modal">
                <h2>✅ Key Criada!</h2>
                <p style="color:var(--warning);margin-bottom:1rem;font-weight:600">⚠️ Copie agora! Esta key não será mostrada novamente.</p>
                <div class="key-display">
                  <span id="rawKeyVal">${res.data.key}</span>
                  <button class="copy-btn" onclick="navigator.clipboard.writeText('${res.data.key}');toast('Copiada!')">Copiar</button>
                </div>
                <button class="btn btn-primary" style="width:100%;margin-top:1.5rem" onclick="Router.navigate('/keys')">Fechar</button>
              </div>
            </div>`;
        } catch (err) { toast(err.message, 'error'); }
      };
    };
  } catch (err) { toast(err.message, 'error'); }
});

async function revokeKey(id) {
  if (!confirm('Tem certeza que deseja revogar esta key?')) return;
  try {
    await API.revokeKey(id);
    toast('Key revogada com sucesso');
    Router.navigate('/keys');
  } catch (err) { toast(err.message, 'error'); }
}
