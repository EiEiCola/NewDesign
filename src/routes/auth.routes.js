const express = require('express');
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.post('/login', ctrl.login);
// Log out even when the session is already invalid (auth errors are ignored here)
router.post('/logout', (req, res, next) => authenticate(req, res, () => next()).catch(() => next()), ctrl.logout);
router.get('/me', authenticate, ctrl.me);

module.exports = router;
