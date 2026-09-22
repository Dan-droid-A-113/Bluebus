import React from 'react';
import { RotateCcw, SlidersHorizontal, Clock, Zap, DollarSign, BusFront } from 'lucide-react';

export default function FilterSidebar({ filters, onFilterChange, onReset }) {
  return (
    <aside className="filter-sidebar">
      <div className="filter-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.95rem' }}>
          <SlidersHorizontal size={18} color="var(--primary)" />
          <span>FILTERS</span>
        </div>
        <button 
          onClick={onReset}
          style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}
        >
          <RotateCcw size={12} />
          <span>RESET</span>
        </button>
      </div>

      {/* Bus Types */}
      <div className="filter-group">
        <div className="filter-title">
          <span>Bus Types</span>
          <BusFront size={14} />
        </div>
        {[
          { label: 'All Buses', val: 'ALL' },
          { label: 'AC Buses', val: 'AC' },
          { label: 'Non-AC Buses', val: 'NON_AC' },
          { label: 'Sleeper Berths', val: 'SLEEPER' },
          { label: 'Seater Chairs', val: 'SEATER' }
        ].map(item => (
          <label key={item.val} className="filter-option">
            <input 
              type="radio" 
              name="bus_type" 
              checked={filters.bus_type === item.val}
              onChange={() => onFilterChange('bus_type', item.val)}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>

      {/* Operators */}
      <div className="filter-group">
        <div className="filter-title">
          <span>Bus Operators</span>
        </div>
        {[
          'ALL',
          'BlueBus Prime',
          'SRS Travels',
          'Orange Tours & Travels',
          'KPN Travels',
          'VRL Logistics'
        ].map(op => (
          <label key={op} className="filter-option">
            <input 
              type="radio" 
              name="operator_name" 
              checked={(filters.operator_name || 'ALL') === op}
              onChange={() => onFilterChange('operator_name', op === 'ALL' ? '' : op)}
            />
            <span>{op === 'ALL' ? 'All Operators' : op}</span>
          </label>
        ))}
      </div>

      {/* Departure Time Slots */}
      <div className="filter-group">
        <div className="filter-title">
          <span>Departure Time</span>
          <Clock size={14} />
        </div>
        {[
          { label: 'Any Time', val: 'ALL' },
          { label: 'Morning (06:00 - 12:00)', val: 'MORNING' },
          { label: 'Afternoon (12:00 - 18:00)', val: 'AFTERNOON' },
          { label: 'Night (After 18:00)', val: 'NIGHT' }
        ].map(slot => (
          <label key={slot.val} className="filter-option">
            <input 
              type="radio" 
              name="time_slot" 
              checked={(filters.time_slot || 'ALL') === slot.val}
              onChange={() => onFilterChange('time_slot', slot.val)}
            />
            <span>{slot.label}</span>
          </label>
        ))}
      </div>

      {/* Price Slider */}
      <div className="filter-group">
        <div className="filter-title">
          <span>Max Fare</span>
          <DollarSign size={14} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.3rem' }}>
          <span>₹300</span>
          <span>Up to ₹{filters.max_price || 1500}</span>
        </div>
        <input 
          type="range" 
          min="400" 
          max="1500" 
          step="50"
          value={filters.max_price || 1500}
          onChange={(e) => onFilterChange('max_price', Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--primary)' }}
        />
      </div>

      {/* Amenities Highlight */}
      <div className="filter-group" style={{ marginBottom: 0 }}>
        <div className="filter-title">
          <span>Key Amenities</span>
          <Zap size={14} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <div>&bull; Free High-speed Wi-Fi</div>
          <div>&bull; Individual USB Charging</div>
          <div>&bull; Sanitized Blankets &amp; Pillows</div>
          <div>&bull; GPS Live Location Tracking</div>
          <div>&bull; Emergency Exit &amp; Hammer</div>
        </div>
      </div>
    </aside>
  );
}
