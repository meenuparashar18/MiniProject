// client/src/components/PostListItem.js

import React from 'react';
// HIGHLIGHT START
// 1. Import the Link component from react-router-dom
import { Link } from 'react-router-dom';
// HIGHLIGHT END

const PostListItem = ({ post }) => {
  const snippet = post.markdownContent
    .replace(/[#*`]/g, '')
    .substring(0, 150) + '...';

  return (
    <article className="post-list-item">
      <Link to={`/post/${post.slug || post._id}`} className="post-link">
        <h2>{post.title}</h2>
        <div className="post-meta">
          <span>by {post.author}</span>
          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
        </div>
        <p>{snippet}</p>
      </Link>
      <div className="post-engagement">
        <span>{post.likes?.length || 0} likes</span>
        <span>{post.comments?.length || 0} comments</span>
        <span>{post.views || 0} views</span>
      </div>
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
    </article>
  );
};

export default PostListItem;
