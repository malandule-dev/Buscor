import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import TopUpModal from '../components/TopUpModal';
import TransactionList from '../components/TransactionList';

export default function Dashboard() {
  const { user, card, logout, apiFetch, refreshCard } = useAuth();
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [card2, setCard] = useState(null);

  useEffect(() => { if (card) setCard(card); }, [card]);

  useEffect(() => {
    loadData();
  }, [card?.balance]);

  async function loadData() {
    try {
      const [s, txs, subs] = await Promise.all([
        apiFetch('/stats'),
        apiFetch('/transactions'),
        apiFetch('/subscriptions')
      ]);
      setStats(s);
      setTransactions(txs);
      setSubscription(subs[0] || null);
    } catch {}
  }

  async function freezeCard() {
    const card = card2;
    const action = card && !card.isActive ? 'unfreeze' : 'freeze';
    try {
      const d = await apiFetch('/freeze-card', { method: 'POST', body: JSON.stringify({ action }) });
      setCard(c => ({ ...c, isActive: d.isActive }));
    } catch (err) {
      alert(err.message);
    }
  }

  async function takeTrip(route) {
    const d = await apiFetch('/trip', {
      method: 'POST',
      body: JSON.stringify({ route: route.name, fare: route.fare })
    });
    setCard(c => ({ ...c, balance: d.newBalance }));
    await loadData();
  }

  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <div style={styles.wrap}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sideLogoWrap}>
          <div style={styles.sideLogoRing}>BC</div>
          <span style={styles.sideLogoText}>Buscor</span>
        </div>

        <nav style={styles.nav}>
          {navItems.map(item => (
            <button key={item.id} style={{ ...styles.navBtn, ...(activeTab === item.id ? styles.navBtnActive : {}) }} onClick={() => setActiveTab(item.id)}>
              <span style={styles.navIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={styles.sideUser}>
          <div style={styles.avatar}>{initials}</div>
          <div style={styles.sideUserInfo}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{user?.fullName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
          <button style={styles.logoutBtn} onClick={logout} title="Sign out">↩</button>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        {activeTab === 'home' && <HomeTab card={card2 || card} stats={stats} transactions={transactions} onTopUp={() => setShowTopUp(true)} onTrip={takeTrip} onFreeze={freezeCard} />}
        {activeTab === 'history' && <TransactionList transactions={transactions} />}
        {activeTab === 'subscription' && <SubscriptionTab sub={subscription} card={card} apiFetch={apiFetch} onRefresh={loadData} />}
        {activeTab === 'notifications' && <NotificationsTab card={card2 || card} subscription={subscription} apiFetch={apiFetch} />}
        {activeTab === 'family' && <FamilyTab card={card2 || card} apiFetch={apiFetch} />}
        {activeTab === 'profile' && <ProfileTab user={user} card={card} apiFetch={apiFetch} />}
      </main>

      {showTopUp && <TopUpModal onClose={() => { setShowTopUp(false); loadData(); }} />}
    </div>
  );
}

// ─── Home Tab ────────────────────────────────────────────────────────────────

function HomeTab({ card, stats, transactions, onTopUp, onTrip, onFreeze }) {
  const recent = transactions.slice(0, 5);
  const [tripLoading, setTripLoading] = useState(false);
  const [tripMsg, setTripMsg] = useState({ text: '', type: '' });

  const ROUTES = [
    { name: 'Route 1 — Pretoria CBD', fare: 12.50 },
    { name: 'Route 2 — Sunnyside', fare: 14.50 },
    { name: 'Route 3 — Hatfield', fare: 16.00 },
    { name: 'Route 4 — Arcadia', fare: 18.00 },
    { name: 'Route 5 — Centurion', fare: 22.00 },
    { name: 'Route 6 — Menlyn', fare: 19.50 },
    { name: 'Route 7 — Mamelodi', fare: 24.00 },
  ];

  async function takeTrip() {
    if (!card || card.balance <= 0) {
      setTripMsg({ text: 'Insufficient balance. Please top up first.', type: 'error' });
      return;
    }
    setTripLoading(true);
    setTripMsg({ text: '', type: '' });
    const route = ROUTES[Math.floor(Math.random() * ROUTES.length)];
    if (card.balance < route.fare) {
      setTripMsg({ text: `Insufficient balance for ${route.name} (R${route.fare.toFixed(2)})`, type: 'error' });
      setTripLoading(false);
      return;
    }
    try {
      await onTrip(route);
      setTripMsg({ text: `Trip taken! ${route.name} — R${route.fare.toFixed(2)} deducted.`, type: 'success' });
    } catch (err) {
      setTripMsg({ text: err.message, type: 'error' });
    }
    setTripLoading(false);
    setTimeout(() => setTripMsg({ text: '', type: '' }), 4000);
  }

  return (
    <div>
      <h1 style={styles.pageTitle}>Dashboard</h1>

      {/* Balance card */}
      <div style={{ ...styles.balanceCard, ...(card && !card.isActive ? styles.balanceCardFrozen : {}) }}>
        <div style={styles.balCardBg} />
        <div style={{ position: 'relative' }}>
          {card && !card.isActive && (
            <div style={styles.frozenBanner}>❄ CARD FROZEN — Tap to unfreeze</div>
          )}
          <div style={styles.balLabel}>Available Balance</div>
          <div style={{ ...styles.balAmount, ...(card && !card.isActive ? { color: '#888', filter: 'blur(4px)' } : {}) }}>
            <span style={styles.balCurrency}>R</span>
            {card ? card.balance.toFixed(2) : '—'}
          </div>
          <div style={styles.balCardNum}>{card?.cardNumber || '•••• •••• •••• ••••'}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
            <button style={styles.topUpBtn} onClick={onTopUp} disabled={card && !card.isActive}>+ Top Up</button>
            <button style={styles.tripBtn} onClick={takeTrip} disabled={tripLoading || (card && !card.isActive)}>
              {tripLoading ? 'Boarding…' : '🚌 Take a Trip'}
            </button>
            <button
              style={{ ...styles.freezeBtn, ...(card && !card.isActive ? styles.freezeBtnActive : {}) }}
              onClick={onFreeze}
            >
              {card && !card.isActive ? '❄ Unfreeze Card' : '🔒 Freeze Card'}
            </button>
          </div>
        </div>
      </div>

      {/* Trip message */}
      {tripMsg.text && (
        <div style={{ ...styles.tripMsg, background: tripMsg.type === 'success' ? 'rgba(45,204,110,0.1)' : 'rgba(232,64,28,0.1)', border: `1px solid ${tripMsg.type === 'success' ? 'rgba(45,204,110,0.3)' : 'rgba(232,64,28,0.3)'}`, color: tripMsg.type === 'success' ? '#2dcc6e' : '#f87a5e' }}>
          {tripMsg.type === 'success' ? '✓ ' : '✗ '}{tripMsg.text}
        </div>
      )}

      {/* Stats row */}
      {stats && (
        <div style={styles.statsRow}>
          <StatCard label="Total Spent" value={`R${stats.totalSpent.toFixed(2)}`} sub="all time" color="#E8401C" />
          <StatCard label="Total Loaded" value={`R${stats.totalLoaded.toFixed(2)}`} sub="all time" color="#2dcc6e" />
          <StatCard label="Trips Taken" value={stats.tripCount} sub="journeys" color="#F5893A" />
        </div>
      )}

      {/* Recent transactions */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Recent Trips</h2>
        {recent.length === 0
          ? <div style={styles.empty}>No transactions yet.</div>
          : recent.map(tx => <TxRow key={tx.id} tx={tx} />)
        }
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statDot, background: color }} />
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color }}>{value}</div>
      <div style={styles.statSub}>{sub}</div>
    </div>
  );
}

function TxRow({ tx }) {
  const isCredit = tx.type === 'credit';
  return (
    <div style={styles.txRow}>
      <div style={{ ...styles.txIcon, background: isCredit ? 'rgba(45,204,110,0.1)' : 'rgba(232,64,28,0.1)' }}>
        {isCredit ? '↑' : '🚌'}
      </div>
      <div style={styles.txInfo}>
        <div style={styles.txDesc}>{tx.description}</div>
        <div style={styles.txTime}>{formatDate(tx.createdAt)}</div>
      </div>
      <div style={{ ...styles.txAmount, color: isCredit ? '#2dcc6e' : '#f0eee8' }}>
        {isCredit ? '+' : '–'}R{tx.amount.toFixed(2)}
      </div>
    </div>
  );
}

// ─── Subscription Tab ────────────────────────────────────────────────────────

