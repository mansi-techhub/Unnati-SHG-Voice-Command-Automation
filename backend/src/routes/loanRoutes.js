const express = require('express');
const controller = require('../controllers/loanController');
const { protect, authorize } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');

const router = express.Router();

router.use(protect);
router.get('/', controller.list);
router.post('/', authorize('admin'), requireFields(['shg', 'member', 'amount', 'purpose', 'interestRate', 'durationMonths']), controller.apply);
router.post('/:id/approve', authorize('admin'), controller.approve);
router.post('/:id/reject', authorize('admin'), controller.reject);
router.post('/:id/disburse', authorize('admin'), controller.disburse);
router.post('/:id/repay', authorize('admin'), controller.repay);

module.exports = router;
