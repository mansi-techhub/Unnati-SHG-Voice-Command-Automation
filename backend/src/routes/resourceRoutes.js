const express = require('express');
const controller = require('../controllers/resourceController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/government-schemes', controller.schemes.list);
router.post('/government-schemes', authorize('admin'), controller.schemes.create);
router.patch('/government-schemes/:id', authorize('admin'), controller.schemes.update);
router.get('/goals', controller.goals.list);
router.post('/goals', authorize('admin'), controller.goals.create);
router.patch('/goals/:id', authorize('admin'), controller.goals.update);
router.get('/emergency-fund', controller.emergencyFund.get);
router.post('/emergency-fund/transactions', authorize('admin'), controller.emergencyFund.update);
router.get('/documents', controller.documents.list);
router.post('/documents', authorize('admin'), controller.documents.create);
router.patch('/documents/:id', authorize('admin'), controller.documents.update);
router.get('/audit-logs', authorize('admin'), controller.auditLogs.list);

module.exports = router;
