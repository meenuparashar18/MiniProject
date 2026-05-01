// middleware/authMiddleware.js

// 1. Import necessary libraries
const jwt = require('jsonwebtoken');
const { promisify } = require('util'); // A Node.js utility to convert callback-based functions to promise-based
const User = require('../models/userModel'); // Import your User model

// 2. Define the protection middleware function
exports.protect = async (req, res, next) => {
  try {
    // 3. Check if a token exists in the request headers
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // The token is part of the header string "Bearer <token>". We split the string and take the second part.
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      // If no token is found, the user is not logged in.
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in. Please log in to get access.',
      });
    }

    // 4. Verify the token's signature
    // jwt.verify is a callback-based function. We use 'promisify' to turn it into an async/await compatible function.
    // It will throw an error if the signature is invalid or the token has expired.
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 5. Check if the user associated with the token still exists
    // This is a crucial security step. If a user has been deleted after the token was issued,
    // we must not allow access.
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists.',
      });
    }

    // (Optional) 6. Check if user changed password after the token was issued
    // This logic would be added in the userModel if you have a `passwordChangedAt` field.
    // For this project, this check is not required but is good to know about.

    // 7. If all checks pass, grant access to the protected route
    // We attach the user object to the request. This makes the user's data available
    // in all subsequent middleware and in the final route handler.
    req.user = currentUser;

    // Call next() to move to the next middleware in the chain (or the route handler itself).
    next();
  } catch (error) {
    // The catch block will handle errors from jwt.verify (e.g., JsonWebTokenError, TokenExpiredError)
    console.error('AUTH MIDDLEWARE ERROR:', error);
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid token or session expired. Please log in again.',
    });
  }
};

exports.optionalProtect = async (req, _res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next();
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);

    if (currentUser) {
      req.user = currentUser;
    }

    next();
  } catch (_error) {
    next();
  }
};

exports.adminOnly = (req, res, next) => {
  const adminUsernames = new Set([
    process.env.ADMIN_USERNAME || 'adi24',
    'adi24',
    'admin',
  ]);

  if (!req.user || !adminUsernames.has(req.user.username)) {
    return res.status(403).json({
      status: 'fail',
      message: 'Only admin can access this section.',
    });
  }

  next();
};
