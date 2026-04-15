# Buscor Smart Card System — Working Prototype

A full-stack web application for the Buscor digital transit card system.
Built with React (frontend) and Node.js/Express (backend).

---

## Project Structure

```
buscor/
├── backend/          # Node.js + Express REST API
│   └── src/
│       └── index.js  # All routes and in-memory data
└── frontend/         # React app
    └── src/
        ├── App.js
        ├── context/AuthContext.js   # Auth + API state
        ├── pages/
        │   ├── LoginPage.js         # Login & Register
        │   └── Dashboard.js         # Main dashboard
        └── components/
            ├── TopUpModal.js        # Payment simulation modal
            └── TransactionList.js   # Trip history table
```

---

## Setup & Running

### 1. Start the Backend

```bash
cd backend
npm install
node src/index.js
```

Backend runs at: http://localhost:4000

### 2. Start the Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs at: http://localhost:3000

---

## Demo Login

| Field    | Value              |
|----------|--------------------|
| Email    | thembi@demo.com    |
| Password | password123        |

Or register a new account — a card is auto-created with R0 balance.

---

## API Endpoints

| Method | Route             | Auth | Description                    |
|--------|-------------------|------|--------------------------------|
| POST   | /auth/login       | No   | Login, returns JWT             |
| POST   | /auth/register    | No   | Register + auto-create card    |
| GET    | /me               | Yes  | Get user + card info           |
| GET    | /transactions     | Yes  | List all transactions          |
| GET    | /subscriptions    | Yes  | List subscriptions             |
| GET    | /stats            | Yes  | Spending summary               |
| POST   | /topup            | Yes  | Simulate payment top-up        |

### POST /topup body:
```json
{
  "amount": 100,
  "method": "SnapScan"
}
```

### POST /auth/login body:
```json
{
  "email": "thembi@demo.com",
  "password": "password123"
}
```

---

## Features

- JWT authentication with 24-hour tokens
- User registration (auto-creates a smart card)
- Real-time balance updates after top-up
- Payment simulation with 90% success rate (tests error handling)
- Full transaction history with trip + top-up records
- Subscription management tab
- Profile view with card details
- Responsive dark-mode UI

---

## Tech Stack

| Layer     | Technology            |
|-----------|-----------------------|
| Frontend  | React 18, Context API |
| Backend   | Node.js, Express      |
| Auth      | JWT (jsonwebtoken)    |
| Passwords | bcryptjs              |
| Database  | In-memory (no DB needed to run) |
| Styling   | Pure CSS with variables |

---

## Notes for Submission

- No database setup required — all data is in-memory
- Restart the backend to reset data to defaults
- The payment gateway is simulated with a 90% success rate to demonstrate error handling
- Card numbers and user IDs use UUID format
