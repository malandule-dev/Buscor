import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const PRESETS = [50, 100, 200, 300, 500];
const METHODS = [
  { id: 'SnapScan', label: 'SnapScan / QR Pay', badge: 'INSTANT' },
  { id: 'Ozow EFT', label: 'Ozow / EFT', badge: null },
  { id: 'Credit Card', label: 'Credit / Debit Card', badge: null }
];

export default function TopUpModal({ onClose }) {
  const { topup } = useAuth();
  const [amount, setAmount] = useState(100);
  const [custom, setCustom] = useState('');
  const [method, setMethod] = useState('SnapScan');
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  const finalAmount = custom ? parseFloat(custom) || 0 : amount;

  async function pay() {
    if (finalAmount < 10) { setStatus('error'); setMessage('Minimum top-up is R10'); return; }
    if (finalAmount > 5000) { setStatus('error'); setMessage('Maximum top-up is R5000'); return; }
    setStatus('loading');
    setMessage('');
    try {
      const d = await topup(finalAmount, method);
      setStatus('success');
      setMessage(`R${finalAmount.toFixed(2)} added! New balance: R${d.newBalance.toFixed(2)}`);
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Payment failed. Please try again.');
    }
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Top Up Card</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {status === 'success' ? (
          <div style={styles.successBox}>
            <div style={styles.successIcon}>✓</div>
            <div style={styles.successMsg}>{message}</div>
            <button style={styles.primaryBtn} onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            {/* Amount display */}
            <div style={styles.amountDisplay}>
              <span style={styles.amtCur}>R</span>
              <span style={styles.amtBig}>{custom || amount}</span>
            </div>

            {/* Presets */}
            <div style={styles.presets}>
              {PRESETS.map(p => (
                <button key={p} style={{ ...styles.preset, ...(amount === p && !custom ? styles.presetActive : {}) }}
                  onClick={() => { setAmount(p); setCustom(''); }}>
                  R{p}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <input
              style={styles.customInput}
              type="number"
              placeholder="Or enter custom amount (R10–R5000)"
              value={custom}
              onChange={e => { setCustom(e.target.value); }}
              min={10} max={5000}
            />

            {/* Payment methods */}
            <div style={{ marginBottom: 20 }}>
              <div style={styles.pmLabel}>Payment method</div>
              {METHODS.map(m => (
                <div key={m.id} style={{ ...styles.pmItem, ...(method === m.id ? styles.pmItemActive : {}) }}
                  onClick={() => setMethod(m.id)}>
                  <div style={{ ...styles.pmDot, ...(method === m.id ? styles.pmDotActive : {}) }} />
                  <span style={{ flex: 1, fontSize: 13 }}>{m.label}</span>
                  {m.badge && <span style={styles.pmBadge}>{m.badge}</span>}
                </div>
              ))}
            </div>

            {status === 'error' && (
              <div style={styles.errorBox}>{message}</div>
            )}

            <button style={{ ...styles.primaryBtn, ...(status === 'loading' ? styles.btnDisabled : {}) }}
              onClick={pay} disabled={status === 'loading'}>
              {status === 'loading' ? 'Processing payment…' : `Pay R${finalAmount > 0 ? finalAmount.toFixed(2) : '0.00'} Now`}
            </button>

            <p style={styles.simNote}>⚡ This is a simulated payment — no real money is charged</p>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  modal: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, padding: '28px 28px 24px', width: '100%', maxWidth: 420 },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: 600 },
  closeBtn: { border: 'none', background: 'var(--bg)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-muted)', fontSize: 14 },
  amountDisplay: { background: 'linear-gradient(160deg, #1e0c06, #280d08)', border: '1px solid rgba(232,64,28,0.2)', borderRadius: 14, padding: '20px', textAlign: 'center', marginBottom: 16, fontFamily: 'var(--font-mono)' },
  amtCur: { fontSize: 16, color: '#E8401C', verticalAlign: 'super' },
  amtBig: { fontSize: 40, fontWeight: 700, letterSpacing: -2 },
  presets: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 12 },
  preset: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 4px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', transition: 'all .15s', cursor: 'pointer' },
  presetActive: { background: 'rgba(232,64,28,0.12)', border: '1px solid rgba(232,64,28,0.4)', color: '#E8401C' },
  customInput: { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', color: 'var(--text)', fontSize: 13, marginBottom: 16, outline: 'none' },
  pmLabel: { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  pmItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, marginBottom: 6, cursor: 'pointer', border: '1px solid transparent', transition: 'all .12s' },
  pmItemActive: { background: 'rgba(232,64,28,0.08)', border: '1px solid rgba(232,64,28,0.25)' },
  pmDot: { width: 14, height: 14, borderRadius: '50%', border: '1.5px solid var(--text-dim)', flexShrink: 0, transition: 'all .12s' },
  pmDotActive: { borderColor: '#E8401C', background: '#E8401C' },
  pmBadge: { background: 'rgba(45,204,110,0.12)', border: '1px solid rgba(45,204,110,0.2)', borderRadius: 4, padding: '2px 6px', fontSize: 9, fontFamily: 'var(--font-mono)', color: '#2dcc6e' },
  errorBox: { background: 'rgba(232,64,28,0.1)', border: '1px solid rgba(232,64,28,0.25)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#f87a5e', marginBottom: 14 },
  primaryBtn: { width: '100%', background: 'linear-gradient(135deg, #E8401C, #F5893A)', border: 'none', borderRadius: 10, padding: '13px', color: '#fff', fontSize: 14, fontWeight: 600 },
  btnDisabled: { opacity: 0.6 },
  simNote: { textAlign: 'center', fontSize: 11, color: 'var(--text-dim)', marginTop: 12 },
  successBox: { textAlign: 'center', padding: '20px 0' },
  successIcon: { width: 60, height: 60, borderRadius: '50%', background: 'rgba(45,204,110,0.15)', border: '1px solid rgba(45,204,110,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#2dcc6e', margin: '0 auto 16px' },
  successMsg: { fontSize: 15, marginBottom: 24, color: 'var(--text-muted)', lineHeight: 1.6 }
};
