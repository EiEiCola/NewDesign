const express = require('express');
const ctrl = require('../controllers/audit.controller');
const { authenticate, requireRole } = require('../middlewares/auth');
const { ROLE } = require('../config/constants');

const router = express.Router();

// Read-only: the app never updates or deletes audit rows.
router.get('/', authenticate, requireRole(ROLE.ADMIN), ctrl.list);

module.exports = router;
