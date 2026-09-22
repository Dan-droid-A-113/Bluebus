import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, CheckCircle2, AlertCircle, Loader2, Disc } from 'lucide-react';
import { getTripSeatsApi, swapSeatApi } from '../api';

export default function SeatSwapModal({ booking, onClose, onSuccess }) {
  const [layout, setLayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPassengerId, setSelectedPassengerId] = useState(
    booking.passengers?.[0]?.passenger_id || null
  );
  const [selectedNewSeat, setSelectedNewSeat] = useState(null);
  const [activeDeck, setActiveDeck] = useState('LOWER');
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTripSeats();
  }, [booking.trip_id]);

  const loadTripSeats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTripSeatsApi(booking.trip_id);
      setLayout(data);
    } catch (e) {
      setError(e.message || 'Failed to load bus seat layout');
    } finally {
      setLoading(false);
    }
  };

  const handleSwapSubmit = async () => {
    if (!selectedPassengerId || !selectedNewSeat) {
      alert('Please select the passenger and the new available seat.');
      return;
    }

    setSwapping(true);
    setError(null);
    try {
      const res = await swapSeatApi(booking.pnr_number, {
        passenger_id: selectedPassengerId,
        new_seat_id: selectedNewSeat.seat_id,
        reason: 'Passenger requested seat swap'
      });
      alert(res.message);
      onSuccess(res);
    } catch (e) {
      setError(e.message || 'Failed to swap seat');
      setSwapping(false);
    }
  };

  const currentPassenger = booking.passengers.find(p => p.passenger_id === selectedPassengerId);
  const currentDeckSeats = activeDeck === 'UPPER' ? layout?.upper_deck : layout?.lower_deck;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 620 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
            <ArrowRightLeft size={22} />
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Seat Swap &amp; Relocation</h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                PNR: {booking.pnr_number} &bull; {booking.bus_name}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }} disabled={swapping}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 10px', color: 'var(--primary)' }} />
            <div>Loading available seats for seat swap...</div>
          </div>
        ) : error ? (
          <div style={{ padding: '1rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 8 }}>
            {error}
          </div>
        ) : (
          <div>
            {/* Step 1: Select Passenger to Swap */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                1. SELECT PASSENGER TO MOVE
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {booking.passengers.map(p => (
                  <button
                    key={p.passenger_id}
                    type="button"
                    onClick={() => {
                      setSelectedPassengerId(p.passenger_id);
                      setSelectedNewSeat(null);
                    }}
                    style={{
                      padding: '0.5rem 0.85rem',
                      borderRadius: 6,
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      border: selectedPassengerId === p.passenger_id ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: selectedPassengerId === p.passenger_id ? 'var(--primary-light)' : '#ffffff',
                      color: selectedPassengerId === p.passenger_id ? 'var(--primary)' : 'var(--text-main)'
                    }}
                  >
                    {p.name} (Current: Seat {p.seat_number})
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Pick New Available Seat */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  2. CHOOSE NEW SEAT TO SWAP INTO
                </label>
                {layout?.upper_deck?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button 
                      className={`deck-tab-btn ${activeDeck === 'LOWER' ? 'active' : ''}`}
                      onClick={() => setActiveDeck('LOWER')}
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                    >
                      Lower Deck
                    </button>
                    <button 
                      className={`deck-tab-btn ${activeDeck === 'UPPER' ? 'active' : ''}`}
                      onClick={() => setActiveDeck('UPPER')}
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                    >
                      Upper Deck
                    </button>
                  </div>
                )}
              </div>

              {/* Mini Seat Chassis */}
              <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem', maxHeight: 240, overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                  {currentDeckSeats?.map(seat => {
                    const isAvailable = seat.status === 'AVAILABLE';
                    const isCurrent = currentPassenger?.seat_number === seat.seat_number;
                    const isPicked = selectedNewSeat?.seat_id === seat.seat_id;

                    let bg = '#ffffff';
                    let border = '1px solid #cbd5e1';
                    let color = '#0f172a';
                    let cursor = 'pointer';

                    if (isCurrent) {
                      bg = '#e0f2fe';
                      border = '2px solid #0284c7';
                      color = '#0284c7';
                    } else if (isPicked) {
                      bg = 'var(--primary)';
                      border = '2px solid var(--primary-hover)';
                      color = '#ffffff';
                    } else if (!isAvailable) {
                      bg = '#e2e8f0';
                      color = '#94a3b8';
                      cursor = 'not-allowed';
                    }

                    return (
                      <div
                        key={seat.seat_id}
                        onClick={() => {
                          if (isAvailable && !isCurrent) {
                            setSelectedNewSeat(seat);
                          }
                        }}
                        style={{
                          background: bg,
                          border: border,
                          color: color,
                          cursor: cursor,
                          borderRadius: 6,
                          padding: '0.6rem 0.4rem',
                          textAlign: 'center',
                          fontSize: '0.78rem',
                          fontWeight: 700
                        }}
                        title={isCurrent ? 'Current Seat' : (isAvailable ? `Available - ₹${seat.price}` : `Occupied by ${seat.passenger_gender || 'Passenger'}`)}
                      >
                        <div>{seat.seat_number}</div>
                        <div style={{ fontSize: '0.68rem', opacity: 0.85 }}>
                          {isCurrent ? 'Current' : (isAvailable ? `₹${seat.price}` : (seat.passenger_gender === 'FEMALE' ? '♀ Occ' : '♂ Occ'))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Swap Summary */}
            {selectedNewSeat && currentPassenger && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>Confirmed Relocation</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#14532d' }}>
                    Seat {currentPassenger.seat_number} &rarr; Seat {selectedNewSeat.seat_number}
                  </div>
                </div>
                <div className="badge badge-green">Ready to Swap</div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }} disabled={swapping}>
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleSwapSubmit} 
                style={{ flex: 1.5 }}
                disabled={swapping || !selectedNewSeat}
              >
                {swapping ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Swapping Seat...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Confirm Seat Swap</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
