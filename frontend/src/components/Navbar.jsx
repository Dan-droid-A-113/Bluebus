import React from 'react';
import { Bus, Ticket, Tag, Shield, User, LogOut, LogIn } from 'lucide-react';
import { logoutApi } from '../api';

export default function Navbar({ activeTab, setActiveTab, currentUser, onAuthClick, onLogout }) {
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

        {/* Auth / Profile Area */}
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
    </header>
  );
}
