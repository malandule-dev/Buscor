import { createContext, useContext, useState, useEffect } from 'react';

const API = 'https://buscor.onrender.com';
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = () => localStorage.getItem('buscor_token');

  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token()}`
  });

  async function fetchMe() {
    try {
      const r = await fetch(`${API}/me`, { headers: headers() });
      if (r.ok) {
        const d = await r.json();
        setUser(d.user);
        setCard(d.card);
      } else {
        localStorage.removeItem('buscor_token');
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { if (token()) fetchMe(); else setLoading(false); }, []);

  async function login(email, password) {
    const r = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    localStorage.setItem('buscor_token', d.token);
    setUser(d.user);
    await fetchMe();
  }

  async function register(data) {
    const r = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    localStorage.setItem('buscor_token', d.token);
    setUser(d.user);
    await fetchMe();
  }

  function logout() {
    localStorage.removeItem('buscor_token');
    setUser(null);
    setCard(null);
  }

  async function apiFetch(path, opts = {}) {
    const r = await fetch(`${API}${path}`, { ...opts, headers: { ...headers(), ...(opts.headers || {}) } });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    return d;
  }

  async function topup(amount, method) {
    const d = await apiFetch('/topup', {
      method: 'POST',
      body: JSON.stringify({ amount, method })
    });
    setCard(c => ({ ...c, balance: d.newBalance }));
    return d;
  }

  return (
    <AuthCtx.Provider value={{ user, card, loading, login, register, logout, topup, apiFetch, refreshCard: fetchMe }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
