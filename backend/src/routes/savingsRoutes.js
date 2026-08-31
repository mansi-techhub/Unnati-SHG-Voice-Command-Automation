const express = require('express');
const controller = require('../controllers/savingsController');
const { protect, authorize } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');

const router = express.Router();

router.use(protect);
router.get('/', controller.list);
router.post('/', authorize('admin'), requireFields(['shg', 'member', 'month', 'amount']), controller.create);

module.exports = router;
