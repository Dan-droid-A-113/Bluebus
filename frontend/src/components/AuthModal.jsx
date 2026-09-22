import React, { useState } from 'react';
import { X, User, Mail, Lock, Phone, UserCheck, Shield, Sparkles } from 'lucide-react';
import { loginApi, registerApi } from '../api';

export default function AuthModal({ onClose, onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('MALE');
  const [age, setAge] = useState(28);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await loginApi(email, password);
      onAuthSuccess(user);
      onClose();
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await registerApi({
        email,
        password,
        full_name: fullName,
        phone,
        gender,
        age: Number(age),
        role: 'PASSENGER'
      });
      // Auto login after register
      const user = await loginApi(email, password);
      onAuthSuccess(user);
      onClose();
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail, demoPassword) => {
    setLoading(true);
    setError(null);
    try {
      const user = await loginApi(demoEmail, demoPassword);
      onAuthSuccess(user);
      onClose();
    } catch (err) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 440 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {isRegister ? 'Join Blue Bus' : 'Sign in to Blue Bus'}
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* 1-Click Demo Login Box */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.85rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={14} />
            <span>INSTANT DEMO PERSONAS</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button 
              type="button" 
              className="btn-secondary" 
              style={{ fontSize: '0.78rem', padding: '0.45rem' }}
              onClick={() => handleQuickDemo('user@bluebus.com', 'Password123!')}
              disabled={loading}
            >
              <UserCheck size={14} color="var(--primary)" />
              <span>Demo Passenger</span>
            </button>
            <button 
              type="button" 
              className="btn-secondary" 
              style={{ fontSize: '0.78rem', padding: '0.45rem' }}
              onClick={() => handleQuickDemo('admin@bluebus.com', 'Admin123!')}
              disabled={loading}
            >
              <Shield size={14} color="var(--warning)" />
              <span>Demo Admin</span>
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.25rem' }}>
          <button 
            type="button" 
            style={{ 
              flex: 1, 
              padding: '0.6rem', 
              fontWeight: 700, 
              fontSize: '0.9rem', 
              color: !isRegister ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: !isRegister ? '2px solid var(--primary)' : 'none'
            }}
            onClick={() => setIsRegister(false)}
          >
            Sign In
          </button>
          <button 
            type="button" 
            style={{ 
              flex: 1, 
              padding: '0.6rem', 
              fontWeight: 700, 
              fontSize: '0.9rem', 
              color: isRegister ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: isRegister ? '2px solid var(--primary)' : 'none'
            }}
            onClick={() => setIsRegister(true)}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.65rem', borderRadius: 6, fontSize: '0.82rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={isRegister ? handleRegister : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {isRegister && (
            <>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Full Name</label>
                <input 
                  type="text" 
                  placeholder="Enter full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--border)', borderRadius: 6 }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Phone Number</label>
                <input 
                  type="tel" 
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--border)', borderRadius: 6 }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Gender</label>
                  <select 
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--border)', borderRadius: 6 }}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Age</label>
                  <input 
                    type="number" 
                    min="1"
                    max="100"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--border)', borderRadius: 6 }}
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Email Address</label>
            <input 
              type="email" 
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--border)', borderRadius: 6 }}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Password</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', border: '1px solid var(--border)', borderRadius: 6 }}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : (isRegister ? 'Register Account' : 'Sign In')}
          </button>
        </form>
      </div>
    </div>
  );
}
