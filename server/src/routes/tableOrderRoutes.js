const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/tableOrderController');

router.get('/', protect, ctrl.listTableOrders);
router.post('/', protect, ctrl.openTable);
router.patch('/:id', protect, ctrl.updateTableOrder);
router.delete('/:id', protect, ctrl.cancelTableOrder);
router.post('/:id/play/start', protect, ctrl.startPlay);
router.post('/:id/play/end', protect, ctrl.endPlay);
router.post('/:id/transfer', protect, ctrl.transferTable);
router.post('/:id/merge', protect, ctrl.mergeTable);
router.post('/:id/checkout', protect, ctrl.checkoutTable);

module.exports = router;
