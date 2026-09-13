const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/customerController');

router.get('/:phone', protect, ctrl.getByPhone);

module.exports = router;
