export default function TransactionList({ transactions }) {
  if (!transactions.length) return (
    <div>
      <h1 style={styles.pageTitle}>Trip History</h1>
      <div style={styles.empty}>No transactions yet.</div>
    </div>
  );

  return (
    <div>
      <h1 style={styles.pageTitle}>Trip History</h1>
      <div style={styles.table}>
        <div style={styles.headerRow}>
          <span>Description</span>
          <span>Date</span>
          <span style={{ textAlign: 'right' }}>Amount</span>
          <span style={{ textAlign: 'right' }}>Status</span>
        </div>
        {transactions.map(tx => {
          const isCredit = tx.type === 'credit';
          return (
            <div key={tx.id} style={styles.row}>
              <div style={styles.descCell}>
                <div style={{ ...styles.txIcon, background: isCredit ? 'rgba(45,204,110,0.1)' : 'rgba(232,64,28,0.1)' }}>
                  {isCredit ? '↑' : '🚌'}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{tx.description}</span>
              </div>
              <span style={styles.dateCell}>{new Date(tx.createdAt).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              <span style={{ ...styles.amtCell, color: isCredit ? '#2dcc6e' : '#f0eee8' }}>
                {isCredit ? '+' : '–'}R{tx.amount.toFixed(2)}
              </span>
              <span style={styles.badgeCell}>
                <span style={styles.badge}>{tx.status}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  pageTitle: { fontSize: 22, fontWeight: 600, marginBottom: 24 },
  empty: { color: '#555', fontSize: 14, padding: 32, textAlign: 'center' },
  table: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' },
  headerRow: { display: 'grid', gridTemplateColumns: '2fr 1.4fr 1fr 0.8fr', padding: '12px 20px', borderBottom: '1px solid var(--border)', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.8 },
  row: { display: 'grid', gridTemplateColumns: '2fr 1.4fr 1fr 0.8fr', padding: '13px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' },
  descCell: { display: 'flex', alignItems: 'center', gap: 10 },
  txIcon: { width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 },
  dateCell: { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' },
  amtCell: { fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', textAlign: 'right' },
  badgeCell: { textAlign: 'right' },
  badge: { background: 'rgba(45,204,110,0.1)', border: '1px solid rgba(45,204,110,0.2)', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontFamily: 'var(--font-mono)', color: '#2dcc6e' }
};
