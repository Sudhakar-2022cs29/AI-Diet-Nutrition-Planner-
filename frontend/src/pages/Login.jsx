// Login page
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiLogIn } from 'react-icons/fi';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(form);
    if (result.success) navigate('/dashboard');
    else setError(result.message);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🥗</div>
          <h1>Welcome back</h1>
          <p>Sign in to your NutriAI account</p>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <div style={{ position: 'relative' }}>
              <FiMail style={{ position:'absolute', left:'0.875rem', top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
              <input
                className="form-input" style={{ paddingLeft: '2.5rem' }}
                type="email" name="email" placeholder="you@example.com"
                value={form.email} onChange={handleChange} required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <FiLock style={{ position:'absolute', left:'0.875rem', top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
              <input
                className="form-input" style={{ paddingLeft: '2.5rem' }}
                type="password" name="password" placeholder="••••••••"
                value={form.password} onChange={handleChange} required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width:'100%', justifyContent:'center' }} disabled={loading}>
            {loading ? <span className="spinner" /> : <><FiLogIn /> Sign In</>}
          </button>
        </form>

        <div className="auth-divider">or</div>
        <p style={{ textAlign:'center', fontSize:'0.875rem' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color:'var(--accent-green)', fontWeight:600, textDecoration:'none' }}>Sign up free</Link>
        </p>

        {/* Demo credentials hint */}
        <div className="alert alert-info" style={{ marginTop:'1.5rem', fontSize:'0.8rem' }}>
          <strong>Demo:</strong> Sign up with any email to get started — no real email needed.
        </div>
      </div>
    </div>
  );
}
