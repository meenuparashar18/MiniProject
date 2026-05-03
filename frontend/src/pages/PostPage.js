// client/src/pages/PostPage.js

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import apiService from '../apiService';
import ReactMarkdown from 'react-markdown';
import { connectSocket } from '../socket';

// HIGHLIGHT START
// Import the stylesheet.
// The path './markdown-styles.css' is a relative path that tells the build tool
// to find the CSS file in the same directory ('src') as the current file.
// By importing it here, its styles become available to the component.
import '../markdown-styles.css';
// HIGHLIGHT END

const PostPage = () => {
  const { slug } = useParams();
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [activeGalleryImage, setActiveGalleryImage] = useState('');

  useEffect(() => {
    // ... data fetching logic remains the same
    const fetchPost = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiService.get(`/posts/slug/${slug}`);
        setPost(response.data);
      } catch (err) {
        console.error("Error fetching post:", err);
        if (err.response && err.response.status === 404) {
          setError('Post not found.');
        } else {
          setError('Failed to load the post. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  useEffect(() => {
    if (!post?._id) {
      return undefined;
    }

    const token = localStorage.getItem('token');
    const socket = connectSocket(token);
    const handleCommentUpdate = (data) => {
      if (data.comments) {
        setPost((currentPost) => ({
          ...currentPost,
          comments: data.comments,
        }));
      }
    };

    socket.emit('post:join', post._id);
    socket.on('post:comment', handleCommentUpdate);

    return () => {
      socket.emit('post:leave', post._id);
      socket.off('post:comment', handleCommentUpdate);
    };
  }, [post?._id]);

  useEffect(() => {
    if (post?.galleryImages?.length) {
      setActiveGalleryImage(post.galleryImages[0]);
    }
  }, [post]);

  // ... conditional rendering for loading/error states remains the same
  if (loading) {
    return <div>Loading post...</div>;
  }
  if (error) {
    return <div style={{ color: 'red', textAlign: 'center', marginTop: '2rem' }}>Error: {error}</div>;
  }
  if (!post) {
    return <div>Post not found.</div>;
  }

  const likedByCurrentUser = currentUser && post.likes?.some((like) => like === currentUser.id || like?._id === currentUser.id);
  const savedPostIds = currentUser?.savedPosts || [];
  const isSaved = currentUser && savedPostIds.some((savedPostId) => savedPostId === post._id || savedPostId?._id === post._id);

  const handleLike = async () => {
    try {
      const response = await apiService.post(`/posts/${post._id}/like`);
      setPost((currentPost) => ({
        ...currentPost,
        likes: response.data.liked
          ? [...(currentPost.likes || []), currentUser.id]
          : (currentPost.likes || []).filter((like) => like !== currentUser.id && like?._id !== currentUser.id),
      }));
    } catch (err) {
      setActionMessage(err.response?.data?.message || 'Please log in to like posts.');
    }
  };

  const handleSave = async () => {
    try {
      const folder = window.prompt('Save to a folder like React, Ideas, or Read later. Leave blank for general saved posts.', '');
      const response = await apiService.post(`/posts/${post._id}/save`, { folder });
      const updatedUser = {
        ...currentUser,
        savedPosts: response.data.savedPosts,
        bookmarkFolders: response.data.bookmarkFolders,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setActionMessage(response.data.saved ? 'Post saved.' : 'Post removed from saved posts.');
    } catch (err) {
      setActionMessage(err.response?.data?.message || 'Please log in to save posts.');
    }
  };

  const handleCommentSubmit = async (event) => {
    event.preventDefault();

    if (!commentText.trim()) {
      return;
    }

    try {
      const response = await apiService.post(`/posts/${post._id}/comments`, { text: commentText });
      setPost((currentPost) => ({
        ...currentPost,
        comments: response.data.comments,
      }));
      setCommentText('');
      setActionMessage('Comment added.');
    } catch (err) {
      setActionMessage(err.response?.data?.message || 'Please log in to comment.');
    }
  };

  const handleReport = async () => {
    const reason = window.prompt('Why are you reporting this post?', '');
    if (!reason) {
      return;
    }

    try {
      await apiService.post(`/posts/${post._id}/report`, { reason });
      setActionMessage('Report submitted.');
    } catch (err) {
      setActionMessage(err.response?.data?.message || 'Could not report this post.');
    }
  };

  return (
    <article className="post-full">
      <Helmet>
        <title>{post.title} | My Blog</title>
      </Helmet>

      <h1>{post.title}</h1>
      <div className="post-full-meta">
        <Link className="author-link" to={`/profile/${encodeURIComponent(post.author)}`}>by {post.author}</Link>
        <span>Published on {new Date(post.createdAt).toLocaleDateString()}</span>
        <span>{post.views || 0} views</span>
      </div>
      <div className="post-social-bar">
        <button type="button" className={`secondary-button social-button ${likedByCurrentUser ? 'active-social' : ''}`} onClick={handleLike}>
          {likedByCurrentUser ? 'Liked' : 'Like'} ({post.likes?.length || 0})
        </button>
        <button type="button" className={`secondary-button social-button ${isSaved ? 'active-social' : ''}`} onClick={handleSave}>
          {isSaved ? 'Saved' : 'Save'}
        </button>
        <button
          type="button"
          className="secondary-button social-button"
          onClick={async () => {
            const shareUrl = `${window.location.origin}/post/${post.slug || post._id}`;
            if (navigator.share) {
              await navigator.share({ title: post.title, url: shareUrl });
            } else {
              await navigator.clipboard.writeText(shareUrl);
              setActionMessage('Post link copied.');
            }
          }}
        >
          Share
        </button>
        <button
          type="button"
          className="secondary-button social-button"
          onClick={async () => {
            const shareUrl = `${window.location.origin}/post/${post.slug || post._id}`;
            await navigator.clipboard.writeText(`WhatsApp / Instagram / Facebook / X: ${shareUrl}`);
            setActionMessage('Share-ready link copied for WhatsApp, Instagram, Facebook, and X.');
          }}
        >
          Social Share
        </button>
        <button type="button" className="secondary-button social-button" onClick={handleReport}>
          Report
        </button>
        <span className="social-meta">{post.comments?.length || 0} comments</span>
      </div>
      {actionMessage && <p className="state-panel">{actionMessage}</p>}
      {post.categories?.length > 0 && (
        <div className="category-list">
          {post.categories.map((category) => (
            <Link className="category-pill category-link" to={`/category/${encodeURIComponent(category)}`} key={category}>
              {category}
            </Link>
          ))}
        </div>
      )}
      {post.tags?.length > 0 && (
        <div className="category-list">
          {post.tags.map((tag) => (
            <Link className="category-pill category-link" to={`/tag/${encodeURIComponent(tag)}`} key={tag}>
              #{tag}
            </Link>
          ))}
        </div>
      )}
      {post.galleryImages?.length > 0 && (
        <section className="gallery-panel">
          <img className="gallery-feature-image" src={activeGalleryImage || post.galleryImages[0]} alt={post.title} />
          <div className="gallery-thumb-row">
            {post.galleryImages.map((image) => (
              <button type="button" className="gallery-thumb" key={image} onClick={() => setActiveGalleryImage(image)}>
                <img src={image} alt={post.title} />
              </button>
            ))}
          </div>
        </section>
      )}
      {/*
        Because we imported the stylesheet, the selectors inside it
        (like '.post-full-content h1') will now correctly style the
        HTML elements generated by ReactMarkdown inside this div.
      */}
      <div className="post-full-content">
        <ReactMarkdown>{post.markdownContent}</ReactMarkdown>
      </div>

      <section className="comments-section">
        <h2>Comments</h2>
        <form className="comment-form" onSubmit={handleCommentSubmit}>
          <textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            rows="4"
            placeholder="Write a comment..."
          />
          <button type="submit">Add Comment</button>
        </form>

        <div className="comments-list">
          {(post.comments || []).length === 0 ? (
            <p className="state-panel">No comments yet. Start the conversation.</p>
          ) : (
            post.comments.map((comment, index) => (
              <article className="comment-card" key={`${comment.username}-${index}-${comment.createdAt}`}>
                <strong>{comment.username}</strong>
                <p>{comment.text}</p>
                <small>{new Date(comment.createdAt).toLocaleString()}</small>
              </article>
            ))
          )}
        </div>
      </section>
    </article>
  );
};

export default PostPage;
