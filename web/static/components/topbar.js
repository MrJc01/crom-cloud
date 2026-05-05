// Crom Cloud — Topbar (Inline styles)
const Topbar = {
  render(title, breadcrumbs = []) {
    const user = API.user || { name: 'User', email: '' };
    const bc = breadcrumbs.length > 0 ? `<nav style="display:flex;align-items:center;gap:6px;font-size:13px;color:#64748b;margin-bottom:2px;">${breadcrumbs.map((item, i) => {
      const isLast = i === breadcrumbs.length - 1;
      return isLast
        ? `<span style="color:#e2e8f0;font-weight:500;">${item.label}</span>`
        : `<a style="cursor:pointer;transition:color 0.2s;" onmouseover="this.style.color='#818cf8'" onmouseout="this.style.color='#64748b'" onclick="${item.action || ''}">${item.label}</a><span style="color:#334155;">${I('chevron-right','w-3.5 h-3.5')}</span>`;
    }).join('')}</nav>` : '';

    return `<header style="height:64px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:rgba(17,24,39,0.8);backdrop-filter:blur(20px);position:sticky;top:0;z-index:40;">
      <div>
        ${bc}
        <h1 style="font-size:18px;font-weight:700;letter-spacing:-0.01em;">${title}</h1>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <button style="display:flex;align-items:center;gap:8px;padding:7px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#64748b;font-size:12px;cursor:pointer;transition:all 0.2s;font-family:Inter,sans-serif;" onmouseover="this.style.borderColor='rgba(255,255,255,0.15)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'" onclick="CommandPalette.open()">
          ${I('search','w-3.5 h-3.5')} Buscar...
          <kbd style="padding:2px 6px;background:rgba(255,255,255,0.05);border-radius:4px;font-size:10px;font-family:'JetBrains Mono',monospace;color:#475569;margin-left:8px;">⌘K</kbd>
        </button>
        <span style="font-size:12px;color:#64748b;">${UI.esc(user.email)}</span>
      </div>
    </header>`;
  },
};

function dashboardLayout(title, content, activeNav = '', breadcrumbs = []) {
  const ml = Sidebar.collapsed ? 64 : 256;
  return `
  ${Sidebar.render(activeNav)}
  <div id="main-content" style="margin-left:${ml}px;display:flex;flex-direction:column;min-height:100vh;transition:margin-left 0.3s;">
    ${Topbar.render(title, breadcrumbs)}
    <div style="flex:1;padding:24px;" class="anim-fade">${content}</div>
  </div>`;
}
