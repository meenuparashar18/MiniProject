require('dotenv').config();
///

const mongoose = require('mongoose');
const Post = require('./models/postModel');

const backfillSlugs = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
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
