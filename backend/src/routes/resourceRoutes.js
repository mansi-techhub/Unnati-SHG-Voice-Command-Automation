const express = require('express');
const controller = require('../controllers/resourceController');
const { protect, authorize } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');
const uploadDocument = require('../middleware/uploadDocument');

const router = express.Router();

router.use(protect);
router.get('/government-schemes', controller.schemes.list);
router.post('/government-schemes', authorize('admin'), controller.schemes.create);
router.patch('/government-schemes/:id', authorize('admin'), controller.schemes.update);
router.get('/goals', controller.goals.list);
router.post('/goals', authorize('admin'), controller.goals.create);
router.patch('/goals/:id', authorize('admin'), controller.goals.update);
router.get('/rule-notices', controller.ruleNotices.list);
router.post('/rule-notices', authorize('admin'), requireFields(['kind', 'title', 'content']), controller.ruleNotices.create);
router.patch('/rule-notices/:id', authorize('admin'), controller.ruleNotices.update);
router.post('/goals/:id/contributions', authorize('admin'), controller.goals.contribute);
router.get('/emergency-fund', controller.emergencyFund.get);
router.post('/emergency-fund/transactions', authorize('admin'), requireFields(['shg', 'type', 'amount']), controller.emergencyFund.update);
router.get('/documents', controller.documents.list);
router.post('/documents', authorize('admin'), controller.documents.create);
router.post('/documents/upload', authorize('admin'), uploadDocument.single('file'), controller.documents.upload);
router.patch('/documents/:id', authorize('admin'), controller.documents.update);
router.get('/audit-logs', authorize('admin'), controller.auditLogs.list);

module.exports = router;
