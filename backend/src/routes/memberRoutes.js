const express = require('express');
const controller = require('../controllers/memberController');
const { protect, authorize } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');

const router = express.Router();

router.use(protect);
router.get('/', controller.list);
router.post('/', authorize('admin'), requireFields(['shg', 'name']), controller.create);
router.get('/:id', controller.get);
router.patch('/:id', authorize('admin'), controller.update);

module.exports = router;
