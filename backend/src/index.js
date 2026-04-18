const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 4000;
const JWT_SECRET = 'buscor_secret_2026';

app.use(cors());
app.use(express.json());

// ─── In-memory "database" ───────────────────────────────────────────────────

const users = [
  {
    id: 'u1',
    fullName: 'Thembi Dlamini',
    email: 'thembi@demo.com',
    phone: '082 555 0101',
    passwordHash: bcrypt.hashSync('password123', 10),
    createdAt: '2025-01-15'
  },
  {
    id: 'u2',
    fullName: 'Sipho Nkosi',
    email: 'sipho@demo.com',
    phone: '073 222 0303',
    passwordHash: bcrypt.hashSync('password123', 10),
    createdAt: '2025-03-20'
  }
];

const cards = [
  { id: 'c1', userId: 'u1', cardNumber: '4822 8800 1234 8821', balance: 247.50, isActive: true, issuedAt: '2025-01-16' },
  { id: 'c2', userId: 'u2', cardNumber: '4822 8800 5678 3342', balance: 89.00, isActive: true, issuedAt: '2025-03-21' }
];

const transactions = [
  { id: 't1', cardId: 'c1', type: 'debit',  amount: 14.50, status: 'completed', description: 'Route 4 — Pretoria CBD',    createdAt: new Date(Date.now() - 1*3600000).toISOString() },
  { id: 't2', cardId: 'c1', type: 'credit', amount: 100.00, status: 'completed', description: 'Top-Up via SnapScan',       createdAt: new Date(Date.now() - 26*3600000).toISOString() },
  { id: 't3', cardId: 'c1', type: 'debit',  amount: 18.00, status: 'completed', description: 'Route 7 — Arcadia',         createdAt: new Date(Date.now() - 27*3600000).toISOString() },
  { id: 't4', cardId: 'c1', type: 'debit',  amount: 14.50, status: 'completed', description: 'Route 4 — Pretoria CBD',    createdAt: new Date(Date.now() - 50*3600000).toISOString() },
  { id: 't5', cardId: 'c1', type: 'credit', amount: 200.00, status: 'completed', description: 'Top-Up via Card',          createdAt: new Date(Date.now() - 75*3600000).toISOString() },
  { id: 't6', cardId: 'c2', type: 'debit',  amount: 22.00, status: 'completed', description: 'Route 2 — Sunnyside',       createdAt: new Date(Date.now() - 2*3600000).toISOString() },
  { id: 't7', cardId: 'c2', type: 'credit', amount: 150.00, status: 'completed', description: 'Top-Up via EFT',           createdAt: new Date(Date.now() - 49*3600000).toISOString() }
];

const subscriptions = [
  { id: 's1', cardId: 'c1', planName: 'Monthly Commuter Pass', monthlyAmount: 350.00, renewalDate: '2026-05-01', active: true, planId: 'monthly' }
];

// Available plans catalogue
const PLANS = [
  { id: 'weekly',  name: 'Weekly Pass',        price: 89.00,  period: 'week',  description: 'Unlimited trips for 7 days', perks: ['Unlimited trips', 'Valid 7 days', 'All routes'] },
  { id: 'monthly', name: 'Monthly Commuter',   price: 350.00, period: 'month', description: 'Best value for daily commuters', perks: ['Unlimited trips', 'Valid 30 days', 'All routes', 'Priority boarding'] },
  { id: 'premium', name: 'Premium Pass',       price: 600.00, period: 'month', description: 'All routes + express services', perks: ['Unlimited trips', 'Valid 30 days', 'All routes', 'Express services', 'Lounge access'] },
];

// ─── Middleware ──────────────────────────────────────────────────────────────

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function getCard(userId) {
  return cards.find(c => c.userId === userId);
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// POST /auth/login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
  res.json({
    token,
    user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone }
  });
});

