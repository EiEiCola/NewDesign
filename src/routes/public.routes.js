const express = require('express');
const ctrl = require('../controllers/public.controller');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

/** Attach req.user when a valid login cookie is present, but never block the request. */
function optionalAuth(req, res, next) {
    if (!req.cookies?.token) return next();
    authenticate(req, res, () => next()).catch(() => next());
}

router.get('/menu', ctrl.menu);
router.get('/featured', ctrl.featured);
router.get('/sub-categories/:id/contents', ctrl.subContents);
router.get('/contents/:id', optionalAuth, ctrl.contentDetail);

module.exports = router;
