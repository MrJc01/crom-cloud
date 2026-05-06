// Crom Cloud — Plugin Admin Panel (UI Renderizada via Schema ou Iframe)
Router.register('/plugins/:slug/admin', async (app, params) => {
  const slug = params.slug;

  if (!API.isAuth()) {
    Router.navigate('/login');
    return;
  }

  try {
    // Buscar dados do plugin
    const pluginsRes = await API.listPlugins();
    const plugin = (pluginsRes.data || []).find(p => p.slug === slug);
    if (!plugin) throw new Error('Plugin não encontrado');

    // Verificar se tem UI
    const uiType = plugin.ui_type || 'none';

    if (uiType === 'none') {
      app.innerHTML = dashboardLayout(plugin.name + ' — Admin', `
        <div class="anim-fade" style="text-align:center;padding:80px 20px;">
          <div style="font-size:48px;margin-bottom:16px;">🔧</div>
          <h2 style="font-size:24px;font-weight:800;margin-bottom:8px;">Sem Painel de Controle</h2>
          <p style="color:#64748b;font-size:14px;max-width:400px;margin:0 auto 24px;">Este plugin não possui uma interface de administração.</p>
          <button onclick="Router.navigate('/plugins/${slug}')" style="background:#6366f1;color:white;border:none;padding:10px 24px;border-radius:8px;font-weight:700;cursor:pointer;">Voltar</button>
        </div>
      `, 'plugins');
      return;
    }

    if (uiType === 'iframe') {
      // Modo Iframe — o plugin serve HTML/JS diretamente
      app.innerHTML = dashboardLayout(plugin.name + ' — Admin', `
        <div class="anim-fade">
          <div style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;color:#818cf8;font-size:13px;font-weight:600;margin-bottom:24px;" onclick="Router.navigate('/plugins/${slug}')">
            ${I('arrow-left', 'w-4 h-4')} Voltar para ${UI.esc(plugin.name)}
          </div>
          <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:16px;overflow:hidden;">
            <div style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;gap:12px;">
              <div style="width:32px;height:32px;border-radius:8px;background:rgba(99,102,241,0.1);display:flex;align-items:center;justify-content:center;color:#818cf8;">${I('layout','w-4 h-4')}</div>
              <div>
                <div style="font-weight:700;font-size:14px;">${UI.esc(plugin.name)} — Painel</div>
                <div style="color:#64748b;font-size:12px;">Interface customizada do plugin (iframe)</div>
              </div>
            </div>
            <iframe id="plugin-iframe" src="/v1/playground/${slug}/ui/" sandbox="allow-scripts allow-forms allow-same-origin" style="width:100%;min-height:600px;border:none;background:#0a0a0f;"></iframe>
          </div>
        </div>
      `, 'plugins');
      return;
    }

    // Modo Schema (padrão) — buscar o JSON Schema do plugin e renderizar nativamente
    let schema = null;
    try {
      const uiRes = await API.request('GET', `/playground/${slug}/ui/`);
      schema = uiRes;
    } catch (e) {
      console.error('Erro ao carregar UI schema:', e);
    }

    if (!schema || !schema.pages) {
      app.innerHTML = dashboardLayout(plugin.name + ' — Admin', `
        <div class="anim-fade" style="text-align:center;padding:80px 20px;">
          <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
          <h2 style="font-size:24px;font-weight:800;margin-bottom:8px;">Erro ao Carregar Painel</h2>
          <p style="color:#64748b;font-size:14px;">O plugin não retornou um schema de interface válido.</p>
          <button onclick="Router.navigate('/plugins/${slug}')" style="background:#6366f1;color:white;border:none;padding:10px 24px;border-radius:8px;font-weight:700;cursor:pointer;margin-top:16px;">Voltar</button>
        </div>
      `, 'plugins');
      return;
    }

    // Renderizar Schema UI
    const pages = schema.pages;
    let activePage = pages[0]?.id || '';

    const renderPage = (pageId) => {
      const page = pages.find(p => p.id === pageId);
      if (!page) return '<div style="color:#64748b;">Página não encontrada</div>';

      return (page.sections || []).map(section => {
        switch(section.type) {
          case 'info':
            return `
              <div style="background:rgba(99,102,241,0.05);border:1px solid rgba(99,102,241,0.15);border-radius:12px;padding:20px;margin-bottom:24px;">
                <h4 style="font-size:14px;font-weight:700;margin-bottom:8px;color:#818cf8;">${UI.esc(section.title)}</h4>
                <p style="color:#94a3b8;font-size:13px;line-height:1.6;">${UI.esc(section.content)}</p>
              </div>`;

          case 'form':
            const formFields = (section.fields || []).map(f => {
              if (f.type === 'dynamic_list') {
                return `
                  <div style="margin-bottom:16px;">
                    <label style="display:block;font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:8px;text-transform:uppercase;">${UI.esc(f.label)}</label>
                    <div id="dynamic-${f.name}" style="display:flex;flex-direction:column;gap:8px;">
                      <div style="display:flex;gap:8px;align-items:center;" data-row>
                        ${(f.item_fields || []).map(sf => {
                          if (sf.type === 'select') {
                            return `<select name="${sf.name}" style="flex:1;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:8px 12px;color:white;font-size:13px;">
                              ${(sf.options || []).map(o => `<option value="${o}">${o}</option>`).join('')}
                            </select>`;
                          }
                          return `<input name="${sf.name}" placeholder="${sf.label}" style="flex:1;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:8px 12px;color:white;font-size:13px;" />`;
                        }).join('')}
                      </div>
                    </div>
                    <button type="button" onclick="window.__addDynamicRow('${f.name}')" style="margin-top:8px;background:transparent;border:1px dashed rgba(255,255,255,0.15);color:#818cf8;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">+ Adicionar</button>
                  </div>`;
              }
              return `
                <div style="margin-bottom:16px;">
                  <label style="display:block;font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:8px;text-transform:uppercase;">${UI.esc(f.label)}</label>
                  <input name="${f.name}" placeholder="${f.placeholder || ''}" ${f.required ? 'required' : ''} style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:10px 14px;color:white;font-size:13px;box-sizing:border-box;" />
                </div>`;
            }).join('');

            return `
              <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:24px;margin-bottom:24px;">
                <h4 style="font-size:14px;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
                  ${I('plus-circle','w-4 h-4')} ${UI.esc(section.title)}
                </h4>
                <form id="schema-form-${section.submit_action?.replace(/\\W/g,'-')}" onsubmit="window.__submitSchemaForm(event, '${slug}', '${section.submit_action}')">
                  ${formFields}
                  <div style="margin-top:8px;">
                    ${UI.btn(section.submit_label || 'Enviar', 'primary')}
                  </div>
                </form>
                <div id="schema-form-result-${section.submit_action?.replace(/\\W/g,'-')}" style="display:none;margin-top:16px;padding:12px;background:rgba(0,0,0,0.5);border-radius:8px;border:1px solid rgba(255,255,255,0.05);"></div>
              </div>`;

          case 'table_list':
            return `
              <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:24px;margin-bottom:24px;">
                <h4 style="font-size:14px;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
                  ${I('database','w-4 h-4')} ${UI.esc(section.title)}
                </h4>
                <div id="schema-table-list" style="color:#64748b;font-size:13px;">Carregando...</div>
              </div>`;

          case 'data_browser':
            return `
              <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:24px;margin-bottom:24px;">
                <h4 style="font-size:14px;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
                  ${I('table','w-4 h-4')} ${UI.esc(section.title)}
                </h4>
                <div style="margin-bottom:16px;">
                  <select id="data-browser-table" onchange="window.__loadTableData('${slug}', this.value)" style="background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:8px 12px;color:white;font-size:13px;min-width:200px;">
                    <option value="">Selecione uma tabela...</option>
                  </select>
                </div>
                <div id="data-browser-content" style="color:#64748b;font-size:13px;">Selecione uma tabela para visualizar os dados.</div>
              </div>`;

          case 'resource_list':
            return `
              <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:24px;margin-bottom:24px;">
                <h4 style="font-size:14px;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
                  ${I('shield','w-4 h-4')} ${UI.esc(section.title)}
                </h4>
                <div id="schema-resource-list" style="color:#64748b;font-size:13px;">Carregando...</div>
              </div>`;

          default:
            return '';
        }
      }).join('');
    };

    const tabsHtml = pages.map(p => `
      <button onclick="window.__switchAdminTab('${p.id}')" id="admin-tab-${p.id}"
        style="padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:0.2s;border:none;
        ${p.id === activePage ? 'background:#6366f1;color:white;' : 'background:transparent;color:#94a3b8;'}">
        ${UI.esc(p.title)}
      </button>
    `).join('');

    const content = `
      <div class="anim-fade">
        <div style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;color:#818cf8;font-size:13px;font-weight:600;margin-bottom:24px;" onclick="Router.navigate('/plugins/${slug}')">
          ${I('arrow-left', 'w-4 h-4')} Voltar para ${UI.esc(plugin.name)}
        </div>

        <div style="display:flex;align-items:center;gap:16px;margin-bottom:32px;">
          <div style="width:48px;height:48px;border-radius:12px;background:rgba(99,102,241,0.1);display:flex;align-items:center;justify-content:center;color:#818cf8;">${I('settings','w-6 h-6')}</div>
          <div>
            <h1 style="font-size:24px;font-weight:900;margin-bottom:4px;">${UI.esc(plugin.name)} — Painel de Controle</h1>
            <p style="color:#64748b;font-size:13px;">Gerencie recursos e dados internos do plugin.</p>
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:32px;background:rgba(0,0,0,0.2);padding:6px;border-radius:12px;border:1px solid rgba(255,255,255,0.05);">
          ${tabsHtml}
        </div>

        <div id="admin-page-content">
          ${renderPage(activePage)}
        </div>
      </div>
    `;

    app.innerHTML = dashboardLayout(plugin.name + ' — Admin', content, 'plugins');

    // === Global handlers ===
    window.__switchAdminTab = (pageId) => {
      activePage = pageId;
      document.getElementById('admin-page-content').innerHTML = renderPage(pageId);
      pages.forEach(p => {
        const btn = document.getElementById('admin-tab-' + p.id);
        if (btn) {
          btn.style.background = p.id === pageId ? '#6366f1' : 'transparent';
          btn.style.color = p.id === pageId ? 'white' : '#94a3b8';
        }
      });
      postRenderLoad();
    };

    window.__addDynamicRow = (fieldName) => {
      const container = document.getElementById('dynamic-' + fieldName);
      if (!container) return;
      const firstRow = container.querySelector('[data-row]');
      if (!firstRow) return;
      const newRow = firstRow.cloneNode(true);
      newRow.querySelectorAll('input, select').forEach(el => el.value = '');
      container.appendChild(newRow);
    };

    window.__submitSchemaForm = async (e, pluginSlug, actionStr) => {
      e.preventDefault();
      const form = e.target;
      const resultId = 'schema-form-result-' + actionStr.replace(/\W/g, '-');
      const resultEl = document.getElementById(resultId);

      const [method, path] = actionStr.split(' ');
      let payload = {};

      // Coletar campos simples
      form.querySelectorAll('input[name]').forEach(el => {
        const container = el.closest('[data-row]');
        if (!container) {
          payload[el.name] = el.value;
        }
      });

      // Coletar dynamic lists
      form.querySelectorAll('[id^="dynamic-"]').forEach(container => {
        const fieldName = container.id.replace('dynamic-', '');
        const rows = container.querySelectorAll('[data-row]');
        const items = [];
        rows.forEach(row => {
          const item = {};
          row.querySelectorAll('input, select').forEach(el => {
            if (el.value) item[el.name] = el.value;
          });
          if (Object.keys(item).length > 0) items.push(item);
        });
        if (items.length > 0) payload[fieldName] = items;
      });

      if (resultEl) {
        resultEl.style.display = 'block';
        resultEl.innerHTML = '<div style="color:#64748b;">Enviando...</div>';
      }

      try {
        const res = await API.request(method, `/playground/${pluginSlug}${path}`, method !== 'GET' ? payload : undefined);
        if (resultEl) {
          resultEl.innerHTML = `<pre style="margin:0;color:#22c55e;font-size:12px;white-space:pre-wrap;">${JSON.stringify(res, null, 2)}</pre>`;
        }
        toast('Operação realizada com sucesso!', 'success');
        // Recarregar listas quase instantaneamente
        setTimeout(postRenderLoad, 50);
      } catch (err) {
        if (resultEl) {
          resultEl.innerHTML = `<pre style="margin:0;color:#ef4444;font-size:12px;white-space:pre-wrap;">${err.message}</pre>`;
        }
        toast(err.message, 'error');
      }
    };

    window.__toggleInsertForm = () => {
      const form = document.getElementById('crud-insert-form');
      if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
    };

    window.__insertRow = async (e, pluginSlug, tableName) => {
      e.preventDefault();
      const payload = {};
      new FormData(e.target).forEach((val, key) => {
        if (val) payload[key] = isNaN(val) ? val : Number(val);
      });
      try {
        await API.request('POST', `/playground/${pluginSlug}/data/${tableName}`, payload);
        toast('Registro inserido com sucesso!', 'success');
        window.__loadTableData(pluginSlug, tableName);
      } catch (err) {
        toast(err.message, 'error');
      }
    };

    window.__deleteRow = async (pluginSlug, tableName, rowId) => {
      if (!confirm('Excluir este registro permanentemente?')) return;
      try {
        await API.request('DELETE', `/playground/${pluginSlug}/data/${tableName}/${rowId}`);
        toast('Registro excluído!', 'success');
        window.__loadTableData(pluginSlug, tableName);
      } catch (err) {
        toast(err.message, 'error');
      }
    };

    window.__editRow = (rowId) => {
      document.getElementById(`row-display-${rowId}`).style.display = 'none';
      document.getElementById(`row-edit-${rowId}`).style.display = 'table-row';
    };

    window.__cancelEdit = (rowId) => {
      document.getElementById(`row-display-${rowId}`).style.display = 'table-row';
      document.getElementById(`row-edit-${rowId}`).style.display = 'none';
    };

    window.__saveRow = async (pluginSlug, tableName, rowId) => {
      const editRow = document.getElementById(`row-edit-${rowId}`);
      const payload = {};
      editRow.querySelectorAll('input').forEach(input => {
        if (input.name) {
          payload[input.name] = isNaN(input.value) ? input.value : Number(input.value);
        }
      });
      try {
        await API.request('PUT', `/playground/${pluginSlug}/data/${tableName}/${rowId}`, payload);
        toast('Registro atualizado!', 'success');
        window.__loadTableData(pluginSlug, tableName);
      } catch (err) {
        toast(err.message, 'error');
      }
    };

    window.__loadTableData = async (pluginSlug, tableName) => {
      const contentEl = document.getElementById('data-browser-content');
      if (!tableName) {
        contentEl.innerHTML = '<div style="color:#64748b;">Selecione uma tabela.</div>';
        return;
      }
      contentEl.innerHTML = '<div style="color:#64748b;">Carregando dados...</div>';
      try {
        // Fetch schema first
        const tablesRes = await API.request('GET', `/playground/${pluginSlug}/tables`);
        const tablesData = tablesRes.data || tablesRes;
        const tableSchema = (tablesData.tables || []).find(t => t.name === tableName);
        const columns = tableSchema ? (tableSchema.columns || []) : [];
        const colsToRender = columns.length > 0 ? columns.map(c => c.name) : ['id'];

        const res = await API.request('GET', `/playground/${pluginSlug}/data/${tableName}`);
        const dataPayload = res.data || res;
        const rows = dataPayload.rows || [];
        
        let insertFormHtml = `
          <div style="margin-bottom:16px;">
            <button onclick="window.__toggleInsertForm()" style="background:rgba(34,197,94,0.1);color:#22c55e;border:1px solid rgba(34,197,94,0.3);padding:6px 16px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">+ Novo Registro</button>
            <div id="crud-insert-form" style="display:none;margin-top:12px;background:rgba(0,0,0,0.2);padding:16px;border-radius:8px;border:1px solid rgba(255,255,255,0.05);">
              <form onsubmit="window.__insertRow(event, '${pluginSlug}', '${tableName}')" style="display:flex;flex-wrap:wrap;gap:12px;align-items:end;">
                ${colsToRender.filter(c => c !== 'id' && c !== 'created_at').map(c => `
                  <div style="flex:1;min-width:150px;">
                    <label style="display:block;font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:4px;text-transform:uppercase;">${UI.esc(c)}</label>
                    <input name="${c}" required style="width:100%;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:8px;color:white;font-size:13px;box-sizing:border-box;" />
                  </div>
                `).join('')}
                <button type="submit" style="background:#6366f1;color:white;border:none;padding:8px 16px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;">Salvar</button>
              </form>
            </div>
          </div>
        `;

        if (rows.length === 0) {
          contentEl.innerHTML = insertFormHtml + `<div style="color:#64748b;text-align:center;padding:24px;background:rgba(0,0,0,0.2);border-radius:8px;border:1px solid rgba(255,255,255,0.03);">Tabela "${UI.esc(tableName)}" vazia.</div>`;
          return;
        }

        // Dynamically add columns found in rows if not in schema
        if (rows.length > 0) {
          Object.keys(rows[0]).forEach(k => { if (!colsToRender.includes(k)) colsToRender.push(k); });
        }

        contentEl.innerHTML = insertFormHtml + `
          <div class="anim-fade" style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead>
                <tr>
                  ${colsToRender.map(c => `<th style="text-align:left;padding:8px 12px;color:#94a3b8;border-bottom:1px solid rgba(255,255,255,0.1);font-weight:700;text-transform:uppercase;font-size:11px;">${UI.esc(c)}</th>`).join('')}
                  <th style="text-align:right;padding:8px 12px;color:#94a3b8;border-bottom:1px solid rgba(255,255,255,0.1);font-weight:700;text-transform:uppercase;font-size:11px;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map((row, i) => `
                  <tr id="row-display-${row.id}" class="anim-slide-up" style="animation-delay:${i * 0.05}s;">
                    ${colsToRender.map(c => `<td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.03);color:#e2e8f0;font-family:monospace;">${UI.esc(String(row[c] ?? ''))}</td>`).join('')}
                    <td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.03);text-align:right;white-space:nowrap;">
                      <button onclick="window.__editRow('${row.id}')" style="background:transparent;border:none;color:#3b82f6;cursor:pointer;font-size:12px;margin-right:8px;">Editar</button>
                      <button onclick="window.__deleteRow('${pluginSlug}', '${tableName}', '${row.id}')" style="background:transparent;border:none;color:#ef4444;cursor:pointer;font-size:12px;">Excluir</button>
                    </td>
                  </tr>
                  <tr id="row-edit-${row.id}" style="display:none;background:rgba(59,130,246,0.05);">
                    ${colsToRender.map(c => {
                      if (c === 'id' || c === 'created_at') return `<td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.03);color:#94a3b8;font-family:monospace;">${UI.esc(String(row[c] ?? ''))}</td>`;
                      return `<td style="padding:4px 12px;border-bottom:1px solid rgba(255,255,255,0.03);">
                        <input name="${c}" value="${UI.esc(String(row[c] ?? ''))}" style="width:100%;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.2);border-radius:4px;padding:6px;color:white;font-size:12px;box-sizing:border-box;" />
                      </td>`;
                    }).join('')}
                    <td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.03);text-align:right;white-space:nowrap;">
                      <button onclick="window.__saveRow('${pluginSlug}', '${tableName}', '${row.id}')" style="background:#22c55e;border:none;color:white;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:700;margin-right:4px;">Salvar</button>
                      <button onclick="window.__cancelEdit('${row.id}')" style="background:rgba(255,255,255,0.1);border:none;color:#e2e8f0;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;">Cancelar</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="anim-fade" style="margin-top:12px;color:#64748b;font-size:12px;animation-delay:0.3s;">Total: ${dataPayload.total || rows.length} registros</div>`;
      } catch (err) {
        contentEl.innerHTML = `<div style="color:#ef4444;">${err.message}</div>`;
      }
    };

    window.__dropTable = async (pluginSlug, tableName) => {
      if (!confirm(`Remover tabela "${tableName}" permanentemente?`)) return;
      try {
        await API.request('POST', `/playground/${pluginSlug}/tables/drop`, { name: tableName });
        toast(`Tabela "${tableName}" removida.`, 'success');
        postRenderLoad();
      } catch (err) {
        toast(err.message, 'error');
      }
    };

    window.__exploreTable = (slug, tableName) => {
      // 1. Mudar o contexto para a aba "data" para que a UI fique visível
      if (window.__switchAdminTab) {
        window.__switchAdminTab('data');
      }

      // 2. Aguardar a transição de display e preencher o form
      setTimeout(() => {
        const select = document.getElementById('data-browser-table');
        if (select) {
          select.value = tableName;
          window.__loadTableData(slug, tableName);
          select.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    };

    // Carregar dados dinamicamente após render
    const postRenderLoad = async () => {
      // Carregar lista de tabelas
      const tableListEl = document.getElementById('schema-table-list');
      if (tableListEl) {
        try {
          const res = await API.request('GET', `/playground/${slug}/tables`);
          const dataPayload = res.data || res;
          const tables = dataPayload.tables || [];
          if (tables.length === 0) {
            tableListEl.innerHTML = '<div style="color:#64748b;text-align:center;padding:24px;">Nenhuma tabela criada ainda.</div>';
          } else {
            tableListEl.innerHTML = tables.map((t, i) => `
              <div class="anim-slide-up" style="animation-delay:${i * 0.05}s; display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:rgba(0,0,0,0.2);border-radius:8px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.03);">
                <div style="display:flex;align-items:center;gap:12px;">
                  <div style="width:32px;height:32px;border-radius:8px;background:rgba(34,197,94,0.1);display:flex;align-items:center;justify-content:center;color:#22c55e;font-size:14px;">${I('database','w-4 h-4')}</div>
                  <div>
                    <div style="font-weight:700;font-size:14px;color:#e2e8f0;">${UI.esc(t.name)}</div>
                    <div style="font-size:12px;color:#64748b;">${t.row_count || 0} registros · ${(t.columns || []).length} colunas</div>
                  </div>
                </div>
                <div style="display:flex;gap:8px;">
                  <button onclick="window.__exploreTable('${slug}', '${t.name}')" style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);color:#3b82f6;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;transition:0.2s;" onmouseover="this.style.background='rgba(59,130,246,0.2)'" onmouseout="this.style.background='rgba(59,130,246,0.1)'">Explorar CRUD</button>
                  <button onclick="window.__dropTable('${slug}', '${t.name}')" style="background:transparent;border:1px solid rgba(239,68,68,0.3);color:#ef4444;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;transition:0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.background='transparent'">Remover</button>
                </div>
              </div>
            `).join('');
          }
        } catch (err) {
          tableListEl.innerHTML = `<div style="color:#ef4444;">${err.message}</div>`;
        }
      }

      // Preencher dropdown do data browser
      const tableSelect = document.getElementById('data-browser-table');
      if (tableSelect) {
        try {
          const res = await API.request('GET', `/playground/${slug}/tables`);
          const dataPayload = res.data || res;
          const tables = dataPayload.tables || [];
          tableSelect.innerHTML = '<option value="">Selecione uma tabela...</option>' + tables.map(t => `<option value="${t.name}">${t.name} (${t.row_count || 0} registros)</option>`).join('');
        } catch (err) {}
      }

      // Resource list
      window.__reloadResourceList = async (pluginSlug) => {
        const resourceListEl = document.getElementById('schema-resource-list');
        if (!resourceListEl) return;
        
        try {
          resourceListEl.innerHTML = '<div style="color:#64748b;">Carregando chaves e permissões...</div>';
          const [tablesRes, keysRes] = await Promise.all([
            API.request('GET', `/playground/${pluginSlug}/tables`),
            API.request('GET', `/account/keys`)
          ]);
          
          const tablesData = tablesRes.data || tablesRes;
          const tables = tablesData.tables || [];
          const keys = keysRes.data || keysRes || [];
          
          if (keys.length === 0) {
            resourceListEl.innerHTML = '<div style="color:#64748b;">Você não tem API Keys criadas. Crie uma primeiro no Dashboard Principal.</div>';
            return;
          }
          
          let html = '<div style="display:flex;flex-direction:column;gap:16px;">';
          
          keys.forEach(key => {
            const pluginPerms = (key.permissions || []).filter(p => p.plugin_slug === pluginSlug);
            
            html += `
              <div style="background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:16px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                  <div style="font-weight:700;font-size:14px;color:#e2e8f0;">${UI.esc(key.label)}</div>
                  <div style="font-size:11px;color:#64748b;font-family:monospace;">ID: ${key.id.split('-')[0]}...</div>
                </div>
                
                <div style="margin-bottom:12px;background:rgba(255,255,255,0.02);padding:12px;border-radius:6px;">
                  <div style="font-size:11px;text-transform:uppercase;color:#94a3b8;font-weight:700;margin-bottom:8px;">Permissões Ativas (${pluginSlug})</div>
                  ${pluginPerms.length === 0 ? '<div style="color:#64748b;font-size:12px;">Nenhuma permissão para este plugin.</div>' : ''}
                  <div style="display:flex;flex-wrap:wrap;gap:8px;">
                    ${pluginPerms.map(p => `
                      <div style="display:flex;align-items:center;gap:6px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);padding:4px 8px;border-radius:4px;font-size:12px;">
                        <span style="color:#a5b4fc;">${p.resource_id ? UI.esc(p.resource_id) : '* (Acesso Total)'}</span>
                        <span style="color:#cbd5e1;font-size:11px;background:rgba(0,0,0,0.3);padding:2px 4px;border-radius:3px;">${p.scope}</span>
                        <button onclick="window.__revokeResourceAccess('${key.id}', '${pluginSlug}', '${p.resource_id || ''}')" style="background:transparent;border:none;color:#ef4444;cursor:pointer;margin-left:4px;" title="Revogar">&times;</button>
                      </div>
                    `).join('')}
                  </div>
                </div>
                
                <div style="display:flex;gap:8px;align-items:center;">
                  <select id="res-sel-${key.id}" style="background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px;color:white;font-size:12px;flex:1;">
                    <option value="">* (Todas as tabelas)</option>
                    ${tables.map(t => `<option value="${t.name}">${t.name}</option>`).join('')}
                  </select>
                  <select id="scope-sel-${key.id}" style="background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px;color:white;font-size:12px;width:160px;">
                    <option value="read">Apenas Leitura (Read)</option>
                    <option value="write">Leitura + Escrita (Write)</option>
                    <option value="admin">Acesso Total (Admin)</option>
                  </select>
                  <button onclick="window.__grantResourceAccess('${key.id}', '${pluginSlug}')" style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);color:#22c55e;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">Conceder</button>
                </div>
              </div>
            `;
          });
          
          html += '</div>';
          resourceListEl.innerHTML = html;
        } catch (err) {
          resourceListEl.innerHTML = `<div style="color:#ef4444;">${err.message}</div>`;
        }
      };

      window.__grantResourceAccess = async (keyId, pluginSlug) => {
        try {
          const resSel = document.getElementById(`res-sel-${keyId}`);
          const scopeSel = document.getElementById(`scope-sel-${keyId}`);
          if (!resSel || !scopeSel) return;
          
          const resourceId = resSel.value || null;
          const scope = scopeSel.value;
          
          const keysRes = await API.request('GET', `/account/keys`);
          const keys = keysRes.data || keysRes;
          const key = keys.find(k => k.id === keyId);
          if (!key) throw new Error('Key não encontrada');
          
          let newPerms = key.permissions ? key.permissions.filter(p => !(p.plugin_slug === pluginSlug && (p.resource_id || null) === resourceId)) : [];
          
          newPerms.push({
            plugin_slug: pluginSlug,
            scope: scope,
            resource_id: resourceId
          });
          
          await API.request('PUT', `/account/keys/${keyId}`, {
            label: key.label,
            permissions: newPerms
          });
          toast('Acesso concedido com sucesso!', 'success');
          window.__reloadResourceList(pluginSlug);
        } catch (err) {
          toast(err.message, 'error');
        }
      };
      
      window.__revokeResourceAccess = async (keyId, pluginSlug, resourceIdRaw) => {
        try {
          const resourceId = resourceIdRaw === '' ? null : resourceIdRaw;
          const keysRes = await API.request('GET', `/account/keys`);
          const keys = keysRes.data || keysRes;
          const key = keys.find(k => k.id === keyId);
          if (!key) throw new Error('Key não encontrada');
          
          let newPerms = key.permissions ? key.permissions.filter(p => !(p.plugin_slug === pluginSlug && (p.resource_id || null) === resourceId)) : [];
          
          if (newPerms.length === 0) {
            alert('Aviso: Você está removendo a última permissão. O Backend não permite keys sem permissões. Adicione outra antes de remover a última.');
            return;
          }
          
          await API.request('PUT', `/account/keys/${keyId}`, {
            label: key.label,
            permissions: newPerms
          });
          toast('Acesso revogado!', 'success');
          window.__reloadResourceList(pluginSlug);
        } catch (err) {
          toast(err.message, 'error');
        }
      };

      window.__reloadResourceList(slug);
    };

    postRenderLoad();

  } catch (err) {
    app.innerHTML = dashboardLayout('Erro', `
      <div style="text-align:center;padding:80px 20px;">
        <div style="font-size:48px;margin-bottom:16px;">❌</div>
        <h2 style="font-size:20px;font-weight:800;margin-bottom:8px;">Erro ao carregar painel</h2>
        <p style="color:#ef4444;font-size:14px;">${err.message}</p>
        <button onclick="Router.navigate('/plugins')" style="background:#6366f1;color:white;border:none;padding:10px 24px;border-radius:8px;font-weight:700;cursor:pointer;margin-top:16px;">Voltar</button>
      </div>
    `, 'plugins');
  }
});
