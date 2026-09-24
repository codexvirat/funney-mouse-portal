const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const ctrl = require('../controllers/auditController');

router.get('/', protect, adminOnly, ctrl.listAudit);

module.exports = router;
