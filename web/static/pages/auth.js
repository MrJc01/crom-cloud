// Crom Cloud — Auth Pages (Login/Register)

Router.register('/login', async (app) => {
  app.innerHTML = `
  <div class="auth-page">
    <div class="auth-card">
      <h1>👋 Bem-vindo</h1>
      <p class="subtitle">Faça login na sua conta Crom Cloud</p>
      <form id="loginForm">
        <div class="form-group">
          <label>Email</label>
          <input type="email" class="form-input" id="loginEmail" placeholder="dev@exemplo.com" required>
        </div>
        <div class="form-group">
          <label>Senha</label>
          <input type="password" class="form-input" id="loginPassword" placeholder="••••••••" required>
        </div>
        <button type="submit" class="btn btn-primary btn-lg">Entrar</button>
      </form>
      <p class="auth-link">Não tem conta? <a onclick="Router.navigate('/register')">Criar conta</a></p>
    </div>
  </div>`;

  document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.login(
        document.getElementById('loginEmail').value,
        document.getElementById('loginPassword').value
      );
      API.setToken(res.data.token);
      API.user = res.data.developer;
      toast('Login realizado com sucesso!');
      Router.navigate('/dashboard');
    } catch (err) { toast(err.message, 'error'); }
  };
});

Router.register('/register', async (app) => {
  app.innerHTML = `
  <div class="auth-page">
    <div class="auth-card">
      <h1>🚀 Criar Conta</h1>
      <p class="subtitle">Comece a usar a Crom Cloud gratuitamente</p>
      <form id="registerForm">
        <div class="form-group">
          <label>Nome</label>
          <input type="text" class="form-input" id="regName" placeholder="Seu nome" required>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" class="form-input" id="regEmail" placeholder="dev@exemplo.com" required>
        </div>
        <div class="form-group">
          <label>Senha</label>
          <input type="password" class="form-input" id="regPassword" placeholder="Mínimo 6 caracteres" required minlength="6">
        </div>
        <button type="submit" class="btn btn-primary btn-lg">Criar Conta</button>
      </form>
      <p class="auth-link">Já tem conta? <a onclick="Router.navigate('/login')">Fazer login</a></p>
    </div>
  </div>`;

  document.getElementById('registerForm').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await API.register(
        document.getElementById('regEmail').value,
        document.getElementById('regName').value,
        document.getElementById('regPassword').value
      );
      toast('Conta criada! Faça login.');
      Router.navigate('/login');
    } catch (err) { toast(err.message, 'error'); }
  };
});
