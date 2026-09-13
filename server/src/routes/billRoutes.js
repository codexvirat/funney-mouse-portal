const router = require('express').Router();
const { protect, adminOnly, allowRoles } = require('../middleware/auth');
const ctrl = require('../controllers/billController');

router.post('/', protect, ctrl.createBill);
// Reports are readable by admins and by the PIN-only owner portal (read-only).
router.get('/', protect, allowRoles('admin', 'owner'), ctrl.getBills);
router.patch('/:id/void', protect, adminOnly, ctrl.voidBill);
router.patch('/:id/settle-due', protect, adminOnly, ctrl.settleDue);

module.exports = router;
