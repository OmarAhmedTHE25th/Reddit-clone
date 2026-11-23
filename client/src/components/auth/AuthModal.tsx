import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { AxiosError } from 'axios';
import { useAuth } from '../../context/AuthContext';

interface ApiErrorPayload {
  error?: string;
  field?: string;
  details?: Array<{ field: string; message: string }>;
}

export default function AuthModal() {
  const { authModal, openAuthModal, closeAuthModal, login, register } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Reset form state whenever modal mode switches or closes
  useEffect(() => {
    setFormError(null);
    setFieldErrors({});
    setPassword('');
    setShowPassword(false);
  }, [authModal]);

  if (!authModal) {
    return null;
  }

  const isLogin = authModal === 'login';

  function validateClientSide(): boolean {
    const errors: Record<string, string> = {};

    if (isLogin) {
      if (!identifier.trim()) {
        errors.identifier = 'Please enter your email or username';
      }
      if (!password) {
        errors.password = 'Please enter your password';
      }
    } else {
      if (username.trim().length < 3 || username.trim().length > 20) {
        errors.username = 'Username must be 3–20 characters';
      } else if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
        errors.username = 'Only letters, numbers, underscores, and hyphens allowed';
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors.email = 'Please enter a valid email address';
      }

      if (password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        errors.password = 'Password must include both a letter and a number';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!validateClientSide()) {
      return;
    }

    setSubmitting(true);
    try {
      if (isLogin) {
        await login(identifier.trim(), password);
      } else {
        await register({
          username: username.trim(),
          email: email.trim(),
          password,
          displayName: displayName.trim() || undefined,
        });
      }
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorPayload>;
      const data = axiosErr.response?.data;

      if (data?.details && data.details.length > 0) {
        const nextFieldErrors: Record<string, string> = {};
        for (const item of data.details) {
          nextFieldErrors[item.field] = item.message;
        }
        setFieldErrors(nextFieldErrors);
        setFormError(data.error || 'Please fix the highlighted fields');
      } else if (data?.field && data?.error) {
        setFieldErrors({ [data.field]: data.error });
        setFormError(data.error);
      } else {
        setFormError(data?.error || 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      <div className="modal-card">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={closeAuthModal}
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            padding: '6px',
          }}
        >
          <X size={20} />
        </button>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="navbar-logo-dot" style={{ width: '28px', height: '28px', fontSize: '0.95rem' }}>
              r
            </span>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Reddit Clone
            </span>
          </div>
          <h2 id="auth-modal-title" style={{ margin: '0 0 6px', fontSize: '1.5rem' }}>
            {isLogin ? 'Log In' : 'Sign Up'}
          </h2>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {isLogin
              ? 'Welcome back! Enter your credentials to continue.'
              : 'Create your account to customize your profile and join discussions.'}
          </p>
        </div>

        {formError && <div className="alert alert-error">{formError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {isLogin ? (
            <div className="form-group">
              <label className="form-label" htmlFor="login-identifier">
                Email or Username
              </label>
              <input
                id="login-identifier"
                type="text"
                className="form-input"
                placeholder="u/username or email@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                autoFocus
              />
              {fieldErrors.identifier && (
                <div className="form-error">{fieldErrors.identifier}</div>
              )}
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-username">
                  Username
                </label>
                <input
                  id="reg-username"
                  type="text"
                  className="form-input"
                  placeholder="e.g. alex_dev"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                />
                {fieldErrors.username && (
                  <div className="form-error">{fieldErrors.username}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-email">
                  Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                {fieldErrors.email && (
                  <div className="form-error">{fieldErrors.email}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-display-name">
                  Display Name <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  id="reg-display-name"
                  type="text"
                  className="form-input"
                  placeholder="How your name appears on your profile"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
                {fieldErrors.displayName && (
                  <div className="form-error">{fieldErrors.displayName}</div>
                )}
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder={isLogin ? 'Enter password' : 'Min 8 chars, letters & numbers'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                style={{ paddingRight: '42px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  padding: '4px',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.password && (
              <div className="form-error">{fieldErrors.password}</div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: '100%', padding: '11px 18px', fontSize: '0.95rem', marginTop: '4px' }}
          >
            {submitting
              ? isLogin
                ? 'Logging in...'
                : 'Creating account...'
              : isLogin
                ? 'Log In'
                : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop: '18px', marginBottom: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
          {isLogin ? 'New to Reddit Clone? ' : 'Already have an account? '}
          <button
            type="button"
            onClick={() => openAuthModal(isLogin ? 'register' : 'login')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--reddit-blue)',
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
}
