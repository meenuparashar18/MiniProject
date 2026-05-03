const express = require('express');
const { protect, optionalProtect, adminOnly } = require('../middleware/authMiddleware');
const {
  addComment,
  createPost,
  createUploadedImage,
  deleteCommentAsAdmin,
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
} = require('../controllers/postController');

const router = express.Router();

router.route('/').get(getAllPosts).post(protect, createPost);
router.get('/explore', getExploreData);
router.get('/moderation/overview', protect, adminOnly, getModerationOverview);
router.get('/mine', protect, getMyPosts);
router.get('/analytics', protect, getMyAnalytics);
router.get('/saved', protect, getSavedPosts);
router.post('/upload-image', protect, uploadPostImage, createUploadedImage);
router.get('/slug/:slug', getPostBySlug);
router.get('/category/:categoryName', getPostsByCategory);
router.get('/tag/:tagName', getPostsByTag);
router.get('/:id/comments/stream', streamComments);
router.get('/:id/history', protect, getPostHistory);
router.post('/:id/history/:revisionId/restore', protect, restoreRevision);
router.post('/:id/like', protect, toggleLike);
router.route('/:id/comments').post(protect, addComment);
router.post('/:id/save', protect, toggleSavePost);
router.post('/:id/report', protect, reportPost);
router.patch('/:id/feature', protect, adminOnly, toggleFeaturePost);
router.delete('/:id/comments/:commentId', protect, adminOnly, deleteCommentAsAdmin);
router.route('/:id').get(optionalProtect, getPostById).patch(protect, updatePost).delete(protect, deletePost);

module.exports = router;
