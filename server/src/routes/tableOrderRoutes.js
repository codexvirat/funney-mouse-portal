const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/auth');
const ctrl = require('../controllers/tableOrderController');
const { notifyOnWrite } = require('../utils/events');

// Kitchen can only see tables and handle KOTs. Captains (waiters) run
// their tables — open, order, KOT, serve — but billing, cancelling and
// merging stay with staff/admin.
const floor = allowRoles('admin', 'staff');
const service = allowRoles('admin', 'staff', 'captain');
const anyone = allowRoles('admin', 'staff', 'kitchen', 'captain');

router.use(notifyOnWrite('tables'));

router.get('/', protect, anyone, ctrl.listTableOrders);
router.post('/:id/kot', protect, anyone, ctrl.sendKot);
router.post('/:id/kot/:no/ready', protect, anyone, ctrl.kotReady);
router.post('/:id/kot/:no/served', protect, service, ctrl.kotServed);
router.post('/:id/requests/:rid', protect, service, ctrl.handleRequest);
router.post('/', protect, service, ctrl.openTable);
router.patch('/:id', protect, service, ctrl.updateTableOrder);
router.delete('/:id', protect, floor, ctrl.cancelTableOrder);
router.post('/:id/play/start', protect, service, ctrl.startPlay);
router.post('/:id/play/end', protect, service, ctrl.endPlay);
router.post('/:id/transfer', protect, service, ctrl.transferTable);
router.post('/:id/merge', protect, floor, ctrl.mergeTable);
router.post('/:id/checkout', protect, floor, ctrl.checkoutTable);

module.exports = router;
