const router = require('express').Router();
const { protect, adminOnly, allowRoles } = require('../middleware/auth');
const ctrl = require('../controllers/cashController');

const floor = allowRoles('admin', 'staff');

router.get('/expenses', protect, allowRoles('admin', 'owner'), ctrl.listExpenses);
router.delete('/expenses/:id', protect, adminOnly, ctrl.deleteExpense);
router.get('/:date', protect, allowRoles('admin', 'staff', 'owner'), ctrl.getDay);
router.put('/:date', protect, floor, ctrl.updateDay);
router.post('/:date/expenses', protect, floor, ctrl.addExpense);

module.exports = router;
