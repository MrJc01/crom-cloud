// Crom Cloud — API Client (Enhanced)
const API = {
  base: '/v1',
  token: localStorage.getItem('crom_token'),
  user: null,
  _cache: {},

  setToken(t) { this.token = t; localStorage.setItem('crom_token', t); },
  clearToken() { this.token = null; this.user = null; localStorage.removeItem('crom_token'); this._cache = {}; },
  isAuth() { return !!this.token; },

  async request(method, path, body, opts = {}) {
    const { retries = 2, cacheKey, cacheTTL = 0 } = opts;

    // Cache check
    if (cacheKey && this._cache[cacheKey] && Date.now() - this._cache[cacheKey].ts < cacheTTL) {
      return this._cache[cacheKey].data;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const fetchOpts = { method, headers };
    if (body) fetchOpts.body = JSON.stringify(body);

    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(this.base + path, fetchOpts);

        // 401 → auto redirect
        if (res.status === 401) {
          this.clearToken();
          Router.navigate('/login');
          throw new Error('Sessão expirada. Faça login novamente.');
        }

        const data = await res.json();
        if (!data.success && data.error) throw new Error(data.error.message || 'Erro desconhecido');

        // Cache store
        if (cacheKey && cacheTTL > 0) {
          this._cache[cacheKey] = { data, ts: Date.now() };
        }
        return data;
      } catch (err) {
        lastErr = err;
        if (attempt < retries && !err.message.includes('Sessão expirada')) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 500));
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  },

  // Auth
  register(email, name, password) { return this.request('POST', '/account/register', { email, name, password }); },
  login(email, password) { return this.request('POST', '/account/login', { email, password }); },
  me() { return this.request('GET', '/account/me', null, { cacheKey: 'me', cacheTTL: 60000 }); },

  // Keys
  createKey(label, permissions) { this._cache = {}; return this.request('POST', '/account/keys', { label, permissions }); },
  listKeys() { return this.request('GET', '/account/keys', null, { cacheKey: 'keys', cacheTTL: 30000 }); },
  revokeKey(id) { this._cache = {}; return this.request('DELETE', `/account/keys/${id}`); },

  // Billing
  getBalance() { return this.request('GET', '/account/balance', null, { cacheKey: 'balance', cacheTTL: 15000 }); },
  addCredits(amount, type = 'purchase', description = '') { this._cache = {}; return this.request('POST', '/account/credits', { amount, type, description }); },

  // Secrets
  setSecret(pluginSlug, secretName, value) { this._cache = {}; return this.request('POST', '/account/secrets', { plugin_slug: pluginSlug, secret_name: secretName, value }); },
  listSecrets() { return this.request('GET', '/account/secrets', null, { cacheKey: 'secrets', cacheTTL: 30000 }); },
  deleteSecret(pluginSlug, secretName) { this._cache = {}; return this.request('DELETE', `/account/secrets/${pluginSlug}/${secretName}`); },

  // System
  listPlugins() { return this.request('GET', '/system/plugins', null, { cacheKey: 'plugins', cacheTTL: 300000 }); },
  health() { return this.request('GET', '/system/health', null, { cacheKey: 'health', cacheTTL: 10000 }); },

  // Generic
  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
};
