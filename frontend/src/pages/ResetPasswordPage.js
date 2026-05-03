import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import apiService from '../apiService';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialToken = searchParams.get('token') || '';
  const initialUsername = searchParams.get('username') || '';
  const [username, setUsername] = useState(initialUsername);
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetDetails, setResetDetails] = useState(null);

  const handleRequestReset = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await apiService.post('/auth/forgot-password', { username });
      setResetDetails(response.data);
      setToken(response.data.resetToken || '');
      setMessage('Reset details generated. Use the OTP or the reset link below.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not request a reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await apiService.post('/auth/reset-password', {
        username,
        password,
        otp,
        token,
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset the password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page">
      <Helmet>
        <title>Reset Password | PersonalBlogAI</title>
      </Helmet>

      <div className="auth-layout">
        <div className="auth-intro">
          <p className="eyebrow">Recovery</p>
          <h1>Reset your password without getting stuck.</h1>
          <p>This build uses an OTP or reset token flow so you can recover the account right inside the app.</p>
          <Link className="button-link" to="/admin/login">
            Back to Login
          </Link>
        </div>

        <div className="auth-card auth-stack">
          <form className="admin-form auth-form" onSubmit={handleRequestReset}>
            <h2>Request reset</h2>
            <label htmlFor="reset-username">Username</label>
            <input id="reset-username" type="text" value={username} onChange={(event) => setUsername(event.target.value)} required />
            <button type="submit" disabled={loading}>
              {loading ? 'Generating...' : 'Send OTP / Link'}
            </button>
          </form>

          {resetDetails && (
            <div className="state-panel reset-details">
              <strong>Developer reset details</strong>
              <p>OTP: {resetDetails.otp}</p>
              <p>Token: {resetDetails.resetToken}</p>
            </div>
          )}

          <form className="admin-form auth-form" onSubmit={handleResetPassword}>
            <h2>Set a new password</h2>
            <label htmlFor="otp">OTP Code</label>
            <input id="otp" type="text" value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="Use this or the token below" />
            <label htmlFor="token">Reset Token</label>
            <input id="token" type="text" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste reset token if using link flow" />
            <label htmlFor="new-password">New Password</label>
            <input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <button type="submit" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          {message && <p className="state-panel">{message}</p>}
          {error && <p className="error-message">{error}</p>}
        </div>
      </div>
    </section>
  );
};

export default ResetPasswordPage;
