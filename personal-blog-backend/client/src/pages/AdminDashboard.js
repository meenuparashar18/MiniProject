import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import apiService from '../apiService';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [profileForm, setProfileForm] = useState({
    bio: currentUser?.bio || '',
    avatarUrl: currentUser?.avatarUrl || '',
    coverImageUrl: currentUser?.coverImageUrl || '',
    socialLinks: {
      website: currentUser?.socialLinks?.website || '',
      twitter: currentUser?.socialLinks?.twitter || '',
      github: currentUser?.socialLinks?.github || '',
    },
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [savedPosts, setSavedPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const avatarPreviewUrl =
    profileForm.avatarUrl && profileForm.avatarUrl.startsWith('/')
      ? `http://localhost:5001${profileForm.avatarUrl}`
      : profileForm.avatarUrl;

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await apiService.get('/posts/mine');
        setPosts(response.data.posts);
        const savedResponse = await apiService.get('/posts/saved');
        setSavedPosts(savedResponse.data.posts);
        const notificationsResponse = await apiService.get('/users/notifications');
        setNotifications(notificationsResponse.data.notifications);
        const analyticsResponse = await apiService.get('/posts/analytics');
        setAnalytics(analyticsResponse.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load posts.');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/admin/login');
  };

  const handleDelete = async (postId) => {
    const shouldDelete = window.confirm('Delete this post? This action cannot be undone.');

    if (!shouldDelete) {
      return;
    }

    try {
      await apiService.delete(`/posts/${postId}`);
      setPosts((currentPosts) => currentPosts.filter((post) => post._id !== postId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete post.');
    }
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    if (name.startsWith('socialLinks.')) {
      const socialKey = name.split('.')[1];
      setProfileForm((currentForm) => ({
        ...currentForm,
        socialLinks: {
          ...currentForm.socialLinks,
          [socialKey]: value,
        },
      }));
      return;
    }

    setProfileForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setProfileSaving(true);
    setError('');

    try {
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        const uploadResponse = await apiService.post('/users/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        profileForm.avatarUrl = uploadResponse.data.avatarUrl;
      }

      const response = await apiService.patch('/auth/me', profileForm);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/admin/dashboard', { replace: true });
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleMarkNotificationsRead = async () => {
    const response = await apiService.patch('/users/notifications/read');
    setNotifications(response.data.notifications);
  };

  const visiblePosts = [...posts]
    .filter((post) => {
      const query = searchQuery.toLowerCase().trim();

      if (!query) {
        return true;
      }

      return (
        post.title.toLowerCase().includes(query) ||
        (post.categories || []).some((category) => category.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      if (sortOrder === 'oldest') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }

      if (sortOrder === 'title') {
        return a.title.localeCompare(b.title);
      }

      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  if (loading) {
    return <div className="admin-page">Loading dashboard...</div>;
  }

  return (
    <section className="admin-page">
      <Helmet>
        <title>Your Dashboard | My Blog</title>
      </Helmet>

      <div className="admin-header">
        <div>
          <p className="eyebrow">Content studio</p>
          <h1>{currentUser?.username ? `${currentUser.username}'s Dashboard` : 'Your Dashboard'}</h1>
          <p>Manage only the posts from your own account.</p>
        </div>
        <div className="admin-header-actions">
          <Link className="button-link" to="/admin/posts/new">
            Create Post
          </Link>
          <button type="button" className="secondary-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}

      <section className="dashboard-stats">
        <article>
          <strong>{posts.length}</strong>
          <span>Posts ready</span>
        </article>
        <article>
          <strong>{posts.filter((post) => (post.categories || []).length > 0).length}</strong>
          <span>Categorized</span>
        </article>
        <article>
          <strong>{new Set(posts.flatMap((post) => post.categories || [])).size}</strong>
          <span>Topics covered</span>
        </article>
        <article>
          <strong>{analytics?.totals?.views || 0}</strong>
          <span>Total views</span>
        </article>
      </section>

      {analytics && (
        <section className="saved-posts-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Performance</p>
              <h2>Analytics dashboard</h2>
            </div>
          </div>
          <div className="dashboard-stats">
            <article>
              <strong>{analytics.totals.likes}</strong>
              <span>Total likes</span>
            </article>
            <article>
              <strong>{analytics.totals.comments}</strong>
              <span>Total comments</span>
            </article>
            <article>
              <strong>{analytics.totals.saves}</strong>
              <span>Saved posts</span>
            </article>
            <article>
              <strong>{analytics.totals.followers}</strong>
              <span>Followers</span>
            </article>
          </div>
          <div className="analytics-bars">
            {(analytics.engagementTimeline || []).slice(-8).map((item) => (
              <article className="analytics-bar-card" key={item.label}>
                <div className="analytics-bar-track">
                  <span style={{ height: `${Math.max(item.views, item.likes * 10, item.comments * 12, 8)}px` }} />
                </div>
                <strong>{item.label}</strong>
                <small>{item.views} views · {item.likes} likes · {item.comments} comments</small>
              </article>
            ))}
          </div>
          {(analytics.topPosts || []).length > 0 && (
            <div className="admin-post-list">
              {analytics.topPosts.map((post) => (
                <article className="admin-post-row" key={post._id}>
                  <div>
                    <h2>{post.title}</h2>
                    <p>{post.views || 0} views · {post.likes?.length || 0} likes · {post.comments?.length || 0} comments</p>
                  </div>
                  <div className="admin-row-actions">
                    <Link to={`/post/${post.slug || post._id}`}>View</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="profile-panel">
        <article>
          <strong>{currentUser?.username || 'Logged in user'}</strong>
          <span>Account owner</span>
        </article>
        <article>
          <strong>{posts.length}</strong>
          <span>Total personal posts</span>
        </article>
        <article>
          <strong>{posts.filter((post) => (post.categories || []).length > 0).length}</strong>
          <span>Posts with categories</span>
        </article>
        <article>
          <strong>{savedPosts.length}</strong>
          <span>Saved posts</span>
        </article>
      </section>

      <form className="admin-form profile-form" onSubmit={handleProfileSave}>
        <h2>Profile</h2>
        {avatarPreviewUrl && <img className="profile-avatar-preview" src={avatarPreviewUrl} alt="Profile preview" />}
        <label htmlFor="avatarUpload">Upload Avatar</label>
        <input id="avatarUpload" type="file" accept="image/*" onChange={(event) => setAvatarFile(event.target.files?.[0] || null)} />
        <label htmlFor="avatarUrl">Avatar URL</label>
        <input
          id="avatarUrl"
          name="avatarUrl"
          type="url"
          value={profileForm.avatarUrl}
          onChange={handleProfileChange}
          placeholder="https://example.com/avatar.jpg"
        />

        <label htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          name="bio"
          value={profileForm.bio}
          onChange={handleProfileChange}
          rows="4"
          placeholder="Tell readers about yourself..."
        />

        <label htmlFor="coverImageUrl">Cover Image URL</label>
        <input
          id="coverImageUrl"
          name="coverImageUrl"
          type="url"
          value={profileForm.coverImageUrl}
          onChange={handleProfileChange}
          placeholder="https://example.com/cover.jpg"
        />

        <label htmlFor="socialWebsite">Website</label>
        <input
          id="socialWebsite"
          name="socialLinks.website"
          type="url"
          value={profileForm.socialLinks.website}
          onChange={handleProfileChange}
          placeholder="https://your-portfolio.com"
        />

        <label htmlFor="socialTwitter">Twitter / X</label>
        <input
          id="socialTwitter"
          name="socialLinks.twitter"
          type="url"
          value={profileForm.socialLinks.twitter}
          onChange={handleProfileChange}
          placeholder="https://x.com/yourname"
        />

        <label htmlFor="socialGithub">GitHub</label>
        <input
          id="socialGithub"
          name="socialLinks.github"
          type="url"
          value={profileForm.socialLinks.github}
          onChange={handleProfileChange}
          placeholder="https://github.com/yourname"
        />

        <div className="form-actions">
          <button type="submit" disabled={profileSaving}>
            {profileSaving ? 'Saving profile...' : 'Save Profile'}
          </button>
        </div>
      </form>

      <section className="saved-posts-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Alerts</p>
            <h2>Notifications</h2>
          </div>
          <button type="button" className="secondary-button" onClick={handleMarkNotificationsRead}>
            Mark all read
          </button>
        </div>

        {notifications.length === 0 ? (
          <p className="state-panel">No notifications yet.</p>
        ) : (
          <div className="comments-list">
            {notifications.map((notification, index) => (
              <article className={`comment-card ${notification.read ? '' : 'notification-unread'}`} key={`${notification.type}-${index}-${notification.createdAt}`}>
                <strong>{notification.type}</strong>
                <p>{notification.message}</p>
                <small>{new Date(notification.createdAt).toLocaleString()}</small>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="saved-posts-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Saved collection</p>
            <h2>Posts you saved</h2>
          </div>
        </div>

        {savedPosts.length === 0 ? (
          <p className="state-panel">You have not saved any posts yet.</p>
        ) : (
          <div className="admin-post-list">
            {savedPosts.map((post) => (
              <article className="admin-post-row" key={post._id}>
                <div>
                  <h2>{post.title}</h2>
                  <p>
                    by {post.author} · {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="admin-row-actions">
                  <Link to={`/post/${post.slug || post._id}`}>View</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-tools">
        <input
          className="discover-search"
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search your posts..."
        />

        <select className="dashboard-select" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A-Z</option>
        </select>
      </section>

      {posts.length === 0 ? (
        <p className="state-panel">You have not posted anything yet. Create your first post.</p>
      ) : visiblePosts.length === 0 ? (
        <p className="state-panel">No posts match your current search.</p>
      ) : (
        <div className="admin-post-list">
          {visiblePosts.map((post) => (
            <article className="admin-post-row" key={post._id}>
              <div>
                <h2>{post.title}</h2>
                <p>
                  by {post.author} · {new Date(post.createdAt).toLocaleDateString()} · {post.status}
                </p>
                {post.categories?.length > 0 && (
                  <div className="category-list">
                    {post.categories.map((category) => (
                      <span className="category-pill" key={category}>
                        {category}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="admin-row-actions">
                <Link to={`/post/${post.slug || post._id}`}>View</Link>
                <Link to={`/admin/posts/${post._id}/edit`}>Edit</Link>
                <button type="button" className="danger-button" onClick={() => handleDelete(post._id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default AdminDashboard;
