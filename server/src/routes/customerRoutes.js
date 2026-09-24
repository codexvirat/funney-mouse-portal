const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/auth');
const ctrl = require('../controllers/customerController');

const floor = allowRoles('admin', 'staff');

router.get('/occasions', protect, floor, ctrl.occasions);
// Captains look up / fill in the customer on their table.
router.get('/:phone', protect, allowRoles('admin', 'staff', 'captain'), ctrl.getByPhone);
router.patch('/:phone', protect, allowRoles('admin', 'staff', 'captain'), ctrl.updateCustomer);

module.exports = router;
