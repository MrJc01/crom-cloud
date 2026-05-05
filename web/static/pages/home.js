// Crom Cloud — Home Page (Premium Landing)
Router.register('/', async (app) => {
  app.innerHTML = `
  <!-- Nav -->
  <nav class="fixed top-0 left-0 right-0 z-50 px-6 h-16 bg-black/90 backdrop-blur-xl border-b border-white/10" style="display:flex;align-items:center;justify-content:space-between;">
    <div class="text-lg font-extrabold tracking-tight" style="display:flex;align-items:center;gap:8px;">
      <div style="width:32px;height:32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;color:white;font-size:14px;">C</div>
      <span style="background:linear-gradient(90deg,#818cf8,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Crom Cloud</span>
    </div>
    <div style="display:flex;align-items:center;gap:20px;">
      <a class="text-sm text-slate-400 hover:text-white cursor-pointer" style="transition:color 0.2s" onclick="Router.navigate('/docs')">Docs</a>
      <a class="text-sm text-slate-400 hover:text-white cursor-pointer" style="transition:color 0.2s" onclick="Router.navigate('/plugins')">Plugins</a>
      ${API.isAuth()
        ? `<button onclick="Router.navigate('/dashboard')" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:linear-gradient(135deg,#6366f1,#7c3aed);color:white;border-radius:8px;font-size:13px;font-weight:600;border:none;cursor:pointer;box-shadow:0 4px 15px rgba(99,102,241,0.4);transition:all 0.2s">${I('dashboard','w-4 h-4')} Dashboard</button>`
        : `<a class="text-sm text-slate-400 hover:text-white cursor-pointer" style="transition:color 0.2s" onclick="Router.navigate('/login')">Login</a>
           <button onclick="Router.navigate('/register')" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:linear-gradient(135deg,#6366f1,#7c3aed);color:white;border-radius:8px;font-size:13px;font-weight:600;border:none;cursor:pointer;box-shadow:0 4px 15px rgba(99,102,241,0.4);transition:all 0.2s">${I('rocket','w-4 h-4')} Começar Grátis</button>`}
    </div>
  </nav>

  <!-- Hero -->
  <section style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 24px;position:relative;overflow:hidden;">
    <!-- Animated background orbs -->
    <div style="position:absolute;inset:0;pointer-events:none;">
      <div style="position:absolute;top:20%;left:20%;width:400px;height:400px;background:radial-gradient(circle,rgba(99,102,241,0.15) 0%,transparent 70%);border-radius:50%;filter:blur(60px);" class="anim-float"></div>
      <div style="position:absolute;bottom:30%;right:15%;width:350px;height:350px;background:radial-gradient(circle,rgba(139,92,246,0.12) 0%,transparent 70%);border-radius:50%;filter:blur(60px);" class="anim-float" style="animation-delay:3s"></div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:600px;background:radial-gradient(circle,rgba(99,102,241,0.08) 0%,transparent 50%);border-radius:50%;"></div>
    </div>
    <div style="position:relative;" class="anim-fade">
      <div style="display:inline-flex;align-items:center;gap:8px;padding:6px 16px;border-radius:100px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25);color:#818cf8;font-size:12px;font-weight:600;margin-bottom:32px;" class="anim-glow">
        ${I('zap','w-3.5 h-3.5')} Novo: Arquitetura Microkernel com gRPC
      </div>
      <h1 style="font-size:clamp(40px,7vw,72px);font-weight:900;line-height:1.05;letter-spacing:-0.03em;margin-bottom:24px;">
        Uma API para<br>
        <span style="background:linear-gradient(135deg,#818cf8 0%,#a78bfa 40%,#c084fc 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">todas as suas ferramentas</span>
      </h1>
      <p style="font-size:18px;color:#94a3b8;max-width:520px;margin:0 auto 40px;line-height:1.7;">
        Gateway unificado para cloud, infraestrutura e desenvolvimento. Uma API key, um saldo de créditos, centenas de integrações.
      </p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        <button onclick="Router.navigate('/register')" style="display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:linear-gradient(135deg,#6366f1,#7c3aed);color:white;border-radius:12px;font-size:15px;font-weight:700;border:none;cursor:pointer;box-shadow:0 8px 30px rgba(99,102,241,0.4);transition:all 0.3s;letter-spacing:-0.01em;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 12px 40px rgba(99,102,241,0.5)'" onmouseout="this.style.transform='';this.style.boxShadow='0 8px 30px rgba(99,102,241,0.4)'">${I('rocket','w-5 h-5')} Criar Conta Grátis</button>
        <button onclick="Router.navigate('/docs')" style="display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:rgba(255,255,255,0.05);color:#e2e8f0;border-radius:12px;font-size:15px;font-weight:600;border:1px solid rgba(255,255,255,0.1);cursor:pointer;transition:all 0.3s;backdrop-filter:blur(10px);" onmouseover="this.style.background='rgba(255,255,255,0.1)';this.style.borderColor='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.05)';this.style.borderColor='rgba(255,255,255,0.1)'">${I('book-open','w-5 h-5')} Documentação</button>
      </div>
    </div>
  </section>

  <!-- Features -->
  <section style="padding:80px 24px;max-width:1100px;margin:0 auto;">
    <h2 style="text-align:center;font-size:32px;font-weight:800;letter-spacing:-0.02em;margin-bottom:12px;">Por que Crom Cloud?</h2>
    <p style="text-align:center;color:#64748b;margin-bottom:48px;max-width:500px;margin-left:auto;margin-right:auto;">Tudo que você precisa para gerenciar suas APIs e serviços em um único lugar.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;">
      ${[
        { ic:'globe', t:'API Unificada', d:'Acesse Cloudflare, AWS, GitHub e dezenas de serviços com uma única interface.', color:'#6366f1' },
        { ic:'key', t:'Uma Key, Tudo', d:'API Keys com permissões granulares por plugin e scope. Controle total.', color:'#8b5cf6' },
        { ic:'credit-card', t:'Pay-per-use', d:'Créditos unificados. Pague só pelo que usar, sem planos engessados.', color:'#22c55e' },
        { ic:'shield', t:'Vault de Secrets', d:'Tokens criptografados com AES-256-GCM. Injetados automaticamente.', color:'#f59e0b' },
        { ic:'cpu', t:'Extensível', d:'Crie plugins em Go, Python, Node.js. Comunicação via gRPC.', color:'#3b82f6' },
        { ic:'bar-chart', t:'Observabilidade', d:'Métricas em tempo real: latência, créditos e request_id por chamada.', color:'#ec4899' },
      ].map((f, i) => `
        <div style="background:linear-gradient(135deg,rgba(255,255,255,0.03) 0%,rgba(255,255,255,0.01) 100%);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;cursor:default;transition:all 0.3s;backdrop-filter:blur(10px);animation:fadeIn 0.5s ease-out both;animation-delay:${i*0.08}s;" onmouseover="this.style.borderColor='${f.color}40';this.style.transform='translateY(-4px)';this.style.boxShadow='0 20px 40px rgba(0,0,0,0.3), 0 0 30px ${f.color}15'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)';this.style.transform='';this.style.boxShadow=''">
          <div style="width:44px;height:44px;border-radius:12px;background:${f.color}15;display:flex;align-items:center;justify-content:center;color:${f.color};margin-bottom:16px;">${I(f.ic, 'w-5 h-5')}</div>
          <h3 style="font-weight:700;font-size:16px;margin-bottom:8px;">${f.t}</h3>
          <p style="font-size:14px;color:#94a3b8;line-height:1.6;">${f.d}</p>
        </div>`).join('')}
    </div>
  </section>

  <!-- Code Preview -->
  <section style="padding:60px 24px 80px;max-width:700px;margin:0 auto;">
    <h2 style="text-align:center;font-size:24px;font-weight:700;margin-bottom:32px;">Simples como deve ser</h2>
    <div style="background:linear-gradient(135deg,#0f1629 0%,#111827 100%);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;position:relative;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
      <div style="position:absolute;top:0;left:0;right:0;height:40px;background:rgba(0,0,0,0.3);display:flex;align-items:center;padding:0 16px;gap:6px;">
        <div style="width:10px;height:10px;border-radius:50%;background:#ef4444;"></div>
        <div style="width:10px;height:10px;border-radius:50%;background:#f59e0b;"></div>
        <div style="width:10px;height:10px;border-radius:50%;background:#22c55e;"></div>
        <span style="margin-left:auto;font-size:11px;color:#64748b;font-family:'JetBrains Mono',monospace;">terminal</span>
      </div>
      <pre style="margin-top:32px;font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.8;overflow-x:auto;"><span style="color:#64748b"># 1. Crie sua conta e pegue uma API Key</span>

<span style="color:#64748b"># 2. Use qualquer plugin com um curl</span>
<span style="color:#c084fc">curl</span> <span style="color:#818cf8">https://api.crom.cloud/v1/echo/ping</span> \\
  -H <span style="color:#67e8f9">"Authorization: Bearer crom_sk_live_..."</span>

<span style="color:#64748b"># Response:</span>
{
  <span style="color:#67e8f9">"success"</span>: <span style="color:#c084fc">true</span>,
  <span style="color:#67e8f9">"data"</span>: { <span style="color:#67e8f9">"message"</span>: <span style="color:#67e8f9">"pong"</span> },
  <span style="color:#67e8f9">"meta"</span>: { <span style="color:#67e8f9">"plugin"</span>: <span style="color:#67e8f9">"echo"</span>, <span style="color:#67e8f9">"latency_ms"</span>: <span style="color:#c084fc">4</span> }
}</pre>
    </div>
  </section>

  <!-- Footer -->
  <footer style="padding:40px 24px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
    <p style="color:#64748b;font-size:13px;">${I('cloud','w-4 h-4 inline')} Crom Cloud © 2026 — API Gateway SaaS</p>
    <p style="color:#475569;font-size:11px;margin-top:6px;">Construído com Go, gRPC e ${I('heart','w-3 h-3 inline')} </p>
  </footer>`;
});
