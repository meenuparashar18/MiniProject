const fs = require('fs');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const Post = require('../models/postModel');
const User = require('../models/userModel');
const { getIo } = require('../socket');

const listenersByPost = new Map();

const postImageUploadDir = path.join(__dirname, '..', 'uploads', 'posts');
fs.mkdirSync(postImageUploadDir, { recursive: true });

const postImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, postImageUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.png';
    cb(null, `${req.user._id}-${Date.now()}${ext}`);
  },
});

const postImageFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image uploads are allowed.'));
  }
};

const postImageUploader = multer({
  storage: postImageStorage,
  fileFilter: postImageFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
});

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseCommaList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  return [];
};

const parseGalleryImages = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeUploadUrl = (filename) => `/uploads/posts/${filename}`;

const buildFilter = (baseFilter = {}, query = {}) => {
  const filter = { ...baseFilter };

  if (query.search) {
    const regex = new RegExp(escapeRegex(String(query.search).trim()), 'i');
    filter.$or = [
      { title: regex },
      { markdownContent: regex },
      { categories: regex },
      { tags: regex },
      { author: regex },
    ];
  }

  if (query.tag) {
    filter.tags = { $regex: new RegExp(`^${escapeRegex(String(query.tag))}$`, 'i') };
  }

  if (query.status && ['draft', 'published'].includes(query.status)) {
    filter.status = query.status;
  }

  return filter;
};

const getSort = (sort) => {
  switch (sort) {
    case 'popular':
      return { views: -1, createdAt: -1 };
    case 'liked':
      return { likesCount: -1, createdAt: -1 };
    case 'discussed':
      return { commentsCount: -1, createdAt: -1 };
    case 'oldest':
      return { createdAt: 1 };
    default:
      return { createdAt: -1 };
  }
};

const aggregatePosts = async (filter, { page, limit, sort }) => {
  const skip = (page - 1) * limit;
  const sortStage = getSort(sort);

  const [posts, countResult] = await Promise.all([
    Post.aggregate([
      { $match: filter },
      {
        $addFields: {
          likesCount: { $size: { $ifNull: ['$likes', []] } },
          commentsCount: { $size: { $ifNull: ['$comments', []] } },
        },
      },
      { $sort: sortStage },
      { $skip: skip },
      { $limit: limit },
    ]),
    Post.aggregate([{ $match: filter }, { $count: 'total' }]),
  ]);

  const total = countResult[0]?.total || 0;

  return {
    posts,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  };
};

const broadcastPostEvent = (postId, payload) => {
  getIo()?.to(`post:${String(postId)}`).emit('post:comment', payload);
  const listeners = listenersByPost.get(String(postId)) || [];

  listeners.forEach((res) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  });
};

const createNotification = async (userId, notification) => {
  const user = await User.findById(userId);

  if (!user) {
    return;
  }

  user.notifications.unshift(notification);
  user.notifications = user.notifications.slice(0, 40);
  await user.save();
  getIo()?.to(`user:${userId.toString()}`).emit('notification:new', notification);
};

const createPost = async (req, res) => {
  try {
    const { title, markdownContent, categories, tags, status, galleryImages } = req.body;

    if (!title || !markdownContent) {
      return res.status(400).json({ message: 'Please provide a title and content for the post.' });
    }

    const newPost = await Post.create({
      title,
      markdownContent,
      author: req.user.username,
      owner: req.user._id,
      categories: parseCommaList(categories),
      tags: parseCommaList(tags),
      galleryImages: parseGalleryImages(galleryImages),
      status: status === 'draft' ? 'draft' : 'published',
    });

    res.status(201).json(newPost);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Error creating post', error: error.message });
  }
};

const uploadPostImage = postImageUploader.single('image');

const createUploadedImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please choose an image file.' });
    }

    res.status(201).json({
      message: 'Image uploaded successfully.',
      imageUrl: normalizeUploadUrl(req.file.filename),
      markdown: `![image alt](${normalizeUploadUrl(req.file.filename)})`,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading image', error: error.message });
  }
};

const getAllPosts = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20);
    const result = await aggregatePosts(buildFilter({ status: 'published' }, req.query), {
      page,
      limit,
      sort: req.query.sort,
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching posts', error: error.message });
  }
};