// POST /auth/register
app.post('/auth/register', async (req, res) => {
  const { fullName, email, phone, password } = req.body;
  if (users.find(u => u.email === email.toLowerCase().trim())) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  const newUser = {
    id: uuidv4(),
    fullName,
    email: email.toLowerCase().trim(),
    phone,
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: new Date().toISOString().split('T')[0]
  };
  users.push(newUser);
  const newCard = {
    id: uuidv4(),
    userId: newUser.id,
    cardNumber: `4822 8800 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
    balance: 0,
    isActive: true,
    issuedAt: new Date().toISOString().split('T')[0]
  };
  cards.push(newCard);
  const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '24h' });
  res.status(201).json({
    token,
    user: { id: newUser.id, fullName: newUser.fullName, email: newUser.email, phone: newUser.phone }
  });
});

// GET /me
app.get('/me', auth, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  const card = getCard(req.user.userId);
  res.json({ user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone }, card });
});

// GET /transactions
app.get('/transactions', auth, (req, res) => {
  const card = getCard(req.user.userId);
  if (!card) return res.json([]);
  const txs = transactions
    .filter(t => t.cardId === card.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(txs);
});

// GET /subscriptions
app.get('/subscriptions', auth, (req, res) => {
  const card = getCard(req.user.userId);
  if (!card) return res.json([]);
  res.json(subscriptions.filter(s => s.cardId === card.id));
});

// POST /topup — payment simulation
app.post('/topup', auth, (req, res) => {
  const { amount, method } = req.body;
  if (!amount || amount < 10 || amount > 5000) {
    return res.status(400).json({ error: 'Amount must be between R10 and R5000' });
  }

  // Simulate payment gateway — 90% success rate
  const paymentSuccess = Math.random() > 0.1;
  if (!paymentSuccess) {
    return res.status(402).json({ error: 'Payment declined by gateway. Please try again.' });
  }

  const card = getCard(req.user.userId);
  if (!card) return res.status(404).json({ error: 'Card not found' });

  card.balance = Math.round((card.balance + parseFloat(amount)) * 100) / 100;

  const tx = {
    id: uuidv4(),
    cardId: card.id,
    type: 'credit',
    amount: parseFloat(amount),
    status: 'completed',
    description: `Top-Up via ${method || 'Card'}`,
    createdAt: new Date().toISOString()
  };
  transactions.push(tx);

  res.json({ success: true, newBalance: card.balance, transaction: tx });
});

// GET /stats — admin-style summary for dashboard charts
app.get('/stats', auth, (req, res) => {
  const card = getCard(req.user.userId);
  if (!card) return res.json({ totalSpent: 0, totalLoaded: 0, tripCount: 0 });
  const txs = transactions.filter(t => t.cardId === card.id);
  const totalSpent  = txs.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
  const totalLoaded = txs.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const tripCount   = txs.filter(t => t.type === 'debit').length;
  res.json({ totalSpent: Math.round(totalSpent * 100) / 100, totalLoaded: Math.round(totalLoaded * 100) / 100, tripCount });
});

// GET /plans — list available subscription plans
app.get('/plans', auth, (req, res) => {
  res.json(PLANS);
});

// POST /subscribe — subscribe to a plan
app.post('/subscribe', auth, (req, res) => {
  const { planId } = req.body;
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return res.status(400).json({ error: 'Invalid plan' });

  const card = getCard(req.user.userId);
  if (!card) return res.status(404).json({ error: 'Card not found' });

  if (card.balance < plan.price) {
    return res.status(402).json({ error: `Insufficient balance. You need R${plan.price.toFixed(2)} but have R${card.balance.toFixed(2)}` });
  }

  // Cancel any existing active subscription
  subscriptions.forEach(s => { if (s.cardId === card.id) s.active = false; });

  // Deduct from balance
  card.balance = Math.round((card.balance - plan.price) * 100) / 100;

  // Calculate renewal date
  const renewal = new Date();
  if (plan.period === 'week') renewal.setDate(renewal.getDate() + 7);
  else renewal.setMonth(renewal.getMonth() + 1);
  const renewalDate = renewal.toISOString().split('T')[0];

  // Create subscription
  const sub = {
    id: uuidv4(),
    cardId: card.id,
    planId: plan.id,
    planName: plan.name,
    monthlyAmount: plan.price,
    period: plan.period,
    renewalDate,
    active: true,
    startedAt: new Date().toISOString()
  };
  subscriptions.push(sub);

  // Log as transaction
  transactions.push({
    id: uuidv4(),
    cardId: card.id,
    type: 'debit',
    amount: plan.price,
    status: 'completed',
    description: `Subscription: ${plan.name}`,
    createdAt: new Date().toISOString()
  });

  res.json({ success: true, subscription: sub, newBalance: card.balance });
});

// POST /cancel-subscription — cancel active subscription
app.post('/cancel-subscription', auth, (req, res) => {
  const card = getCard(req.user.userId);
  if (!card) return res.status(404).json({ error: 'Card not found' });

  const sub = subscriptions.find(s => s.cardId === card.id && s.active);
  if (!sub) return res.status(404).json({ error: 'No active subscription found' });

  sub.active = false;
  res.json({ success: true, message: 'Subscription cancelled successfully' });
});

// POST /trip — simulate taking a bus trip
app.post('/trip', auth, (req, res) => {
  const { route, fare } = req.body;
  const card = getCard(req.user.userId);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  if (!card.isActive) return res.status(403).json({ error: 'Card is inactive' });
  if (card.balance < fare) return res.status(402).json({ error: `Insufficient balance. You need R${fare.toFixed(2)} but have R${card.balance.toFixed(2)}` });

  card.balance = Math.round((card.balance - fare) * 100) / 100;

  const tx = {
    id: uuidv4(),
    cardId: card.id,
    type: 'debit',
    amount: fare,
    status: 'completed',
    description: route,
    createdAt: new Date().toISOString()
  };
  transactions.push(tx);

  res.json({ success: true, newBalance: card.balance, transaction: tx });
});

// POST /freeze-card — freeze or unfreeze card
app.post('/freeze-card', auth, (req, res) => {
  const { action } = req.body;
  const card = getCard(req.user.userId);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  card.isActive = action === 'unfreeze';
  res.json({ success: true, isActive: card.isActive, message: `Card ${action}d successfully` });
});

// POST /change-password
app.post('/change-password', auth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = users.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!bcrypt.compareSync(currentPassword, user.passwordHash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  res.json({ success: true, message: 'Password changed successfully' });
});

app.listen(PORT, () => console.log(`Buscor API running on http://localhost:${PORT}`));
