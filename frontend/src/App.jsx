import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SearchPage from './pages/SearchPage';
import MyBookingsPage from './pages/MyBookingsPage';
import OffersPage from './pages/OffersPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AuthModal from './components/AuthModal';
import { getUser, setUser, setToken, loginApi } from './api';
import { Bus, ShieldCheck, Heart, Phone, Mail, Award, Clock } from 'lucide-react';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [currentUser, setCurrentUser] = useState(getUser());
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Auto-login with default demo user on first boot if no user is saved
  useEffect(() => {
    const initDefaultUser = async () => {
      if (!getUser()) {
        try {
          const res = await loginApi('user@bluebus.com', 'Password123!');
          setCurrentUser(res);
        } catch (e) {
          console.log('Default user login skipped:', e);
        }
      }
    };
    initDefaultUser();
  }, []);

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Blue Bus Navigation Bar */}
      <Navbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onAuthClick={() => setShowAuthModal(true)}
        onLogout={() => setCurrentUser(null)}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {activeTab === 'search' && (
          <SearchPage 
            currentUser={currentUser}
            onRequireAuth={() => setShowAuthModal(true)}
          />
        )}

        {activeTab === 'bookings' && (
          <MyBookingsPage 
            currentUser={currentUser}
            onRequireAuth={() => setShowAuthModal(true)}
          />
        )}

        {activeTab === 'offers' && (
          <OffersPage />
        )}

        {activeTab === 'admin' && (
          <AdminDashboardPage 
            currentUser={currentUser}
            onAdminLoginSuccess={(adminUser) => setCurrentUser(adminUser)}
          />
        )}
      </main>

      {/* Blue Bus Trust Footer */}
      <footer style={{ background: '#0f172a', color: '#cbd5e1', paddingTop: '3rem', paddingBottom: '2rem', borderTop: '4px solid #2563eb' }}>
        <div className="container">
          {/* Trust Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', borderBottom: '1px solid #334155', paddingBottom: '2.5rem', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ background: '#1e293b', padding: 12, borderRadius: 10, color: '#38bdf8' }}>
                <ShieldCheck size={28} />
              </div>
              <div>
                <h4 style={{ color: 'white', fontWeight: 700, fontSize: '0.98rem' }}>100% Secure Checkout</h4>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Encrypted payments with instant refundable guarantee</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ background: '#1e293b', padding: 12, borderRadius: 10, color: '#38bdf8' }}>
                <Clock size={28} />
              </div>
              <div>
                <h4 style={{ color: 'white', fontWeight: 700, fontSize: '0.98rem' }}>On-Time Guarantee</h4>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Live tracking and verified on-time departure records</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ background: '#1e293b', padding: 12, borderRadius: 10, color: '#38bdf8' }}>
                <Award size={28} />
              </div>
              <div>
                <h4 style={{ color: 'white', fontWeight: 700, fontSize: '0.98rem' }}>India's No. 1 Bus Platform</h4>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Over 10,000+ satisfied passengers every single day</p>
              </div>
            </div>
          </div>

          {/* Links and Brand */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa', fontWeight: 800, fontSize: '1.4rem', marginBottom: '0.75rem' }}>
                <Bus size={24} />
                <span>BLUE BUS</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
                Blue Bus is the leading online bus ticket reservation brand, providing seamless seat selection, live tracking, and instant refunds across India.
              </p>
            </div>

            <div>
              <h5 style={{ color: 'white', fontWeight: 700, marginBottom: '0.75rem' }}>Top Bus Routes</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem' }}>
                <a href="#search" onClick={() => setActiveTab('search')} style={{ color: '#94a3b8', textDecoration: 'none' }}>Chennai &rarr; Bangalore Bus</a>
                <a href="#search" onClick={() => setActiveTab('search')} style={{ color: '#94a3b8', textDecoration: 'none' }}>Bangalore &rarr; Chennai Bus</a>
                <a href="#search" onClick={() => setActiveTab('search')} style={{ color: '#94a3b8', textDecoration: 'none' }}>Mumbai &rarr; Pune Bus</a>
                <a href="#search" onClick={() => setActiveTab('search')} style={{ color: '#94a3b8', textDecoration: 'none' }}>Bangalore &rarr; Hyderabad Bus</a>
                <a href="#search" onClick={() => setActiveTab('search')} style={{ color: '#94a3b8', textDecoration: 'none' }}>Delhi &rarr; Jaipur Bus</a>
              </div>
            </div>

            <div>
              <h5 style={{ color: 'white', fontWeight: 700, marginBottom: '0.75rem' }}>Quick Navigation</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem' }}>
                <a href="#search" onClick={() => setActiveTab('search')} style={{ color: '#94a3b8', textDecoration: 'none' }}>Book Bus Tickets</a>
                <a href="#bookings" onClick={() => setActiveTab('bookings')} style={{ color: '#94a3b8', textDecoration: 'none' }}>My Bookings &amp; PNR</a>
                <a href="#offers" onClick={() => setActiveTab('offers')} style={{ color: '#94a3b8', textDecoration: 'none' }}>Promo Offers &amp; Discounts</a>
                <a href="#admin" onClick={() => setActiveTab('admin')} style={{ color: '#94a3b8', textDecoration: 'none' }}>Admin Operations Dashboard</a>
              </div>
            </div>

            <div>
              <h5 style={{ color: 'white', fontWeight: 700, marginBottom: '0.75rem' }}>Customer Helpline</h5>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={14} color="#60a5fa" />
                  <span>1800-258-3287 (Toll Free)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={14} color="#60a5fa" />
                  <span>support@bluebus.com</span>
                </div>
                <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#64748b' }}>
                  24/7 dedicated traveler assistance
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1e293b', paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
            &copy; {new Date().getFullYear()} Blue Bus Technologies Pvt. Ltd. All Rights Reserved &bull; RedBus-Style Bus Reservation Platform
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={(u) => setCurrentUser(u)}
        />
      )}
    </div>
  );
}
