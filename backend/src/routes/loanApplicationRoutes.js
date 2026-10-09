const express = require('express');
const controller = require('../controllers/loanApplicationController');
const { protect, authorize } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');

const router = express.Router();
router.use(protect);
router.get('/', controller.list);
router.post('/', requireFields(['member', 'amount', 'purpose', 'durationMonths', 'repaymentPlan', 'monthlyIncome']), controller.create);
router.post('/:id/approve', authorize('admin'), requireFields(['interestRate']), controller.approve);
router.post('/:id/reject', authorize('admin'), controller.reject);

module.exports = router;
