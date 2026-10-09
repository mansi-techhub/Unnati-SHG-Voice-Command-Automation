const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const secret = process.env.JWT_SECRET || 'development-only-secret-change-me';
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    // An admin-president may enter through the member view. The access role
    // comes from the signed token, while the database role remains admin.
    if (user.role === 'admin' && decoded.role === 'member') {
      user.role = 'member';
    } else if (decoded.role !== user.role) {
      return res.status(401).json({ message: 'Invalid access role' });
    }
    req.user = user;
    if (user.shg) {
      const userShg = String(user.shg);
      const requestedShg = req.query.shg || req.body?.shg;
      if (requestedShg && String(requestedShg) !== userShg) {
        return res.status(403).json({ message: 'You do not have access to this SHG' });
      }
      if (!req.query.shg) req.query.shg = userShg;
      if (req.body && !req.body.shg) req.body.shg = userShg;
    }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    return next(error);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission for this action' });
    }
    next();
  };
}

module.exports = { protect, authorize };
