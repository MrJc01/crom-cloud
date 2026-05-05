// Crom Cloud — UI Component Library (Inline Styles - Zero Tailwind dependency)

const UI = {
  esc(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; },

  toast(msg, type = 'success') {
    let c = document.querySelector('#toast-container');
    if (!c) { c = document.createElement('div'); c.id = 'toast-container'; c.style.cssText = 'position:fixed;top:16px;right:16px;z-index:1000;display:flex;flex-direction:column;gap:8px;'; document.body.appendChild(c); }
    const colors = { success:'#22c55e', error:'#ef4444', warning:'#f59e0b', info:'#3b82f6' };
    const col = colors[type] || colors.info;
    const t = document.createElement('div');
    t.style.cssText = `display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;border-left:3px solid ${col};background:#1a2233;border:1px solid rgba(255,255,255,0.06);min-width:320px;box-shadow:0 15px 40px rgba(0,0,0,0.4);animation:slideInRight 0.3s ease-out;font-size:13px;color:#e2e8f0;`;
    t.innerHTML = `<span style="color:${col};flex-shrink:0;">${I('check-circle','w-5 h-5')}</span><span style="flex:1;">${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(50px)'; t.style.transition = 'all 0.3s'; setTimeout(() => t.remove(), 300); }, 4000);
  },

  badge(text, variant = 'default') {
    const v = { active:'#22c55e', inactive:'#ef4444', warning:'#f59e0b', info:'#3b82f6', default:'#818cf8', new:'#a78bfa' };
    const col = v[variant] || v.default;
    return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:100px;font-size:11px;font-weight:600;background:${col}15;color:${col};">${text}</span>`;
  },

  btn(label, variant = 'primary', attrs = '') {
    const styles = {
      primary: 'background:linear-gradient(135deg,#6366f1,#7c3aed);color:white;border:none;box-shadow:0 4px 15px rgba(99,102,241,0.3);',
      secondary: 'background:rgba(255,255,255,0.03);color:#e2e8f0;border:1px solid rgba(255,255,255,0.08);',
      danger: 'background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.2);',
      ghost: 'background:none;color:#94a3b8;border:none;',
    };
    const s = styles[variant] || styles.primary;
    return `<button style="display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:9px 18px;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;transition:all 0.2s;font-family:Inter,sans-serif;${s}" ${attrs}>${label}</button>`;
  },

  btnSm(label, variant = 'primary', attrs = '') {
    return this.btn(label, variant, attrs).replace('padding:9px 18px', 'padding:6px 12px').replace('font-size:13px', 'font-size:12px');
  },

  btnLg(label, variant = 'primary', attrs = '') {
    return this.btn(label, variant, attrs).replace('padding:9px 18px', 'padding:14px 28px').replace('font-size:13px', 'font-size:15px');
  },

  stat(label, value, opts = {}) {
    const { icon: ic, color = '#f1f5f9', change, changeUp } = opts;
    return `<div style="background:linear-gradient(135deg,rgba(26,34,51,0.8),rgba(17,24,39,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:20px;transition:all 0.3s;" onmouseover="this.style.borderColor='rgba(255,255,255,0.12)';this.style.boxShadow='0 8px 30px rgba(0,0,0,0.3)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.06)';this.style.boxShadow=''">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">${label}</span>
        ${ic ? `<span style="color:#475569;">${I(ic,'w-4 h-4')}</span>` : ''}
      </div>
      <div style="font-size:28px;font-weight:800;letter-spacing:-0.02em;color:${color};" class="anim-count">${value}</div>
      ${change ? `<div style="font-size:12px;margin-top:4px;color:${changeUp ? '#22c55e' : '#64748b'};">${change}</div>` : ''}
    </div>`;
  },

  card(title, content, opts = {}) {
    const { actions = '', icon: ic, noPad } = opts;
    return `<div style="background:linear-gradient(135deg,rgba(26,34,51,0.8),rgba(17,24,39,0.9));border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;" class="anim-fade">
      ${title ? `<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <h3 style="font-weight:700;font-size:14px;display:flex;align-items:center;gap:8px;">${ic ? `<span style="color:#818cf8;">${I(ic,'w-4 h-4')}</span>` : ''}${title}</h3>
        <div style="display:flex;align-items:center;gap:8px;">${actions}</div>
      </div>` : ''}
      <div ${noPad ? '' : 'style="padding:20px;"'}>${content}</div>
    </div>`;
  },

  table(headers, rows, opts = {}) {
    const { id, searchable, emptyIcon, emptyTitle, emptyDesc } = opts;
    const search = searchable ? `<div style="padding:12px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="position:relative;"><span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#64748b;">${I('search','w-4 h-4')}</span>
      <input type="text" style="width:100%;padding:10px 16px 10px 40px;background:#0f1520;border:1px solid rgba(255,255,255,0.06);border-radius:8px;font-size:13px;color:#e2e8f0;outline:none;transition:border-color 0.2s;font-family:Inter,sans-serif;" placeholder="Buscar..." onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='rgba(255,255,255,0.06)'" onkeyup="UI._filterTable(this,'${id}')"></div>
    </div>` : '';
    const empty = rows.length === 0 ? `<tr><td colspan="${headers.length}">
      <div style="text-align:center;padding:48px 20px;color:#64748b;">
        <div style="margin-bottom:12px;opacity:0.5;">${I(emptyIcon || 'search', 'w-10 h-10')}</div>
        <div style="font-weight:600;color:#94a3b8;margin-bottom:4px;">${emptyTitle || 'Nenhum item'}</div>
        <div style="font-size:13px;">${emptyDesc || 'Nenhum dado encontrado'}</div>
      </div>
    </td></tr>` : '';
    return `${search}<table style="width:100%;border-collapse:collapse;" ${id ? `id="${id}"` : ''}>
      <thead><tr>${headers.map(h => `<th style="text-align:left;padding:10px 20px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;background:rgba(0,0,0,0.2);border-bottom:1px solid rgba(255,255,255,0.06);">${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.join('') || empty}</tbody>
    </table>`;
  },

  _filterTable(input, tableId) {
    const filter = input.value.toLowerCase();
    const rows = document.getElementById(tableId)?.querySelectorAll('tbody tr') || [];
    rows.forEach(r => { r.style.display = r.textContent.toLowerCase().includes(filter) ? '' : 'none'; });
  },

  modal(title, content, opts = {}) {
    const { id = 'modal', width = '500px' } = opts;
    return `<div id="${id}" style="position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);" class="anim-fade" onclick="if(event.target===this)this.remove()">
      <div style="max-width:${width};width:100%;background:linear-gradient(135deg,#1a2233,#111827);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:28px;box-shadow:0 25px 50px rgba(0,0,0,0.5);" class="anim-scale">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <h2 style="font-size:18px;font-weight:700;display:flex;align-items:center;gap:8px;">${title}</h2>
          <button style="padding:4px;border-radius:8px;background:none;border:none;color:#64748b;cursor:pointer;transition:color 0.2s;" onmouseover="this.style.color='#f1f5f9'" onmouseout="this.style.color='#64748b'" onclick="this.closest('[id]').remove()">${I('x','w-5 h-5')}</button>
        </div>
        ${content}
      </div>
    </div>`;
  },

  confirm(title, message) {
    const modal = document.createElement('div');
    modal.id = 'confirm-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);';
    modal.innerHTML = `<div style="max-width:420px;width:100%;background:linear-gradient(135deg,#1a2233,#111827);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:28px;box-shadow:0 25px 50px rgba(0,0,0,0.5);" class="anim-scale">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="padding:8px;border-radius:50%;background:rgba(239,68,68,0.1);color:#ef4444;">${I('alert-triangle','w-5 h-5')}</div>
        <h2 style="font-size:18px;font-weight:700;">${title}</h2>
      </div>
      <p style="font-size:14px;color:#94a3b8;margin-bottom:24px;">${message}</p>
      <div style="display:flex;gap:12px;justify-content:flex-end;">
        <button style="padding:9px 18px;border-radius:8px;font-size:13px;font-weight:600;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:#94a3b8;cursor:pointer;font-family:Inter,sans-serif;" onclick="document.getElementById('confirm-modal').remove()">Cancelar</button>
        <button id="confirm-action-btn" style="padding:9px 18px;border-radius:8px;font-size:13px;font-weight:600;background:#ef4444;border:none;color:white;cursor:pointer;font-family:Inter,sans-serif;">Confirmar</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    return modal;
  },

  skeleton(type = 'line', count = 1) {
    const base = 'background:linear-gradient(90deg,#1f2b3d 25%,#253044 50%,#1f2b3d 75%);background-size:200% 100%;animation:shimmer 1.5s ease-in-out infinite;';
    const skels = {
      line: `<div style="height:16px;border-radius:4px;${base}"></div>`,
      card: `<div style="height:128px;border-radius:12px;${base}"></div>`,
      stat: `<div style="background:#1a2233;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:20px;"><div style="height:12px;width:80px;border-radius:4px;${base}margin-bottom:12px;"></div><div style="height:32px;width:96px;border-radius:4px;${base}"></div></div>`,
      row: `<tr><td colspan="10" style="padding:16px 20px;"><div style="height:16px;border-radius:4px;${base}"></div></td></tr>`,
    };
    return Array(count).fill(skels[type] || skels.line).join('');
  },

  breadcrumb(items) {
    return `<nav style="display:flex;align-items:center;gap:6px;font-size:13px;color:#64748b;">
      ${items.map((item, i) => {
        const isLast = i === items.length - 1;
        const sep = !isLast ? `<span style="color:#334155;">${I('chevron-right','w-3.5 h-3.5')}</span>` : '';
        return isLast
          ? `<span style="color:#e2e8f0;font-weight:500;">${item.label}</span>`
          : `<a style="cursor:pointer;transition:color 0.2s;" onmouseover="this.style.color='#818cf8'" onmouseout="this.style.color='#64748b'" onclick="${item.action || ''}">${item.label}</a>${sep}`;
      }).join('')}
    </nav>`;
  },

  empty(ic, title, desc, action = '') {
    return `<div style="text-align:center;padding:64px 20px;" class="anim-fade">
      <div style="margin-bottom:16px;color:#475569;">${I(ic, 'w-12 h-12')}</div>
      <h3 style="font-weight:600;font-size:18px;color:#e2e8f0;margin-bottom:4px;">${title}</h3>
      <p style="font-size:14px;color:#64748b;margin-bottom:20px;max-width:400px;margin-left:auto;margin-right:auto;">${desc}</p>
      ${action}
    </div>`;
  },

  keyDisplay(value) {
    return `<div style="display:flex;align-items:center;gap:12px;background:#0f1520;border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px 16px;font-family:'JetBrains Mono',monospace;font-size:13px;">
      <span style="flex:1;color:#94a3b8;word-break:break-all;">${value}</span>
      <button style="flex-shrink:0;padding:6px 14px;background:linear-gradient(135deg,#6366f1,#7c3aed);color:white;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;display:flex;align-items:center;gap:4px;" onclick="navigator.clipboard.writeText('${value}');this.innerHTML='Copiado!';setTimeout(()=>this.innerHTML='${I('copy','w-3.5 h-3.5')} Copiar',2000)">${I('copy','w-3.5 h-3.5')} Copiar</button>
    </div>`;
  },

  input(id, label, opts = {}) {
    const { type = 'text', placeholder = '', required, value = '', min } = opts;
    return `<div style="margin-bottom:16px;">
      <label for="${id}" style="display:block;margin-bottom:6px;font-size:13px;font-weight:600;color:#94a3b8;">${label}</label>
      <input type="${type}" id="${id}" style="width:100%;padding:10px 16px;background:#0f1520;border:1px solid rgba(255,255,255,0.06);border-radius:8px;font-size:14px;color:#e2e8f0;outline:none;transition:all 0.2s;font-family:Inter,sans-serif;" placeholder="${placeholder}" ${required ? 'required' : ''} ${value ? `value="${value}"` : ''} ${min ? `min="${min}"` : ''} onfocus="this.style.borderColor='#6366f1';this.style.boxShadow='0 0 0 3px rgba(99,102,241,0.15)'" onblur="this.style.borderColor='rgba(255,255,255,0.06)';this.style.boxShadow=''">
    </div>`;
  },

  select(id, label, options) {
    return `<div style="margin-bottom:16px;">
      <label for="${id}" style="display:block;margin-bottom:6px;font-size:13px;font-weight:600;color:#94a3b8;">${label}</label>
      <select id="${id}" style="width:100%;padding:10px 16px;background:#0f1520;border:1px solid rgba(255,255,255,0.06);border-radius:8px;font-size:14px;color:#e2e8f0;outline:none;cursor:pointer;font-family:Inter,sans-serif;" onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='rgba(255,255,255,0.06)'">
        ${options.map(o => `<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}</option>`).join('')}
      </select>
    </div>`;
  },

  code(content) {
    const codeId = 'code-' + Math.random().toString(36).slice(2, 8);
    return `<div style="position:relative;">
      <div style="background:#0f1520;border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;">
        <div style="display:flex;align-items:center;padding:8px 14px;gap:6px;background:rgba(0,0,0,0.3);border-bottom:1px solid rgba(255,255,255,0.04);">
          <div style="width:8px;height:8px;border-radius:50%;background:#ef4444;"></div>
          <div style="width:8px;height:8px;border-radius:50%;background:#f59e0b;"></div>
          <div style="width:8px;height:8px;border-radius:50%;background:#22c55e;"></div>
        </div>
        <pre id="${codeId}" style="padding:16px 20px;font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.7;overflow-x:auto;color:#94a3b8;margin:0;">${content}</pre>
      </div>
      <button style="position:absolute;top:36px;right:8px;padding:6px 10px;border-radius:6px;background:rgba(255,255,255,0.05);border:none;color:#64748b;cursor:pointer;font-size:11px;font-family:Inter,sans-serif;transition:all 0.2s;" onmouseover="this.style.color='#f1f5f9'" onmouseout="this.style.color='#64748b'" onclick="navigator.clipboard.writeText(document.getElementById('${codeId}').textContent);UI.toast('Copiado!','success')">${I('copy','w-4 h-4')}</button>
    </div>`;
  },

  tag(text) {
    return `<span style="display:inline-block;padding:2px 8px;font-size:11px;font-weight:600;background:rgba(99,102,241,0.12);color:#818cf8;border-radius:4px;margin-right:4px;">${text}</span>`;
  },

  relTime(dateStr) {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Agora';
    if (mins < 60) return `${mins}m atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d atrás`;
    return new Date(dateStr).toLocaleDateString('pt-BR');
  },
};

function toast(msg, type) { UI.toast(msg, type); }
