import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (!form.fullName || !form.phone) { setError('All fields required'); setLoading(false); return; }
        await register(form);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoRing}>BC</div>
          <div>
            <div style={styles.logoTitle}>Buscor</div>
            <div style={styles.logoSub}>SMART CARD SYSTEM</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {['login', 'register'].map(m => (
            <button key={m} style={{ ...styles.tab, ...(mode === m ? styles.tabActive : {}) }} onClick={() => { setMode(m); setError(''); }}>
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={submit} style={styles.form}>
          {mode === 'register' && (
            <>
              <Input label="Full Name" value={form.fullName} onChange={set('fullName')} placeholder="Thembi Dlamini" />
              <Input label="Phone" value={form.phone} onChange={set('phone')} placeholder="082 555 0101" />
            </>
          )}
          <Input label="Email" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
          <Input label="Password" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" />

          {error && <div style={styles.error}>{error}</div>}

          <button style={{ ...styles.btn, ...(loading ? styles.btnDisabled : {}) }} disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {mode === 'login' && (
          <div style={styles.demoHint}>
            <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>Demo credentials: </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--orange)' }}>thembi@demo.com / password123</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={styles.label}>{label}</label>
      <input style={styles.input} required {...props} />
    </div>
  );
}

const styles = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'radial-gradient(ellipse at 50% 0%, rgba(232,64,28,0.12) 0%, transparent 60%), var(--bg)' },
  card: { width: '100%', maxWidth: 400, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, padding: '32px 28px' },
  logo: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 },
  logoRing: { width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #E8401C, #F5893A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#fff' },
  logoTitle: { fontSize: 18, fontWeight: 600 },
  logoSub: { fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: 2 },
  tabs: { display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 10, padding: 4, marginBottom: 24 },
  tab: { flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, background: 'transparent', color: 'var(--text-muted)', fontSize: 13, fontWeight: 500, transition: 'all .15s' },
  tabActive: { background: 'var(--bg2)', color: 'var(--text)', boxShadow: '0 1px 6px rgba(0,0,0,0.3)' },
  form: { display: 'flex', flexDirection: 'column' },
  label: { display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5, fontFamily: 'var(--font-mono)', letterSpacing: 0.5, textTransform: 'uppercase' },
  input: { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', color: 'var(--text)', fontSize: 14, outline: 'none' },
  error: { background: 'rgba(232,64,28,0.12)', border: '1px solid rgba(232,64,28,0.3)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#f87a5e', marginBottom: 12 },
  btn: { width: '100%', marginTop: 4, background: 'linear-gradient(135deg, #E8401C, #F5893A)', border: 'none', borderRadius: 10, padding: '12px', color: '#fff', fontSize: 14, fontWeight: 600, letterSpacing: 0.2 },
  btnDisabled: { opacity: 0.6 },
  demoHint: { marginTop: 16, textAlign: 'center', lineHeight: 1.8 }
};
