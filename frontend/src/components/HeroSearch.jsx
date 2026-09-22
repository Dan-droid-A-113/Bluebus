import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ArrowLeftRight, Calendar, Search, ChevronDown, Check } from 'lucide-react';
import { getCitiesApi } from '../api';

const DEFAULT_CITIES = [
  'Bangalore',
  'Chennai',
  'Coimbatore',
  'Delhi',
  'Hyderabad',
  'Jaipur',
  'Madurai',
  'Mumbai',
  'Pune'
];

export default function HeroSearch({ onSearch, defaultSource = 'Chennai', defaultDest = 'Bangalore', defaultDate = '' }) {
  const [source, setSource] = useState(defaultSource);
  const [destination, setDestination] = useState(defaultDest);
  const [availableCities, setAvailableCities] = useState(DEFAULT_CITIES);

  // Dropdown states
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);

  const fromRef = useRef(null);
  const toRef = useRef(null);

  // Default to today or tomorrow
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(defaultDate || todayStr);

  useEffect(() => {
    // Load dynamic cities from backend
    getCitiesApi()
      .then(res => {
        if (res.cities && res.cities.length > 0) {
          setAvailableCities(res.cities);
        }
      })
      .catch(() => {
        // Keep defaults
      });
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (fromRef.current && !fromRef.current.contains(e.target)) {
        setShowFromDropdown(false);
      }
      if (toRef.current && !toRef.current.contains(e.target)) {
        setShowToDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwap = () => {
    const temp = source;
    setSource(destination);
    setDestination(temp);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!source || !destination) {
      alert('Please provide both source and destination cities');
      return;
    }
    if (source.toLowerCase() === destination.toLowerCase()) {
      alert('Source and destination cannot be the same city.');
      return;
    }
    setShowFromDropdown(false);
    setShowToDropdown(false);
    onSearch({ source, destination, date });
  };

  const handleQuickRoute = (src, dst) => {
    setSource(src);
    setDestination(dst);
    onSearch({ source: src, destination: dst, date });
  };

  const filteredFromCities = availableCities.filter(c => 
    c.toLowerCase().includes((source || '').toLowerCase())
  );

  const filteredToCities = availableCities.filter(c => 
    c.toLowerCase().includes((destination || '').toLowerCase()) && c.toLowerCase() !== (source || '').toLowerCase()
  );

  return (
    <div className="hero-banner">
      <div className="container">
        <h1 className="hero-title">India's Smartest Bus Ticket Booking</h1>
        <p className="hero-subtitle">
          Over 500+ Daily Trips &bull; Verified Ratings &bull; Real-time Seat Layouts &bull; Instant Refunds
        </p>

        {/* Search Box Card */}
        <form className="search-box-card" onSubmit={handleSubmit}>
          {/* FROM City Dropdown */}
          <div className="search-field" ref={fromRef} style={{ position: 'relative' }}>
            <label>
              <MapPin size={13} color="var(--primary)" />
              <span>FROM</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder="Select Source City"
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setShowFromDropdown(true);
                }}
                onFocus={() => setShowFromDropdown(true)}
                required
                style={{ cursor: 'pointer' }}
              />
              <button 
                type="button" 
                onClick={() => setShowFromDropdown(!showFromDropdown)}
                style={{ color: 'var(--text-muted)', padding: '0 4px' }}
              >
                <ChevronDown size={16} />
              </button>
            </div>

            {/* Dropdown Menu */}
            {showFromDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 8,
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                zIndex: 200,
                maxHeight: 240,
                overflowY: 'auto',
                marginTop: 6
              }}>
                <div style={{ padding: '6px 12px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                  AVAILABLE SOURCE CITIES
                </div>
                {filteredFromCities.length === 0 ? (
                  <div style={{ padding: '10px 12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>No city found</div>
                ) : (
                  filteredFromCities.map(city => (
                    <div 
                      key={city}
                      onClick={() => {
                        setSource(city);
                        setShowFromDropdown(false);
                      }}
                      style={{
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        color: source === city ? 'var(--primary)' : 'var(--text-main)',
                        background: source === city ? 'var(--primary-light)' : 'transparent',
                        borderBottom: '1px solid #f1f5f9'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = source === city ? 'var(--primary-light)' : 'transparent'}
                    >
                      <span>{city}</span>
                      {source === city && <Check size={14} color="var(--primary)" />}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Swap Button */}
          <button 
            type="button" 
            className="swap-btn" 
            onClick={handleSwap} 
            title="Swap Source &amp; Destination"
          >
            <ArrowLeftRight size={16} />
          </button>

          {/* TO City Dropdown */}
          <div className="search-field" ref={toRef} style={{ position: 'relative' }}>
            <label>
              <MapPin size={13} color="var(--primary)" />
              <span>TO</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder="Select Destination City"
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value);
                  setShowToDropdown(true);
                }}
                onFocus={() => setShowToDropdown(true)}
                required
                style={{ cursor: 'pointer' }}
              />
              <button 
                type="button" 
                onClick={() => setShowToDropdown(!showToDropdown)}
                style={{ color: 'var(--text-muted)', padding: '0 4px' }}
              >
                <ChevronDown size={16} />
              </button>
            </div>

            {/* Dropdown Menu */}
            {showToDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 8,
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                zIndex: 200,
                maxHeight: 240,
                overflowY: 'auto',
                marginTop: 6
              }}>
                <div style={{ padding: '6px 12px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                  AVAILABLE DESTINATIONS
                </div>
                {filteredToCities.length === 0 ? (
                  <div style={{ padding: '10px 12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>No destination found</div>
                ) : (
                  filteredToCities.map(city => (
                    <div 
                      key={city}
                      onClick={() => {
                        setDestination(city);
                        setShowToDropdown(false);
                      }}
                      style={{
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        color: destination === city ? 'var(--primary)' : 'var(--text-main)',
                        background: destination === city ? 'var(--primary-light)' : 'transparent',
                        borderBottom: '1px solid #f1f5f9'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = destination === city ? 'var(--primary-light)' : 'transparent'}
                    >
                      <span>{city}</span>
                      {destination === city && <Check size={14} color="var(--primary)" />}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Date Picker */}
          <div className="search-field">
            <label>
              <Calendar size={13} color="var(--primary)" />
              <span>TRAVEL DATE</span>
            </label>
            <input 
              type="date" 
              value={date}
              min={todayStr}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Submit Button */}
          <button type="submit" className="search-submit-btn">
            <Search size={18} />
            <span>SEARCH BUSES</span>
          </button>
        </form>

        {/* Quick Popular Routes */}
        <div className="popular-routes-bar">
          <span style={{ fontWeight: 600, opacity: 0.9 }}>Popular Routes:</span>
          <button type="button" className="route-chip" onClick={() => handleQuickRoute('Chennai', 'Bangalore')}>
            Chennai &rarr; Bangalore
          </button>
          <button type="button" className="route-chip" onClick={() => handleQuickRoute('Bangalore', 'Chennai')}>
            Bangalore &rarr; Chennai
          </button>
          <button type="button" className="route-chip" onClick={() => handleQuickRoute('Mumbai', 'Pune')}>
            Mumbai &rarr; Pune
          </button>
          <button type="button" className="route-chip" onClick={() => handleQuickRoute('Bangalore', 'Hyderabad')}>
            Bangalore &rarr; Hyderabad
          </button>
          <button type="button" className="route-chip" onClick={() => handleQuickRoute('Delhi', 'Jaipur')}>
            Delhi &rarr; Jaipur
          </button>
        </div>
      </div>
    </div>
  );
}
