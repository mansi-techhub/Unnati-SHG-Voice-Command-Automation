const express = require('express');
const controller = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/summary', controller.summary);
router.get('/exports', controller.exportInfo);

module.exports = router;
