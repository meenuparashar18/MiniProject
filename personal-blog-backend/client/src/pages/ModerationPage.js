import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import apiService from '../apiService';

const ModerationPage = () => {
  const [data, setData] = useState({ reportedPosts: [], flaggedComments: [] });
  const [error, setError] = useState('');

  const fetchOverview = async () => {
    try {
      const response = await apiService.get('/posts/moderation/overview');
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load moderation overview.');
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleFeatureToggle = async (postId) => {
    await apiService.patch(`/posts/${postId}/feature`);
    fetchOverview();
  };

  const handleDeleteComment = async (postId, commentId) => {
    await apiService.delete(`/posts/${postId}/comments/${commentId}`);
    fetchOverview();
  };

  return (
    <section className="admin-page">
      <Helmet>
        <title>Moderation | PersonalBlogAI</title>
      </Helmet>

      <div className="admin-header">
        <div>
          <p className="eyebrow">Admin center</p>
          <h1>Moderation</h1>
          <p>Review reported posts, manage comments, and feature standout writing.</p>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}

      <section className="saved-posts-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Reported posts</p>
            <h2>Reports queue</h2>
          </div>
        </div>

        {data.reportedPosts.length === 0 ? (
          <p className="state-panel">No reported posts right now.</p>
        ) : (
          <div className="admin-post-list">
            {data.reportedPosts.map((post) => (
              <article className="admin-post-row" key={post._id}>
                <div>
                  <h2>{post.title}</h2>
                  <p>{post.reports.length} reports · {post.featured ? 'Featured' : 'Not featured'}</p>
                  <div className="comments-list">
                    {post.reports.map((report) => (
                      <article className="comment-card" key={report._id}>
                        <strong>{report.username || 'User'}</strong>
                        <p>{report.reason}</p>
                      </article>
                    ))}
                  </div>
                </div>
                <div className="admin-row-actions">
                  <Link to={`/post/${post.slug || post._id}`}>View</Link>
                  <button type="button" className="secondary-button" onClick={() => handleFeatureToggle(post._id)}>
                    {post.featured ? 'Unfeature' : 'Feature'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="saved-posts-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Comments</p>
            <h2>Recent comments</h2>
          </div>
        </div>
        {data.flaggedComments.length === 0 ? (
          <p className="state-panel">No comments available to review.</p>
        ) : (
          <div className="admin-post-list">
            {data.flaggedComments.map(({ postId, postTitle, comment }) => (
              <article className="admin-post-row" key={comment._id}>
                <div>
                  <h2>{postTitle}</h2>
                  <p>{comment.username}</p>
                  <p>{comment.text}</p>
                </div>
                <div className="admin-row-actions">
                  <button type="button" className="danger-button" onClick={() => handleDeleteComment(postId, comment._id)}>
                    Delete Comment
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
};

export default ModerationPage;
