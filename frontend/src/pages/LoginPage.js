import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import apiService from '../apiService';

const LoginPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('token')) {
      navigate('/admin/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'register' ? '/auth/register' : '/auth/login';
      const response = await apiService.post(endpoint, {
        username,
        password,
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/admin/dashboard');
    } catch (err) {
      setError(
        err.userMessage ||
          err.response?.data?.message ||
          (mode === 'register' ? 'Signup failed. Please try again.' : 'Login failed. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page">
      <Helmet>
        <title>{mode === 'register' ? 'Create Account' : 'Login'} | PersonalBlogAI</title>
      </Helmet>

      <div className="auth-layout">
        <div className="auth-intro">
          <p className="eyebrow">Personal space</p>
          <h1>{mode === 'register' ? 'Create your own writing account.' : 'Sign in to your account.'}</h1>
          <p>
            {mode === 'register'
              ? 'Create an account and you will have full access to your own posts, just like a personal creator profile.'
              : 'Sign in to manage your own posts, edit them, and delete them from your personal dashboard.'}
          </p>
        </div>

        <div className="auth-card">
          <div className="auth-switch">
            <button
              type="button"
              className={`secondary-button ${mode === 'login' ? 'auth-switch-active' : ''}`}
              onClick={() => {
                setMode('login');
                setError('');
              }}
            >
              Login
            </button>
            <button
              type="button"
              className={`secondary-button ${mode === 'register' ? 'auth-switch-active' : ''}`}
              onClick={() => {
                setMode('register');
                setError('');
              }}
            >
              Create Account
            </button>
          </div>

          {error && <p className="error-message">{error}</p>}

          <form className="admin-form auth-form" onSubmit={handleSubmit}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? (mode === 'register' ? 'Creating account...' : 'Signing in...') : mode === 'register' ? 'Create Account' : 'Login'}
            </button>
            {mode === 'login' && (
              <Link className="text-link" to="/reset-password">
                Forgot password?
              </Link>
            )}
          </form>
        </div>
      </div>
    </section>
  );
};

export default LoginPage;
