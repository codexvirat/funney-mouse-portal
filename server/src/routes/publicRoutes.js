const router = require('express').Router();
const ctrl = require('../controllers/publicController');

// No auth: QR ordering from the customer's phone.
router.get('/table/:tableId', ctrl.getTableMenu);
router.post('/table/:tableId/order', ctrl.placeOrder);

module.exports = router;
