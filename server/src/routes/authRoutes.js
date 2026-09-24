const router = require('express').Router();
const { protect, adminOnly, allowRoles } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

router.post('/login', ctrl.login);
router.post('/owner-login', ctrl.ownerLogin);
router.get('/me', protect, ctrl.me);
router.get('/captains', protect, allowRoles('admin', 'staff', 'captain'), ctrl.listCaptains);
router.get('/users', protect, adminOnly, ctrl.listUsers);
router.post('/users', protect, adminOnly, ctrl.createUser);
router.patch('/users/:id', protect, adminOnly, ctrl.updateUser);
router.delete('/users/:id', protect, adminOnly, ctrl.deleteUser);

module.exports = router;
