import React, { useState, useEffect } from 'react';
import { Bus, Ticket, Tag, Shield, User, LogOut, LogIn, Database, RefreshCw } from 'lucide-react';
import { logoutApi, subscribeDbStatus, checkBackendConnection } from '../api';

export default function Navbar({ activeTab, setActiveTab, currentUser, onAuthClick, onLogout }) {
  const [dbState, setDbState] = useState({ connected: false, type: 'checking', target: '' });
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    checkBackendConnection().then(setDbState);
    const unsubscribe = subscribeDbStatus((status) => {
      setDbState(status);
    });
    return unsubscribe;
  }, []);

  const handleRefreshDb = async () => {
    setIsChecking(true);
    const res = await checkBackendConnection();
    setDbState(res);
    setIsChecking(false);
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        {/* Brand Logo */}
        <div 
          className="brand-logo" 
          onClick={() => setActiveTab('search')}
          style={{ cursor: 'pointer' }}
        >
          <div className="logo-icon">
            <Bus size={24} />
          </div>
          <div>
            <span>BLUE</span>
            <span style={{ color: '#0f172a' }}>BUS</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-links">
          <button 
            className={`nav-item ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <Bus size={18} />
            <span>Bus Tickets</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            <Ticket size={18} />
            <span>My Bookings</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'offers' ? 'active' : ''}`}
            onClick={() => setActiveTab('offers')}
          >
            <Tag size={18} />
            <span>Offers &amp; Coupons</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <Shield size={18} />
            <span>Admin Dashboard</span>
          </button>
        </nav>

        {/* Database Status Indicator & Auth Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {/* Live DBMS Status Pill */}
          <div 
            onClick={handleRefreshDb}
            title={dbState.connected ? `Connected to ${dbState.type.toUpperCase()} DBMS (${dbState.target}). Integrity: ${dbState.integrity || 'Strict'}. Click to ping.` : "Operating in standalone browser mode. Click to connect to backend DBMS."}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.65rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: dbState.connected ? '#ecfdf5' : '#fef3c7',
              color: dbState.connected ? '#047857' : '#b45309',
              border: `1px solid ${dbState.connected ? '#a7f3d0' : '#fde68a'}`,
              userSelect: 'none',
              transition: 'all 0.2s'
            }}
          >
            <Database size={13} />
            <span>
              {dbState.connected 
                ? (dbState.type === 'sqlite' ? 'DBMS: bluebus.db (WAL)' : 'DBMS: Neon Cloud SQL')
                : 'DBMS: Demo Standalone'}
            </span>
            <RefreshCw size={11} className={isChecking ? 'spin' : ''} style={{ opacity: 0.7 }} />
          </div>

          <div className="nav-auth">
            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="user-badge">
                  <User size={16} color="var(--primary)" />
                  <span>{currentUser.full_name}</span>
                  {currentUser.role === 'ADMIN' && (
                    <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>ADMIN</span>
                  )}
                </div>
                <button 
                  className="btn-secondary" 
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                  onClick={() => {
                    logoutApi();
                    onLogout();
                  }}
                  title="Logout"
                >
                  <LogOut size={15} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button className="btn-primary" onClick={onAuthClick}>
                <LogIn size={16} />
                <span>Login / Register</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

