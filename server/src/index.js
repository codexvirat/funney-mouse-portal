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

const app = express();
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
  app.listen(PORT, () => console.log(`Funny Mouse API running on port ${PORT}`));
})();
