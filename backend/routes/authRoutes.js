// routes/authRoutes.js

const express = require('express');
const router = express.Router();

// 1. Import the authentication controller we created earlier.
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// 2. Define the login route.
// When a POST request is made to '/api/auth/login',
// it will be handled by the 'login' function in our authController.
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', protect, authController.getMe);
router.patch('/me', protect, authController.updateMe);

// 3. Export the router so it can be used in server.jsA
module.exports = router;
// By exporting the router, we can import it in our server.js file and use it to handle authentication-related routes in our application.