const getMyPosts = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 30);
    const result = await aggregatePosts(buildFilter({ owner: req.user._id }, req.query), {
      page,
      limit,
      sort: req.query.sort,
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching your posts', error: error.message });
  }
};

const getSavedPosts = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 20);
    const skip = (page - 1) * limit;
    const total = req.user.savedPosts?.length || 0;

    await req.user.populate({
      path: 'savedPosts',
      options: { sort: { createdAt: -1 }, skip, limit },
    });

    res.status(200).json({
      posts: req.user.savedPosts || [],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching saved posts', error: error.message });
  }
};

const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (
      post.status === 'draft' &&
      (!req.user || !post.owner || post.owner.toString() !== req.user._id.toString())
    ) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.status(200).json(post);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: `Invalid post ID format: ${req.params.id}` });
    }

    res.status(500).json({ message: 'Error fetching post', error: error.message });
  }
};

const getPostBySlug = async (req, res) => {
  try {
    let post = await Post.findOne({ slug: req.params.slug });

    if (!post && mongoose.Types.ObjectId.isValid(req.params.slug)) {
      post = await Post.findById(req.params.slug);
    }

    if (!post || post.status === 'draft') {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.views += 1;
    await post.save();

    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching post', error: error.message });
  }
};

const getPostsByCategory = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20);
    const filter = buildFilter(
      {
        status: 'published',
        categories: { $regex: new RegExp(`^${escapeRegex(req.params.categoryName)}$`, 'i') },
      },
      req.query
    );

    const result = await aggregatePosts(filter, { page, limit, sort: req.query.sort });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching category posts', error: error.message });
  }
};

const getPostsByTag = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20);
    const filter = buildFilter(
      {
        status: 'published',
        tags: { $regex: new RegExp(`^${escapeRegex(req.params.tagName)}$`, 'i') },
      },
      req.query
    );

    const result = await aggregatePosts(filter, { page, limit, sort: req.query.sort });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tagged posts', error: error.message });
  }
};

const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (!post.owner || post.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can edit only your own posts.' });
    }

    post.revisionHistory.unshift({
      title: post.title,
      markdownContent: post.markdownContent,
      categories: post.categories,
      tags: post.tags,
      status: post.status,
      savedAt: new Date(),
    });
    post.revisionHistory = post.revisionHistory.slice(0, 15);

    post.title = req.body.title ?? post.title;
    post.markdownContent = req.body.markdownContent ?? post.markdownContent;
    post.author = req.user.username;

    if (req.body.categories !== undefined) {
      post.categories = parseCommaList(req.body.categories);
    }

    if (req.body.tags !== undefined) {
      post.tags = parseCommaList(req.body.tags);
    }

    if (req.body.galleryImages !== undefined) {
      post.galleryImages = parseGalleryImages(req.body.galleryImages);
    }

    if (req.body.status !== undefined) {
      post.status = req.body.status === 'draft' ? 'draft' : 'published';
    }

    const updatedPost = await post.save();
    res.status(200).json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: 'Error updating post', error: error.message });
  }
};

const restoreRevision = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (!post.owner || post.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can edit only your own posts.' });
    }

    const revision = post.revisionHistory.id(req.params.revisionId);

    if (!revision) {
      return res.status(404).json({ message: 'Revision not found.' });
    }

    post.revisionHistory.unshift({
      title: post.title,
      markdownContent: post.markdownContent,
      categories: post.categories,
      tags: post.tags,
      status: post.status,
      savedAt: new Date(),
    });
    post.revisionHistory = post.revisionHistory.slice(0, 15);

    post.title = revision.title || post.title;
    post.markdownContent = revision.markdownContent || post.markdownContent;
    post.categories = revision.categories || [];
    post.tags = revision.tags || [];
    post.status = revision.status || post.status;

    await post.save();

    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Error restoring revision.', error: error.message });
  }
};

const getPostHistory = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).select('revisionHistory owner');

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    if (!post.owner || post.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can view only your own post history.' });
    }

    res.status(200).json({
      history: post.revisionHistory || [],
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching post history.', error: error.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const deletedPost = await Post.findById(req.params.id);

    if (!deletedPost) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (!deletedPost.owner || deletedPost.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can delete only your own posts.' });
    }

    await deletedPost.deleteOne();

    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting post', error: error.message });
  }
};

const toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const alreadyLiked = post.likes.some((like) => like.toString() === req.user._id.toString());

    if (alreadyLiked) {
      post.likes = post.likes.filter((like) => like.toString() !== req.user._id.toString());
    } else {
      post.likes.push(req.user._id);

      if (post.owner && post.owner.toString() !== req.user._id.toString()) {
        await createNotification(post.owner, {
          type: 'like',
          message: `${req.user.username} liked your post "${post.title}".`,
          link: `/post/${post.slug || post._id}`,
        });
      }
    }

    await post.save();

    res.status(200).json({
      liked: !alreadyLiked,
      likesCount: post.likes.length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating like', error: error.message });
  }
};

const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Please write a comment.' });
    }

    post.comments.push({
      user: req.user._id,
      username: req.user.username,
      text: text.trim(),
    });

    await post.save();

    if (post.owner && post.owner.toString() !== req.user._id.toString()) {
      await createNotification(post.owner, {
        type: 'comment',
        message: `${req.user.username} commented on your post "${post.title}".`,
        link: `/post/${post.slug || post._id}`,
      });
    }

    const payload = {
      type: 'comment',
      comments: post.comments,
      commentsCount: post.comments.length,
    };

    broadcastPostEvent(post._id, payload);

    res.status(201).json(payload);
  } catch (error) {
    res.status(500).json({ message: 'Error adding comment', error: error.message });
  }
};

const streamComments = async (req, res) => {
  const postId = String(req.params.id);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const listeners = listenersByPost.get(postId) || [];
  listeners.push(res);
  listenersByPost.set(postId, listeners);

  const post = await Post.findById(postId).select('comments');
  res.write(`data: ${JSON.stringify({ type: 'init', comments: post?.comments || [] })}\n\n`);

  req.on('close', () => {
    const current = listenersByPost.get(postId) || [];
    listenersByPost.set(
      postId,
      current.filter((listener) => listener !== res)
    );
  });
};

const getModerationOverview = async (_req, res) => {
  try {
    const reportedPosts = await Post.find({ 'reports.0': { $exists: true } })
      .sort({ createdAt: -1 })
      .lean();

    const flaggedComments = reportedPosts.flatMap((post) =>
      (post.comments || []).map((comment) => ({
        postId: post._id,
        postTitle: post.title,
        comment,
      }))
    );

    res.status(200).json({
      reportedPosts,
      flaggedComments,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error loading moderation data.', error: error.message });
  }
};

const toggleFeaturePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    post.featured = !post.featured;
    await post.save();

    res.status(200).json({ featured: post.featured });
  } catch (error) {
    res.status(500).json({ message: 'Could not update featured status.', error: error.message });
  }
};

const deleteCommentAsAdmin = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    post.comments = (post.comments || []).filter((comment) => comment._id.toString() !== req.params.commentId);
    await post.save();

    const payload = {
      type: 'comment',
      comments: post.comments,
      commentsCount: post.comments.length,
    };
    broadcastPostEvent(post._id, payload);

    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({ message: 'Could not delete comment.', error: error.message });
  }
};

const toggleSavePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const folderName = typeof req.body.folder === 'string' ? req.body.folder.trim() : '';
    const alreadySaved = req.user.savedPosts.some((savedPost) => savedPost.toString() === post._id.toString());

    if (alreadySaved) {
      req.user.savedPosts = req.user.savedPosts.filter((savedPost) => savedPost.toString() !== post._id.toString());
      req.user.bookmarkFolders = (req.user.bookmarkFolders || []).map((folder) => ({
        ...folder.toObject?.(),
        posts: (folder.posts || []).filter((savedPost) => savedPost.toString() !== post._id.toString()),
      }));
    } else {
      req.user.savedPosts.push(post._id);

      if (folderName) {
        const existingFolder = req.user.bookmarkFolders.find(
          (folder) => folder.name.toLowerCase() === folderName.toLowerCase()
        );

        if (existingFolder) {
          if (!existingFolder.posts.some((savedPost) => savedPost.toString() === post._id.toString())) {
            existingFolder.posts.push(post._id);
          }
        } else {
          req.user.bookmarkFolders.push({
            name: folderName,
            posts: [post._id],
          });
        }
      }
    }

    await req.user.save();

    res.status(200).json({
      saved: !alreadySaved,
      savedPosts: req.user.savedPosts,
      bookmarkFolders: req.user.bookmarkFolders,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error saving post', error: error.message });
  }
};

