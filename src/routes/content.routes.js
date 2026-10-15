const express = require('express');
const ctrl = require('../controllers/content.controller');
const { authenticate, requireRole } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');
const { CAN_POST } = require('../config/constants');

const router = express.Router();

// Admin and editor can post; editors are limited to their own posts inside the controller.
router.use(authenticate, requireRole(...CAN_POST));

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

// multipart/form-data: send the "kind" field BEFORE the files so the file filter can read it
router.post('/:id/media', ctrl.loadEditable, upload.array('files', 20), ctrl.uploadMedia);
router.put('/:id/media/order', ctrl.updateMediaOrder);
router.delete('/:id/media/:cmId', ctrl.deleteMedia);

module.exports = router;
