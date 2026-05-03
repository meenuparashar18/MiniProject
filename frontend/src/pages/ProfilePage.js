import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import apiService from '../apiService';
import PaginatedPostList from '../components/PaginatedPostList';
import { toAbsoluteAssetUrl } from '../config';

const ProfilePage = () => {
  const { username } = useParams();
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiService.get(`/users/profile/${username}`);
        setProfile(response.data.profile);
        setPosts(response.data.posts);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load profile.');
      }
    };

    fetchProfile();
  }, [username]);

  const handleFollow = async () => {
    try {
      const response = await apiService.post(`/users/follow/${username}`);
      const updatedUser = {
        ...currentUser,
        following: response.data.followingIds,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setProfile((currentProfile) => ({
        ...currentProfile,
        followersCount: response.data.followersCount,
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update follow status.');
    }
  };

  const handleBlock = async () => {
    try {
      await apiService.post(`/users/block/${username}`);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update block status.');
    }
  };

  if (error) {
    return <div className="state-panel error-message">{error}</div>;
  }

  if (!profile) {
    return <div className="state-panel">Loading profile...</div>;
  }

  const isFollowing =
    currentUser?.following?.some((id) => id === profile.id || id?._id === profile.id) || false;
  const avatarUrl = toAbsoluteAssetUrl(profile.avatarUrl);
  const coverImageUrl = toAbsoluteAssetUrl(profile.coverImageUrl);

  return (
    <section className="admin-page">
      <Helmet>
        <title>{profile.username} | PersonalBlogAI</title>
      </Helmet>

      <section className="profile-page-cover" style={coverImageUrl ? { backgroundImage: `linear-gradient(rgba(17,24,39,0.25), rgba(17,24,39,0.55)), url(${coverImageUrl})` } : undefined}>
      <section className="profile-page-hero">
        <div className="profile-page-main">
          {avatarUrl ? <img className="profile-avatar-large" src={avatarUrl} alt={profile.username} /> : <div className="profile-avatar-large fallback-avatar">{profile.username.slice(0, 1).toUpperCase()}</div>}
          <div>
            <h1>{profile.username}</h1>
            <p>{profile.bio || 'No bio yet.'}</p>
            <small>Joined {new Date(profile.joinedAt).toLocaleDateString()}</small>
          </div>
        </div>
        {currentUser && currentUser.username !== profile.username && (
          <div className="admin-row-actions">
            <button type="button" onClick={handleFollow}>
              {isFollowing ? 'Unfollow' : 'Follow'}
            </button>
            <button type="button" className="secondary-button" onClick={handleBlock}>
              Block
            </button>
          </div>
        )}
      </section>
      </section>

      <section className="profile-panel">
        <article>
          <strong>{profile.followersCount}</strong>
          <span>Followers</span>
        </article>
        <article>
          <strong>{profile.followingCount}</strong>
          <span>Following</span>
        </article>
        <article>
          <strong>{posts.length}</strong>
          <span>Published posts</span>
        </article>
      </section>

      {(profile.socialLinks?.website || profile.socialLinks?.twitter || profile.socialLinks?.github) && (
        <section className="saved-posts-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Links</p>
              <h2>Find {profile.username} elsewhere</h2>
            </div>
          </div>
          <div className="category-list">
            {profile.socialLinks?.website && <a className="category-pill category-link" href={profile.socialLinks.website} target="_blank" rel="noreferrer">Website</a>}
            {profile.socialLinks?.twitter && <a className="category-pill category-link" href={profile.socialLinks.twitter} target="_blank" rel="noreferrer">Twitter / X</a>}
            {profile.socialLinks?.github && <a className="category-pill category-link" href={profile.socialLinks.github} target="_blank" rel="noreferrer">GitHub</a>}
          </div>
        </section>
      )}

      <PaginatedPostList posts={posts} pagination={{ page: 1, pages: 1, total: posts.length }} onPageChange={() => {}} />
    </section>
  );
};

export default ProfilePage;
