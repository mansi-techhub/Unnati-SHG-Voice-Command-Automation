const express = require('express');
const controller = require('../controllers/meetingController');
const { protect, authorize } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');

const router = express.Router();

router.use(protect);
router.get('/', controller.list);
router.get('/my-attendance', controller.myAttendance);
router.post('/', authorize('admin'), requireFields(['title', 'date']), controller.create);
router.patch('/:id', authorize('admin'), controller.update);
router.patch('/:id/attendance', authorize('admin'), requireFields(['attendance']), controller.markAttendance);

module.exports = router;
