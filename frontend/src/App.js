import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import DriverApp from './pages/DriverApp';
import './index.css';

function AppInner() {
  const { user, loading } = useAuth();
  const isDriverApp = window.location.pathname === '/driver';

  if (isDriverApp) return <DriverApp />;

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#E8401C,#F5893A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#fff' }}>BC</div>
      <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 2 }}>LOADING…</p>
    </div>
  );

  return user ? <Dashboard /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
