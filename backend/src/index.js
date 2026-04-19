const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = 4000;
const JWT_SECRET = 'buscor_secret_2026';
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mlobitech_db_user:DaANAy3NLofVkOqt@cluster0.mmobahb.mongodb.net/?appName=Cluster0';
const DB_NAME = 'buscor';

app.use(cors());
app.use(express.json());

let db;

// ─── Connect to MongoDB ───────────────────────────────────────────────────────
async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log('Connected to MongoDB Atlas');

  // Seed demo users if not exist
  const users = db.collection('users');
  const existing = await users.findOne({ email: 'mike@demo.com' });
  if (!existing) {
    const mikeId = uuidv4();
    const siphoId = uuidv4();
    const mikeCardId = uuidv4();
    const siphoCardId = uuidv4();

    await users.insertMany([
      { id: mikeId, fullName: 'Michael Malandule', email: 'mike@demo.com', phone: '072 533 5234', passwordHash: bcrypt.hashSync('password123', 10), createdAt: '2026-01-15' },
      { id: siphoId, fullName: 'Sipho Nkosi', email: 'sipho@demo.com', phone: '073 222 0303', passwordHash: bcrypt.hashSync('password123', 10), createdAt: '2026-03-20' }
    ]);

    await db.collection('cards').insertMany([
      { id: mikeCardId, userId: mikeId, cardNumber: '4822 8800 7253 5234', balance: 347.50, isActive: true, issuedAt: '2026-01-15' },
      { id: siphoCardId, userId: siphoId, cardNumber: '4822 8800 5678 3342', balance: 89.00, isActive: true, issuedAt: '2026-03-21' }
    ]);

    const now = Date.now();
    await db.collection('transactions').insertMany([
      { id: uuidv4(), cardId: mikeCardId, type: 'debit',  amount: 14.50, status: 'completed', description: 'Route 4 — Pretoria CBD', createdAt: new Date(now - 1*3600000).toISOString() },
      { id: uuidv4(), cardId: mikeCardId, type: 'credit', amount: 200.00, status: 'completed', description: 'Top-Up via SnapScan',    createdAt: new Date(now - 26*3600000).toISOString() },
      { id: uuidv4(), cardId: mikeCardId, type: 'debit',  amount: 18.00, status: 'completed', description: 'Route 7 — Arcadia',      createdAt: new Date(now - 27*3600000).toISOString() },
      { id: uuidv4(), cardId: mikeCardId, type: 'credit', amount: 500.00, status: 'completed', description: 'Top-Up via Card',       createdAt: new Date(now - 75*3600000).toISOString() },
    ]);

    await db.collection('subscriptions').insertMany([
      { id: uuidv4(), cardId: mikeCardId, planId: 'monthly', planName: 'Monthly Commuter Pass', monthlyAmount: 350.00, period: 'month', renewalDate: '2026-05-19', active: true, startedAt: new Date().toISOString() }
    ]);

    console.log('Demo data seeded');
  }
}

// ─── Plans ────────────────────────────────────────────────────────────────────
const PLANS = [
  { id: 'weekly',  name: 'Weekly Pass',       price: 89.00,  period: 'week'  },
  { id: 'monthly', name: 'Monthly Commuter',  price: 350.00, period: 'month' },
  { id: 'premium', name: 'Premium Pass',      price: 600.00, period: 'month' },
];

// ─── Middleware ───────────────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

async function getCard(userId) {
  return db.collection('cards').findOne({ userId });
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.collection('users').findOne({ email: email.toLowerCase().trim() });
  if (!user || !bcrypt.compareSync(password, user.passwordHash))
    return res.status(401).json({ error: 'Invalid email or password' });
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone } });
});

app.post('/auth/register', async (req, res) => {
  const { fullName, email, phone, password } = req.body;
  const exists = await db.collection('users').findOne({ email: email.toLowerCase().trim() });
  if (exists) return res.status(400).json({ error: 'Email already registered' });
  const newUser = { id: uuidv4(), fullName, email: email.toLowerCase().trim(), phone, passwordHash: bcrypt.hashSync(password, 10), createdAt: new Date().toISOString().split('T')[0] };
  await db.collection('users').insertOne(newUser);
  const newCard = { id: uuidv4(), userId: newUser.id, cardNumber: `4822 8800 ${Math.floor(1000+Math.random()*9000)} ${Math.floor(1000+Math.random()*9000)}`, balance: 0, isActive: true, issuedAt: new Date().toISOString().split('T')[0] };
  await db.collection('cards').insertOne(newCard);
  const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '24h' });
  res.status(201).json({ token, user: { id: newUser.id, fullName: newUser.fullName, email: newUser.email, phone: newUser.phone } });
});

app.get('/me', auth, async (req, res) => {
  const user = await db.collection('users').findOne({ id: req.user.userId });
  const card = await getCard(req.user.userId);
  res.json({ user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone }, card });
});

app.get('/transactions', auth, async (req, res) => {
  const card = await getCard(req.user.userId);
  if (!card) return res.json([]);
  const txs = await db.collection('transactions').find({ cardId: card.id }).sort({ createdAt: -1 }).toArray();
  res.json(txs);
});

