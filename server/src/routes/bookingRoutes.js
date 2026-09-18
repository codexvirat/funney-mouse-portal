const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/bookingController');

router.get('/', protect, ctrl.listBookings);
router.post('/', protect, ctrl.createBooking);
router.patch('/:id', protect, ctrl.updateBooking);
router.delete('/:id', protect, ctrl.deleteBooking);

module.exports = router;
