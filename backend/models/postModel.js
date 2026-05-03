// models/postModel.js

// 1. Import Mongoose to use its schema-building capabilities.
const mongoose = require('mongoose');
const slugify = require('slugify');

// 2. Define the schema for our blog posts.
// A schema is a JSON object that defines the structure and properties of a document.
const postSchema = new mongoose.Schema({
  // 'title' field:
  // - type: String. The title of the post must be a string.
  // - required: true. A post cannot be created without a title. The 'true' value can also be an array
  //   [true, 'A post must have a title.'] to provide a custom error message.
  title: {
    type: String,
    required: [true, 'A post must have a title.'],
    trim: true // A Mongoose middleware that removes leading/trailing whitespace.
  },

  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },

  // 'markdownContent' field:
  // - The main body of the blog post, written in Markdown format.
  markdownContent: {
    type: String,
    required: [true, 'A post must have content.']
  },

  // 'author' field:
  // - A simple string for the author's name. In a more complex application,
  //   this might be a reference to a User model (mongoose.Schema.Types.ObjectId).
  //   For now, a string is perfect.
  author: {
    type: String,
    default: 'Admin' // Sets a default value if no author is provided.
  },

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],

  comments: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      username: {
        type: String,
        required: true,
      },
      text: {
        type: String,
        required: true,
        trim: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  categories: {
    type: [String],
    default: [],
  },

  tags: {
    type: [String],
    default: [],
  },

  galleryImages: {
    type: [String],
    default: [],
  },

  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'published',
  },

  views: {
    type: Number,
    default: 0,
  },

  featured: {
    type: Boolean,
    default: false,
  },

  revisionHistory: [
    {
      title: String,
      markdownContent: String,
      categories: [String],
      tags: [String],
      status: String,
      savedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  reports: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      username: String,
      reason: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  // 'createdAt' field:
  // - type: Date. Stores the date and time when the post was created.
  // - default: Date.now. When a new post document is created, if the 'createdAt' field
  //   is not specified, Mongoose will automatically set it to the current timestamp.
  //   Note that we pass `Date.now` as a reference to the function, not `Date.now()`.
  //   If we used `Date.now()`, the date would be set only once when the code first runs.
  createdAt: {
    type: Date,
    default: Date.now
  }
});

postSchema.pre('save', async function () {
  if (!this.isModified('title') && this.slug) {
    return;
  }

  const baseSlug = slugify(this.title, {
    lower: true,
    strict: true,
    trim: true,
  });
  let slug = baseSlug;
  let suffix = 1;

  while (await this.constructor.exists({ slug, _id: { $ne: this._id } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  this.slug = slug;
});

// 3. Create and export the Mongoose Model.
// The mongoose.model() function compiles the schema into a usable model.
// It takes two arguments:
// - The singular name of the model as a string ('Post'). Mongoose will automatically look for
//   the plural, lowercased version of this name for the collection in the database (i.e., 'posts').
// - The schema to use (postSchema).
// We then use `module.exports` to make this Post model available to other files in our application,
// specifically our controllers.
const Post = mongoose.model('Post', postSchema);

module.exports = Post;
// By exporting the Post model, we can import it in our controller files to perform CRUD operations on our blog posts.