function SubscriptionTab({ sub, card, apiFetch, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  async function subscribe(planId) {
    setLoading(planId);
    setMsg({ text: '', type: '' });
    try {
      await apiFetch('/subscribe', { method: 'POST', body: JSON.stringify({ planId }) });
      setMsg({ text: 'Subscription activated successfully!', type: 'success' });
      onRefresh();
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    }
    setLoading(false);
  }

  async function cancel() {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) return;
    setLoading('cancel');
    try {
      await apiFetch('/cancel-subscription', { method: 'POST' });
      setMsg({ text: 'Subscription cancelled.', type: 'success' });
      onRefresh();
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    }
    setLoading(false);
  }

  const PERKS = {
    weekly:  ['Unlimited trips', 'Valid 7 days', 'All routes'],
    monthly: ['Unlimited trips', 'Valid 30 days', 'All routes', 'Priority boarding'],
    premium: ['Unlimited trips', 'Valid 30 days', 'All routes', 'Express services', 'Lounge access'],
  };

  return (
    <div>
      <h1 style={styles.pageTitle}>Subscriptions</h1>

      {msg.text && (
        <div style={{ ...styles.msgBox, background: msg.type === 'success' ? 'rgba(45,204,110,0.1)' : 'rgba(232,64,28,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(45,204,110,0.3)' : 'rgba(232,64,28,0.3)'}`, color: msg.type === 'success' ? '#2dcc6e' : '#f87a5e' }}>
          {msg.text}
        </div>
      )}

      {/* Active subscription banner */}
      {sub && (
        <div style={styles.activeBanner}>
          <div>
            <div style={styles.subBadge}>ACTIVE</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 6 }}>{sub.planName}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>Renews: {sub.renewalDate}</div>
          </div>
          <button style={styles.cancelBtn} onClick={cancel} disabled={loading === 'cancel'}>
            {loading === 'cancel' ? 'Cancelling…' : 'Cancel Plan'}
          </button>
        </div>
      )}

      {/* Plans grid */}
      <div style={styles.plansGrid}>
        {[
          { id: 'weekly',  name: 'Weekly Pass',       price: 89.00,  period: 'week',  popular: false },
          { id: 'monthly', name: 'Monthly Commuter',  price: 350.00, period: 'month', popular: true  },
          { id: 'premium', name: 'Premium Pass',      price: 600.00, period: 'month', popular: false },
        ].map(plan => {
          const isActive = sub?.planId === plan.id;
          return (
            <div key={plan.id} style={{ ...styles.planCard, ...(plan.popular ? styles.planCardPopular : {}), ...(isActive ? styles.planCardActive : {}) }}>
              {plan.popular && <div style={styles.popularBadge}>MOST POPULAR</div>}
              {isActive && <div style={styles.activePlanBadge}>YOUR PLAN</div>}
              <div style={styles.planName}>{plan.name}</div>
              <div style={styles.planPrice}>
                <span style={styles.planCur}>R</span>{plan.price.toFixed(2)}
                <span style={styles.planPeriod}> / {plan.period}</span>
              </div>
              <div style={styles.perksList}>
                {(PERKS[plan.id] || []).map(p => (
                  <div key={p} style={styles.perkItem}>
                    <span style={styles.perkTick}>✓</span> {p}
                  </div>
                ))}
              </div>
              <button
                style={{ ...styles.subBtn, ...(isActive ? styles.subBtnActive : plan.popular ? styles.subBtnPopular : {}) }}
                onClick={() => !isActive && subscribe(plan.id)}
                disabled={!!loading || isActive}
              >
                {loading === plan.id ? 'Processing…' : isActive ? 'Current Plan' : 'Subscribe'}
              </button>
              <div style={styles.balanceNote}>Balance needed: R{plan.price.toFixed(2)}</div>
            </div>
          );
        })}
      </div>

      <div style={styles.balanceBar}>
        Your current balance: <span style={{ color: 'var(--orange)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>R{card?.balance?.toFixed(2) || '0.00'}</span>
      </div>
    </div>
  );
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab({ user, card, apiFetch }) {
  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState({ text: '', type: '' });
  const [pwLoading, setPwLoading] = useState(false);

  async function changePassword(e) {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) {
      setPwMsg({ text: 'New passwords do not match', type: 'error' });
      return;
    }
    if (pwForm.newPw.length < 6) {
      setPwMsg({ text: 'Password must be at least 6 characters', type: 'error' });
      return;
    }
    setPwLoading(true);
    setPwMsg({ text: '', type: '' });
    try {
      await apiFetch('/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.newPw })
      });
      setPwMsg({ text: 'Password changed successfully!', type: 'success' });
      setPwForm({ current: '', newPw: '', confirm: '' });
      setShowPwForm(false);
    } catch (err) {
      setPwMsg({ text: err.message, type: 'error' });
    }
    setPwLoading(false);
  }

  return (
    <div>
      <h1 style={styles.pageTitle}>Profile</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 780 }}>

        {/* Profile details card */}
        <div style={styles.profileCard}>
          <div style={styles.profileAvatar}>{initials}</div>
          <div style={styles.profileName}>{user?.fullName}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Buscor Member</div>
          {[['Email', user?.email], ['Phone', user?.phone], ['Card Number', card?.cardNumber], ['Card Status', card?.isActive ? 'Active' : 'Inactive'], ['Member Since', card?.issuedAt]].map(([l, v]) => (
            <div key={l} style={styles.profileRow}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{l}</span>
              <span style={{ fontFamily: l === 'Card Number' ? 'var(--font-mono)' : 'inherit', fontSize: 13 }}>{v || '—'}</span>
            </div>
          ))}
        </div>

        {/* Password change card */}
        <div style={styles.profileCard}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Security</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Manage your password</div>

          {pwMsg.text && (
            <div style={{ ...styles.msgBox, background: pwMsg.type === 'success' ? 'rgba(45,204,110,0.1)' : 'rgba(232,64,28,0.1)', border: `1px solid ${pwMsg.type === 'success' ? 'rgba(45,204,110,0.3)' : 'rgba(232,64,28,0.3)'}`, color: pwMsg.type === 'success' ? '#2dcc6e' : '#f87a5e', marginBottom: 16 }}>
              {pwMsg.text}
            </div>
          )}

          {!showPwForm ? (
            <button style={styles.changePwBtn} onClick={() => { setShowPwForm(true); setPwMsg({ text: '', type: '' }); }}>
              Change Password
            </button>
          ) : (
            <form onSubmit={changePassword}>
              {[['Current password', 'current'], ['New password', 'newPw'], ['Confirm new password', 'confirm']].map(([label, key]) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
                  <input
                    type="password"
                    style={styles.pwInput}
                    value={pwForm[key]}
                    onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder="••••••••"
                    required
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" style={{ ...styles.changePwBtn, flex: 1 }} disabled={pwLoading}>
                  {pwLoading ? 'Saving…' : 'Save Password'}
                </button>
                <button type="button" style={styles.cancelPwBtn} onClick={() => { setShowPwForm(false); setPwMsg({ text: '', type: '' }); }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

      </div>

      {/* QR Code card */}
      {card && (
        <div style={{ ...styles.profileCard, maxWidth: 780, marginTop: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Smart Card QR Code</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Scan this code at any Buscor terminal to board</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{ background: '#fff', padding: 12, borderRadius: 12, display: 'inline-block' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=BUSCOR:${card.cardNumber.replace(/\s/g,'')}&color=0d0d0d&bgcolor=ffffff`}
                alt="Card QR Code"
                width={160}
                height={160}
                style={{ display: 'block', borderRadius: 4 }}
              />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Card Details</div>
              <div style={{ fontSize: 13, marginBottom: 6 }}><span style={{ color: 'var(--text-muted)' }}>Number: </span><span style={{ fontFamily: 'var(--font-mono)' }}>{card.cardNumber}</span></div>
              <div style={{ fontSize: 13, marginBottom: 6 }}><span style={{ color: 'var(--text-muted)' }}>Status: </span><span style={{ color: card.isActive ? '#2dcc6e' : '#7bb8f0' }}>{card.isActive ? 'Active' : 'Frozen'}</span></div>
              <div style={{ fontSize: 13, marginBottom: 16 }}><span style={{ color: 'var(--text-muted)' }}>Holder: </span>{user?.fullName}</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', maxWidth: 200, lineHeight: 1.6 }}>
                This QR code is unique to your card. Do not share it with anyone.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Notifications Tab ───────────────────────────────────────────────────────

function NotificationsTab({ card, subscription, apiFetch }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateNotifications();
  }, [card, subscription]);

  function generateNotifications() {
    const notifs = [];

    // Low balance alert
    if (card) {
      if (card.balance === 0) {
        notifs.push({ id: 'n1', type: 'danger', icon: '⚠', title: 'Zero Balance', message: 'Your card balance is R0.00. Top up now to continue using Buscor services.', time: 'Now', read: false });
      } else if (card.balance < 20) {
        notifs.push({ id: 'n2', type: 'warning', icon: '⚠', title: 'Low Balance Alert', message: `Your balance is running low (R${card.balance.toFixed(2)}). We recommend topping up to avoid service interruption.`, time: 'Just now', read: false });
      } else if (card.balance < 50) {
        notifs.push({ id: 'n3', type: 'warning', icon: '💳', title: 'Balance Reminder', message: `Your current balance is R${card.balance.toFixed(2)}. Consider topping up soon.`, time: '1 hour ago', read: false });
      }

      // Card status
      if (!card.isActive) {
        notifs.push({ id: 'n4', type: 'info', icon: '❄', title: 'Card Frozen', message: 'Your Buscor card is currently frozen. Visit the Dashboard to unfreeze it.', time: 'Recently', read: false });
      }
    }

    // Subscription renewal reminder
    if (subscription && subscription.active) {
      const daysLeft = Math.ceil((new Date(subscription.renewalDate) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 7) {
        notifs.push({ id: 'n5', type: 'warning', icon: '📅', title: 'Subscription Renewing Soon', message: `Your ${subscription.planName} renews in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} on ${subscription.renewalDate}. Ensure sufficient balance.`, time: 'Today', read: false });
      } else {
        notifs.push({ id: 'n6', type: 'success', icon: '✓', title: 'Subscription Active', message: `Your ${subscription.planName} is active and renews on ${subscription.renewalDate}.`, time: 'Today', read: true });
      }
    } else {
      notifs.push({ id: 'n7', type: 'info', icon: '📅', title: 'No Active Subscription', message: 'You have no active subscription. Subscribe to a plan for unlimited travel benefits.', time: 'Today', read: true });
    }

    // Welcome / general
    notifs.push({ id: 'n8', type: 'success', icon: '🎉', title: 'Welcome to Buscor', message: 'Your digital smart card is set up and ready to use. Tap "Take a Trip" to simulate your first journey!', time: 'When you joined', read: true });

    setNotifications(notifs);
    setLoading(false);
  }

  const unread = notifications.filter(n => !n.read).length;

  const typeStyles = {
    danger:  { bg: 'rgba(232,64,28,0.08)',  border: 'rgba(232,64,28,0.25)',  color: '#f87a5e',  dot: '#E8401C' },
    warning: { bg: 'rgba(245,137,58,0.08)', border: 'rgba(245,137,58,0.25)', color: '#F5893A',  dot: '#F5893A' },
    success: { bg: 'rgba(45,204,110,0.08)', border: 'rgba(45,204,110,0.25)', color: '#2dcc6e',  dot: '#2dcc6e' },
    info:    { bg: 'rgba(59,139,212,0.08)', border: 'rgba(59,139,212,0.25)', color: '#7bb8f0',  dot: '#3B8BD4' },
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h1 style={{ ...styles.pageTitle, marginBottom: 0 }}>Notifications</h1>
        {unread > 0 && (
          <span style={{ background: '#E8401C', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600, color: '#fff', fontFamily: 'var(--font-mono)' }}>
            {unread} new
          </span>
        )}
      </div>

      {loading ? (
        <div style={styles.empty}>Loading notifications…</div>
      ) : notifications.length === 0 ? (
        <div style={styles.empty}>No notifications.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notifications.map(n => {
            const t = typeStyles[n.type] || typeStyles.info;
            return (
              <div key={n.id} style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 14, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start', opacity: n.read ? 0.7 : 1 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${t.dot}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {n.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t.color, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {n.title}
                      {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.dot, display: 'inline-block' }} />}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{n.time}</div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{n.message}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Admin Analytics Tab ─────────────────────────────────────────────────────

function AdminAnalyticsTab({ transactions, stats }) {
  const ROUTES = [
    { name: 'Route 1 — Pretoria CBD', fare: 12.50, capacity: 60 },
    { name: 'Route 2 — Sunnyside',    fare: 14.50, capacity: 45 },
    { name: 'Route 3 — Hatfield',     fare: 16.00, capacity: 50 },
    { name: 'Route 4 — Arcadia',      fare: 18.00, capacity: 55 },
    { name: 'Route 5 — Centurion',    fare: 22.00, capacity: 70 },
    { name: 'Route 6 — Menlyn',       fare: 19.50, capacity: 48 },
    { name: 'Route 7 — Mamelodi',     fare: 24.00, capacity: 65 },
  ];

  const HOURS = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];

  // Count trips per route from real transactions
  const routeCounts = {};
  ROUTES.forEach(r => { routeCounts[r.name] = 0; });
  transactions.filter(t => t.type === 'debit' && t.description.startsWith('Route')).forEach(t => {
    if (routeCounts[t.description] !== undefined) routeCounts[t.description]++;
  });

  // Add simulated base counts so heatmap is always interesting
  const BASE = [18, 12, 9, 22, 8, 15, 11];
  const routeData = ROUTES.map((r, i) => ({
    ...r,
    trips: (routeCounts[r.name] || 0) + BASE[i],
    revenue: ((routeCounts[r.name] || 0) + BASE[i]) * r.fare,
  }));

  const maxTrips = Math.max(...routeData.map(r => r.trips));

  // Heatmap: simulate peak hours per route
  const PEAK_PATTERNS = [
    [0,2,8,9,4,2,3,2,3,5,8,9,6,2],
    [0,1,6,7,3,2,2,2,3,4,7,8,5,1],
    [0,1,5,6,4,2,3,3,4,5,6,7,4,1],
    [0,2,9,8,3,1,2,2,3,5,9,8,5,2],
    [0,1,4,5,3,2,2,3,3,4,5,6,3,1],
    [0,1,6,7,4,3,4,4,4,5,7,8,5,2],
    [0,2,8,7,3,2,2,2,3,4,8,7,4,1],
  ];

  function heatColor(val) {
    if (val === 0) return 'rgba(232,64,28,0.05)';
    if (val <= 2) return 'rgba(232,64,28,0.15)';
    if (val <= 4) return 'rgba(232,64,28,0.30)';
    if (val <= 6) return 'rgba(232,64,28,0.50)';
    if (val <= 8) return 'rgba(232,64,28,0.70)';
    return 'rgba(232,64,28,0.90)';
  }

  const totalRevenue = routeData.reduce((s, r) => s + r.revenue, 0);
  const totalTrips = routeData.reduce((s, r) => s + r.trips, 0);
  const busiestRoute = routeData.reduce((a, b) => a.trips > b.trips ? a : b);

  return (
    <div>
      <h1 style={styles.pageTitle}>Admin Analytics</h1>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Trips', value: totalTrips, color: '#E8401C' },
          { label: 'Total Revenue', value: `R${totalRevenue.toFixed(2)}`, color: '#2dcc6e' },
          { label: 'Busiest Route', value: busiestRoute.name.split('—')[0].trim(), color: '#F5893A' },
        ].map(k => (
          <div key={k.label} style={styles.statCard}>
            <div style={{ ...styles.statDot, background: k.color }} />
            <div style={styles.statLabel}>{k.label}</div>
            <div style={{ ...styles.statValue, color: k.color, fontSize: 18 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Route popularity bar chart */}
      <div style={{ ...styles.section, marginBottom: 24, padding: '20px' }}>
        <h2 style={styles.sectionTitle}>Route Popularity</h2>
        {routeData.sort((a,b) => b.trips - a.trips).map(r => (
          <div key={r.name} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.name}</span>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--orange)' }}>{r.trips} trips · R{r.revenue.toFixed(2)}</span>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 4, height: 10, overflow: 'hidden' }}>
              <div style={{ width: `${(r.trips / maxTrips) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #E8401C, #F5893A)', borderRadius: 4, transition: 'width .5s' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div style={{ ...styles.section, padding: '20px', overflowX: 'auto' }}>
        <h2 style={{ ...styles.sectionTitle, marginBottom: 6 }}>Peak Hour Heatmap</h2>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>Darker = more passengers. Use this to deploy more buses during peak hours.</p>

        {/* Hour labels */}
        <div style={{ display: 'grid', gridTemplateColumns: `120px repeat(${HOURS.length}, 1fr)`, gap: 3, minWidth: 700 }}>
          <div />
          {HOURS.map(h => (
            <div key={h} style={{ fontSize: 9, color: 'var(--text-dim)', textAlign: 'center', fontFamily: 'var(--font-mono)', paddingBottom: 4 }}>{h}</div>
          ))}

          {/* Route rows */}
          {ROUTES.map((r, ri) => (
            <>
              <div key={r.name + 'label'} style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', paddingRight: 8 }}>
                {r.name.split('—')[1]?.trim() || r.name}
              </div>
              {PEAK_PATTERNS[ri].map((val, hi) => (
                <div key={hi} style={{ background: heatColor(val), borderRadius: 3, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 8, color: val >= 7 ? '#fff' : 'transparent', fontFamily: 'var(--font-mono)' }}>{val}</span>
                </div>
              ))}
            </>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Low</span>
          {[0.05,0.15,0.30,0.50,0.70,0.90].map(o => (
            <div key={o} style={{ width: 20, height: 12, borderRadius: 2, background: `rgba(232,64,28,${o})` }} />
          ))}
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>High</span>
        </div>
      </div>

      {/* Recommendations */}
      <div style={{ ...styles.section, marginTop: 24, padding: '20px' }}>
        <h2 style={styles.sectionTitle}>Management Recommendations</h2>
        {[
          { icon: '🚌', text: `Deploy extra buses on ${busiestRoute.name} during 08:00–09:00 and 16:00–17:00 peak hours.` },
          { icon: '💰', text: `Route 5 — Centurion generates the highest revenue per trip at R22.00. Consider increasing frequency.` },
          { icon: '📊', text: `Off-peak hours (10:00–14:00) show consistently low demand across all routes. Reduce bus frequency to cut operating costs.` },
          { icon: '🔔', text: `Send push notifications to passengers 30 minutes before peak hours to encourage early boarding.` },
        ].map((rec, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 18 }}>{rec.icon}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{rec.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Family Cards Tab ─────────────────────────────────────────────────────────

function FamilyTab({ card, apiFetch }) {
  const [subCards, setSubCards] = useState([
    { id: 'sc1', name: 'Thabo — School', holder: 'Thabo Malandule', balance: 45.00, cardNumber: '4822 8800 1111 2222', isActive: true, color: '#3B8BD4' },
    { id: 'sc2', name: 'Nomsa — Work',   holder: 'Nomsa Malandule',  balance: 120.50, cardNumber: '4822 8800 3333 4444', isActive: true, color: '#2dcc6e' },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newHolder, setNewHolder] = useState('');
  const [transferId, setTransferId] = useState(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [masterBalance, setMasterBalance] = useState(card?.balance || 0);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => { setMasterBalance(card?.balance || 0); }, [card]);

  function addCard() {
    if (!newName || !newHolder) { setMsg({ text: 'Please fill in all fields', type: 'error' }); return; }
    if (subCards.length >= 5) { setMsg({ text: 'Maximum 5 family cards allowed', type: 'error' }); return; }
    const colors = ['#E8401C', '#F5893A', '#3B8BD4', '#2dcc6e', '#9B59B6'];
    const newCard = {
      id: 'sc' + Date.now(),
      name: newName,
      holder: newHolder,
      balance: 0,
      cardNumber: `4822 8800 ${Math.floor(1000+Math.random()*9000)} ${Math.floor(1000+Math.random()*9000)}`,
      isActive: true,
      color: colors[subCards.length]
    };
    setSubCards(prev => [...prev, newCard]);
    setNewName(''); setNewHolder(''); setShowAdd(false);
    setMsg({ text: `${newName} card added successfully!`, type: 'success' });
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  }

  function transfer(scId) {
    const amount = parseFloat(transferAmount);
    if (!amount || amount < 5) { setMsg({ text: 'Minimum transfer is R5', type: 'error' }); return; }
    if (amount > masterBalance) { setMsg({ text: `Insufficient master balance. You have R${masterBalance.toFixed(2)}`, type: 'error' }); return; }
    setSubCards(prev => prev.map(sc => sc.id === scId ? { ...sc, balance: Math.round((sc.balance + amount) * 100) / 100 } : sc));
    setMasterBalance(prev => Math.round((prev - amount) * 100) / 100);
    const sc = subCards.find(s => s.id === scId);
    setMsg({ text: `R${amount.toFixed(2)} transferred to ${sc.name}`, type: 'success' });
    setTransferId(null); setTransferAmount('');
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  }

  function toggleFreeze(scId) {
    setSubCards(prev => prev.map(sc => sc.id === scId ? { ...sc, isActive: !sc.isActive } : sc));
  }

  function removeCard(scId) {
    if (!window.confirm('Remove this family card?')) return;
    setSubCards(prev => prev.filter(sc => sc.id !== scId));
  }

  const totalFamily = subCards.reduce((s, c) => s + c.balance, 0);

  return (
    <div>
      <h1 style={styles.pageTitle}>Family Cards</h1>

      {msg.text && (
        <div style={{ borderRadius: 10, padding: '12px 16px', fontSize: 13, marginBottom: 20, background: msg.type === 'success' ? 'rgba(45,204,110,0.1)' : 'rgba(232,64,28,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(45,204,110,0.3)' : 'rgba(232,64,28,0.3)'}`, color: msg.type === 'success' ? '#2dcc6e' : '#f87a5e' }}>
          {msg.text}
        </div>
      )}

      {/* Master account summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statDot, background: '#E8401C' }} />
          <div style={styles.statLabel}>Master Balance</div>
          <div style={{ ...styles.statValue, color: '#E8401C' }}>R{masterBalance.toFixed(2)}</div>
          <div style={styles.statSub}>your main card</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statDot, background: '#2dcc6e' }} />
          <div style={styles.statLabel}>Family Total</div>
          <div style={{ ...styles.statValue, color: '#2dcc6e' }}>R{totalFamily.toFixed(2)}</div>
          <div style={styles.statSub}>across all sub-cards</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statDot, background: '#F5893A' }} />
          <div style={styles.statLabel}>Sub-Cards</div>
          <div style={{ ...styles.statValue, color: '#F5893A' }}>{subCards.length} / 5</div>
          <div style={styles.statSub}>family members</div>
        </div>
      </div>

      {/* Sub-cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, marginBottom: 20 }}>
        {subCards.map(sc => (
          <div key={sc.id} style={{ background: 'var(--bg2)', border: `1px solid ${sc.isActive ? sc.color + '44' : 'var(--border)'}`, borderRadius: 16, padding: '20px', opacity: sc.isActive ? 1 : 0.6 }}>
            {/* Card header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{sc.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sc.holder}</div>
              </div>
              <div style={{ background: sc.isActive ? sc.color + '22' : 'rgba(255,255,255,0.05)', border: `1px solid ${sc.isActive ? sc.color + '44' : 'var(--border)'}`, borderRadius: 6, padding: '3px 8px', fontSize: 9, fontFamily: 'var(--font-mono)', color: sc.isActive ? sc.color : 'var(--text-dim)' }}>
                {sc.isActive ? 'ACTIVE' : 'FROZEN'}
              </div>
            </div>

            {/* Balance */}
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px', marginBottom: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>BALANCE</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)', color: sc.color }}>R{sc.balance.toFixed(2)}</div>
              <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 4, letterSpacing: 2 }}>{sc.cardNumber}</div>
            </div>

            {/* Transfer */}
            {transferId === sc.id ? (
              <div style={{ marginBottom: 10 }}>
                <input
                  style={{ ...styles.pwInput, marginBottom: 8 }}
                  type="number" placeholder="Amount to transfer (R)"
                  value={transferAmount} onChange={e => setTransferAmount(e.target.value)}
                  min={5} max={masterBalance}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={{ ...styles.changePwBtn, flex: 1, fontSize: 12, padding: '8px' }} onClick={() => transfer(sc.id)}>Transfer</button>
                  <button style={{ ...styles.cancelPwBtn, fontSize: 12, padding: '8px 12px' }} onClick={() => { setTransferId(null); setTransferAmount(''); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={{ flex: 1, background: sc.color + '22', border: `1px solid ${sc.color}44`, borderRadius: 8, padding: '8px', fontSize: 11, fontWeight: 600, color: sc.color, cursor: 'pointer' }}
                  onClick={() => setTransferId(sc.id)}>
                  💸 Transfer Funds
                </button>
                <button style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }}
                  onClick={() => toggleFreeze(sc.id)}>
                  {sc.isActive ? '❄' : '▶'}
                </button>
                <button style={{ background: 'var(--bg)', border: '1px solid rgba(232,64,28,0.3)', borderRadius: 8, padding: '8px 10px', fontSize: 11, color: '#f87a5e', cursor: 'pointer' }}
                  onClick={() => removeCard(sc.id)}>
                  🗑
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add card button */}
        {subCards.length < 5 && !showAdd && (
          <div style={{ background: 'var(--bg2)', border: '1px dashed var(--border)', borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', minHeight: 200 }}
            onClick={() => setShowAdd(true)}>
            <div style={{ fontSize: 28 }}>+</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Add Family Member</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{5 - subCards.length} slots remaining</div>
          </div>
        )}

        {/* Add card form */}
        {showAdd && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>New Family Card</div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>Card Label</div>
              <input style={styles.pwInput} placeholder="e.g. Thabo — School" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>Cardholder Name</div>
              <input style={styles.pwInput} placeholder="e.g. Thabo Malandule" value={newHolder} onChange={e => setNewHolder(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...styles.changePwBtn, flex: 1 }} onClick={addCard}>Add Card</button>
              <button style={styles.cancelPwBtn} onClick={() => { setShowAdd(false); setNewName(''); setNewHolder(''); }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
        💡 Transfer funds from your master card to any family member's sub-card instantly. Each sub-card can be frozen individually if lost or stolen.
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `Today ${d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`;
  if (diff < 172800000) return `Yesterday ${d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

const navItems = [
  { id: 'home', icon: '⬛', label: 'Dashboard' },
  { id: 'history', icon: '📋', label: 'Trip History' },
  { id: 'subscription', icon: '📅', label: 'Subscriptions' },
  { id: 'notifications', icon: '🔔', label: 'Notifications' },
  { id: 'family', icon: '👨‍👩‍👧', label: 'Family Cards' },
  { id: 'analytics', icon: '📈', label: 'Admin Analytics' },
  { id: 'profile', icon: '👤', label: 'Profile' }
];

const styles = {
  wrap: { display: 'flex', minHeight: '100vh' },
  sidebar: { width: 220, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0 },
  sideLogoWrap: { display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px 28px' },
  sideLogoRing: { width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#E8401C,#F5893A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#fff' },
  sideLogoText: { fontSize: 16, fontWeight: 600, letterSpacing: '-0.3px' },
  nav: { flex: 1, padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2 },
  navBtn: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 13, fontWeight: 500, textAlign: 'left', transition: 'all .15s', width: '100%' },
  navBtnActive: { background: 'rgba(232,64,28,0.12)', color: 'var(--orange)' },
  navIcon: { fontSize: 14, width: 18, textAlign: 'center' },
  sideUser: { display: 'flex', alignItems: 'center', gap: 8, padding: '16px 16px 0', borderTop: '1px solid var(--border)', marginTop: 16 },
  avatar: { width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#E8401C,#F5893A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0 },
  sideUserInfo: { flex: 1, overflow: 'hidden' },
  logoutBtn: { border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 16, padding: 4, borderRadius: 6, flexShrink: 0 },
  main: { flex: 1, padding: '32px 40px', overflowY: 'auto', maxWidth: 900 },
  pageTitle: { fontSize: 22, fontWeight: 600, marginBottom: 24 },
  balanceCard: { position: 'relative', background: 'linear-gradient(160deg, #1e0c06, #2a1208)', border: '1px solid rgba(232,64,28,0.2)', borderRadius: 20, padding: '28px 28px 24px', marginBottom: 24, overflow: 'hidden' },
  balCardBg: { position: 'absolute', right: -40, top: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(232,64,28,0.2), transparent 70%)', pointerEvents: 'none' },
  balLabel: { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.5)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  balAmount: { fontSize: 42, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: -2, marginBottom: 12 },
  balCurrency: { fontSize: 20, fontWeight: 400, color: 'var(--orange)', verticalAlign: 'super', marginRight: 2 },
  balCardNum: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, marginBottom: 16 },
  topUpBtn: { background: 'linear-gradient(135deg, #E8401C, #F5893A)', border: 'none', borderRadius: 8, padding: '9px 18px', color: '#fff', fontSize: 13, fontWeight: 600 },
  tripBtn: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '9px 18px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  tripMsg: { borderRadius: 10, padding: '12px 16px', fontSize: 13, marginBottom: 20 },
  freezeBtn: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 18px', color: '#aaa', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  freezeBtnActive: { background: 'rgba(59,139,212,0.2)', border: '1px solid rgba(59,139,212,0.4)', color: '#7bb8f0' },
  balanceCardFrozen: { background: 'linear-gradient(160deg, #0a0e1a, #101828)', border: '1px solid rgba(59,139,212,0.3)' },
  frozenBanner: { background: 'rgba(59,139,212,0.15)', border: '1px solid rgba(59,139,212,0.3)', borderRadius: 8, padding: '6px 12px', fontSize: 11, color: '#7bb8f0', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 12, display: 'inline-block' },
  statCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', position: 'relative', overflow: 'hidden' },
  statDot: { width: 6, height: 6, borderRadius: '50%', marginBottom: 10 },
  statLabel: { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: -1, marginBottom: 2 },
  statSub: { fontSize: 11, color: 'var(--text-dim)' },
  section: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 20px 8px' },
  sectionTitle: { fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'var(--font-mono)' },
  txRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' },
  txIcon: { width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 13, fontWeight: 500, marginBottom: 2 },
  txTime: { fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
  txAmount: { fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)' },
  empty: { color: 'var(--text-dim)', fontSize: 14, padding: '24px 0', textAlign: 'center' },
  subCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px', maxWidth: 440 },
  subBadge: { display: 'inline-block', background: 'rgba(45,204,110,0.12)', border: '1px solid rgba(45,204,110,0.2)', borderRadius: 6, padding: '3px 10px', fontSize: 10, fontFamily: 'var(--font-mono)', color: '#2dcc6e', letterSpacing: 1, marginBottom: 14 },
  subName: { fontSize: 18, fontWeight: 600, marginBottom: 8 },
  subPrice: { fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--orange)', marginBottom: 20 },
  subRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' },
  profileCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px', maxWidth: 440, textAlign: 'center' },
  profileAvatar: { width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#E8401C,#F5893A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 600, color: '#fff', margin: '0 auto 14px' },
  profileName: { fontSize: 20, fontWeight: 600, marginBottom: 4 },
  profileRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--border)', textAlign: 'left' },
  msgBox: { borderRadius: 10, padding: '12px 16px', fontSize: 13, marginBottom: 20 },
  activeBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(45,204,110,0.08)', border: '1px solid rgba(45,204,110,0.2)', borderRadius: 14, padding: '16px 20px', marginBottom: 24 },
  cancelBtn: { background: 'transparent', border: '1px solid rgba(232,64,28,0.4)', borderRadius: 8, padding: '8px 16px', color: '#f87a5e', fontSize: 12, cursor: 'pointer' },
  plansGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 },
  planCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 20px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' },
  planCardPopular: { border: '1px solid rgba(232,64,28,0.4)' },
  planCardActive: { border: '1px solid rgba(45,204,110,0.4)', background: 'rgba(45,204,110,0.04)' },
  popularBadge: { display: 'inline-block', background: 'linear-gradient(135deg,#E8401C,#F5893A)', borderRadius: 6, padding: '3px 10px', fontSize: 9, fontFamily: 'var(--font-mono)', color: '#fff', letterSpacing: 1, marginBottom: 12 },
  activePlanBadge: { display: 'inline-block', background: 'rgba(45,204,110,0.15)', border: '1px solid rgba(45,204,110,0.3)', borderRadius: 6, padding: '3px 10px', fontSize: 9, fontFamily: 'var(--font-mono)', color: '#2dcc6e', letterSpacing: 1, marginBottom: 12 },
  planName: { fontSize: 15, fontWeight: 600, marginBottom: 8 },
  planPrice: { fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: -1, marginBottom: 16 },
  planCur: { fontSize: 14, color: 'var(--orange)', verticalAlign: 'super' },
  planPeriod: { fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 },
  perksList: { flex: 1, marginBottom: 20 },
  perkItem: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 },
  perkTick: { color: '#2dcc6e', fontWeight: 600 },
  subBtn: { width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '10px', color: 'var(--text-muted)', fontSize: 13, fontWeight: 500, background: 'var(--bg)', cursor: 'pointer', marginBottom: 8 },
  subBtnPopular: { background: 'linear-gradient(135deg,#E8401C,#F5893A)', border: 'none', color: '#fff' },
  subBtnActive: { background: 'rgba(45,204,110,0.1)', border: '1px solid rgba(45,204,110,0.3)', color: '#2dcc6e', cursor: 'default' },
  balanceNote: { fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textAlign: 'center' },
  balanceBar: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' },
  changePwBtn: { width: '100%', background: 'linear-gradient(135deg,#E8401C,#F5893A)', border: 'none', borderRadius: 8, padding: '10px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  cancelPwBtn: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 16px', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' },
  pwInput: { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, outline: 'none' }
};
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import TopUpModal from '../components/TopUpModal';
import TransactionList from '../components/TransactionList';

export default function Dashboard() {
  const { user, card, logout, apiFetch, refreshCard } = useAuth();
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [card2, setCard] = useState(null);

  useEffect(() => { if (card) setCard(card); }, [card]);

  useEffect(() => {
    loadData();
  }, [card?.balance]);

  async function loadData() {
    try {
      const [s, txs, subs] = await Promise.all([
        apiFetch('/stats'),
        apiFetch('/transactions'),
        apiFetch('/subscriptions')
      ]);
      setStats(s);
      setTransactions(txs);
      setSubscription(subs[0] || null);
    } catch {}
  }

  async function freezeCard() {
    const card = card2;
    const action = card && !card.isActive ? 'unfreeze' : 'freeze';
    try {
      const d = await apiFetch('/freeze-card', { method: 'POST', body: JSON.stringify({ action }) });
      setCard(c => ({ ...c, isActive: d.isActive }));
    } catch (err) {
      alert(err.message);
    }
  }

  async function takeTrip(route) {
    const d = await apiFetch('/trip', {
      method: 'POST',
      body: JSON.stringify({ route: route.name, fare: route.fare })
    });
    setCard(c => ({ ...c, balance: d.newBalance }));
    await loadData();
  }

  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <div style={styles.wrap}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sideLogoWrap}>
          <div style={styles.sideLogoRing}>BC</div>
          <span style={styles.sideLogoText}>Buscor</span>
        </div>

        <nav style={styles.nav}>
          {navItems.map(item => (
            <button key={item.id} style={{ ...styles.navBtn, ...(activeTab === item.id ? styles.navBtnActive : {}) }} onClick={() => setActiveTab(item.id)}>
              <span style={styles.navIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={styles.sideUser}>
          <div style={styles.avatar}>{initials}</div>
          <div style={styles.sideUserInfo}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{user?.fullName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
          <button style={styles.logoutBtn} onClick={logout} title="Sign out">↩</button>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        {activeTab === 'home' && <HomeTab card={card2 || card} stats={stats} transactions={transactions} onTopUp={() => setShowTopUp(true)} onTrip={takeTrip} onFreeze={freezeCard} />}
        {activeTab === 'history' && <TransactionList transactions={transactions} />}
        {activeTab === 'subscription' && <SubscriptionTab sub={subscription} card={card} apiFetch={apiFetch} onRefresh={loadData} />}
        {activeTab === 'notifications' && <NotificationsTab card={card2 || card} subscription={subscription} apiFetch={apiFetch} />}
        {activeTab === 'family' && <FamilyTab card={card2 || card} apiFetch={apiFetch} />}
        {activeTab === 'profile' && <ProfileTab user={user} card={card} apiFetch={apiFetch} />}
      </main>

      {showTopUp && <TopUpModal onClose={() => { setShowTopUp(false); loadData(); }} />}
    </div>
  );
}

// ─── Home Tab ────────────────────────────────────────────────────────────────

function HomeTab({ card, stats, transactions, onTopUp, onTrip, onFreeze }) {
  const recent = transactions.slice(0, 5);
  const [tripLoading, setTripLoading] = useState(false);
  const [tripMsg, setTripMsg] = useState({ text: '', type: '' });

  const ROUTES = [
    { name: 'Route 1 — Pretoria CBD', fare: 12.50 },
    { name: 'Route 2 — Sunnyside', fare: 14.50 },
    { name: 'Route 3 — Hatfield', fare: 16.00 },
    { name: 'Route 4 — Arcadia', fare: 18.00 },
    { name: 'Route 5 — Centurion', fare: 22.00 },
    { name: 'Route 6 — Menlyn', fare: 19.50 },
    { name: 'Route 7 — Mamelodi', fare: 24.00 },
  ];

  async function takeTrip() {
    if (!card || card.balance <= 0) {
      setTripMsg({ text: 'Insufficient balance. Please top up first.', type: 'error' });
      return;
    }
    setTripLoading(true);
    setTripMsg({ text: '', type: '' });
    const route = ROUTES[Math.floor(Math.random() * ROUTES.length)];
    if (card.balance < route.fare) {
      setTripMsg({ text: `Insufficient balance for ${route.name} (R${route.fare.toFixed(2)})`, type: 'error' });
      setTripLoading(false);
      return;
    }
    try {
      await onTrip(route);
      setTripMsg({ text: `Trip taken! ${route.name} — R${route.fare.toFixed(2)} deducted.`, type: 'success' });
    } catch (err) {
      setTripMsg({ text: err.message, type: 'error' });
    }
    setTripLoading(false);
    setTimeout(() => setTripMsg({ text: '', type: '' }), 4000);
  }

  return (
    <div>
      <h1 style={styles.pageTitle}>Dashboard</h1>

      {/* Balance card */}
      <div style={{ ...styles.balanceCard, ...(card && !card.isActive ? styles.balanceCardFrozen : {}) }}>
        <div style={styles.balCardBg} />
        <div style={{ position: 'relative' }}>
          {card && !card.isActive && (
            <div style={styles.frozenBanner}>❄ CARD FROZEN — Tap to unfreeze</div>
          )}
          <div style={styles.balLabel}>Available Balance</div>
          <div style={{ ...styles.balAmount, ...(card && !card.isActive ? { color: '#888', filter: 'blur(4px)' } : {}) }}>
            <span style={styles.balCurrency}>R</span>
            {card ? card.balance.toFixed(2) : '—'}
          </div>
          <div style={styles.balCardNum}>{card?.cardNumber || '•••• •••• •••• ••••'}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
            <button style={styles.topUpBtn} onClick={onTopUp} disabled={card && !card.isActive}>+ Top Up</button>
            <button style={styles.tripBtn} onClick={takeTrip} disabled={tripLoading || (card && !card.isActive)}>
              {tripLoading ? 'Boarding…' : '🚌 Take a Trip'}
            </button>
            <button
              style={{ ...styles.freezeBtn, ...(card && !card.isActive ? styles.freezeBtnActive : {}) }}
              onClick={onFreeze}
            >
              {card && !card.isActive ? '❄ Unfreeze Card' : '🔒 Freeze Card'}
            </button>
          </div>
        </div>
      </div>

      {/* Trip message */}
      {tripMsg.text && (
        <div style={{ ...styles.tripMsg, background: tripMsg.type === 'success' ? 'rgba(45,204,110,0.1)' : 'rgba(232,64,28,0.1)', border: `1px solid ${tripMsg.type === 'success' ? 'rgba(45,204,110,0.3)' : 'rgba(232,64,28,0.3)'}`, color: tripMsg.type === 'success' ? '#2dcc6e' : '#f87a5e' }}>
          {tripMsg.type === 'success' ? '✓ ' : '✗ '}{tripMsg.text}
        </div>
      )}

      {/* Stats row */}
      {stats && (
        <div style={styles.statsRow}>
          <StatCard label="Total Spent" value={`R${stats.totalSpent.toFixed(2)}`} sub="all time" color="#E8401C" />
          <StatCard label="Total Loaded" value={`R${stats.totalLoaded.toFixed(2)}`} sub="all time" color="#2dcc6e" />
          <StatCard label="Trips Taken" value={stats.tripCount} sub="journeys" color="#F5893A" />
        </div>
      )}

      {/* Recent transactions */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Recent Trips</h2>
        {recent.length === 0
          ? <div style={styles.empty}>No transactions yet.</div>
          : recent.map(tx => <TxRow key={tx.id} tx={tx} />)
        }
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statDot, background: color }} />
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color }}>{value}</div>
      <div style={styles.statSub}>{sub}</div>
    </div>
  );
}

function TxRow({ tx }) {
  const isCredit = tx.type === 'credit';
  return (
    <div style={styles.txRow}>
      <div style={{ ...styles.txIcon, background: isCredit ? 'rgba(45,204,110,0.1)' : 'rgba(232,64,28,0.1)' }}>
        {isCredit ? '↑' : '🚌'}
      </div>
      <div style={styles.txInfo}>
        <div style={styles.txDesc}>{tx.description}</div>
        <div style={styles.txTime}>{formatDate(tx.createdAt)}</div>
      </div>
      <div style={{ ...styles.txAmount, color: isCredit ? '#2dcc6e' : '#f0eee8' }}>
        {isCredit ? '+' : '–'}R{tx.amount.toFixed(2)}
      </div>
    </div>
  );
}

// ─── Subscription Tab ────────────────────────────────────────────────────────

function SubscriptionTab({ sub, card, apiFetch, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  async function subscribe(planId) {
    setLoading(planId);
    setMsg({ text: '', type: '' });
    try {
      await apiFetch('/subscribe', { method: 'POST', body: JSON.stringify({ planId }) });
      setMsg({ text: 'Subscription activated successfully!', type: 'success' });
      onRefresh();
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    }
    setLoading(false);
  }

  async function cancel() {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) return;
    setLoading('cancel');
    try {
      await apiFetch('/cancel-subscription', { method: 'POST' });
      setMsg({ text: 'Subscription cancelled.', type: 'success' });
      onRefresh();
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    }
    setLoading(false);
  }

  const PERKS = {
    weekly:  ['Unlimited trips', 'Valid 7 days', 'All routes'],
    monthly: ['Unlimited trips', 'Valid 30 days', 'All routes', 'Priority boarding'],
    premium: ['Unlimited trips', 'Valid 30 days', 'All routes', 'Express services', 'Lounge access'],
  };

  return (
    <div>
      <h1 style={styles.pageTitle}>Subscriptions</h1>

      {msg.text && (
        <div style={{ ...styles.msgBox, background: msg.type === 'success' ? 'rgba(45,204,110,0.1)' : 'rgba(232,64,28,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(45,204,110,0.3)' : 'rgba(232,64,28,0.3)'}`, color: msg.type === 'success' ? '#2dcc6e' : '#f87a5e' }}>
          {msg.text}
        </div>
      )}

      {/* Active subscription banner */}
      {sub && (
        <div style={styles.activeBanner}>
          <div>
            <div style={styles.subBadge}>ACTIVE</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginTop: 6 }}>{sub.planName}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>Renews: {sub.renewalDate}</div>
          </div>
          <button style={styles.cancelBtn} onClick={cancel} disabled={loading === 'cancel'}>
            {loading === 'cancel' ? 'Cancelling…' : 'Cancel Plan'}
          </button>
        </div>
      )}

      {/* Plans grid */}
      <div style={styles.plansGrid}>
        {[
          { id: 'weekly',  name: 'Weekly Pass',       price: 89.00,  period: 'week',  popular: false },
          { id: 'monthly', name: 'Monthly Commuter',  price: 350.00, period: 'month', popular: true  },
          { id: 'premium', name: 'Premium Pass',      price: 600.00, period: 'month', popular: false },
        ].map(plan => {
          const isActive = sub?.planId === plan.id;
          return (
            <div key={plan.id} style={{ ...styles.planCard, ...(plan.popular ? styles.planCardPopular : {}), ...(isActive ? styles.planCardActive : {}) }}>
              {plan.popular && <div style={styles.popularBadge}>MOST POPULAR</div>}
              {isActive && <div style={styles.activePlanBadge}>YOUR PLAN</div>}
              <div style={styles.planName}>{plan.name}</div>
              <div style={styles.planPrice}>
                <span style={styles.planCur}>R</span>{plan.price.toFixed(2)}
                <span style={styles.planPeriod}> / {plan.period}</span>
              </div>
              <div style={styles.perksList}>
                {(PERKS[plan.id] || []).map(p => (
                  <div key={p} style={styles.perkItem}>
                    <span style={styles.perkTick}>✓</span> {p}
                  </div>
                ))}
              </div>
              <button
                style={{ ...styles.subBtn, ...(isActive ? styles.subBtnActive : plan.popular ? styles.subBtnPopular : {}) }}
                onClick={() => !isActive && subscribe(plan.id)}
                disabled={!!loading || isActive}
              >
                {loading === plan.id ? 'Processing…' : isActive ? 'Current Plan' : 'Subscribe'}
              </button>
              <div style={styles.balanceNote}>Balance needed: R{plan.price.toFixed(2)}</div>
            </div>
          );
        })}
      </div>

      <div style={styles.balanceBar}>
        Your current balance: <span style={{ color: 'var(--orange)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>R{card?.balance?.toFixed(2) || '0.00'}</span>
      </div>
    </div>
  );
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab({ user, card, apiFetch }) {
  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState({ text: '', type: '' });
  const [pwLoading, setPwLoading] = useState(false);

  async function changePassword(e) {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) {
      setPwMsg({ text: 'New passwords do not match', type: 'error' });
      return;
    }
    if (pwForm.newPw.length < 6) {
      setPwMsg({ text: 'Password must be at least 6 characters', type: 'error' });
      return;
    }
    setPwLoading(true);
    setPwMsg({ text: '', type: '' });
    try {
      await apiFetch('/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.newPw })
      });
      setPwMsg({ text: 'Password changed successfully!', type: 'success' });
      setPwForm({ current: '', newPw: '', confirm: '' });
      setShowPwForm(false);
    } catch (err) {
      setPwMsg({ text: err.message, type: 'error' });
    }
    setPwLoading(false);
  }

  return (
    <div>
      <h1 style={styles.pageTitle}>Profile</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 780 }}>

        {/* Profile details card */}
        <div style={styles.profileCard}>
          <div style={styles.profileAvatar}>{initials}</div>
          <div style={styles.profileName}>{user?.fullName}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Buscor Member</div>
          {[['Email', user?.email], ['Phone', user?.phone], ['Card Number', card?.cardNumber], ['Card Status', card?.isActive ? 'Active' : 'Inactive'], ['Member Since', card?.issuedAt]].map(([l, v]) => (
            <div key={l} style={styles.profileRow}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{l}</span>
              <span style={{ fontFamily: l === 'Card Number' ? 'var(--font-mono)' : 'inherit', fontSize: 13 }}>{v || '—'}</span>
            </div>
          ))}
        </div>

        {/* Password change card */}
        <div style={styles.profileCard}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Security</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Manage your password</div>

          {pwMsg.text && (
            <div style={{ ...styles.msgBox, background: pwMsg.type === 'success' ? 'rgba(45,204,110,0.1)' : 'rgba(232,64,28,0.1)', border: `1px solid ${pwMsg.type === 'success' ? 'rgba(45,204,110,0.3)' : 'rgba(232,64,28,0.3)'}`, color: pwMsg.type === 'success' ? '#2dcc6e' : '#f87a5e', marginBottom: 16 }}>
              {pwMsg.text}
            </div>
          )}

          {!showPwForm ? (
            <button style={styles.changePwBtn} onClick={() => { setShowPwForm(true); setPwMsg({ text: '', type: '' }); }}>
              Change Password
            </button>
          ) : (
            <form onSubmit={changePassword}>
              {[['Current password', 'current'], ['New password', 'newPw'], ['Confirm new password', 'confirm']].map(([label, key]) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
                  <input
                    type="password"
                    style={styles.pwInput}
                    value={pwForm[key]}
                    onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder="••••••••"
                    required
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" style={{ ...styles.changePwBtn, flex: 1 }} disabled={pwLoading}>
                  {pwLoading ? 'Saving…' : 'Save Password'}
                </button>
                <button type="button" style={styles.cancelPwBtn} onClick={() => { setShowPwForm(false); setPwMsg({ text: '', type: '' }); }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

      </div>

      {/* QR Code card */}
      {card && (
        <div style={{ ...styles.profileCard, maxWidth: 780, marginTop: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Smart Card QR Code</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Scan this code at any Buscor terminal to board</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{ background: '#fff', padding: 12, borderRadius: 12, display: 'inline-block' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=BUSCOR:${card.cardNumber.replace(/\s/g,'')}&color=0d0d0d&bgcolor=ffffff`}
                alt="Card QR Code"
                width={160}
                height={160}
                style={{ display: 'block', borderRadius: 4 }}
              />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Card Details</div>
              <div style={{ fontSize: 13, marginBottom: 6 }}><span style={{ color: 'var(--text-muted)' }}>Number: </span><span style={{ fontFamily: 'var(--font-mono)' }}>{card.cardNumber}</span></div>
              <div style={{ fontSize: 13, marginBottom: 6 }}><span style={{ color: 'var(--text-muted)' }}>Status: </span><span style={{ color: card.isActive ? '#2dcc6e' : '#7bb8f0' }}>{card.isActive ? 'Active' : 'Frozen'}</span></div>
              <div style={{ fontSize: 13, marginBottom: 16 }}><span style={{ color: 'var(--text-muted)' }}>Holder: </span>{user?.fullName}</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', maxWidth: 200, lineHeight: 1.6 }}>
                This QR code is unique to your card. Do not share it with anyone.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Notifications Tab ───────────────────────────────────────────────────────

function NotificationsTab({ card, subscription, apiFetch }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateNotifications();
  }, [card, subscription]);

  function generateNotifications() {
    const notifs = [];

    // Low balance alert
    if (card) {
      if (card.balance === 0) {
        notifs.push({ id: 'n1', type: 'danger', icon: '⚠', title: 'Zero Balance', message: 'Your card balance is R0.00. Top up now to continue using Buscor services.', time: 'Now', read: false });
      } else if (card.balance < 20) {
        notifs.push({ id: 'n2', type: 'warning', icon: '⚠', title: 'Low Balance Alert', message: `Your balance is running low (R${card.balance.toFixed(2)}). We recommend topping up to avoid service interruption.`, time: 'Just now', read: false });
      } else if (card.balance < 50) {
        notifs.push({ id: 'n3', type: 'warning', icon: '💳', title: 'Balance Reminder', message: `Your current balance is R${card.balance.toFixed(2)}. Consider topping up soon.`, time: '1 hour ago', read: false });
      }

      // Card status
      if (!card.isActive) {
        notifs.push({ id: 'n4', type: 'info', icon: '❄', title: 'Card Frozen', message: 'Your Buscor card is currently frozen. Visit the Dashboard to unfreeze it.', time: 'Recently', read: false });
      }
    }

    // Subscription renewal reminder
    if (subscription && subscription.active) {
      const daysLeft = Math.ceil((new Date(subscription.renewalDate) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 7) {
        notifs.push({ id: 'n5', type: 'warning', icon: '📅', title: 'Subscription Renewing Soon', message: `Your ${subscription.planName} renews in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} on ${subscription.renewalDate}. Ensure sufficient balance.`, time: 'Today', read: false });
      } else {
        notifs.push({ id: 'n6', type: 'success', icon: '✓', title: 'Subscription Active', message: `Your ${subscription.planName} is active and renews on ${subscription.renewalDate}.`, time: 'Today', read: true });
      }
    } else {
      notifs.push({ id: 'n7', type: 'info', icon: '📅', title: 'No Active Subscription', message: 'You have no active subscription. Subscribe to a plan for unlimited travel benefits.', time: 'Today', read: true });
    }

    // Welcome / general
    notifs.push({ id: 'n8', type: 'success', icon: '🎉', title: 'Welcome to Buscor', message: 'Your digital smart card is set up and ready to use. Tap "Take a Trip" to simulate your first journey!', time: 'When you joined', read: true });

    setNotifications(notifs);
    setLoading(false);
  }

  const unread = notifications.filter(n => !n.read).length;

  const typeStyles = {
    danger:  { bg: 'rgba(232,64,28,0.08)',  border: 'rgba(232,64,28,0.25)',  color: '#f87a5e',  dot: '#E8401C' },
    warning: { bg: 'rgba(245,137,58,0.08)', border: 'rgba(245,137,58,0.25)', color: '#F5893A',  dot: '#F5893A' },
    success: { bg: 'rgba(45,204,110,0.08)', border: 'rgba(45,204,110,0.25)', color: '#2dcc6e',  dot: '#2dcc6e' },
    info:    { bg: 'rgba(59,139,212,0.08)', border: 'rgba(59,139,212,0.25)', color: '#7bb8f0',  dot: '#3B8BD4' },
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h1 style={{ ...styles.pageTitle, marginBottom: 0 }}>Notifications</h1>
        {unread > 0 && (
          <span style={{ background: '#E8401C', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600, color: '#fff', fontFamily: 'var(--font-mono)' }}>
            {unread} new
          </span>
        )}
      </div>

      {loading ? (
        <div style={styles.empty}>Loading notifications…</div>
      ) : notifications.length === 0 ? (
        <div style={styles.empty}>No notifications.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notifications.map(n => {
            const t = typeStyles[n.type] || typeStyles.info;
            return (
              <div key={n.id} style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 14, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start', opacity: n.read ? 0.7 : 1 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${t.dot}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {n.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t.color, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {n.title}
                      {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.dot, display: 'inline-block' }} />}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{n.time}</div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{n.message}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Admin Analytics Tab ─────────────────────────────────────────────────────

function AdminAnalyticsTab({ transactions, stats }) {
  const ROUTES = [
    { name: 'Route 1 — Pretoria CBD', fare: 12.50, capacity: 60 },
    { name: 'Route 2 — Sunnyside',    fare: 14.50, capacity: 45 },
    { name: 'Route 3 — Hatfield',     fare: 16.00, capacity: 50 },
    { name: 'Route 4 — Arcadia',      fare: 18.00, capacity: 55 },
    { name: 'Route 5 — Centurion',    fare: 22.00, capacity: 70 },
    { name: 'Route 6 — Menlyn',       fare: 19.50, capacity: 48 },
    { name: 'Route 7 — Mamelodi',     fare: 24.00, capacity: 65 },
  ];

  const HOURS = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];

  // Count trips per route from real transactions
  const routeCounts = {};
  ROUTES.forEach(r => { routeCounts[r.name] = 0; });
  transactions.filter(t => t.type === 'debit' && t.description.startsWith('Route')).forEach(t => {
    if (routeCounts[t.description] !== undefined) routeCounts[t.description]++;
  });

  // Add simulated base counts so heatmap is always interesting
  const BASE = [18, 12, 9, 22, 8, 15, 11];
  const routeData = ROUTES.map((r, i) => ({
    ...r,
    trips: (routeCounts[r.name] || 0) + BASE[i],
    revenue: ((routeCounts[r.name] || 0) + BASE[i]) * r.fare,
  }));

  const maxTrips = Math.max(...routeData.map(r => r.trips));

  // Heatmap: simulate peak hours per route
  const PEAK_PATTERNS = [
    [0,2,8,9,4,2,3,2,3,5,8,9,6,2],
    [0,1,6,7,3,2,2,2,3,4,7,8,5,1],
    [0,1,5,6,4,2,3,3,4,5,6,7,4,1],
    [0,2,9,8,3,1,2,2,3,5,9,8,5,2],
    [0,1,4,5,3,2,2,3,3,4,5,6,3,1],
    [0,1,6,7,4,3,4,4,4,5,7,8,5,2],
    [0,2,8,7,3,2,2,2,3,4,8,7,4,1],
  ];

  function heatColor(val) {
    if (val === 0) return 'rgba(232,64,28,0.05)';
    if (val <= 2) return 'rgba(232,64,28,0.15)';
    if (val <= 4) return 'rgba(232,64,28,0.30)';
    if (val <= 6) return 'rgba(232,64,28,0.50)';
    if (val <= 8) return 'rgba(232,64,28,0.70)';
    return 'rgba(232,64,28,0.90)';
  }

  const totalRevenue = routeData.reduce((s, r) => s + r.revenue, 0);
  const totalTrips = routeData.reduce((s, r) => s + r.trips, 0);
  const busiestRoute = routeData.reduce((a, b) => a.trips > b.trips ? a : b);

  return (
    <div>
      <h1 style={styles.pageTitle}>Admin Analytics</h1>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Trips', value: totalTrips, color: '#E8401C' },
          { label: 'Total Revenue', value: `R${totalRevenue.toFixed(2)}`, color: '#2dcc6e' },
          { label: 'Busiest Route', value: busiestRoute.name.split('—')[0].trim(), color: '#F5893A' },
        ].map(k => (
          <div key={k.label} style={styles.statCard}>
            <div style={{ ...styles.statDot, background: k.color }} />
            <div style={styles.statLabel}>{k.label}</div>
            <div style={{ ...styles.statValue, color: k.color, fontSize: 18 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Route popularity bar chart */}
      <div style={{ ...styles.section, marginBottom: 24, padding: '20px' }}>
        <h2 style={styles.sectionTitle}>Route Popularity</h2>
        {routeData.sort((a,b) => b.trips - a.trips).map(r => (
          <div key={r.name} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.name}</span>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--orange)' }}>{r.trips} trips · R{r.revenue.toFixed(2)}</span>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 4, height: 10, overflow: 'hidden' }}>
              <div style={{ width: `${(r.trips / maxTrips) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #E8401C, #F5893A)', borderRadius: 4, transition: 'width .5s' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div style={{ ...styles.section, padding: '20px', overflowX: 'auto' }}>
        <h2 style={{ ...styles.sectionTitle, marginBottom: 6 }}>Peak Hour Heatmap</h2>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>Darker = more passengers. Use this to deploy more buses during peak hours.</p>

        {/* Hour labels */}
        <div style={{ display: 'grid', gridTemplateColumns: `120px repeat(${HOURS.length}, 1fr)`, gap: 3, minWidth: 700 }}>
          <div />
          {HOURS.map(h => (
            <div key={h} style={{ fontSize: 9, color: 'var(--text-dim)', textAlign: 'center', fontFamily: 'var(--font-mono)', paddingBottom: 4 }}>{h}</div>
          ))}

          {/* Route rows */}
          {ROUTES.map((r, ri) => (
            <>
              <div key={r.name + 'label'} style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', paddingRight: 8 }}>
                {r.name.split('—')[1]?.trim() || r.name}
              </div>
              {PEAK_PATTERNS[ri].map((val, hi) => (
                <div key={hi} style={{ background: heatColor(val), borderRadius: 3, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 8, color: val >= 7 ? '#fff' : 'transparent', fontFamily: 'var(--font-mono)' }}>{val}</span>
                </div>
              ))}
            </>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Low</span>
          {[0.05,0.15,0.30,0.50,0.70,0.90].map(o => (
            <div key={o} style={{ width: 20, height: 12, borderRadius: 2, background: `rgba(232,64,28,${o})` }} />
          ))}
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>High</span>
        </div>
      </div>

      {/* Recommendations */}
      <div style={{ ...styles.section, marginTop: 24, padding: '20px' }}>
        <h2 style={styles.sectionTitle}>Management Recommendations</h2>
        {[
          { icon: '🚌', text: `Deploy extra buses on ${busiestRoute.name} during 08:00–09:00 and 16:00–17:00 peak hours.` },
          { icon: '💰', text: `Route 5 — Centurion generates the highest revenue per trip at R22.00. Consider increasing frequency.` },
          { icon: '📊', text: `Off-peak hours (10:00–14:00) show consistently low demand across all routes. Reduce bus frequency to cut operating costs.` },
          { icon: '🔔', text: `Send push notifications to passengers 30 minutes before peak hours to encourage early boarding.` },
        ].map((rec, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 18 }}>{rec.icon}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{rec.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Family Cards Tab ─────────────────────────────────────────────────────────

function FamilyTab({ card, apiFetch }) {
  const [subCards, setSubCards] = useState([
    { id: 'sc1', name: 'Thabo — School', holder: 'Thabo Malandule', balance: 45.00, cardNumber: '4822 8800 1111 2222', isActive: true, color: '#3B8BD4' },
    { id: 'sc2', name: 'Nomsa — Work',   holder: 'Nomsa Malandule',  balance: 120.50, cardNumber: '4822 8800 3333 4444', isActive: true, color: '#2dcc6e' },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newHolder, setNewHolder] = useState('');
  const [transferId, setTransferId] = useState(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [masterBalance, setMasterBalance] = useState(card?.balance || 0);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => { setMasterBalance(card?.balance || 0); }, [card]);

  function addCard() {
    if (!newName || !newHolder) { setMsg({ text: 'Please fill in all fields', type: 'error' }); return; }
    if (subCards.length >= 5) { setMsg({ text: 'Maximum 5 family cards allowed', type: 'error' }); return; }
    const colors = ['#E8401C', '#F5893A', '#3B8BD4', '#2dcc6e', '#9B59B6'];
    const newCard = {
      id: 'sc' + Date.now(),
      name: newName,
      holder: newHolder,
      balance: 0,
      cardNumber: `4822 8800 ${Math.floor(1000+Math.random()*9000)} ${Math.floor(1000+Math.random()*9000)}`,
      isActive: true,
      color: colors[subCards.length]
    };
    setSubCards(prev => [...prev, newCard]);
    setNewName(''); setNewHolder(''); setShowAdd(false);
    setMsg({ text: `${newName} card added successfully!`, type: 'success' });
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  }

  function transfer(scId) {
    const amount = parseFloat(transferAmount);
    if (!amount || amount < 5) { setMsg({ text: 'Minimum transfer is R5', type: 'error' }); return; }
    if (amount > masterBalance) { setMsg({ text: `Insufficient master balance. You have R${masterBalance.toFixed(2)}`, type: 'error' }); return; }
    setSubCards(prev => prev.map(sc => sc.id === scId ? { ...sc, balance: Math.round((sc.balance + amount) * 100) / 100 } : sc));
    setMasterBalance(prev => Math.round((prev - amount) * 100) / 100);
    const sc = subCards.find(s => s.id === scId);
    setMsg({ text: `R${amount.toFixed(2)} transferred to ${sc.name}`, type: 'success' });
    setTransferId(null); setTransferAmount('');
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  }

  function toggleFreeze(scId) {
    setSubCards(prev => prev.map(sc => sc.id === scId ? { ...sc, isActive: !sc.isActive } : sc));
  }

  function removeCard(scId) {
    if (!window.confirm('Remove this family card?')) return;
    setSubCards(prev => prev.filter(sc => sc.id !== scId));
  }

  const totalFamily = subCards.reduce((s, c) => s + c.balance, 0);

  return (
    <div>
      <h1 style={styles.pageTitle}>Family Cards</h1>

      {msg.text && (
        <div style={{ borderRadius: 10, padding: '12px 16px', fontSize: 13, marginBottom: 20, background: msg.type === 'success' ? 'rgba(45,204,110,0.1)' : 'rgba(232,64,28,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(45,204,110,0.3)' : 'rgba(232,64,28,0.3)'}`, color: msg.type === 'success' ? '#2dcc6e' : '#f87a5e' }}>
          {msg.text}
        </div>
      )}

      {/* Master account summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statDot, background: '#E8401C' }} />
          <div style={styles.statLabel}>Master Balance</div>
          <div style={{ ...styles.statValue, color: '#E8401C' }}>R{masterBalance.toFixed(2)}</div>
          <div style={styles.statSub}>your main card</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statDot, background: '#2dcc6e' }} />
          <div style={styles.statLabel}>Family Total</div>
          <div style={{ ...styles.statValue, color: '#2dcc6e' }}>R{totalFamily.toFixed(2)}</div>
          <div style={styles.statSub}>across all sub-cards</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statDot, background: '#F5893A' }} />
          <div style={styles.statLabel}>Sub-Cards</div>
          <div style={{ ...styles.statValue, color: '#F5893A' }}>{subCards.length} / 5</div>
          <div style={styles.statSub}>family members</div>
        </div>
      </div>

      {/* Sub-cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, marginBottom: 20 }}>
        {subCards.map(sc => (
          <div key={sc.id} style={{ background: 'var(--bg2)', border: `1px solid ${sc.isActive ? sc.color + '44' : 'var(--border)'}`, borderRadius: 16, padding: '20px', opacity: sc.isActive ? 1 : 0.6 }}>
            {/* Card header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{sc.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sc.holder}</div>
              </div>
              <div style={{ background: sc.isActive ? sc.color + '22' : 'rgba(255,255,255,0.05)', border: `1px solid ${sc.isActive ? sc.color + '44' : 'var(--border)'}`, borderRadius: 6, padding: '3px 8px', fontSize: 9, fontFamily: 'var(--font-mono)', color: sc.isActive ? sc.color : 'var(--text-dim)' }}>
                {sc.isActive ? 'ACTIVE' : 'FROZEN'}
              </div>
            </div>

            {/* Balance */}
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px', marginBottom: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>BALANCE</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)', color: sc.color }}>R{sc.balance.toFixed(2)}</div>
              <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 4, letterSpacing: 2 }}>{sc.cardNumber}</div>
            </div>

            {/* Transfer */}
            {transferId === sc.id ? (
              <div style={{ marginBottom: 10 }}>
                <input
                  style={{ ...styles.pwInput, marginBottom: 8 }}
                  type="number" placeholder="Amount to transfer (R)"
                  value={transferAmount} onChange={e => setTransferAmount(e.target.value)}
                  min={5} max={masterBalance}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={{ ...styles.changePwBtn, flex: 1, fontSize: 12, padding: '8px' }} onClick={() => transfer(sc.id)}>Transfer</button>
                  <button style={{ ...styles.cancelPwBtn, fontSize: 12, padding: '8px 12px' }} onClick={() => { setTransferId(null); setTransferAmount(''); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={{ flex: 1, background: sc.color + '22', border: `1px solid ${sc.color}44`, borderRadius: 8, padding: '8px', fontSize: 11, fontWeight: 600, color: sc.color, cursor: 'pointer' }}
                  onClick={() => setTransferId(sc.id)}>
                  💸 Transfer Funds
                </button>
                <button style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }}
                  onClick={() => toggleFreeze(sc.id)}>
                  {sc.isActive ? '❄' : '▶'}
                </button>
                <button style={{ background: 'var(--bg)', border: '1px solid rgba(232,64,28,0.3)', borderRadius: 8, padding: '8px 10px', fontSize: 11, color: '#f87a5e', cursor: 'pointer' }}
                  onClick={() => removeCard(sc.id)}>
                  🗑
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add card button */}
        {subCards.length < 5 && !showAdd && (
          <div style={{ background: 'var(--bg2)', border: '1px dashed var(--border)', borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', minHeight: 200 }}
            onClick={() => setShowAdd(true)}>
            <div style={{ fontSize: 28 }}>+</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Add Family Member</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{5 - subCards.length} slots remaining</div>
          </div>
        )}

        {/* Add card form */}
        {showAdd && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>New Family Card</div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>Card Label</div>
              <input style={styles.pwInput} placeholder="e.g. Thabo — School" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>Cardholder Name</div>
              <input style={styles.pwInput} placeholder="e.g. Thabo Malandule" value={newHolder} onChange={e => setNewHolder(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...styles.changePwBtn, flex: 1 }} onClick={addCard}>Add Card</button>
              <button style={styles.cancelPwBtn} onClick={() => { setShowAdd(false); setNewName(''); setNewHolder(''); }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
        💡 Transfer funds from your master card to any family member's sub-card instantly. Each sub-card can be frozen individually if lost or stolen.
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `Today ${d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`;
  if (diff < 172800000) return `Yesterday ${d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

const navItems = [
  { id: 'home', icon: '⬛', label: 'Dashboard' },
  { id: 'history', icon: '📋', label: 'Trip History' },
  { id: 'subscription', icon: '📅', label: 'Subscriptions' },
  { id: 'notifications', icon: '🔔', label: 'Notifications' },
  { id: 'family', icon: '👨‍👩‍👧', label: 'Family Cards' },
  { id: 'analytics', icon: '📈', label: 'Admin Analytics' },
  { id: 'profile', icon: '👤', label: 'Profile' }
];

const styles = {
  wrap: { display: 'flex', minHeight: '100vh' },
  sidebar: { width: 220, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0 },
  sideLogoWrap: { display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px 28px' },
  sideLogoRing: { width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#E8401C,#F5893A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: '#fff' },
  sideLogoText: { fontSize: 16, fontWeight: 600, letterSpacing: '-0.3px' },
  nav: { flex: 1, padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2 },
  navBtn: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 13, fontWeight: 500, textAlign: 'left', transition: 'all .15s', width: '100%' },
  navBtnActive: { background: 'rgba(232,64,28,0.12)', color: 'var(--orange)' },
  navIcon: { fontSize: 14, width: 18, textAlign: 'center' },
  sideUser: { display: 'flex', alignItems: 'center', gap: 8, padding: '16px 16px 0', borderTop: '1px solid var(--border)', marginTop: 16 },
  avatar: { width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#E8401C,#F5893A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0 },
  sideUserInfo: { flex: 1, overflow: 'hidden' },
  logoutBtn: { border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 16, padding: 4, borderRadius: 6, flexShrink: 0 },
  main: { flex: 1, padding: '32px 40px', overflowY: 'auto', maxWidth: 900 },
  pageTitle: { fontSize: 22, fontWeight: 600, marginBottom: 24 },
  balanceCard: { position: 'relative', background: 'linear-gradient(160deg, #1e0c06, #2a1208)', border: '1px solid rgba(232,64,28,0.2)', borderRadius: 20, padding: '28px 28px 24px', marginBottom: 24, overflow: 'hidden' },
  balCardBg: { position: 'absolute', right: -40, top: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(232,64,28,0.2), transparent 70%)', pointerEvents: 'none' },
  balLabel: { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.5)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  balAmount: { fontSize: 42, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: -2, marginBottom: 12 },
  balCurrency: { fontSize: 20, fontWeight: 400, color: 'var(--orange)', verticalAlign: 'super', marginRight: 2 },
  balCardNum: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, marginBottom: 16 },
  topUpBtn: { background: 'linear-gradient(135deg, #E8401C, #F5893A)', border: 'none', borderRadius: 8, padding: '9px 18px', color: '#fff', fontSize: 13, fontWeight: 600 },
  tripBtn: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '9px 18px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  tripMsg: { borderRadius: 10, padding: '12px 16px', fontSize: 13, marginBottom: 20 },
  freezeBtn: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 18px', color: '#aaa', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  freezeBtnActive: { background: 'rgba(59,139,212,0.2)', border: '1px solid rgba(59,139,212,0.4)', color: '#7bb8f0' },
  balanceCardFrozen: { background: 'linear-gradient(160deg, #0a0e1a, #101828)', border: '1px solid rgba(59,139,212,0.3)' },
  frozenBanner: { background: 'rgba(59,139,212,0.15)', border: '1px solid rgba(59,139,212,0.3)', borderRadius: 8, padding: '6px 12px', fontSize: 11, color: '#7bb8f0', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 12, display: 'inline-block' },
  statCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', position: 'relative', overflow: 'hidden' },
  statDot: { width: 6, height: 6, borderRadius: '50%', marginBottom: 10 },
  statLabel: { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: -1, marginBottom: 2 },
  statSub: { fontSize: 11, color: 'var(--text-dim)' },
  section: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 20px 8px' },
  sectionTitle: { fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'var(--font-mono)' },
  txRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' },
  txIcon: { width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 13, fontWeight: 500, marginBottom: 2 },
  txTime: { fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
  txAmount: { fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)' },
  empty: { color: 'var(--text-dim)', fontSize: 14, padding: '24px 0', textAlign: 'center' },
  subCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px', maxWidth: 440 },
  subBadge: { display: 'inline-block', background: 'rgba(45,204,110,0.12)', border: '1px solid rgba(45,204,110,0.2)', borderRadius: 6, padding: '3px 10px', fontSize: 10, fontFamily: 'var(--font-mono)', color: '#2dcc6e', letterSpacing: 1, marginBottom: 14 },
  subName: { fontSize: 18, fontWeight: 600, marginBottom: 8 },
  subPrice: { fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--orange)', marginBottom: 20 },
  subRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' },
  profileCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px', maxWidth: 440, textAlign: 'center' },
  profileAvatar: { width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#E8401C,#F5893A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 600, color: '#fff', margin: '0 auto 14px' },
  profileName: { fontSize: 20, fontWeight: 600, marginBottom: 4 },
  profileRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--border)', textAlign: 'left' },
  msgBox: { borderRadius: 10, padding: '12px 16px', fontSize: 13, marginBottom: 20 },
  activeBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(45,204,110,0.08)', border: '1px solid rgba(45,204,110,0.2)', borderRadius: 14, padding: '16px 20px', marginBottom: 24 },
  cancelBtn: { background: 'transparent', border: '1px solid rgba(232,64,28,0.4)', borderRadius: 8, padding: '8px 16px', color: '#f87a5e', fontSize: 12, cursor: 'pointer' },
  plansGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 },
  planCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 20px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' },
  planCardPopular: { border: '1px solid rgba(232,64,28,0.4)' },
  planCardActive: { border: '1px solid rgba(45,204,110,0.4)', background: 'rgba(45,204,110,0.04)' },
  popularBadge: { display: 'inline-block', background: 'linear-gradient(135deg,#E8401C,#F5893A)', borderRadius: 6, padding: '3px 10px', fontSize: 9, fontFamily: 'var(--font-mono)', color: '#fff', letterSpacing: 1, marginBottom: 12 },
  activePlanBadge: { display: 'inline-block', background: 'rgba(45,204,110,0.15)', border: '1px solid rgba(45,204,110,0.3)', borderRadius: 6, padding: '3px 10px', fontSize: 9, fontFamily: 'var(--font-mono)', color: '#2dcc6e', letterSpacing: 1, marginBottom: 12 },
  planName: { fontSize: 15, fontWeight: 600, marginBottom: 8 },
  planPrice: { fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: -1, marginBottom: 16 },
  planCur: { fontSize: 14, color: 'var(--orange)', verticalAlign: 'super' },
  planPeriod: { fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 },
  perksList: { flex: 1, marginBottom: 20 },
  perkItem: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 },
  perkTick: { color: '#2dcc6e', fontWeight: 600 },
  subBtn: { width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '10px', color: 'var(--text-muted)', fontSize: 13, fontWeight: 500, background: 'var(--bg)', cursor: 'pointer', marginBottom: 8 },
  subBtnPopular: { background: 'linear-gradient(135deg,#E8401C,#F5893A)', border: 'none', color: '#fff' },
  subBtnActive: { background: 'rgba(45,204,110,0.1)', border: '1px solid rgba(45,204,110,0.3)', color: '#2dcc6e', cursor: 'default' },
  balanceNote: { fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textAlign: 'center' },
  balanceBar: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' },
  changePwBtn: { width: '100%', background: 'linear-gradient(135deg,#E8401C,#F5893A)', border: 'none', borderRadius: 8, padding: '10px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  cancelPwBtn: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 16px', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' },
  pwInput: { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, outline: 'none' }
};
