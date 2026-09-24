require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const seedAdmin = require('./seed');
const { notFound, errorHandler } = require('./middleware/error');

const authRoutes = require('./routes/authRoutes');
const configRoutes = require('./routes/configRoutes');
const customerRoutes = require('./routes/customerRoutes');
const billRoutes = require('./routes/billRoutes');
const memberRoutes = require('./routes/memberRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const tableOrderRoutes = require('./routes/tableOrderRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const cashRoutes = require('./routes/cashRoutes');
const auditRoutes = require('./routes/auditRoutes');
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');
const eventsRoutes = require('./routes/eventsRoutes');
const { scheduleBackups } = require('./utils/backup');

const app = express();
// Behind Dokploy's proxy — lets req.ip be the real client (QR order limiter).
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/config', configRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/table-orders', tableOrderRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventsRoutes);

// Serve the built React client (client/dist is copied into ./public at
// Docker image build time — see the root Dockerfile). Any GET request that
// isn't under /api falls back to index.html so client-side paths like
// /owner work on a hard refresh or direct link, not just via in-app nav.
const clientDir = path.join(__dirname, '..', 'public');
app.use(express.static(clientDir));
app.get(/^\/(?!api\/).*/, (req, res, next) => {
  res.sendFile(path.join(clientDir, 'index.html'), (err) => { if (err) next(); });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

(async function start() {
  await connectDB();
  await seedAdmin();
  scheduleBackups();
  app.listen(PORT, () => console.log(`Funny Mouse API running on port ${PORT}`));
})();
