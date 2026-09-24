const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { addClient } = require('../utils/events');

// EventSource can't send an Authorization header, so the token comes in
// the query string.
router.get('/', async (req, res) => {
  try {
    const decoded = jwt.verify(String(req.query.token || ''), process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('active');
    if (!user || !user.active) return res.status(401).end();
  } catch (e) {
    return res.status(401).end();
  }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('retry: 5000\n\n');
  addClient(res);
});

module.exports = router;
