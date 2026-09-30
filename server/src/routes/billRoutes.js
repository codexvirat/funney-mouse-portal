const router = require('express').Router();
const { protect, adminOnly, allowRoles } = require('../middleware/auth');
const ctrl = require('../controllers/billController');

router.post('/', protect, allowRoles('admin', 'staff'), ctrl.createBill);
router.post('/preview', protect, allowRoles('admin', 'staff'), ctrl.previewDiscount);
// Reports are readable by admins and by the PIN-only owner portal (read-only).
router.get('/', protect, allowRoles('admin', 'owner', 'staff'), ctrl.getBills);
// Edit / delete (void) need a reason + an admin password in the body, so
// staff at the counter can fix a mistake once an admin types the password.
router.post('/verify-approval', protect, allowRoles('admin', 'staff'), ctrl.verifyApproval);
router.patch('/:id/edit', protect, allowRoles('admin', 'staff'), ctrl.editBill);
router.patch('/:id/void', protect, allowRoles('admin', 'staff'), ctrl.voidBill);
router.patch('/:id/settle-due', protect, adminOnly, ctrl.settleDue);

module.exports = router;
