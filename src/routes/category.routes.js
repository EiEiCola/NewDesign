const express = require('express');
const ctrl = require('../controllers/category.controller');
const { authenticate, requireRole } = require('../middlewares/auth');
const { ROLE, CAN_POST } = require('../config/constants');

const router = express.Router();

router.use(authenticate);

// Editors need the list to pick a category when posting; only admins can change it.
router.get('/', requireRole(...CAN_POST), ctrl.list);

router.post('/main', requireRole(ROLE.ADMIN), ctrl.createMain);
router.put('/main/:id', requireRole(ROLE.ADMIN), ctrl.updateMain);
router.delete('/main/:id', requireRole(ROLE.ADMIN), ctrl.deleteMain);

router.post('/sub', requireRole(ROLE.ADMIN), ctrl.createSub);
router.put('/sub/:id', requireRole(ROLE.ADMIN), ctrl.updateSub);
router.delete('/sub/:id', requireRole(ROLE.ADMIN), ctrl.deleteSub);

module.exports = router;
