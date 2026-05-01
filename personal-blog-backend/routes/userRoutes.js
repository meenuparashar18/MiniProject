const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  uploadAvatar,
  uploadAvatarImage,
  getProfileByUsername,
  followUser,
  blockUser,
  getNotifications,
  markNotificationsRead,
  getBookmarkFolders,
} = require('../controllers/userController');

const router = express.Router();

router.get('/profile/:username', getProfileByUsername);
router.post('/avatar', protect, uploadAvatar, uploadAvatarImage);
router.post('/follow/:username', protect, followUser);
router.post('/block/:username', protect, blockUser);
router.get('/notifications', protect, getNotifications);
router.patch('/notifications/read', protect, markNotificationsRead);
router.get('/bookmark-folders', protect, getBookmarkFolders);

module.exports = router;
