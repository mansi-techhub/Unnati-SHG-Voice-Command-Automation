const express = require('express');
const controller = require('../controllers/transactionController');
const { protect, authorize } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');

const router = express.Router();

router.use(protect);
router.get('/', controller.list);
router.post('/', authorize('admin'), requireFields(['shg', 'type', 'direction', 'amount']), controller.create);

module.exports = router;
