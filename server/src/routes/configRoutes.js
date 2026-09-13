const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const ctrl = require('../controllers/configController');

router.get('/', protect, ctrl.getConfig);
router.put('/', protect, adminOnly, ctrl.updateConfig);

module.exports = router;
