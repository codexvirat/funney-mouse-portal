const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/auth');
const ctrl = require('../controllers/bookingController');
const { notifyOnWrite } = require('../utils/events');

const floor = allowRoles('admin', 'staff');

router.use(notifyOnWrite('tables'));

// Owner portal lists pending bookings too (read-only).
router.get('/', protect, allowRoles('admin', 'staff', 'owner'), ctrl.listBookings);
router.post('/', protect, floor, ctrl.createBooking);
router.patch('/:id', protect, floor, ctrl.updateBooking);
router.post('/:id/assign-tables', protect, floor, ctrl.assignTables);
router.delete('/:id', protect, floor, ctrl.deleteBooking);

module.exports = router;
