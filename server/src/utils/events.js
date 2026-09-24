// Server-Sent Events: open screens (tables, kitchen) get a nudge the moment
// something changes, instead of waiting for their next poll.
const clients = new Set();

function addClient(res) {
  clients.add(res);
  res.on('close', () => clients.delete(res));
}

function broadcast(type) {
  const msg = `data: ${JSON.stringify({ type, at: Date.now() })}\n\n`;
  clients.forEach(res => {
    try { res.write(msg); } catch (e) { clients.delete(res); }
  });
}

// Keeps proxies from closing idle connections.
setInterval(() => clients.forEach(res => {
  try { res.write(': ping\n\n'); } catch (e) { clients.delete(res); }
}), 25000).unref();

// Router middleware: after any successful write, tell open screens to refresh.
function notifyOnWrite(type) {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      res.on('finish', () => { if (res.statusCode < 400) broadcast(type); });
    }
    next();
  };
}

module.exports = { addClient, broadcast, notifyOnWrite };
