const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const normalizeUrlField = (value) => (typeof value === 'string' ? value.trim() : '');

const sanitizeUser = (user) => ({
  id: user._id,
  username: user.username,
  bio: user.bio || '',
  avatarUrl: user.avatarUrl || '',
  coverImageUrl: user.coverImageUrl || '',
  socialLinks: user.socialLinks || {
    website: '',
    twitter: '',
    github: '',
  },
  savedPosts: user.savedPosts || [],
  following: user.following || [],
  followers: user.followers || [],
  bookmarkFolders: user.bookmarkFolders || [],
});

const createAuthResponse = (user) => ({
  status: 'success',
  token: signToken(user._id),
  user: sanitizeUser(user),
});

exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide a username and password.',
      });
    }

    const existingUser = await User.findOne({ username: username.trim() });

    if (existingUser) {
      return res.status(409).json({
        status: 'fail',
        message: 'That username is already taken.',
      });
    }

    const user = await User.create({ username: username.trim(), password });

    res.status(201).json(createAuthResponse(user));
  } catch (error) {
    console.error('REGISTER ERROR:', error);
    res.status(500).json({
      status: 'error',
      message: 'Could not create your account.',
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide a username and password.',
      });
    }

    const user = await User.findOne({ username: username.trim() }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid credentials.',
      });
    }

    res.status(200).json(createAuthResponse(user));
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    res.status(500).json({
      status: 'error',
      message: 'An internal server error occurred.',
    });
  }
};

exports.getMe = async (req, res) => {
  res.status(200).json({
    status: 'success',
    user: sanitizeUser(req.user),
  });
};

exports.updateMe = async (req, res) => {
  try {
    const socialLinks = req.body.socialLinks || {};

    req.user.bio = (req.body.bio || '').trim();
    req.user.avatarUrl = normalizeUrlField(req.body.avatarUrl);
    req.user.coverImageUrl = normalizeUrlField(req.body.coverImageUrl);
    req.user.socialLinks = {
      website: normalizeUrlField(socialLinks.website),
      twitter: normalizeUrlField(socialLinks.twitter),
      github: normalizeUrlField(socialLinks.github),
    };

    await req.user.save();

    res.status(200).json(createAuthResponse(req.user));
  } catch (error) {
    console.error('UPDATE PROFILE ERROR:', error);
    res.status(500).json({
      status: 'error',
      message: 'Could not update your profile.',
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide your username.',
      });
    }

    const user = await User.findOne({ username: username.trim() });

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'We could not find an account with that username.',
      });
    }

    const { resetCode, resetToken } = user.createPasswordResetOtp();
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Reset code generated. Use the code or reset link within 15 minutes.',
      otp: resetCode,
      resetToken,
      resetUrl: `/reset-password?token=${resetToken}&username=${encodeURIComponent(user.username)}`,
    });
  } catch (error) {
    console.error('FORGOT PASSWORD ERROR:', error);
    res.status(500).json({
      status: 'error',
      message: 'Could not start password reset.',
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { username, password, otp, token } = req.body;

    if (!username || !password || (!otp && !token)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide your username, new password, and reset code or token.',
      });
    }

    const resetPasswordToken = token
      ? crypto.createHash('sha256').update(token).digest('hex')
      : undefined;

    const user = await User.findOne({
      username: username.trim(),
      resetPasswordExpires: { $gt: Date.now() },
      $or: [
        ...(otp ? [{ resetPasswordCode: String(otp).trim() }] : []),
        ...(resetPasswordToken ? [{ resetPasswordToken }] : []),
      ],
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        status: 'fail',
        message: 'That reset code or link is invalid or has expired.',
      });
    }

    user.password = password;
    user.resetPasswordCode = undefined;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json(createAuthResponse(user));
  } catch (error) {
    console.error('RESET PASSWORD ERROR:', error);
    res.status(500).json({
      status: 'error',
      message: 'Could not reset password.',
    });
  }
};
