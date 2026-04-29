import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../api/authService';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [form, setForm]       = useState({ username: '', password: '' });
  const [errors, setErrors]   = useState({});
  const [apiError, setApiError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.username.trim()) e.username = 'Username is required.';
    if (!form.password)        e.password = 'Password is required.';
    console.log("Validate Passed",e);
    
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
    setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const data = await loginUser(form);
      login(data.user, data.token);
      navigate('/dashboard');
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="auth-card">
        {/* ── Header ── */}
        <div className="card-header">
          <div className="header-emblem">🛡️</div>
          <h1>Smart Tourist Safety System</h1>
          <p>Monitoring &amp; Incident Response Portal</p>
          <span className="header-badge">🔒 Government of India</span>
        </div>

        {/* ── Body ── */}
        <div className="card-body">
          <div className="blockchain-info">
            <span className="blockchain-dot" />
            Blockchain-secured authentication active
          </div>

          {apiError && (
            <div className="alert alert-error" role="alert">
              <span className="alert-icon">⚠️</span>
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Username */}
            <div className="form-section">
              <div className="form-group">
                <label className="form-label" htmlFor="username">
                  Username <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder="Enter your username"
                    value={form.username}
                    onChange={handleChange}
                    className={`form-input ${errors.username ? 'error' : ''}`}
                    aria-describedby={errors.username ? 'username-error' : undefined}
                  />
                </div>
                {errors.username && (
                  <span id="username-error" className="field-error">⚠ {errors.username}</span>
                )}
              </div>
            </div>

            {/* Password */}
            <div className="form-section">
              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  Password <span className="required">*</span>
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">🔑</span>
                  <input
                    id="password"
                    name="password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handleChange}
                    className={`form-input ${errors.password ? 'error' : ''}`}
                    style={{ paddingRight: '3rem' }}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                  />
                  <button
                    type="button"
                    className="input-icon-right"
                    onClick={() => setShowPass((p) => !p)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    title={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
                {errors.password && (
                  <span id="password-error" className="field-error">⚠ {errors.password}</span>
                )}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <><span className="spinner" />Authenticating...</>
              ) : (
                <>🔐 Secure Login</>
              )}
            </button>
          </form>

          <div className="auth-footer">
            Not registered yet?{' '}
            <Link to="/register" className="auth-link">Register Here →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}