const getExploreData = async (_req, res) => {
  try {
    const [trendingPosts, mostLikedPosts, newestPosts, newestCreators, featuredPosts] = await Promise.all([
      Post.aggregate([
        { $match: { status: 'published' } },
        {
          $addFields: {
            likesCount: { $size: { $ifNull: ['$likes', []] } },
            commentsCount: { $size: { $ifNull: ['$comments', []] } },
            trendScore: {
              $add: [
                '$views',
                { $multiply: [{ $size: { $ifNull: ['$likes', []] } }, 4] },
                { $multiply: [{ $size: { $ifNull: ['$comments', []] } }, 6] },
              ],
            },
          },
        },
        { $sort: { trendScore: -1, createdAt: -1 } },
        { $limit: 6 },
      ]),
      Post.aggregate([
        { $match: { status: 'published' } },
        { $addFields: { likesCount: { $size: { $ifNull: ['$likes', []] } } } },
        { $sort: { likesCount: -1, createdAt: -1 } },
        { $limit: 6 },
      ]),
      Post.find({ status: 'published' }).sort({ createdAt: -1 }).limit(6).lean(),
      User.aggregate([
        {
          $lookup: {
            from: 'posts',
            localField: '_id',
            foreignField: 'owner',
            as: 'posts',
          },
        },
        {
          $addFields: {
            publishedPosts: {
              $size: {
                $filter: {
                  input: '$posts',
                  as: 'post',
                  cond: { $eq: ['$$post.status', 'published'] },
                },
              },
            },
          },
        },
        {
          $project: {
            username: 1,
            avatarUrl: 1,
            followersCount: { $size: { $ifNull: ['$followers', []] } },
            publishedPosts: 1,
            createdAt: 1,
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 6 },
      ]),
      Post.find({ status: 'published', featured: true }).sort({ createdAt: -1 }).limit(4).lean(),
    ]);

    res.status(200).json({
      trendingPosts,
      mostLikedPosts,
      newestPosts,
      newestCreators,
      featuredPosts,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error loading explore feed.', error: error.message });
  }
};

const getMyAnalytics = async (req, res) => {
  try {
    const posts = await Post.find({ owner: req.user._id }).lean();

    const totalViews = posts.reduce((sum, post) => sum + (post.views || 0), 0);
    const totalLikes = posts.reduce((sum, post) => sum + (post.likes?.length || 0), 0);
    const totalComments = posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0);
    const totalPublished = posts.filter((post) => post.status === 'published').length;
    const totalDrafts = posts.filter((post) => post.status === 'draft').length;
    const topPosts = [...posts]
      .sort((a, b) => (b.views || 0) + (b.likes?.length || 0) * 4 - ((a.views || 0) + (a.likes?.length || 0) * 4))
      .slice(0, 5);

    const engagementTimeline = [...posts]
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((post) => ({
        label: new Date(post.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        views: post.views || 0,
        likes: post.likes?.length || 0,
        comments: post.comments?.length || 0,
      }));

    res.status(200).json({
      totals: {
        posts: posts.length,
        published: totalPublished,
        drafts: totalDrafts,
        views: totalViews,
        likes: totalLikes,
        comments: totalComments,
        saves: req.user.savedPosts?.length || 0,
        followers: req.user.followers?.length || 0,
      },
      topPosts,
      engagementTimeline,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error loading analytics.', error: error.message });
  }
};

const reportPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    if (!req.body.reason || !String(req.body.reason).trim()) {
      return res.status(400).json({ message: 'Please provide a reason.' });
    }

    post.reports.push({
      user: req.user._id,
      username: req.user.username,
      reason: String(req.body.reason).trim(),
    });
    await post.save();

    res.status(201).json({ message: 'Report submitted.' });
  } catch (error) {
    res.status(500).json({ message: 'Could not report this post.', error: error.message });
  }
};

module.exports = {
  addComment,
  createPost,
  createUploadedImage,
  deletePost,
  getAllPosts,
  getExploreData,
  getModerationOverview,
  getMyAnalytics,
  getMyPosts,
  getPostById,
  getPostBySlug,
  getPostHistory,
  getPostsByCategory,
  getPostsByTag,
  getSavedPosts,
  reportPost,
  restoreRevision,
  streamComments,
  toggleFeaturePost,
  toggleLike,
  toggleSavePost,
  updatePost,
  uploadPostImage,
  deleteCommentAsAdmin,
};
