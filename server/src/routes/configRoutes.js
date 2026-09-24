const router = require('express').Router();
const { protect, adminOnly, allowRoles } = require('../middleware/auth');
const ctrl = require('../controllers/configController');

router.get('/', protect, ctrl.getConfig);
router.put('/', protect, adminOnly, ctrl.updateConfig);
router.patch('/menu/:id/availability', protect, allowRoles('admin', 'staff', 'kitchen'), ctrl.setMenuAvailability);

module.exports = router;
