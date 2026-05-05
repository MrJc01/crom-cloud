// Crom Cloud — Command Palette (⌘K)

const CommandPalette = {
  isOpen: false,

  commands: [
    { icon: 'dashboard', label: 'Dashboard', desc: 'Visão geral', action: () => Router.navigate('/dashboard'), cat: 'Páginas' },
    { icon: 'key', label: 'API Keys', desc: 'Gerenciar keys', action: () => Router.navigate('/keys'), cat: 'Páginas' },
    { icon: 'credit-card', label: 'Créditos', desc: 'Billing e saldo', action: () => Router.navigate('/billing'), cat: 'Páginas' },
    { icon: 'lock', label: 'Secrets', desc: 'Vault de secrets', action: () => Router.navigate('/secrets'), cat: 'Páginas' },
    { icon: 'puzzle', label: 'Plugins', desc: 'Marketplace', action: () => Router.navigate('/plugins'), cat: 'Páginas' },
    { icon: 'book-open', label: 'Documentação', desc: 'API docs', action: () => Router.navigate('/docs'), cat: 'Páginas' },
    { icon: 'settings', label: 'Configurações', desc: 'Perfil e preferências', action: () => Router.navigate('/settings'), cat: 'Páginas' },
    { icon: 'activity', label: 'Atividade', desc: 'Log de ações', action: () => Router.navigate('/activity'), cat: 'Páginas' },
    { icon: 'plus', label: 'Nova API Key', desc: 'Criar nova key', action: () => Router.navigate('/keys'), cat: 'Ações' },
    { icon: 'lock', label: 'Novo Secret', desc: 'Adicionar secret', action: () => Router.navigate('/secrets'), cat: 'Ações' },
    { icon: 'log-out', label: 'Sair', desc: 'Fazer logout', action: () => { API.clearToken(); Router.navigate('/'); }, cat: 'Ações' },
  ],

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.selectedIndex = 0;
    const el = document.createElement('div');
    el.id = 'command-palette';
    el.className = 'fixed inset-0 z-[300] flex items-start justify-center pt-[15vh] bg-black/70 backdrop-blur-sm anim-fade';
    el.onclick = (e) => { if (e.target === el) this.close(); };
    el.innerHTML = `<div class="w-full max-w-xl bg-surface-card border border-surface-border rounded-2xl shadow-2xl overflow-hidden anim-scale">
      <div class="flex items-center gap-3 px-5 py-4 border-b border-surface-border">
        <span class="text-slate-500">${I('search','w-5 h-5')}</span>
        <input id="cmd-input" type="text" class="flex-1 bg-transparent text-base text-white placeholder:text-slate-500 focus:outline-none" placeholder="Buscar páginas, ações..." autofocus oninput="CommandPalette.filter(this.value)">
        <kbd class="px-2 py-0.5 rounded bg-surface-hover text-[10px] font-mono text-slate-500">ESC</kbd>
      </div>
      <div id="cmd-results" class="max-h-80 overflow-y-auto py-2">${this._renderResults(this.commands)}</div>
    </div>`;
    document.body.appendChild(el);
    setTimeout(() => document.getElementById('cmd-input')?.focus(), 50);
  },

  close() {
    this.isOpen = false;
    document.getElementById('command-palette')?.remove();
  },

  filter(query) {
    const q = query.toLowerCase();
    const filtered = q ? this.commands.filter(c => c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)) : this.commands;
    this.selectedIndex = 0;
    document.getElementById('cmd-results').innerHTML = this._renderResults(filtered);
  },

  _renderResults(cmds) {
    if (cmds.length === 0) return `<div class="px-5 py-8 text-center text-slate-500 text-sm">Nenhum resultado encontrado</div>`;
    let html = '';
    let lastCat = '';
    cmds.forEach((cmd, i) => {
      if (cmd.cat !== lastCat) {
        lastCat = cmd.cat;
        html += `<div class="px-5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">${cmd.cat}</div>`;
      }
      html += `<button class="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-white/5 transition-colors cursor-pointer text-sm ${i === this.selectedIndex ? 'bg-white/5' : ''}" onclick="CommandPalette.exec(${i})" onmouseenter="CommandPalette.selectedIndex=${i}">
        <span class="text-slate-500">${I(cmd.icon, 'w-4 h-4')}</span>
        <span class="font-medium text-slate-200">${cmd.label}</span>
        <span class="text-xs text-slate-500">${cmd.desc}</span>
      </button>`;
    });
    return html;
  },

  exec(index) {
    const cmds = document.getElementById('cmd-input')?.value
      ? this.commands.filter(c => { const q = document.getElementById('cmd-input').value.toLowerCase(); return c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q); })
      : this.commands;
    if (cmds[index]) { this.close(); cmds[index].action(); }
  },

  handleKey(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); this.isOpen ? this.close() : this.open(); }
    if (e.key === 'Escape' && this.isOpen) this.close();
  },
};

document.addEventListener('keydown', (e) => CommandPalette.handleKey(e));
