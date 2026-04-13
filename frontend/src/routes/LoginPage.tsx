import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { id, email: userEmail, role, full_name, token } = await authService.login(
        email,
        password
      );
      localStorage.setItem('token', token);
      setUser({ id, email: userEmail, role, full_name });

      if (role === 'student') {
        navigate('/student');
      } else {
        navigate('/professor');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error || 'Invalid email or password'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Office Hours Booking</h1>
          <p>Sign in to your account</p>
        </div>

        {error && (
          <div className="toast toast-error">
            <span>⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-login"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Demo Credentials</p>
          <div className="demo-creds">
            <div className="cred">
              <small><strong>Student:</strong></small>
              <small>student1@university.edu / Password123!</small>
            </div>
            <div className="cred">
              <small><strong>Professor:</strong></small>
              <small>prof.martin@university.edu / Password123!</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

