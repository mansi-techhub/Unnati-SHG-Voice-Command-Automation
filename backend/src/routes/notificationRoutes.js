const express = require('express');
const controller = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');

const router = express.Router();

router.use(protect);
router.get('/', controller.list);
router.post('/', authorize('admin'), requireFields(['shg', 'title', 'message']), controller.create);
router.post('/member-message', authorize('admin'), controller.createMemberMessage);
router.post('/reminders', authorize('admin'), controller.triggerReminders);
router.get('/payment-compliance', authorize('admin'), controller.paymentCompliance);
router.post('/payment-reminders', authorize('admin'), controller.sendPaymentReminders);
router.patch('/:id/read', controller.markRead);

module.exports = router;
