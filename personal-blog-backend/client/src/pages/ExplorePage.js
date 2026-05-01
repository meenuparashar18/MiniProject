import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import apiService from '../apiService';

const ExploreSection = ({ eyebrow, title, items, renderItem, emptyMessage }) => (
  <section className="explore-section">
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
    </div>
    {items.length === 0 ? <p className="state-panel">{emptyMessage}</p> : <div className="explore-grid">{items.map(renderItem)}</div>}
  </section>
);

const ExplorePage = () => {
  const [data, setData] = useState({
    trendingPosts: [],
    mostLikedPosts: [],
    newestPosts: [],
    newestCreators: [],
    featuredPosts: [],
  });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const fetchExplore = async () => {
      try {
        const response = await apiService.get('/posts/explore');
        setData(response.data);
        setNotice('');
      } catch (err) {
        setData({
          trendingPosts: [],
          mostLikedPosts: [],
          newestPosts: [],
          newestCreators: [],
          featuredPosts: [],
        });
        setNotice(
          err.response?.data?.message ||
            'Explore data could not be refreshed just now. Showing the latest empty-state view instead.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchExplore();
  }, []);

  if (loading) {
    return <div className="state-panel">Loading explore feed...</div>;
  }

  return (
    <section className="admin-page">
      <Helmet>
        <title>Explore | PersonalBlogAI</title>
      </Helmet>

      <section className="hero-band explore-hero">
        <div className="hero-copy">
          <p className="eyebrow">Discover</p>
          <h1>See what is catching attention right now.</h1>
          <p className="hero-text">
            Trending posts, most-liked writing, newest creators, and featured pieces all in one place.
          </p>
        </div>
        <div className="profile-panel">
          <article>
            <strong>{data.trendingPosts.length}</strong>
            <span>Trending posts</span>
          </article>
          <article>
            <strong>{data.newestCreators.length}</strong>
            <span>New creators</span>
          </article>
          <article>
            <strong>{data.featuredPosts.length}</strong>
            <span>Featured picks</span>
          </article>
        </div>
      </section>

      {notice && <p className="state-panel">{notice}</p>}

      <ExploreSection
        eyebrow="Momentum"
        title="Trending now"
        items={data.trendingPosts}
        emptyMessage="No trending posts yet."
        renderItem={(post) => (
          <Link className="explore-card" key={post._id} to={`/post/${post.slug || post._id}`}>
            <strong>{post.title}</strong>
            <span>{post.author}</span>
            <small>{post.views || 0} views · {post.likesCount || post.likes?.length || 0} likes</small>
          </Link>
        )}
      />

      <ExploreSection
        eyebrow="Appreciated"
        title="Most liked"
        items={data.mostLikedPosts}
        emptyMessage="Likes will show up here soon."
        renderItem={(post) => (
          <Link className="explore-card" key={post._id} to={`/post/${post.slug || post._id}`}>
            <strong>{post.title}</strong>
            <span>{post.author}</span>
            <small>{post.likesCount || post.likes?.length || 0} likes</small>
          </Link>
        )}
      />

      <ExploreSection
        eyebrow="Fresh"
        title="Newest posts"
        items={data.newestPosts}
        emptyMessage="New posts will show up here."
        renderItem={(post) => (
          <Link className="explore-card" key={post._id} to={`/post/${post.slug || post._id}`}>
            <strong>{post.title}</strong>
            <span>{post.author}</span>
            <small>{new Date(post.createdAt).toLocaleDateString()}</small>
          </Link>
        )}
      />

      <ExploreSection
        eyebrow="Creators"
        title="Newest creators"
        items={data.newestCreators}
        emptyMessage="Creators will appear here once accounts are created."
        renderItem={(creator) => (
          <Link className="explore-card" key={creator._id} to={`/profile/${encodeURIComponent(creator.username)}`}>
            <strong>{creator.username}</strong>
            <span>{creator.publishedPosts} published posts</span>
            <small>{creator.followersCount} followers</small>
          </Link>
        )}
      />
    </section>
  );
};

export default ExplorePage;
