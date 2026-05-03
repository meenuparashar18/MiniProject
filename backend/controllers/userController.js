const fs = require('fs');
const multer = require('multer');
const path = require('path');
const User = require('../models/userModel');
const Post = require('../models/postModel');
const { getIo } = require('../socket');

const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.png';
    cb(null, `${req.user._id}-${Date.now()}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image uploads are allowed.'));
  }
};

exports.uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('avatar');

exports.uploadAvatarImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please choose an image file.' });
    }

    req.user.avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await req.user.save();

    res.status(200).json({
      message: 'Avatar uploaded successfully.',
      avatarUrl: req.user.avatarUrl,
    });
  } catch (error) {
    res.status(500).json({ message: 'Could not upload avatar.', error: error.message });
  }
};

exports.getProfileByUsername = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('username bio avatarUrl coverImageUrl socialLinks followers following createdAt')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const posts = await Post.find({ owner: user._id, status: 'published' }).sort({ createdAt: -1 }).lean();

    res.status(200).json({
      profile: {
        id: user._id,
        username: user.username,
        bio: user.bio || '',
        avatarUrl: user.avatarUrl || '',
        coverImageUrl: user.coverImageUrl || '',
        socialLinks: user.socialLinks || {},
        followersCount: user.followers?.length || 0,
        followingCount: user.following?.length || 0,
        joinedAt: user.createdAt,
      },
      posts,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile.', error: error.message });
  }
};

exports.followUser = async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: req.params.username });

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot follow yourself.' });
    }

    if (targetUser.blockedUsers?.some((id) => id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'You cannot follow this user.' });
    }

    const alreadyFollowing = req.user.following.some((id) => id.toString() === targetUser._id.toString());

    if (alreadyFollowing) {
      req.user.following = req.user.following.filter((id) => id.toString() !== targetUser._id.toString());
      targetUser.followers = targetUser.followers.filter((id) => id.toString() !== req.user._id.toString());
    } else {
      req.user.following.push(targetUser._id);
      targetUser.followers.push(req.user._id);
      const notification = {
        type: 'follow',
        message: `${req.user.username} started following you.`,
        link: `/profile/${req.user.username}`,
      };
      targetUser.notifications.unshift(notification);
      getIo()?.to(`user:${targetUser._id.toString()}`).emit('notification:new', notification);
    }

    await Promise.all([req.user.save(), targetUser.save()]);

    res.status(200).json({
      following: !alreadyFollowing,
      followersCount: targetUser.followers.length,
      followingIds: req.user.following,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error following user.', error: error.message });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: req.params.username });

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot block yourself.' });
    }

    const alreadyBlocked = req.user.blockedUsers.some((id) => id.toString() === targetUser._id.toString());

    if (alreadyBlocked) {
      req.user.blockedUsers = req.user.blockedUsers.filter((id) => id.toString() !== targetUser._id.toString());
    } else {
      req.user.blockedUsers.push(targetUser._id);
      req.user.following = req.user.following.filter((id) => id.toString() !== targetUser._id.toString());
    }

    await req.user.save();

    res.status(200).json({
      blocked: !alreadyBlocked,
      blockedUsers: req.user.blockedUsers,
    });
  } catch (error) {
    res.status(500).json({ message: 'Could not update block status.', error: error.message });
  }
};

exports.getNotifications = async (req, res) => {
  const notifications = req.user.notifications || [];

  res.status(200).json({
    notifications,
    unreadCount: notifications.filter((notification) => !notification.read).length,
  });
};

exports.markNotificationsRead = async (req, res) => {
  req.user.notifications = (req.user.notifications || []).map((notification) => ({
    ...notification.toObject(),
    read: true,
  }));

  await req.user.save();

  res.status(200).json({
    notifications: req.user.notifications,
    unreadCount: 0,
  });
};

exports.getBookmarkFolders = async (req, res) => {
  await req.user.populate({
    path: 'bookmarkFolders.posts',
    options: { sort: { createdAt: -1 } },
  });

  res.status(200).json({
    folders: req.user.bookmarkFolders || [],
  });
};
