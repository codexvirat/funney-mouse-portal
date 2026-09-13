const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const ctrl = require('../controllers/memberController');

router.get('/', protect, adminOnly, ctrl.listMembers);

module.exports = router;
