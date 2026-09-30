const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/auth');
const ctrl = require('../controllers/inquiryController');

const floor = allowRoles('admin', 'staff');

router.get('/', protect, floor, ctrl.listInquiries);
router.post('/', protect, floor, ctrl.createInquiry);
router.patch('/:id', protect, floor, ctrl.updateInquiry);
router.delete('/:id', protect, floor, ctrl.deleteInquiry);

module.exports = router;
