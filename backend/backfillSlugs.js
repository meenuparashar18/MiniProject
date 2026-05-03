require('dotenv').config();
///

const mongoose = require('mongoose');
const Post = require('./models/postModel');
const { getMongoConfig } = require('./config/database');

const backfillSlugs = async () => {
  try {
    const mongoConfig = getMongoConfig();

    if (!mongoConfig.uri) {
      throw new Error('Set MONGO_URI, MONGODB_URI, MONGO_URL, or DATABASE_URL before running backfillSlugs.js.');
    }

    if (mongoConfig.isRailway && mongoConfig.isLocalMongoUrl(mongoConfig.uri)) {
      throw new Error(`${mongoConfig.source} points to localhost. Use MongoDB Atlas or Railway Mongo in Railway.`);
    }

    await mongoose.connect(mongoConfig.uri);
    const posts = await Post.find({});

    for (const post of posts) {
      if (!Array.isArray(post.categories)) {
        post.categories = [];
      }

      await post.save();
      console.log(`Updated: ${post.title} -> ${post.slug}`);
    }
  } catch (error) {
    console.error('Error backfilling slugs:', error);
  } finally {
    await mongoose.disconnect();
  }
};

backfillSlugs();
