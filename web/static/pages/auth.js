// Crom Cloud — Auth Pages (Premium Glassmorphism)
Router.register('/login', async (app) => {
  if (API.isAuth()) return Router.navigate('/dashboard');
  app.innerHTML = `
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;position:relative;">
    <div style="position:absolute;inset:0;pointer-events:none;">
      <div style="position:absolute;top:30%;left:40%;width:500px;height:500px;background:radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%);border-radius:50%;filter:blur(80px);"></div>
    </div>
    <div style="width:100%;max-width:420px;position:relative;" class="anim-fade">
      <div style="background:linear-gradient(135deg,rgba(26,34,51,0.9) 0%,rgba(17,24,39,0.95) 100%);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:40px;box-shadow:0 25px 50px rgba(0,0,0,0.5);backdrop-filter:blur(20px);">
        <div style="text-align:center;margin-bottom:32px;">
          <div style="width:56px;height:56px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:14px;display:flex;align-items:center;justify-content:center;font-weight:900;color:white;font-size:22px;margin:0 auto 16px;">C</div>
          <h1 style="font-size:24px;font-weight:800;letter-spacing:-0.02em;">Bem-vindo de volta</h1>
          <p style="font-size:14px;color:#64748b;margin-top:6px;">Faça login na sua conta Crom Cloud</p>
        </div>
        <form id="loginForm">
          <div style="margin-bottom:16px;">
            <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600;color:#94a3b8;">Email</label>
            <input type="email" id="loginEmail" required placeholder="dev@exemplo.com" style="width:100%;padding:12px 16px;background:#0f1520;border:1px solid rgba(255,255,255,0.08);border-radius:10px;font-size:14px;color:#e2e8f0;outline:none;transition:all 0.2s;font-family:Inter,sans-serif;" onfocus="this.style.borderColor='#6366f1';this.style.boxShadow='0 0 0 3px rgba(99,102,241,0.15)'" onblur="this.style.borderColor='rgba(255,255,255,0.08)';this.style.boxShadow=''">
          </div>
          <div style="margin-bottom:24px;">
            <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600;color:#94a3b8;">Senha</label>
            <div style="position:relative;">
              <input type="password" id="loginPassword" required placeholder="••••••••" style="width:100%;padding:12px 16px;padding-right:44px;background:#0f1520;border:1px solid rgba(255,255,255,0.08);border-radius:10px;font-size:14px;color:#e2e8f0;outline:none;transition:all 0.2s;font-family:Inter,sans-serif;" onfocus="this.style.borderColor='#6366f1';this.style.boxShadow='0 0 0 3px rgba(99,102,241,0.15)'" onblur="this.style.borderColor='rgba(255,255,255,0.08)';this.style.boxShadow=''">
              <button type="button" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:#64748b;cursor:pointer;" onclick="const p=document.getElementById('loginPassword');p.type=p.type==='password'?'text':'password'">${I('eye','w-4 h-4')}</button>
            </div>
          </div>
          <button type="submit" id="loginBtn" style="width:100%;padding:14px;background:linear-gradient(135deg,#6366f1,#7c3aed);color:white;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;transition:all 0.3s;box-shadow:0 8px 25px rgba(99,102,241,0.35);display:flex;align-items:center;justify-content:center;gap:8px;font-family:Inter,sans-serif;" onmouseover="this.style.boxShadow='0 12px 35px rgba(99,102,241,0.5)'" onmouseout="this.style.boxShadow='0 8px 25px rgba(99,102,241,0.35)'">Entrar</button>
        </form>
        <p style="text-align:center;margin-top:24px;font-size:14px;color:#64748b;">Não tem conta? <a style="color:#818cf8;font-weight:600;cursor:pointer;" onclick="Router.navigate('/register')">Criar conta</a></p>
      </div>
    </div>
  </div>`;
  document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    btn.disabled = true; btn.innerHTML = `${I('loader','w-4 h-4 anim-spin')} Entrando...`;
    try {
      const res = await API.login(document.getElementById('loginEmail').value, document.getElementById('loginPassword').value);
      API.setToken(res.data.token); API.user = res.data.developer;
      toast('Login realizado com sucesso!'); Router.navigate('/dashboard');
    } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.innerHTML = 'Entrar'; }
  };
});

