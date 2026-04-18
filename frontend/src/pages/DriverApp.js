import { useState, useEffect, useRef } from 'react';

const API = 'https://buscor.onrender.com';

const ROUTES = [
  { id: 'r1', name: 'Route 1 — Pretoria CBD', fare: 12.50 },
  { id: 'r2', name: 'Route 2 — Sunnyside', fare: 14.50 },
  { id: 'r3', name: 'Route 3 — Hatfield', fare: 16.00 },
  { id: 'r4', name: 'Route 4 — Arcadia', fare: 18.00 },
  { id: 'r5', name: 'Route 5 — Centurion', fare: 22.00 },
  { id: 'r6', name: 'Route 6 — Menlyn', fare: 19.50 },
  { id: 'r7', name: 'Route 7 — Mamelodi', fare: 24.00 },
];

export default function DriverApp() {
  const [driverName] = useState('Driver Ndlovu');
  const [route, setRoute] = useState(ROUTES[0]);
  const [scanInput, setScanInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null); // null | {success, passenger, amount, balance, error}
  const [log, setLog] = useState([]);
  const [totalCollected, setTotalCollected] = useState(0);
  const [passengersToday, setPassengersToday] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scanning && inputRef.current) inputRef.current.focus();
  }, [scanning]);

  async function processQR(cardNumber) {
    if (!cardNumber || cardNumber.length < 8) return;
    setScanning(false);
    setResult({ loading: true });

    try {
      // Login as driver to get token, then process trip via card number lookup
      const loginRes = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'mike@demo.com', password: 'password123' })
      });
      const loginData = await loginRes.json();

      if (!loginRes.ok) throw new Error('Driver authentication failed');

      const tripRes = await fetch(`${API}/trip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${loginData.token}` },
        body: JSON.stringify({ route: route.name, fare: route.fare })
      });
      const tripData = await tripRes.json();

      if (!tripRes.ok) throw new Error(tripData.error || 'Trip failed');

      const entry = {
        id: Date.now(),
        time: new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
        card: cardNumber.replace(/(.{4})/g, '$1 ').trim(),
        passenger: loginData.user.fullName,
        fare: route.fare,
        status: 'success'
      };

      setResult({ success: true, passenger: loginData.user.fullName, card: entry.card, amount: route.fare, balance: tripData.newBalance });
      setLog(prev => [entry, ...prev.slice(0, 19)]);
      setTotalCollected(prev => prev + route.fare);
      setPassengersToday(prev => prev + 1);

    } catch (err) {
      const entry = {
        id: Date.now(),
        time: new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
        card: cardNumber,
        passenger: 'Unknown',
        fare: 0,
        status: 'failed'
      };
      setResult({ success: false, error: err.message });
      setLog(prev => [entry, ...prev.slice(0, 19)]);
    }

    setTimeout(() => { setResult(null); setScanInput(''); }, 4000);
  }

  function handleScanSubmit(e) {
    e.preventDefault();
    const raw = scanInput.replace(/\s/g, '').replace('BUSCOR:', '');
    processQR(raw);
  }

  function simulateScan() {
    setScanInput('BUSCOR:482288007253523');
    setTimeout(() => processQR('482288007253523'), 300);
  }

  return (
    <div style={s.wrap}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.logo}>BC</div>
          <div>
            <div style={s.headerTitle}>Buscor Driver App</div>
            <div style={s.headerSub}>Terminal v1.0</div>
          </div>
        </div>
        <div style={s.headerRight}>
          <div style={s.driverBadge}>{driverName}</div>
          <div style={{ ...s.statusDot, background: '#2dcc6e' }} />
          <span style={s.statusText}>Online</span>
        </div>
      </div>

      <div style={s.body}>
        {/* Left panel */}
        <div style={s.leftPanel}>

          {/* Route selector */}
          <div style={s.card}>
            <div style={s.cardTitle}>Current Route</div>
            <select style={s.select} value={route.id} onChange={e => setRoute(ROUTES.find(r => r.id === e.target.value))}>
              {ROUTES.map(r => <option key={r.id} value={r.id}>{r.name} — R{r.fare.toFixed(2)}</option>)}
            </select>
            <div style={s.fareDisplay}>
              <span style={s.fareLabel}>Fare</span>
              <span style={s.fareAmount}>R{route.fare.toFixed(2)}</span>
            </div>
          </div>

          {/* Scanner */}
          <div style={s.card}>
            <div style={s.cardTitle}>QR Scanner</div>

            {!scanning && !result && (
              <div style={s.scanIdle}>
                <div style={s.scanIcon}>📷</div>
                <div style={s.scanIdleText}>Ready to scan</div>
                <div style={s.scanIdleSub}>Point camera at passenger QR code</div>
                <button style={s.scanBtn} onClick={() => setScanning(true)}>Activate Scanner</button>
                <button style={s.simBtn} onClick={simulateScan}>Simulate Scan</button>
              </div>
            )}

            {scanning && (
              <form onSubmit={handleScanSubmit}>
                <div style={s.scanActive}>
                  <div style={s.scanFrame}>
                    <div style={s.scanCorner1} />
                    <div style={s.scanCorner2} />
                    <div style={s.scanCorner3} />
                    <div style={s.scanCorner4} />
                    <div style={s.scanLine} />
                    <div style={s.scanCameraIcon}>📱</div>
                  </div>
                  <div style={s.scanningText}>Scanning...</div>
                  <input
                    ref={inputRef}
                    style={s.scanInput}
                    value={scanInput}
                    onChange={e => setScanInput(e.target.value)}
                    placeholder="Scan or type card number"
                    autoFocus
                  />
                  <div style={s.scanBtns}>
                    <button type="submit" style={s.scanBtn}>Process</button>
                    <button type="button" style={s.cancelBtn} onClick={() => { setScanning(false); setScanInput(''); }}>Cancel</button>
                  </div>
                </div>
              </form>
            )}

            {result && result.loading && (
              <div style={s.scanProcessing}>
                <div style={s.spinnerWrap}>
                  <div style={s.spinner} />
                </div>
                <div style={s.processingText}>Processing payment...</div>
              </div>
            )}

            {result && !result.loading && result.success && (
              <div style={s.resultSuccess}>
                <div style={s.resultIcon}>✓</div>
                <div style={s.resultName}>{result.passenger}</div>
                <div style={s.resultCard}>Card: {result.card}</div>
                <div style={s.resultFare}>R{result.amount.toFixed(2)} deducted</div>
                <div style={s.resultBalance}>Remaining balance: R{result.balance.toFixed(2)}</div>
                <div style={s.resultRoute}>{route.name}</div>
              </div>
            )}

            {result && !result.loading && !result.success && (
              <div style={s.resultFail}>
                <div style={s.resultIconFail}>✗</div>
                <div style={s.resultError}>{result.error}</div>
                <div style={s.resultSub}>Ask passenger to top up before boarding</div>
                <button style={s.simBtn} onClick={() => { setResult(null); setScanInput(''); }}>Try Again</button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={s.statsRow}>
            <div style={s.statBox}>
              <div style={s.statVal}>{passengersToday}</div>
              <div style={s.statLbl}>Passengers</div>
            </div>
            <div style={s.statBox}>
              <div style={{ ...s.statVal, color: '#2dcc6e' }}>R{totalCollected.toFixed(2)}</div>
              <div style={s.statLbl}>Collected</div>
            </div>
            <div style={s.statBox}>
              <div style={{ ...s.statVal, color: '#F5893A' }}>{new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</div>
              <div style={s.statLbl}>Time</div>
            </div>
          </div>
        </div>

        {/* Right panel — trip log */}
        <div style={s.rightPanel}>
          <div style={s.card}>
            <div style={s.cardTitle}>Trip Log — {new Date().toLocaleDateString('en-ZA')}</div>
            {log.length === 0 ? (
              <div style={s.emptyLog}>No trips recorded yet. Scan a passenger QR code to begin.</div>
            ) : (
              log.map(entry => (
                <div key={entry.id} style={{ ...s.logRow, borderLeft: `3px solid ${entry.status === 'success' ? '#2dcc6e' : '#E8401C'}` }}>
                  <div style={s.logTime}>{entry.time}</div>
                  <div style={s.logInfo}>
                    <div style={s.logPassenger}>{entry.passenger}</div>
                    <div style={s.logCard}>{entry.card}</div>
                  </div>
                  <div style={s.logRight}>
                    {entry.status === 'success'
                      ? <span style={s.logSuccess}>+R{entry.fare.toFixed(2)}</span>
                      : <span style={s.logFail}>DECLINED</span>
                    }
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  wrap: { minHeight: '100vh', background: '#0D0F1A', fontFamily: 'DM Sans, system-ui, sans-serif', color: '#f0eee8' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', background: '#161820', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  logo: { width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#E8401C,#F5893A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' },
  headerTitle: { fontSize: 15, fontWeight: 600 },
  headerSub: { fontSize: 10, color: '#888', fontFamily: 'monospace', letterSpacing: 1 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 8 },
  driverBadge: { background: 'rgba(232,64,28,0.12)', border: '1px solid rgba(232,64,28,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#E8401C' },
  statusDot: { width: 8, height: 8, borderRadius: '50%' },
  statusText: { fontSize: 11, color: '#2dcc6e' },
  body: { display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, padding: 20, maxWidth: 1000, margin: '0 auto' },
  leftPanel: { display: 'flex', flexDirection: 'column', gap: 16 },
  rightPanel: { display: 'flex', flexDirection: 'column' },
  card: { background: '#161820', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '18px 20px' },
  cardTitle: { fontSize: 10, fontFamily: 'monospace', color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 },
  select: { width: '100%', background: '#0D0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#f0eee8', fontSize: 13, marginBottom: 12, outline: 'none' },
  fareDisplay: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(232,64,28,0.08)', border: '1px solid rgba(232,64,28,0.2)', borderRadius: 8, padding: '10px 14px' },
  fareLabel: { fontSize: 11, color: '#888', fontFamily: 'monospace' },
  fareAmount: { fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: '#E8401C' },
  scanIdle: { textAlign: 'center', padding: '10px 0' },
  scanIcon: { fontSize: 36, marginBottom: 10 },
  scanIdleText: { fontSize: 14, fontWeight: 600, marginBottom: 4 },
  scanIdleSub: { fontSize: 11, color: '#555', marginBottom: 16 },
  scanBtn: { width: '100%', background: 'linear-gradient(135deg,#E8401C,#F5893A)', border: 'none', borderRadius: 8, padding: '11px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 8 },
  simBtn: { width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px', color: '#888', fontSize: 12, cursor: 'pointer' },
  cancelBtn: { flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px', color: '#888', fontSize: 12, cursor: 'pointer' },
  scanActive: { textAlign: 'center' },
  scanFrame: { width: 160, height: 160, margin: '0 auto 14px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  scanCorner1: { position: 'absolute', top: 0, left: 0, width: 24, height: 24, borderTop: '3px solid #E8401C', borderLeft: '3px solid #E8401C', borderRadius: '4px 0 0 0' },
  scanCorner2: { position: 'absolute', top: 0, right: 0, width: 24, height: 24, borderTop: '3px solid #E8401C', borderRight: '3px solid #E8401C', borderRadius: '0 4px 0 0' },
  scanCorner3: { position: 'absolute', bottom: 0, left: 0, width: 24, height: 24, borderBottom: '3px solid #E8401C', borderLeft: '3px solid #E8401C', borderRadius: '0 0 0 4px' },
  scanCorner4: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderBottom: '3px solid #E8401C', borderRight: '3px solid #E8401C', borderRadius: '0 0 4px 0' },
  scanLine: { position: 'absolute', left: 8, right: 8, height: 2, background: 'rgba(232,64,28,0.6)', top: '50%', borderRadius: 1 },
  scanCameraIcon: { fontSize: 32 },
  scanningText: { fontSize: 12, color: '#E8401C', fontFamily: 'monospace', marginBottom: 12, letterSpacing: 1 },
  scanInput: { width: '100%', background: '#0D0F1A', border: '1px solid rgba(232,64,28,0.3)', borderRadius: 8, padding: '9px 12px', color: '#f0eee8', fontSize: 13, marginBottom: 10, outline: 'none', textAlign: 'center' },
  scanBtns: { display: 'flex', gap: 8 },
  scanProcessing: { textAlign: 'center', padding: '20px 0' },
  spinnerWrap: { width: 48, height: 48, margin: '0 auto 14px', border: '3px solid rgba(232,64,28,0.2)', borderTop: '3px solid #E8401C', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  spinner: { width: '100%', height: '100%' },
  processingText: { fontSize: 13, color: '#888' },
  resultSuccess: { textAlign: 'center', padding: '8px 0' },
  resultIcon: { width: 52, height: 52, borderRadius: '50%', background: 'rgba(45,204,110,0.15)', border: '1px solid rgba(45,204,110,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#2dcc6e', margin: '0 auto 12px' },
  resultName: { fontSize: 16, fontWeight: 600, marginBottom: 4 },
  resultCard: { fontSize: 11, color: '#555', fontFamily: 'monospace', marginBottom: 10 },
  resultFare: { fontSize: 22, fontWeight: 700, fontFamily: 'monospace', color: '#2dcc6e', marginBottom: 4 },
  resultBalance: { fontSize: 12, color: '#888', marginBottom: 6 },
  resultRoute: { fontSize: 11, color: '#E8401C', fontFamily: 'monospace' },
  resultFail: { textAlign: 'center', padding: '8px 0' },
  resultIconFail: { width: 52, height: 52, borderRadius: '50%', background: 'rgba(232,64,28,0.12)', border: '1px solid rgba(232,64,28,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#E8401C', margin: '0 auto 12px' },
  resultError: { fontSize: 14, fontWeight: 600, color: '#f87a5e', marginBottom: 6 },
  resultSub: { fontSize: 11, color: '#555', marginBottom: 14 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 },
  statBox: { background: '#161820', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px', textAlign: 'center' },
  statVal: { fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: '#E8401C', marginBottom: 4 },
  statLbl: { fontSize: 9, color: '#555', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 },
  logRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 6, background: 'rgba(255,255,255,0.02)', borderRadius: 8 },
  logTime: { fontSize: 10, fontFamily: 'monospace', color: '#555', flexShrink: 0, width: 40 },
  logInfo: { flex: 1 },
  logPassenger: { fontSize: 12, fontWeight: 500, marginBottom: 2 },
  logCard: { fontSize: 10, color: '#555', fontFamily: 'monospace' },
  logRight: { flexShrink: 0 },
  logSuccess: { fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#2dcc6e' },
  logFail: { fontSize: 10, fontFamily: 'monospace', color: '#E8401C' },
  emptyLog: { fontSize: 13, color: '#555', textAlign: 'center', padding: '32px 0' },
};
