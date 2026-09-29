import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, CheckCircle2, AlertCircle, Loader2, Send, Wrench, ShieldAlert } from 'lucide-react';
import { getTripSeatsApi, swapSeatApi, requestPeerSwapApi } from '../api';

export default function SeatSwapModal({ booking, onClose, onSuccess }) {
  const [layout, setLayout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPassengerId, setSelectedPassengerId] = useState(
    booking.passengers?.[0]?.passenger_id || null
  );
  const [selectedNewSeat, setSelectedNewSeat] = useState(null);
  const [swapReason, setSwapReason] = useState('Traveling with companion / preference for this seat');
  const [activeDeck, setActiveDeck] = useState('LOWER');
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');


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
      alert('Please select a passenger and a target seat.');
      return;
    }

    setSwapping(true);
    setError(null);
    setSuccessMsg('');

    try {
      if (selectedNewSeat.status === 'AVAILABLE') {
        // Direct instant relocation to empty seat
        const res = await swapSeatApi(booking.pnr_number, {
          passenger_id: selectedPassengerId,
          new_seat_id: selectedNewSeat.seat_id,
          reason: 'Passenger requested seat swap'
        });
        setSuccessMsg(res.message);
        setTimeout(() => {
          onSuccess(res);
        }, 1500);
      } else {
        // Peer-to-peer swap request to occupied seat
        const res = await requestPeerSwapApi(booking.pnr_number, {
          requester_passenger_id: selectedPassengerId,
          target_seat_id: selectedNewSeat.seat_id,
          reason: swapReason
        });
        setSuccessMsg(`Swap request sent to passenger of Seat ${selectedNewSeat.seat_number}! They will see it in their account to Accept or Reject.`);
        setTimeout(() => {
          onSuccess(res);
        }, 2200);
      }
    } catch (e) {
      setError(e.message || 'Failed to process seat swap request');
      setSwapping(false);
    }
  };

  const currentPassenger = booking.passengers.find(p => p.passenger_id === selectedPassengerId);
  const currentDeckSeats = activeDeck === 'UPPER' ? layout?.upper_deck : layout?.lower_deck;
  const isTargetOccupied = selectedNewSeat && (selectedNewSeat.status === 'BOOKED' || selectedNewSeat.status === 'LADIES_BOOKED');

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 640 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
            <ArrowRightLeft size={22} />
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Seat Swap &amp; Passenger Exchange</h3>
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
            <div>Loading live seat layout for seat swap...</div>
          </div>
        ) : (
          <div>
            {error && (
              <div style={{ padding: '0.85rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            {successMsg && (
              <div style={{ padding: '0.85rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 8, marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 700 }}>
                {successMsg}
              </div>
            )}

            {/* Step 1: Select Passenger */}
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

            {/* Step 2: Choose Seat */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  2. PICK SEAT (FREE OR BOOKED BY FELLOW PASSENGER)
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

              {/* Legend */}
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 12, height: 12, border: '1px solid #cbd5e1', background: '#fff', borderRadius: 2 }} /> Available (Direct)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 12, height: 12, border: '1px solid #fca5a5', background: '#fee2e2', borderRadius: 2 }} /> Occupied (Request Swap)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 12, height: 12, border: '1px dashed #cbd5e1', background: '#e2e8f0', borderRadius: 2 }} /> Inoperable (Damaged)
                </span>
              </div>

              {/* Mini Seat Chassis */}
              <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem', maxHeight: 250, overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                  {currentDeckSeats?.map(seat => {
                    const isCurrent = currentPassenger?.seat_number === seat.seat_number;
                    const isAvailable = seat.status === 'AVAILABLE';
                    const isBooked = seat.status === 'BOOKED' || seat.status === 'LADIES_BOOKED';
                    const isInoperable = seat.status === 'INOPERABLE' || seat.is_operable === false;
                    const isPicked = selectedNewSeat?.seat_id === seat.seat_id;

                    let bg = '#ffffff';
                    let border = '1px solid #cbd5e1';
                    let color = '#0f172a';
                    let cursor = 'pointer';

                    if (isCurrent) {
                      bg = '#e0f2fe';
                      border = '2px solid #0284c7';
                      color = '#0284c7';
                      cursor = 'default';
                    } else if (isPicked) {
                      if (isBooked) {
                        bg = '#f59e0b';
                        border = '2px solid #d97706';
                        color = '#ffffff';
                      } else {
                        bg = 'var(--primary)';
                        border = '2px solid var(--primary-hover)';
                        color = '#ffffff';
                      }
                    } else if (isInoperable) {
                      bg = '#e2e8f0';
                      border = '1px dashed #94a3b8';
                      color = '#64748b';
                      cursor = 'not-allowed';
                    } else if (isBooked) {
                      bg = '#fee2e2';
                      border = '1px solid #fca5a5';
                      color = '#991b1b';
                      cursor = 'pointer';
                    }

                    return (
                      <div
                        key={seat.seat_id}
                        onClick={() => {
                          if (!isCurrent && !isInoperable) {
                            setSelectedNewSeat(seat);
                          }
                        }}
                        style={{
                          background: bg,
                          border: border,
                          color: color,
                          cursor: cursor,
                          borderRadius: 6,
                          padding: '0.6rem 0.3rem',
                          textAlign: 'center',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          transition: 'all 0.15s ease'
                        }}
                        title={
                          isInoperable
                            ? `Seat ${seat.seat_number} Out of Service: ${seat.inoperable_reason || 'Maintenance'}`
                            : isCurrent
                            ? 'Your Current Seat'
                            : isAvailable
                            ? `Available - ₹${seat.price}`
                            : `Occupied by ${seat.passenger_gender || 'Passenger'} (${seat.passenger_age || 25} yrs)${seat.passenger_caption ? ` - Note: "${seat.passenger_caption}"` : ''} - Click to request swap`
                        }
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                          {isInoperable && <Wrench size={11} />}
                          <span>{seat.seat_number}</span>
                        </div>
                        <div style={{ fontSize: '0.66rem', opacity: 0.9, marginTop: 2 }}>
                          {isInoperable
                            ? 'Damaged'
                            : isCurrent
                            ? 'Current'
                            : isAvailable
                            ? `₹${seat.price}`
                            : (seat.passenger_gender === 'FEMALE' ? '♀ Swap' : '♂ Swap')}
                        </div>
                        {isBooked && seat.passenger_caption && (
                          <div style={{
                            fontSize: '0.54rem',
                            background: '#fef08a',
                            color: '#854d0e',
                            padding: '1px 2px',
                            borderRadius: 3,
                            fontWeight: 700,
                            marginTop: 2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            🏷️ {seat.passenger_caption}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Selected Action Details */}
            {selectedNewSeat && currentPassenger && (
              <div style={{ marginBottom: '1.25rem' }}>
                {!isTargetOccupied ? (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>Instant Seat Relocation</div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#14532d' }}>
                        Seat {currentPassenger.seat_number} &rarr; Seat {selectedNewSeat.seat_number} (Free Seat)
                      </div>
                    </div>
                    <div className="badge badge-green">Instant Move</div>
                  </div>
                ) : (
                  <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 8, padding: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 700 }}>Peer-to-Peer Seat Swap Request</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#92400e' }}>
                          Swap your Seat {currentPassenger.seat_number} with Occupant of Seat {selectedNewSeat.seat_number}
                        </div>
                      </div>
                      <span className="badge" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                        Requires Approval
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#78350f', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div>
                        Occupant: <strong>{selectedNewSeat.passenger_gender || 'Passenger'}</strong>, Age: <strong>{selectedNewSeat.passenger_age || 25}</strong>. A swap request will be sent to this traveler's account.
                      </div>
                      {selectedNewSeat.passenger_caption && (
                        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '0.35rem 0.6rem', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>🏷️</span>
                          <span><strong>Traveler Note:</strong> "{selectedNewSeat.passenger_caption}"</span>
                        </div>
                      )}
                      {selectedNewSeat.passenger_caption && (
                        selectedNewSeat.passenger_caption.toLowerCase().includes('not interested') ||
                        selectedNewSeat.passenger_caption.toLowerCase().includes('no swap')
                      ) && (
                        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '0.35rem 0.6rem', borderRadius: 6, color: '#991b1b', fontSize: '0.75rem', fontWeight: 600 }}>
                          ⚠️ Notice: This passenger has tagged themselves as "Not interested in seat swaps". Your request might be declined.
                        </div>
                      )}
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e', display: 'block', marginBottom: 4 }}>
                        Reason / Note to Passenger:
                      </label>
                      <input 
                        type="text" 
                        value={swapReason} 
                        onChange={(e) => setSwapReason(e.target.value)}
                        placeholder="e.g. Traveling with companion / preference for this seat"
                        style={{ width: '100%', padding: '0.45rem 0.65rem', border: '1px solid #fcd34d', borderRadius: 6, fontSize: '0.82rem', background: '#fff' }}
                      />
                    </div>
                  </div>
                )}
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
                style={{ flex: 1.5, background: isTargetOccupied ? '#d97706' : 'var(--primary)' }}
                disabled={swapping || !selectedNewSeat}
              >
                {swapping ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : isTargetOccupied ? (
                  <>
                    <Send size={16} />
                    <span>Send Peer Swap Request</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Confirm Instant Relocation</span>
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

