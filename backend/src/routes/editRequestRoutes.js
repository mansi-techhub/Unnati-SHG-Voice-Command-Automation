const express = require('express');
const controller = require('../controllers/editRequestController');
const { protect, authorize } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');

const router = express.Router();

router.use(protect);
router.get('/', controller.list);
router.post('/', authorize('member'), requireFields(['category', 'description']), controller.create);
router.patch('/:id', authorize('admin'), requireFields(['status']), controller.update);

module.exports = router;
