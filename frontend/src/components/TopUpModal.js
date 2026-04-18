import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const PRESETS = [50, 100, 200, 300, 500];

const METHODS = [
  {
    id: 'payfast',
    label: 'PayFast',
    badge: 'SA GATEWAY',
    color: '#0099cc',
    icon: '🏦',
    desc: "South Africa's leading payment gateway. Supports credit/debit cards, EFT, and SnapScan.",
    flow: ['Redirect to PayFast secure page', 'Enter card or banking details', 'OTP verification via SMS', 'Payment confirmed & balance updated'],
  },
  {
    id: 'ozow',
    label: 'Ozow EFT',
    badge: 'INSTANT EFT',
    color: '#6B4FBB',
    icon: '⚡',
    desc: 'Instant EFT directly from your bank. No card needed — works with all major SA banks.',
    flow: ['Select your bank', 'Log in to your banking app', 'Approve the payment', 'Instant balance update'],
  },
  {
    id: 'peach',
    label: 'Peach Payments',
    badge: 'CARD',
    color: '#FF6B35',
    icon: '💳',
    desc: 'Enterprise-grade card payments. Visa, Mastercard, and Amex accepted.',
    flow: ['Enter card number & expiry', 'CVV verification', '3D Secure authentication', 'Balance updated immediately'],
  },
  {
    id: 'ussd',
    label: 'USSD *120*BUSCOR#',
    badge: 'NO DATA NEEDED',
    color: '#2dcc6e',
    icon: '📱',
    desc: 'Top up without internet! Dial *120*2872267# from any phone on any network.',
    flow: ['Dial *120*2872267# on your phone', 'Select option 1 — Top Up', 'Enter card number & amount', 'Confirm with your PIN'],
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    badge: 'POPULAR',
    color: '#25D366',
    icon: '💬',
    desc: 'Top up via WhatsApp chat. Send "TOP UP" to +27 60 000 0000 to get started.',
    flow: ['Send "TOP UP" to Buscor WhatsApp', 'Reply with your card number', 'Enter amount', 'Approve payment via your bank'],
  },
];

