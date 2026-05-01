// models/userModel.js
// models/userModel.js

const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    bio: {
      type: String,
      default: '',
      trim: true,
      maxlength: 240,
    },
    coverImageUrl: {
      type: String,
      default: '',
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: '',
      trim: true,
    },
    socialLinks: {
      website: {
        type: String,
        default: '',
        trim: true,
      },
      twitter: {
        type: String,
        default: '',
        trim: true,
      },
      github: {
        type: String,
        default: '',
        trim: true,
      },
    },
    savedPosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
      },
    ],
    bookmarkFolders: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        posts: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Post',
          },
        ],
      },
    ],
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    notifications: [
      {
        type: {
          type: String,
          required: true,
        },
        link: {
          type: String,
          default: '',
        },
        message: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        read: {
          type: Boolean,
          default: false,
        },
      },
    ],
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    resetPasswordToken: String,
    resetPasswordCode: String,
    resetPasswordExpires: Date,
    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Mongoose pre-save hook for password hashing (from previous task)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// HIGHLIGHT START
// 1. Define a custom method on the userSchema.
// We attach a function named 'comparePassword' to the 'methods' object of our schema.
// Any document created from this schema will have this method available.
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    // 2. Use bcrypt.compare() to check for a match.
    // This is the core of the verification process.
    // - candidatePassword: The plain-text password provided by the user during login.
    // - this.password: The hashed password stored in the database for this specific user document.
    //
    // bcrypt.compare will automatically extract the salt from 'this.password',
    // hash the 'candidatePassword' with that salt, and then securely compare the two hashes.
    // It returns a promise that resolves to true if they match, and false otherwise.
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    return isMatch;
  } catch (error) {
    // In case of an unexpected error during comparison, we re-throw it to be handled by our controller.
    throw error;
  }
};
// HIGHLIGHT END

userSchema.methods.createPasswordResetOtp = function () {
  const resetCode = String(Math.floor(100000 + Math.random() * 900000));
  const resetToken = crypto.randomBytes(24).toString('hex');

  this.resetPasswordCode = resetCode;
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpires = Date.now() + 1000 * 60 * 15;

  return {
    resetCode,
    resetToken,
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
