// Crom Cloud — API Client
const API = {
  base: '/v1',
  token: localStorage.getItem('crom_token'),
  user: null,

  setToken(t) { this.token = t; localStorage.setItem('crom_token', t); },
  clearToken() { this.token = null; this.user = null; localStorage.removeItem('crom_token'); },
  isAuth() { return !!this.token; },

  async request(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (this.token) opts.headers['Authorization'] = `Bearer ${this.token}`;
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(this.base + path, opts);
    const data = await res.json();
    if (!data.success && data.error) throw new Error(data.error.message || 'Erro desconhecido');
    return data;
  },

  // Auth
  register(email, name, password) { return this.request('POST', '/account/register', { email, name, password }); },
  login(email, password) { return this.request('POST', '/account/login', { email, password }); },
  me() { return this.request('GET', '/account/me'); },

  // Keys
  createKey(label, permissions) { return this.request('POST', '/account/keys', { label, permissions }); },
  listKeys() { return this.request('GET', '/account/keys'); },
  revokeKey(id) { return this.request('DELETE', `/account/keys/${id}`); },

  // Billing
  getBalance() { return this.request('GET', '/account/balance'); },
  addCredits(amount) { return this.request('POST', '/account/credits', { amount }); },

  // Secrets
  setSecret(plugin, key, value) { return this.request('POST', '/account/secrets', { plugin, key, value }); },
  listSecrets() { return this.request('GET', '/account/secrets'); },

  // System
  listPlugins() { return this.request('GET', '/system/plugins'); },
  health() { return this.request('GET', '/system/health'); },
};
