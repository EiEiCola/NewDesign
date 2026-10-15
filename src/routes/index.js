const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/categories', require('./category.routes'));
router.use('/contents', require('./content.routes'));
router.use('/public', require('./public.routes'));

module.exports = router;
