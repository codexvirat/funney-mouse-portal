const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/auth');
const ctrl = require('../controllers/sessionController');
const { notifyOnWrite } = require('../utils/events');

const floor = allowRoles('admin', 'staff');

router.use(notifyOnWrite('sessions'));

router.get('/', protect, floor, ctrl.listSessions);
router.post('/', protect, floor, ctrl.startSession);
router.delete('/:id', protect, floor, ctrl.endSession);

module.exports = router;
