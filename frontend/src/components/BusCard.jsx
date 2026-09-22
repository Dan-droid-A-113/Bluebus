import React, { useState } from 'react';
import { 
  Star, Wifi, Zap, Droplet, Navigation, ShieldCheck, 
  ChevronDown, ChevronUp, MessageSquare 
} from 'lucide-react';
import SeatLayout from './SeatLayout';

export default function BusCard({ trip, currentUser, onProceedToPayment, onOpenReviews }) {
  const [showSeats, setShowSeats] = useState(false);

  const getAmenityIcon = (amenity) => {
    const a = amenity.toLowerCase();
    if (a.includes('wifi')) return <Wifi size={13} />;
    if (a.includes('charg')) return <Zap size={13} />;
    if (a.includes('water')) return <Droplet size={13} />;
    if (a.includes('gps') || a.includes('track')) return <Navigation size={13} />;
    return <ShieldCheck size={13} />;
  };

  return (
    <div className="bus-card">
      {/* Main Bus Summary Bar */}
      <div className="bus-card-header">
        {/* Operator & Bus Details */}
        <div>
          <div className="bus-operator-name">
            <span>{trip.operator_name}</span>
            <div 
              className="badge badge-green" 
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
              onClick={() => onOpenReviews(trip)}
              title="Click to view traveler reviews"
            >
              <Star size={12} fill="currentColor" />
              <span>{trip.operator_rating}</span>
            </div>
          </div>
          <div className="bus-subinfo">
            <strong>{trip.bus_name}</strong> &bull; {trip.bus_type}
          </div>
        </div>

        {/* Departure -> Duration -> Arrival */}
        <div className="timing-block">
          <div>
            <div className="time-val">{trip.departure_time}</div>
            <div className="time-city">{trip.source_city}</div>
          </div>

          <div className="duration-line">
            <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>
              {Math.floor(trip.duration_mins / 60)}h {trip.duration_mins % 60}m
            </span>
            <div style={{ width: 60, height: 2, background: '#cbd5e1', margin: '4px 0' }} />
            <span style={{ fontSize: '0.68rem' }}>Direct</span>
          </div>

          <div>
            <div className="time-val">{trip.arrival_time}</div>
            <div className="time-city">{trip.destination_city}</div>
          </div>
        </div>

        {/* Fare & Availability */}
        <div className="fare-block">
          <div className="fare-amount">₹{trip.fare}</div>
          <div className="fare-label">Starting per seat</div>
          <div style={{ marginTop: 4 }}>
            <span className={`badge ${trip.available_seats < 5 ? 'badge-amber' : 'badge-blue'}`}>
              {trip.available_seats} Seats Left
            </span>
          </div>
        </div>

        {/* Action Toggle */}
        <div style={{ textAlign: 'right' }}>
          <button 
            className="btn-primary"
            onClick={() => setShowSeats(!showSeats)}
            style={{ width: '100%', padding: '0.65rem 1rem' }}
          >
            <span>{showSeats ? 'Hide Seats' : 'View Seats'}</span>
            {showSeats ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Footer Amenities & Reviews link */}
      <div className="bus-card-footer">
        <div className="amenities-badges">
          {trip.amenities.slice(0, 5).map((amenity, i) => (
            <span key={i} className="amenity-chip">
              {getAmenityIcon(amenity)}
              <span>{amenity}</span>
            </span>
          ))}
        </div>

        <button 
          onClick={() => onOpenReviews(trip)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 600 }}
        >
          <MessageSquare size={14} />
          <span>Reviews &amp; Ratings</span>
        </button>
      </div>

      {/* Collapsible Interactive Seat Map */}
      {showSeats && (
        <SeatLayout 
          trip={trip}
          currentUser={currentUser}
          onProceedToPayment={onProceedToPayment}
        />
      )}
    </div>
  );
}
