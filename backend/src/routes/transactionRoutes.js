const express = require('express');
const controller = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/', controller.list);

module.exports = router;
