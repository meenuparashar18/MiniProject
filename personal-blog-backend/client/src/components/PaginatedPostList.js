import React from 'react';
import PostListItem from './PostListItem';

const PaginatedPostList = ({ posts, pagination, onPageChange }) => {
  if (posts.length === 0) {
    return <p className="state-panel">No posts found.</p>;
  }

  return (
    <>
      <div className="post-list-grid">
        {posts.map((post) => (
          <PostListItem key={post._id} post={post} />
        ))}
      </div>

      {pagination.pages > 1 && (
        <div className="pagination">
          <span className="pagination-summary">{pagination.total} posts total</span>
          <button
            type="button"
            className="secondary-button"
            disabled={pagination.page === 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            Previous
          </button>
          <span className="pagination-current">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            type="button"
            className="secondary-button"
            disabled={pagination.page === pagination.pages}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
};

export default PaginatedPostList;
