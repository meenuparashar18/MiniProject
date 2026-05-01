import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import apiService from '../apiService';
import PaginatedPostList from '../components/PaginatedPostList';

const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 5 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);

      try {
        const response = await apiService.get(`/posts?page=${pagination.page}&limit=${pagination.limit}`);
        setPosts(response.data.posts);
        setPagination(response.data.pagination);
        setError(null);
      } catch (err) {
        setError('Failed to fetch posts. Please try again later.');
        console.error('Error fetching posts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [pagination.page, pagination.limit]);

  const handlePageChange = (page) => {
    setPagination((currentPagination) => ({
      ...currentPagination,
      page,
    }));
  };

  const featuredPost = posts[0];
  const categories = ['All', ...new Set(posts.flatMap((post) => post.categories || []))];
  const tags = [...new Set(posts.flatMap((post) => post.tags || []))].slice(0, 8);
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      !searchQuery.trim() ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.markdownContent.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.categories || []).some((category) => category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (post.tags || []).some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = activeCategory === 'All' || (post.categories || []).includes(activeCategory);

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <div className="state-panel">Loading posts...</div>;
  }

  if (error) {
    return <div className="state-panel error-message">{error}</div>;
  }

  return (
    <section className="home-page">
      <Helmet>
        <title>PersonalBlogAI | Thoughtful blog posts</title>
      </Helmet>

      <section className="hero-band">
        <div className="hero-copy">
          <p className="eyebrow">Weekly Notes</p>
          <h1>Ideas worth slowing down for.</h1>
          <p className="hero-text">
            Essays, experiments, and practical guides collected in one quiet corner of the internet.
          </p>
          <div className="hero-actions">
            <a className="button-link" href="#latest-posts">
              Read Latest Posts
            </a>
            <Link className="secondary-button button-link" to="/explore">
              Explore Trends
            </Link>
            <Link className="secondary-button button-link" to="/admin/login">
              Write Something New
            </Link>
          </div>
        </div>

        <div
          className="hero-feature"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(17, 24, 39, 0.05), rgba(17, 24, 39, 0.72)), url('https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=1200&q=80')",
          }}
        >
          {featuredPost ? (
            <div className="hero-feature-content">
              <span className="hero-feature-label">Featured post</span>
              <h2>{featuredPost.title}</h2>
              <p>{featuredPost.markdownContent.replace(/[#*`]/g, '').slice(0, 150)}...</p>
              <Link className="hero-feature-link" to={`/post/${featuredPost.slug || featuredPost._id}`}>
                Read this story
              </Link>
            </div>
          ) : (
            <div className="hero-feature-content">
              <span className="hero-feature-label">Start here</span>
              <h2>Your next post can live here.</h2>
              <p>Create the first story and this space will turn into your featured highlight.</p>
            </div>
          )}
        </div>
      </section>

      <section className="home-stats">
        <article>
          <strong>{pagination.total}</strong>
          <span>Published posts</span>
        </article>
        <article>
          <strong>{categories.length - 1}</strong>
          <span>Active categories</span>
        </article>
        <article>
          <strong>{pagination.pages}</strong>
          <span>Pages to explore</span>
        </article>
      </section>

      <section className="section-heading" id="latest-posts">
        <div>
          <p className="eyebrow">Latest collection</p>
          <h2>Newest writing</h2>
        </div>
        <span className="section-note">Page {pagination.page}</span>
      </section>

      <section className="discover-tools">
        <input
          className="discover-search"
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search titles, content, or categories..."
        />

        <div className="discover-categories">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`discover-chip ${activeCategory === category ? 'discover-chip-active' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
        {tags.length > 0 && (
          <div className="discover-categories">
            {tags.map((tag) => (
              <Link className="discover-chip" key={tag} to={`/tag/${encodeURIComponent(tag)}`}>
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </section>

      <PaginatedPostList posts={filteredPosts} pagination={pagination} onPageChange={handlePageChange} />
    </section>
  );
};

export default HomePage;
