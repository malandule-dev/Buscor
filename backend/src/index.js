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
  { id: 's1', cardId: 'c1', planName: 'Monthly Commuter Pass', monthlyAmount: 350.00, renewalDate: '2026-05-01', active: true }
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

app.listen(PORT, () => console.log(`Buscor API running on http://localhost:${PORT}`));
