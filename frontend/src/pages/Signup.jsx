// Signup page
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiMail, FiLock } from 'react-icons/fi';

export default function Signup() {
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    weight: '70', height: '170', age: '25',
    gender: 'male', goal: 'maintenance', activityLevel: 'moderate'
  });
  const [error, setError] = useState('');
  const { signup, loading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    const result = await signup(form);
    if (result.success) navigate('/dashboard');
    else setError(result.message);
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '540px' }}>
        <div className="auth-header">
          <div className="auth-logo">🥗</div>
          <h1>Create Account</h1>
          <p>Start your nutrition journey today</p>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Basic info */}
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" name="name" placeholder="John Doe" value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" name="password" placeholder="Min. 6 characters" value={form.password} onChange={handleChange} required />
          </div>

          {/* Physical stats — 3 columns */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Weight (kg)</label>
              <input className="form-input" type="number" name="weight" value={form.weight} onChange={handleChange} min="30" max="250" />
            </div>
            <div className="form-group">
              <label className="form-label">Height (cm)</label>
              <input className="form-input" type="number" name="height" value={form.height} onChange={handleChange} min="100" max="250" />
            </div>
            <div className="form-group">
              <label className="form-label">Age</label>
              <input className="form-input" type="number" name="age" value={form.age} onChange={handleChange} min="10" max="100" />
            </div>
          </div>

          {/* Gender & goal */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-input form-select" name="gender" value={form.gender} onChange={handleChange}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Goal</label>
              <select className="form-input form-select" name="goal" value={form.goal} onChange={handleChange}>
                <option value="weight_loss">🔥 Weight Loss</option>
                <option value="maintenance">⚖️ Maintenance</option>
                <option value="weight_gain">💪 Weight Gain</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Activity Level</label>
            <select className="form-input form-select" name="activityLevel" value={form.activityLevel} onChange={handleChange}>
              <option value="sedentary">Sedentary (little or no exercise)</option>
              <option value="light">Light (1-3 days/week)</option>
              <option value="moderate">Moderate (3-5 days/week)</option>
              <option value="active">Active (6-7 days/week)</option>
              <option value="very_active">Very Active (twice/day)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width:'100%', justifyContent:'center' }} disabled={loading}>
            {loading ? <span className="spinner" /> : '🚀 Create Account'}
          </button>
        </form>

        <div className="auth-divider">or</div>
        <p style={{ textAlign:'center', fontSize:'0.875rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color:'var(--accent-green)', fontWeight:600, textDecoration:'none' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