export default function TopUpModal({ onClose }) {
  const { topup } = useAuth();
  const [amount, setAmount] = useState(100);
  const [custom, setCustom] = useState('');
  const [method, setMethod] = useState('payfast');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState('select');
  const [gatewayStep, setGatewayStep] = useState(0);

  const finalAmount = custom ? parseFloat(custom) || 0 : amount;
  const selectedMethod = METHODS.find(m => m.id === method);

  async function initiatePayment() {
    if (finalAmount < 10) { setStatus('error'); setMessage('Minimum top-up is R10'); return; }
    if (finalAmount > 5000) { setStatus('error'); setMessage('Maximum top-up is R5000'); return; }

    setStep('gateway');
    setGatewayStep(0);

    for (let i = 1; i <= selectedMethod.flow.length; i++) {
      await new Promise(r => setTimeout(r, 900));
      setGatewayStep(i);
    }

    try {
      const d = await topup(finalAmount, selectedMethod.label);
      setStatus('success');
      setMessage('R' + finalAmount.toFixed(2) + ' added! New balance: R' + d.newBalance.toFixed(2));
      setStep('success');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Payment failed. Please try again.');
      setStep('select');
    }
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Top Up Card</h2>
          <button style={styles.closeBtn} onClick={onClose}>x</button>
        </div>

        {step === 'success' && (
          <div style={styles.successBox}>
            <div style={styles.successIcon}>✓</div>
            <div style={styles.successMsg}>{message}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 20 }}>Paid via {selectedMethod.label}</div>
            <button style={styles.primaryBtn} onClick={onClose}>Done</button>
          </div>
        )}

        {step === 'gateway' && (
          <div style={{ padding: '8px 0' }}>
            <div style={{ ...styles.gatewayHeader, borderColor: selectedMethod.color }}>
              <span style={{ fontSize: 20 }}>{selectedMethod.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: selectedMethod.color }}>{selectedMethod.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Processing R{finalAmount.toFixed(2)}</div>
              </div>
              <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 13, color: selectedMethod.color }}>R{finalAmount.toFixed(2)}</div>
            </div>
            <div style={{ margin: '20px 0' }}>
              {selectedMethod.flow.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: gatewayStep > i ? selectedMethod.color : 'var(--bg)',
                    border: '1px solid ' + (gatewayStep >= i ? selectedMethod.color : 'var(--border)'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: '#fff', fontWeight: 700, transition: 'all .3s'
                  }}>
                    {gatewayStep > i ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: 12, color: gatewayStep > i ? 'var(--text)' : 'var(--text-muted)' }}>{f}</span>
                  {gatewayStep === i && <span style={{ marginLeft: 'auto', fontSize: 10, color: selectedMethod.color }}>Processing...</span>}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
              🔒 256-bit SSL encrypted · PCI DSS compliant
            </div>
          </div>
        )}

        {step === 'select' && (
          <>
            <div style={styles.amountDisplay}>
              <span style={styles.amtCur}>R</span>
              <span style={styles.amtBig}>{custom || amount}</span>
            </div>
            <div style={styles.presets}>
              {PRESETS.map(p => (
                <button key={p} style={{ ...styles.preset, ...(amount === p && !custom ? styles.presetActive : {}) }}
                  onClick={() => { setAmount(p); setCustom(''); }}>R{p}</button>
              ))}
            </div>
            <input style={styles.customInput} type="number" placeholder="Or enter custom amount (R10-R5000)"
              value={custom} onChange={e => setCustom(e.target.value)} min={10} max={5000} />
            <div style={{ marginBottom: 16 }}>
              <div style={styles.pmLabel}>Payment method</div>
              {METHODS.map(m => (
                <div key={m.id}
                  style={{ ...styles.pmItem, ...(method === m.id ? { background: 'rgba(232,64,28,0.05)', border: '1px solid ' + m.color + '55' } : {}) }}
                  onClick={() => { setMethod(m.id); setStatus('idle'); setMessage(''); }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{m.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: method === m.id ? m.color : 'var(--text)' }}>{m.label}</div>
                    {method === m.id && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{m.desc}</div>}
                  </div>
                  {m.badge && <span style={{ background: m.color + '22', color: m.color, border: '1px solid ' + m.color + '44', borderRadius: 4, padding: '2px 6px', fontSize: 9, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{m.badge}</span>}
                </div>
              ))}
            </div>
            {status === 'error' && <div style={styles.errorBox}>{message}</div>}
            <button style={styles.primaryBtn} onClick={initiatePayment}>
              Pay R{finalAmount > 0 ? finalAmount.toFixed(2) : '0.00'} via {selectedMethod.label}
            </button>
            <p style={styles.simNote}>Payment gateway simulation — no real money charged</p>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 },
  modal: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, padding: '28px 28px 24px', width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 600 },
  closeBtn: { border: 'none', background: 'var(--bg)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer' },
  amountDisplay: { background: 'linear-gradient(160deg,#1e0c06,#280d08)', border: '1px solid rgba(232,64,28,0.2)', borderRadius: 14, padding: '16px', textAlign: 'center', marginBottom: 12, fontFamily: 'var(--font-mono)' },
  amtCur: { fontSize: 16, color: '#E8401C', verticalAlign: 'super' },
  amtBig: { fontSize: 36, fontWeight: 700, letterSpacing: -2 },
  presets: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginBottom: 10 },
  preset: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 4px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' },
  presetActive: { background: 'rgba(232,64,28,0.12)', border: '1px solid rgba(232,64,28,0.4)', color: '#E8401C' },
  customInput: { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', color: 'var(--text)', fontSize: 13, marginBottom: 14, outline: 'none' },
  pmLabel: { fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  pmItem: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, marginBottom: 6, cursor: 'pointer', border: '1px solid transparent', transition: 'all .12s' },
  errorBox: { background: 'rgba(232,64,28,0.1)', border: '1px solid rgba(232,64,28,0.25)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#f87a5e', marginBottom: 14 },
  primaryBtn: { width: '100%', background: 'linear-gradient(135deg,#E8401C,#F5893A)', border: 'none', borderRadius: 10, padding: '13px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  simNote: { textAlign: 'center', fontSize: 11, color: 'var(--text-dim)', marginTop: 10 },
  successBox: { textAlign: 'center', padding: '20px 0' },
  successIcon: { width: 60, height: 60, borderRadius: '50%', background: 'rgba(45,204,110,0.15)', border: '1px solid rgba(45,204,110,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#2dcc6e', margin: '0 auto 16px' },
  successMsg: { fontSize: 15, marginBottom: 8, color: 'var(--text-muted)', lineHeight: 1.6 },
  gatewayHeader: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--bg)', borderRadius: 12, border: '1px solid', marginBottom: 8 },
};
