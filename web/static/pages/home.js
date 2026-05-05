// Crom Cloud — Home Page (Landing)
Router.register('/', async (app) => {
  app.innerHTML = `
  <nav class="home-nav">
    <div class="logo"><span>☁ Crom Cloud</span></div>
    <div class="nav-links">
      <a onclick="Router.navigate('/docs')">Docs</a>
      <a onclick="Router.navigate('/plugins')">Plugins</a>
      ${API.isAuth()
        ? '<a class="btn btn-primary btn-sm" onclick="Router.navigate(\'/dashboard\')">Dashboard</a>'
        : '<a onclick="Router.navigate(\'/login\')">Login</a><a class="btn btn-primary btn-sm" onclick="Router.navigate(\'/register\')">Começar Grátis</a>'}
    </div>
  </nav>

  <section class="hero">
    <h1>Uma API para<br><span>todas as suas ferramentas</span></h1>
    <p>Gateway unificado para cloud, infraestrutura e desenvolvimento. Uma API key, um saldo de créditos, centenas de integrações.</p>
    <div class="hero-btns">
      <a class="btn btn-primary btn-lg" onclick="Router.navigate('/register')">🚀 Criar Conta Grátis</a>
      <a class="btn btn-secondary btn-lg" onclick="Router.navigate('/docs')">📚 Documentação</a>
    </div>
  </section>

  <section class="features">
    <h2>Por que Crom Cloud?</h2>
    <div class="features-grid">
      <div class="feature-card">
        <div class="icon">🔌</div>
        <h3>API Unificada</h3>
        <p>Acesse Cloudflare, AWS, GitHub e dezenas de serviços com uma única interface. Sem aprender 50 SDKs diferentes.</p>
      </div>
      <div class="feature-card">
        <div class="icon">🔑</div>
        <h3>Uma Key, Tudo</h3>
        <p>Crie API Keys com permissões granulares por plugin e scope. Controle total de quem acessa o quê.</p>
      </div>
      <div class="feature-card">
        <div class="icon">💳</div>
        <h3>Pay-per-use</h3>
        <p>Sistema de créditos unificado. Pague apenas pelo que usar, sem planos engessados. Estilo OpenRouter.</p>
      </div>
      <div class="feature-card">
        <div class="icon">🔒</div>
        <h3>Vault de Secrets</h3>
        <p>Armazene tokens e chaves de terceiros criptografados com AES-256-GCM. Injetados automaticamente nos plugins.</p>
      </div>
      <div class="feature-card">
        <div class="icon">🧩</div>
        <h3>Extensível</h3>
        <p>Arquitetura microkernel. Crie seus próprios plugins em Go, Python, Node.js. Comunicação via gRPC de alta performance.</p>
      </div>
      <div class="feature-card">
        <div class="icon">📊</div>
        <h3>Observabilidade</h3>
        <p>Cada chamada é logada com latência, créditos e request_id. Dashboard com métricas em tempo real.</p>
      </div>
    </div>
  </section>

  <section class="code-section">
    <h2 style="text-align:center;font-size:1.5rem;font-weight:700;margin-bottom:2rem">Simples como deve ser</h2>
    <div class="code-block">
      <span class="comment"># 1. Crie sua conta e pegue uma API Key</span><br><br>
      <span class="comment"># 2. Use qualquer plugin com um curl</span><br>
      <span class="keyword">curl</span> <span class="url">https://api.crom.cloud/v1/echo/ping</span> \\<br>
      &nbsp;&nbsp;-H <span class="string">"Authorization: Bearer crom_sk_live_..."</span><br><br>
      <span class="comment"># Response:</span><br>
      {<br>
      &nbsp;&nbsp;<span class="string">"success"</span>: <span class="keyword">true</span>,<br>
      &nbsp;&nbsp;<span class="string">"data"</span>: { <span class="string">"message"</span>: <span class="string">"pong"</span> },<br>
      &nbsp;&nbsp;<span class="string">"meta"</span>: { <span class="string">"plugin"</span>: <span class="string">"echo"</span>, <span class="string">"latency_ms"</span>: <span class="keyword">4</span> }<br>
      }
    </div>
  </section>

  <footer class="footer">
    <p>☁ Crom Cloud © 2026 — API Gateway SaaS</p>
    <p style="margin-top:0.5rem">Construído com Go, gRPC e ❤️</p>
  </footer>`;
});
