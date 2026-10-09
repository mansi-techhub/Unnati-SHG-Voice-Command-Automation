const express = require('express');
const controller = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');

const router = express.Router();

router.post('/register', requireFields(['name', 'email', 'password']), controller.register);
router.post('/register-president', requireFields(['shgName', 'name', 'email', 'password']), controller.registerPresident);
router.post('/register-member', requireFields(['name', 'phone', 'password']), controller.registerMember);
router.post('/login', requireFields(['email', 'password']), controller.login);
router.post('/login-shg', requireFields(['shgCode', 'role', 'name', 'password']), controller.loginWithShg);
router.get('/shg/:code', controller.lookupShg);
router.get('/me', protect, controller.me);
router.post('/forgot-password', requireFields(['email']), controller.forgotPassword);
router.post('/reset-password', requireFields(['token', 'password']), controller.resetPassword);

module.exports = router;
