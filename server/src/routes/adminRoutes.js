const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');

router.get('/backup', protect, adminOnly, ctrl.downloadBackup);
router.get('/backups', protect, adminOnly, ctrl.backupStatus);

module.exports = router;
