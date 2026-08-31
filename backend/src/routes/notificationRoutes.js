const express = require('express');
const controller = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');

const router = express.Router();

router.use(protect);
router.get('/', controller.list);
router.post('/', authorize('admin'), requireFields(['shg', 'title', 'message']), controller.create);
router.patch('/:id/read', controller.markRead);

module.exports = router;
