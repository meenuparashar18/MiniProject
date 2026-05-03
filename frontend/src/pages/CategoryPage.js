import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import apiService from '../apiService';
import PaginatedPostList from '../components/PaginatedPostList';

const CategoryPage = ({ mode = 'category' }) => {
  const params = useParams();
  const rawValue = mode === 'tag' ? params.tagName : params.categoryName;
  const decodedValue = decodeURIComponent(rawValue || '');
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 5 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);

      try {
        const endpoint = mode === 'tag' ? 'tag' : 'category';
        const response = await apiService.get(
          `/posts/${endpoint}/${encodeURIComponent(decodedValue)}?page=${pagination.page}&limit=${pagination.limit}`
        );
        setPosts(response.data.posts);
        setPagination(response.data.pagination);
        setError(null);
      } catch (err) {
        setError(`Failed to fetch ${mode} posts. Please try again later.`);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [decodedValue, mode, pagination.page, pagination.limit]);

  const handlePageChange = (page) => {
    setPagination((currentPagination) => ({
      ...currentPagination,
      page,
    }));
  };

  if (loading) {
    return <div className="state-panel">Loading posts...</div>;
  }

  if (error) {
    return <div className="state-panel error-message">{error}</div>;
  }

  return (
    <section className="admin-page">
      <Helmet>
        <title>{mode === 'tag' ? `#${decodedValue}` : decodedValue} | PersonalBlogAI</title>
      </Helmet>

      <section className="section-heading">
        <div>
          <p className="eyebrow">{mode === 'tag' ? 'Hashtag archive' : 'Category archive'}</p>
          <h1>{mode === 'tag' ? `#${decodedValue}` : decodedValue}</h1>
        </div>
        <span className="section-note">{pagination.total} posts</span>
      </section>

      <PaginatedPostList posts={posts} pagination={pagination} onPageChange={handlePageChange} />
    </section>
  );
};

export default CategoryPage;
