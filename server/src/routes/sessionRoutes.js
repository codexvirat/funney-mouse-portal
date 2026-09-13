const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/sessionController');

router.get('/', protect, ctrl.listSessions);
router.post('/', protect, ctrl.startSession);
router.delete('/:id', protect, ctrl.endSession);

module.exports = router;
