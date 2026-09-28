const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/auth');
const ctrl = require('../controllers/customerController');

const floor = allowRoles('admin', 'staff');

router.get('/occasions', protect, floor, ctrl.occasions);
router.get('/:phone', protect, floor, ctrl.getByPhone);
router.patch('/:phone', protect, floor, ctrl.updateCustomer);

module.exports = router;
