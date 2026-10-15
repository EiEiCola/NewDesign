const express = require('express');
const ctrl = require('../controllers/user.controller');
const { authenticate, requireRole } = require('../middlewares/auth');
const { ROLE } = require('../config/constants');

const router = express.Router();

// User management is admin-only
router.use(authenticate, requireRole(ROLE.ADMIN));

router.get('/roles', ctrl.listRoles);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.put('/:id/password', ctrl.resetPassword);

module.exports = router;