Router.register('/register', async (app) => {
  if (API.isAuth()) return Router.navigate('/dashboard');
  app.innerHTML = `
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;position:relative;">
    <div style="position:absolute;inset:0;pointer-events:none;">
      <div style="position:absolute;top:30%;left:40%;width:500px;height:500px;background:radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%);border-radius:50%;filter:blur(80px);"></div>
    </div>
    <div style="width:100%;max-width:420px;position:relative;" class="anim-fade">
      <div style="background:linear-gradient(135deg,rgba(26,34,51,0.9) 0%,rgba(17,24,39,0.95) 100%);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:40px;box-shadow:0 25px 50px rgba(0,0,0,0.5);backdrop-filter:blur(20px);">
        <div style="text-align:center;margin-bottom:32px;">
          <div style="width:56px;height:56px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:14px;display:flex;align-items:center;justify-content:center;font-weight:900;color:white;font-size:22px;margin:0 auto 16px;">C</div>
          <h1 style="font-size:24px;font-weight:800;letter-spacing:-0.02em;">Criar Conta</h1>
          <p style="font-size:14px;color:#64748b;margin-top:6px;">Comece a usar a Crom Cloud gratuitamente</p>
        </div>
        <form id="registerForm">
          <div style="margin-bottom:16px;">
            <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600;color:#94a3b8;">Nome</label>
            <input type="text" id="regName" required placeholder="Seu nome" style="width:100%;padding:12px 16px;background:#0f1520;border:1px solid rgba(255,255,255,0.08);border-radius:10px;font-size:14px;color:#e2e8f0;outline:none;transition:all 0.2s;font-family:Inter,sans-serif;" onfocus="this.style.borderColor='#6366f1';this.style.boxShadow='0 0 0 3px rgba(99,102,241,0.15)'" onblur="this.style.borderColor='rgba(255,255,255,0.08)';this.style.boxShadow=''">
          </div>
          <div style="margin-bottom:16px;">
            <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600;color:#94a3b8;">Email</label>
            <input type="email" id="regEmail" required placeholder="dev@exemplo.com" style="width:100%;padding:12px 16px;background:#0f1520;border:1px solid rgba(255,255,255,0.08);border-radius:10px;font-size:14px;color:#e2e8f0;outline:none;transition:all 0.2s;font-family:Inter,sans-serif;" onfocus="this.style.borderColor='#6366f1';this.style.boxShadow='0 0 0 3px rgba(99,102,241,0.15)'" onblur="this.style.borderColor='rgba(255,255,255,0.08)';this.style.boxShadow=''">
          </div>
          <div style="margin-bottom:24px;">
            <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600;color:#94a3b8;">Senha</label>
            <input type="password" id="regPassword" required minlength="6" placeholder="Mínimo 6 caracteres" style="width:100%;padding:12px 16px;background:#0f1520;border:1px solid rgba(255,255,255,0.08);border-radius:10px;font-size:14px;color:#e2e8f0;outline:none;transition:all 0.2s;font-family:Inter,sans-serif;" onfocus="this.style.borderColor='#6366f1';this.style.boxShadow='0 0 0 3px rgba(99,102,241,0.15)'" onblur="this.style.borderColor='rgba(255,255,255,0.08)';this.style.boxShadow=''">
          </div>
          <button type="submit" id="regBtn" style="width:100%;padding:14px;background:linear-gradient(135deg,#6366f1,#7c3aed);color:white;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;transition:all 0.3s;box-shadow:0 8px 25px rgba(99,102,241,0.35);display:flex;align-items:center;justify-content:center;gap:8px;font-family:Inter,sans-serif;">${I('rocket','w-4 h-4')} Criar Conta</button>
        </form>
        <p style="text-align:center;margin-top:24px;font-size:14px;color:#64748b;">Já tem conta? <a style="color:#818cf8;font-weight:600;cursor:pointer;" onclick="Router.navigate('/login')">Fazer login</a></p>
      </div>
    </div>
  </div>`;
  document.getElementById('registerForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('regBtn');
    btn.disabled = true; btn.innerHTML = `${I('loader','w-4 h-4 anim-spin')} Criando...`;
    try {
      await API.register(document.getElementById('regEmail').value, document.getElementById('regName').value, document.getElementById('regPassword').value);
      toast('Conta criada! Faça login.'); Router.navigate('/login');
    } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.innerHTML = `${I('rocket','w-4 h-4')} Criar Conta`; }
  };
});