app.get('/subscriptions', auth, async (req, res) => {
  const card = await getCard(req.user.userId);
  if (!card) return res.json([]);
  const subs = await db.collection('subscriptions').find({ cardId: card.id }).toArray();
  res.json(subs);
});

app.get('/stats', auth, async (req, res) => {
  const card = await getCard(req.user.userId);
  if (!card) return res.json({ totalSpent: 0, totalLoaded: 0, tripCount: 0 });
  const txs = await db.collection('transactions').find({ cardId: card.id }).toArray();
  const totalSpent  = txs.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
  const totalLoaded = txs.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const tripCount   = txs.filter(t => t.type === 'debit').length;
  res.json({ totalSpent: Math.round(totalSpent*100)/100, totalLoaded: Math.round(totalLoaded*100)/100, tripCount });
});

app.post('/topup', auth, async (req, res) => {
  const { amount, method } = req.body;
  if (!amount || amount < 10 || amount > 5000) return res.status(400).json({ error: 'Amount must be between R10 and R5000' });
  if (Math.random() > 0.9) return res.status(402).json({ error: 'Payment declined by gateway. Please try again.' });
  const card = await getCard(req.user.userId);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  const newBalance = Math.round((card.balance + parseFloat(amount)) * 100) / 100;
  await db.collection('cards').updateOne({ id: card.id }, { $set: { balance: newBalance } });
  const tx = { id: uuidv4(), cardId: card.id, type: 'credit', amount: parseFloat(amount), status: 'completed', description: `Top-Up via ${method || 'Card'}`, createdAt: new Date().toISOString() };
  await db.collection('transactions').insertOne(tx);
  res.json({ success: true, newBalance, transaction: tx });
});

app.post('/trip', auth, async (req, res) => {
  const { route, fare } = req.body;
  const card = await getCard(req.user.userId);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  if (!card.isActive) return res.status(403).json({ error: 'Card is inactive' });
  if (card.balance < fare) return res.status(402).json({ error: `Insufficient balance. You need R${fare.toFixed(2)} but have R${card.balance.toFixed(2)}` });
  const newBalance = Math.round((card.balance - fare) * 100) / 100;
  await db.collection('cards').updateOne({ id: card.id }, { $set: { balance: newBalance } });
  const tx = { id: uuidv4(), cardId: card.id, type: 'debit', amount: fare, status: 'completed', description: route, createdAt: new Date().toISOString() };
  await db.collection('transactions').insertOne(tx);
  res.json({ success: true, newBalance, transaction: tx });
});

app.get('/plans', auth, (req, res) => res.json(PLANS));

app.post('/subscribe', auth, async (req, res) => {
  const { planId } = req.body;
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return res.status(400).json({ error: 'Invalid plan' });
  const card = await getCard(req.user.userId);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  if (card.balance < plan.price) return res.status(402).json({ error: `Insufficient balance. You need R${plan.price.toFixed(2)} but have R${card.balance.toFixed(2)}` });
  await db.collection('subscriptions').updateMany({ cardId: card.id }, { $set: { active: false } });
  const newBalance = Math.round((card.balance - plan.price) * 100) / 100;
  await db.collection('cards').updateOne({ id: card.id }, { $set: { balance: newBalance } });
  const renewal = new Date();
  if (plan.period === 'week') renewal.setDate(renewal.getDate() + 7);
  else renewal.setMonth(renewal.getMonth() + 1);
  const sub = { id: uuidv4(), cardId: card.id, planId: plan.id, planName: plan.name, monthlyAmount: plan.price, period: plan.period, renewalDate: renewal.toISOString().split('T')[0], active: true, startedAt: new Date().toISOString() };
  await db.collection('subscriptions').insertOne(sub);
  await db.collection('transactions').insertOne({ id: uuidv4(), cardId: card.id, type: 'debit', amount: plan.price, status: 'completed', description: `Subscription: ${plan.name}`, createdAt: new Date().toISOString() });
  res.json({ success: true, subscription: sub, newBalance });
});

app.post('/cancel-subscription', auth, async (req, res) => {
  const card = await getCard(req.user.userId);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  await db.collection('subscriptions').updateMany({ cardId: card.id, active: true }, { $set: { active: false } });
  res.json({ success: true, message: 'Subscription cancelled' });
});

app.post('/freeze-card', auth, async (req, res) => {
  const { action } = req.body;
  const card = await getCard(req.user.userId);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  const isActive = action === 'unfreeze';
  await db.collection('cards').updateOne({ id: card.id }, { $set: { isActive } });
  res.json({ success: true, isActive });
});

app.post('/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await db.collection('users').findOne({ id: req.user.userId });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!bcrypt.compareSync(currentPassword, user.passwordHash)) return res.status(401).json({ error: 'Current password is incorrect' });
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  await db.collection('users').updateOne({ id: user.id }, { $set: { passwordHash: bcrypt.hashSync(newPassword, 10) } });
  res.json({ success: true });
});

// ─── Start ────────────────────────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => console.log(`Buscor API running on http://localhost:${PORT}`));
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});
