const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/auth');
const ctrl = require('../controllers/tableOrderController');
const { notifyOnWrite } = require('../utils/events');

// The kitchen login can only see open tables and print KOTs.
const floor = allowRoles('admin', 'staff');
const anyone = allowRoles('admin', 'staff', 'kitchen');

router.use(notifyOnWrite('tables'));

router.get('/', protect, anyone, ctrl.listTableOrders);
router.post('/:id/kot', protect, anyone, ctrl.sendKot);
router.post('/:id/kot/:no/ready', protect, anyone, ctrl.kotReady);
router.post('/:id/kot/:no/served', protect, floor, ctrl.kotServed);
router.post('/:id/requests/:rid', protect, floor, ctrl.handleRequest);
router.post('/', protect, floor, ctrl.openTable);
router.patch('/:id', protect, floor, ctrl.updateTableOrder);
router.delete('/:id', protect, floor, ctrl.cancelTableOrder);
router.post('/:id/play/start', protect, floor, ctrl.startPlay);
router.post('/:id/play/end', protect, floor, ctrl.endPlay);
router.post('/:id/transfer', protect, floor, ctrl.transferTable);
router.post('/:id/merge', protect, floor, ctrl.mergeTable);
router.post('/:id/checkout', protect, floor, ctrl.checkoutTable);

module.exports = router;
