const express = require('express');
const controller = require('../controllers/paymentCollectionController');
const { protect, authorize } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');

const router = express.Router();

router.use(protect);
router.get('/', controller.list);
router.post(
  '/',
  authorize('admin'),
  requireFields(['paymentType', 'shg', 'member', 'loan', 'amount', 'dueDate', 'receivedDate', 'paymentMethod']),
  controller.create
);

module.exports = router;
