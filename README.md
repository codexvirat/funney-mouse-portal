# Funny Mouse — Daily Sales Register (MERN)

A MERN (MongoDB, Express, React, Node) rebuild of the original single-file `funny-mouse-pos-2.html` POS app for a kids' play-area + café: billing (play area / food / socks / membership), live play-session timers, day/month sales reports, a members registry, a customers registry, and a shop settings screen — now backed by a real login system and a MongoDB database instead of `localStorage`.

## Structure
```
server/   Express + Mongoose REST API
client/   Vite + React frontend
```

## 1. Prerequisites
- Node.js 18+
- A MongoDB instance — either local (`mongodb://127.0.0.1:27017`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.

## 2. Setup

```bash
npm run install:all          # installs server + client dependencies
```

Copy the env examples and fill in your own values:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

`server/.env`:
```
MONGODB_URI=mongodb://127.0.0.1:27017/funny-mouse
JWT_SECRET=change-this-to-a-long-random-secret
JWT_EXPIRES_IN=12h
PORT=4000
```

`client/.env`:
```
VITE_API_URL=http://localhost:4000/api
```

## 3. Run (dev)

From the repo root, run both server and client together:

```bash
npm run dev
```

Or in two terminals:

```bash
npm run dev --prefix server   # http://localhost:4000
npm run dev --prefix client   # http://localhost:5173
```

## 4. First login

On first boot (when there are no users yet), the server auto-creates a default admin account and prints it to the console:

```
username: admin
password: admin123
```

**Log in and change this password immediately** — Setup → "Users / staff accounts" → Reset pwd on the `admin` row. From that same screen the admin can create staff accounts (role `staff`, billing screen only) or additional admin accounts.

## Roles
- **admin** — every tab: New bill, Day end, Members, Customers, Setup.
- **staff** — only the New bill tab (billing, sessions, payment, receipt print).
- **owner** — no username/password, no billing access. Logs in with just a PIN at a separate URL, `/owner`, and only sees sales reports (day/month totals, breakdown, bills, CSV export) — read-only, no void/settle.

## Owner reports portal (PIN login)

The shop owner gets their own link, separate from the staff/admin app:

```
http://<your-domain>/owner
```

It asks for a PIN only (no username) and shows nothing but the Day-end style reports — no billing, members, customers, or setup access, and no ability to void a bill or settle a due.

**To set it up**: log in as admin → Setup → "Users / staff accounts" → add a user with role **Owner (reports PIN)**. The "password" field for that role is the PIN itself (numeric, e.g. `1234` or `4569`) — put in whatever PIN the owner should use. The username on an owner account doesn't matter (the PIN login doesn't ask for it) but is still required internally, so anything works.

To change the PIN later, use "Reset pwd" on that user's row in the same Users table.

## Notes
- All business data (customers, bills, sessions, membership, shop config) lives in MongoDB — there is no local/offline fallback.
- Bill totals and membership math are recomputed server-side on save; the client never has the final say on what gets charged.
- "Play chal raha hai" (live session timers) refreshes every ~15 seconds via polling rather than a websocket — simple, and fine for a single-counter or few-counter shop.
