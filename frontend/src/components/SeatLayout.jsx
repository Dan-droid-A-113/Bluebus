import React, { useState, useEffect } from 'react';
import { getTripSeatsApi, applyCouponApi } from '../api';
import { Disc, Tag, Check, AlertCircle, Users, MapPin, Sparkles, Wrench, Info } from 'lucide-react';

const CAPTION_PRESETS = [
  '👶 Carrying a baby',
  '♿ In a wheelchair',
  '😴 Sound sleeper',
  '🚫 Not interested in seat swaps',
  '🪟 Prefer window seat swap',
  '🎧 Quiet traveler',
  '👴 Senior citizen'
];

export default function SeatLayout({ trip, currentUser, onProceedToPayment }) {
  const [loading, setLoading] = useState(true);
  const [layoutData, setLayoutData] = useState(null);
  const [error, setError] = useState(null);
  const [activeDeck, setActiveDeck] = useState('LOWER');
  const [hoveredSeat, setHoveredSeat] = useState(null);

  // Selected seats: array of seat items
  const [selectedSeats, setSelectedSeats] = useState([]);

  // Boarding & Dropping points
  const [selectedBoarding, setSelectedBoarding] = useState(null);
  const [selectedDropping, setSelectedDropping] = useState(null);

  // Passengers info: map seat_id -> { name, age, gender, caption }
  const [passengersMap, setPassengersMap] = useState({});

  // Contact details
  const [contactEmail, setContactEmail] = useState(currentUser?.email || 'user@bluebus.com');
  const [contactPhone, setContactPhone] = useState(currentUser?.phone || '9876543210');

  useEffect(() => {
    if (currentUser) {
      if (currentUser.email && (!contactEmail || contactEmail === 'user@bluebus.com')) {
        setContactEmail(currentUser.email);
      }
      if (currentUser.phone && (!contactPhone || contactPhone === '9876543210')) {
        setContactPhone(currentUser.phone);
      }
    }
  }, [currentUser]);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponStatus, setCouponStatus] = useState(null); // { valid, message, discount, final }
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  useEffect(() => {
    loadSeats();
  }, [trip.trip_id]);

  const loadSeats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTripSeatsApi(trip.trip_id);
      setLayoutData(data);
      if (data.boarding_points?.length > 0) {
        setSelectedBoarding(data.boarding_points[0].stop_id);
      }
      if (data.dropping_points?.length > 0) {
        setSelectedDropping(data.dropping_points[0].stop_id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load seat layout');
    } finally {
      setLoading(false);
    }
  };

  const handleSeatClick = (seat) => {
    if (seat.status === 'INOPERABLE' || seat.is_operable === false) {
      alert(`Seat ${seat.seat_number} is out of service (${seat.inoperable_reason || 'Maintenance/Damaged'}). It cannot be booked.`);
      return;
    }

    if (seat.status === 'BOOKED' || seat.status === 'LADIES_BOOKED') {
      return;
    }


    const exists = selectedSeats.some(s => s.seat_id === seat.seat_id);
    if (exists) {
      // Remove seat
      const nextSeats = selectedSeats.filter(s => s.seat_id !== seat.seat_id);
      setSelectedSeats(nextSeats);

      const nextPsg = { ...passengersMap };
      delete nextPsg[seat.seat_id];
      setPassengersMap(nextPsg);
      resetCoupon();
    } else {
      if (selectedSeats.length >= 6) {
        alert('You can select a maximum of 6 seats per booking.');
        return;
      }
      const nextSeats = [...selectedSeats, seat];
      setSelectedSeats(nextSeats);

      // Pre-fill passenger if it's the first seat and current user is logged in
      const defaultName = (nextSeats.length === 1 && currentUser?.full_name) ? currentUser.full_name : '';
      const defaultAge = (nextSeats.length === 1 && currentUser?.age) ? currentUser.age : 25;
      const defaultGender = (nextSeats.length === 1 && currentUser?.gender) ? currentUser.gender : 'MALE';

      setPassengersMap(prev => ({
        ...prev,
        [seat.seat_id]: { 
          name: defaultName || '', 
          age: defaultAge || 25, 
          gender: defaultGender || 'MALE',
          caption: ''
        }
      }));
      resetCoupon();
    }
  };

  const resetCoupon = () => {
    setCouponStatus(null);
  };

  const handlePassengerChange = (seatId, field, val) => {
    setPassengersMap(prev => ({
      ...prev,
      [seatId]: {
        name: '',
        age: 25,
        gender: 'MALE',
        caption: '',
        ...(prev[seatId] || {}),
        [field]: val
      }
    }));
  };

  const rawTotalFare = selectedSeats.reduce((acc, s) => acc + s.price, 0);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    try {
      const res = await applyCouponApi(couponCode.trim(), rawTotalFare);
      setCouponStatus(res);
    } catch (e) {
      setCouponStatus({ valid: false, message: e.message });
    } finally {
      setApplyingCoupon(false);
    }
  };

  const discountAmount = couponStatus?.valid ? couponStatus.discount_amount : 0.0;
  const finalPayable = Math.max(0, rawTotalFare - discountAmount);

  const handleProceed = () => {
    if (selectedSeats.length === 0) {
      alert('Please select at least one seat to proceed.');
      return;
    }

    if (!selectedBoarding || !selectedDropping) {
      alert('Please select both boarding and dropping points.');
      return;
    }

    // Validate passenger fields
    for (const seat of selectedSeats) {
      const p = passengersMap[seat.seat_id];
      if (!p || !p.name || !p.name.trim()) {
        alert(`Please enter a passenger name for Seat ${seat.seat_number}`);
        return;
      }
      if (!p.age || isNaN(Number(p.age)) || Number(p.age) <= 0) {
        alert(`Please enter a valid age for Seat ${seat.seat_number}`);
        return;
      }
    }

    const emailStr = (contactEmail || '').trim();
    if (!emailStr || !emailStr.includes('@')) {
      alert('Please provide a valid contact email address.');
      return;
    }

    const phoneStr = (contactPhone || '').trim();
    if (!phoneStr || phoneStr.length < 7) {
      alert('Please provide a valid contact phone number.');
      return;
    }

    const payload = {
      trip_id: trip.trip_id,
      boarding_point_id: Number(selectedBoarding) || null,
      dropping_point_id: Number(selectedDropping) || null,
      coupon_code: couponStatus?.valid ? couponStatus.code : null,
      contact_email: emailStr,
      contact_phone: phoneStr,
      total_amount: rawTotalFare,
      discount_amount: discountAmount,
      final_amount: finalPayable,
      passengers: selectedSeats.map(s => {
        const p = passengersMap[s.seat_id] || {};
        return {
          seat_id: s.seat_id,
          seat_number: s.seat_number,
          name: (p.name || 'Passenger').trim(),
          age: Number(p.age) || 25,
          gender: (p.gender || 'MALE').toUpperCase(),
          caption: (p.caption || '').trim() || null
        };
      })
    };

    onProceedToPayment(payload);
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading real-time seat availability...
      </div>
    );
  }

  if (error || !layoutData) {
    return (
      <div style={{ padding: '1.5rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 8 }}>
        Error loading seats: {error}
      </div>
    );
  }

  const currentDeckSeats = activeDeck === 'UPPER' ? layoutData.upper_deck : layoutData.lower_deck;
  const hasUpperDeck = layoutData.upper_deck && layoutData.upper_deck.length > 0;

  return (
    <div className="seat-selection-drawer">
      {/* Left: Bus Seat Matrix Layout */}
      <div className="seat-deck-container">
        {/* Deck Tabs */}
        {hasUpperDeck && (
          <div className="deck-tabs">
            <button 
              className={`deck-tab-btn ${activeDeck === 'LOWER' ? 'active' : ''}`}
              onClick={() => setActiveDeck('LOWER')}
            >
              Lower Deck ({layoutData.lower_deck.length} Berths)
            </button>
            <button 
              className={`deck-tab-btn ${activeDeck === 'UPPER' ? 'active' : ''}`}
              onClick={() => setActiveDeck('UPPER')}
            >
              Upper Deck ({layoutData.upper_deck.length} Berths)
            </button>
          </div>
        )}

        {/* Interior Chassis & Seats */}
        <div className="bus-interior-chassis">
          {/* Front Windshield & Entrance Header */}
          <div style={{
            background: 'linear-gradient(180deg, #dbeafe, #f8fafc)',
            border: '1.5px solid #bfdbfe',
            borderRadius: '20px 20px 8px 8px',
            padding: '8px 14px',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.75rem',
            fontWeight: 700
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#15803d' }}>
              <span style={{ background: '#22c55e', width: 8, height: 8, borderRadius: '50%', display: 'inline-block' }} />
              <span>ENTRANCE DOOR</span>
            </div>
            <div style={{ letterSpacing: '2px', color: '#1e40af', fontSize: '0.72rem' }}>
              FRONT WINDSHIELD
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#1d4ed8' }}>
              <Disc size={18} />
              <span>DRIVER CABIN</span>
            </div>
          </div>

          {/* Live Seat & Neighbor Insight Bar */}
          <div style={{
            marginBottom: '1rem',
            padding: '0.5rem 0.85rem',
            borderRadius: 8,
            fontSize: '0.78rem',
            background: hoveredSeat 
              ? (hoveredSeat.status === 'BOOKED' || hoveredSeat.status === 'LADIES_BOOKED' ? '#fff7ed' : hoveredSeat.status === 'INOPERABLE' || !hoveredSeat.is_operable ? '#fef2f2' : '#f0fdf4')
              : '#f8fafc',
            border: hoveredSeat 
              ? (hoveredSeat.status === 'BOOKED' || hoveredSeat.status === 'LADIES_BOOKED' ? '1px solid #fdba74' : hoveredSeat.status === 'INOPERABLE' || !hoveredSeat.is_operable ? '1px solid #fca5a5' : '1px solid #86efac')
              : '1px dashed #cbd5e1',
            minHeight: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease'
          }}>
            {hoveredSeat ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', width: '100%' }}>
                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>
                  Seat {hoveredSeat.seat_number}
                </span>
                {(hoveredSeat.status === 'INOPERABLE' || !hoveredSeat.is_operable) ? (
                  <span style={{ color: '#dc2626', fontWeight: 700 }}>
                    ⚠️ Damaged / Out of Service ({hoveredSeat.inoperable_reason || 'Maintenance'})
                  </span>
                ) : (hoveredSeat.status === 'BOOKED' || hoveredSeat.status === 'LADIES_BOOKED') ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      background: hoveredSeat.passenger_gender === 'FEMALE' ? '#fce7f3' : '#e2e8f0',
                      color: hoveredSeat.passenger_gender === 'FEMALE' ? '#9d174d' : '#334155',
                      padding: '1px 6px',
                      borderRadius: 4,
                      fontWeight: 800
                    }}>
                      {hoveredSeat.passenger_gender === 'FEMALE' ? '♀ Female' : '♂ Male'} ({hoveredSeat.passenger_age || 26} yrs)
                    </span>
                    {hoveredSeat.passenger_caption ? (
                      <span style={{
                        background: '#fef08a',
                        color: '#854d0e',
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontWeight: 700,
                        border: '1px solid #fde047'
                      }}>
                        🏷️ "{hoveredSeat.passenger_caption}"
                      </span>
                    ) : (
                      <span style={{ color: '#64748b', fontStyle: 'italic' }}>
                        No travel tag
                      </span>
                    )}
                  </div>
                ) : (
                  <span style={{ color: '#16a34a', fontWeight: 700 }}>
                    🟢 Available &bull; ₹{hoveredSeat.price} ({hoveredSeat.berth_type || 'Standard'})
                  </span>
                )}
              </div>
            ) : (
              <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem' }}>
                <Info size={14} color="#3b82f6" />
                <span>Hover over any occupied seat to see passenger gender, age, and travel captions (baby, wheelchair, sleep/swap preference).</span>
              </div>
            )}
          </div>

          {/* Seat Grid */}
          {layoutData.is_sleeper ? (
            <div className="seat-grid-sleeper">
              {currentDeckSeats.map((seat) => {
                const isSelected = selectedSeats.some(s => s.seat_id === seat.seat_id);
                const isBooked = seat.status === 'BOOKED' || seat.status === 'LADIES_BOOKED';
                const isInoperable = seat.status === 'INOPERABLE' || seat.is_operable === false;
                let seatClass = 'seat-unit sleeper';
                if (isSelected) seatClass += ' selected';
                else if (isInoperable) seatClass += ' inoperable';
                else if (seat.status === 'LADIES_BOOKED') seatClass += ' ladies-booked';
                else if (seat.status === 'BOOKED') seatClass += ' booked';
                else if (seat.status === 'LADIES_RESERVED') seatClass += ' ladies-reserved';

                return (
                  <React.Fragment key={seat.seat_id}>
                    <div 
                      className={seatClass}
                      onClick={() => handleSeatClick(seat)}
                      onMouseEnter={() => setHoveredSeat(seat)}
                      onMouseLeave={() => setHoveredSeat(null)}
                      title={isInoperable
                        ? `Seat ${seat.seat_number} - Out of Service (${seat.inoperable_reason || 'Damaged / Under Maintenance'})`
                        : isBooked 
                        ? `Seat ${seat.seat_number} - Occupied by ${seat.passenger_gender === 'FEMALE' ? 'Female' : 'Male'} (${seat.passenger_age || 26} yrs)${seat.passenger_caption ? `\n🏷️ Traveler Note: "${seat.passenger_caption}"` : ''}` 
                        : `${seat.seat_number} - ₹${seat.price} (Available)`}
                    >
                      {/* Berth Pillow Graphic */}
                      <div style={{ 
                        width: '75%', 
                        height: 4, 
                        background: isInoperable ? '#fca5a5' : isSelected ? 'rgba(255,255,255,0.6)' : '#cbd5e1', 
                        borderRadius: 2, 
                        marginBottom: 3 
                      }} />

                      {isInoperable ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <Wrench size={13} style={{ color: '#dc2626', marginBottom: 1 }} />
                          <span className="seat-pill-label" style={{ fontWeight: 800, color: '#dc2626' }}>{seat.seat_number}</span>
                          <span style={{ fontSize: '0.58rem', background: '#fee2e2', color: '#991b1b', padding: '1px 3px', borderRadius: 3, fontWeight: 700 }}>
                            Damaged
                          </span>
                        </div>
                      ) : isBooked ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, width: '100%' }}>
                          <span className="seat-pill-label" style={{ fontWeight: 800 }}>{seat.seat_number}</span>
                          {seat.passenger_gender === 'FEMALE' ? (
                            <span style={{ fontSize: '0.62rem', background: '#fbcfe8', color: '#9d174d', padding: '1px 4px', borderRadius: 3, fontWeight: 800 }}>
                              ♀ {seat.passenger_age || 26}F
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.62rem', background: '#e2e8f0', color: '#334155', padding: '1px 4px', borderRadius: 3, fontWeight: 800 }}>
                              ♂ {seat.passenger_age || 32}M
                            </span>
                          )}
                          {seat.passenger_caption && (
                            <span 
                              style={{ 
                                fontSize: '0.54rem', 
                                background: '#fef08a', 
                                color: '#854d0e', 
                                padding: '1px 3px', 
                                borderRadius: 3, 
                                fontWeight: 700, 
                                maxWidth: '92%', 
                                whiteSpace: 'nowrap', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                marginTop: 1,
                                border: '1px solid #fde047'
                              }}
                              title={seat.passenger_caption}
                            >
                              🏷️ {seat.passenger_caption}
                            </span>
                          )}
                        </div>
                      ) : (
                        <>
                          <span className="seat-pill-label">{seat.seat_number}</span>
                          <span className="seat-pill-price">₹{seat.price}</span>
                        </>
                      )}
                    </div>
                    {/* Aisle separator after col 1 */}
                    {seat.col_num === 1 && (
                      <div className="aisle-space">AISLE &rarr;</div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          ) : (
            <div className="seat-grid-seater">
              {currentDeckSeats.map((seat) => {
                const isSelected = selectedSeats.some(s => s.seat_id === seat.seat_id);
                const isBooked = seat.status === 'BOOKED' || seat.status === 'LADIES_BOOKED';
                const isInoperable = seat.status === 'INOPERABLE' || seat.is_operable === false;
                let seatClass = 'seat-unit seater';
                if (isSelected) seatClass += ' selected';
                else if (isInoperable) seatClass += ' inoperable';
                else if (seat.status === 'LADIES_BOOKED') seatClass += ' ladies-booked';
                else if (seat.status === 'BOOKED') seatClass += ' booked';
                else if (seat.status === 'LADIES_RESERVED') seatClass += ' ladies-reserved';

                return (
                  <React.Fragment key={seat.seat_id}>
                    <div 
                      className={seatClass}
                      onClick={() => handleSeatClick(seat)}
                      onMouseEnter={() => setHoveredSeat(seat)}
                      onMouseLeave={() => setHoveredSeat(null)}
                      title={isInoperable
                        ? `Seat ${seat.seat_number} - Out of Service (${seat.inoperable_reason || 'Damaged / Under Maintenance'})`
                        : isBooked 
                        ? `Seat ${seat.seat_number} - Occupied by ${seat.passenger_gender === 'FEMALE' ? 'Female' : 'Male'} (${seat.passenger_age || 26} yrs)${seat.passenger_caption ? `\n🏷️ Traveler Note: "${seat.passenger_caption}"` : ''}` 
                        : `${seat.seat_number} - ₹${seat.price} (Available)`}
                    >
                      {/* Chair Headrest Graphic */}
                      <div style={{ 
                        width: '65%', 
                        height: 3, 
                        background: isInoperable ? '#fca5a5' : isSelected ? 'rgba(255,255,255,0.6)' : '#cbd5e1', 
                        borderRadius: '3px 3px 0 0', 
                        marginBottom: 2 
                      }} />

                      {isInoperable ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <Wrench size={13} style={{ color: '#dc2626', marginBottom: 1 }} />
                          <span className="seat-pill-label" style={{ fontWeight: 800, color: '#dc2626' }}>{seat.seat_number}</span>
                          <span style={{ fontSize: '0.58rem', background: '#fee2e2', color: '#991b1b', padding: '1px 3px', borderRadius: 3, fontWeight: 700 }}>
                            Damaged
                          </span>
                        </div>
                      ) : isBooked ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, width: '100%' }}>
                          <span className="seat-pill-label" style={{ fontWeight: 800 }}>{seat.seat_number}</span>
                          {seat.passenger_gender === 'FEMALE' ? (
                            <span style={{ fontSize: '0.62rem', background: '#fbcfe8', color: '#9d174d', padding: '1px 4px', borderRadius: 3, fontWeight: 800 }}>
                              ♀ {seat.passenger_age || 26}F
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.62rem', background: '#e2e8f0', color: '#334155', padding: '1px 4px', borderRadius: 3, fontWeight: 800 }}>
                              ♂ {seat.passenger_age || 32}M
                            </span>
                          )}
                          {seat.passenger_caption && (
                            <span 
                              style={{ 
                                fontSize: '0.54rem', 
                                background: '#fef08a', 
                                color: '#854d0e', 
                                padding: '1px 3px', 
                                borderRadius: 3, 
                                fontWeight: 700, 
                                maxWidth: '92%', 
                                whiteSpace: 'nowrap', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                marginTop: 1,
                                border: '1px solid #fde047'
                              }}
                              title={seat.passenger_caption}
                            >
                              🏷️ {seat.passenger_caption}
                            </span>
                          )}
                        </div>
                      ) : (
                        <>
                          <span className="seat-pill-label">{seat.seat_number}</span>
                          <span className="seat-pill-price">₹{seat.price}</span>
                        </>
                      )}
                    </div>
                    {/* Aisle separator after col 2 */}
                    {seat.col_num === 2 && (
                      <div className="aisle-space">AISLE &rarr;</div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* Seat Status Legend with Gender Safety Notice */}
          <div className="seat-legend">
            <div className="legend-item">
              <div className="legend-box" style={{ background: '#ffffff', borderColor: '#94a3b8' }}></div>
              <span>Available</span>
            </div>
            <div className="legend-item">
              <div className="legend-box" style={{ background: '#2563eb', borderColor: '#1d4ed8' }}></div>
              <span>Selected</span>
            </div>
            <div className="legend-item">
              <div className="legend-box" style={{ background: '#e2e8f0', borderColor: '#cbd5e1' }}></div>
              <span>Booked (♂ Male)</span>
            </div>
            <div className="legend-item">
              <div className="legend-box" style={{ background: '#fce7f3', borderColor: '#f472b6' }}></div>
              <span>Booked (♀ Female)</span>
            </div>
            <div className="legend-item">
              <div className="legend-box" style={{ background: '#fef2f2', borderColor: '#fca5a5' }}></div>
              <span>Damaged / Inoperable</span>
            </div>
          </div>

          <div style={{ marginTop: '0.75rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🛡️</span>
            <span><strong>Safety Feature:</strong> Adjacent passenger age and sex are displayed on booked seats to protect identity while ensuring solo female travelers &amp; families can book safely beside companion travelers.</span>
          </div>
        </div>
      </div>

      {/* Right: Booking Form & Checkout Summary */}
      <div className="booking-side-panel">
        {/* Selected Seats summary */}
        <div>
          <div className="section-subhead">
            <Users size={14} style={{ display: 'inline', marginRight: 4 }} />
            Selected Seats ({selectedSeats.length})
          </div>
          {selectedSeats.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Click on any available berth or chair to select seats.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {selectedSeats.map(s => (
                <span key={s.seat_id} className="badge badge-blue" style={{ fontSize: '0.82rem', padding: '0.3rem 0.6rem' }}>
                  Seat {s.seat_number} &bull; ₹{s.price}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Boarding & Dropping Points Selection */}
        <div>
          <div className="section-subhead">
            <MapPin size={14} style={{ display: 'inline', marginRight: 4 }} />
            Boarding &amp; Dropping Points
          </div>
          <div className="boarding-select-grid">
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>BOARDING</label>
              <select 
                value={selectedBoarding || ''} 
                onChange={(e) => setSelectedBoarding(Number(e.target.value))}
                style={{ width: '100%', padding: '0.45rem', borderRadius: 6, border: '1px solid var(--border)' }}
              >
                {layoutData.boarding_points.map(bp => (
                  <option key={bp.stop_id} value={bp.stop_id}>
                    {bp.stop_name} ({bp.landmark || 'Main Stop'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>DROPPING</label>
              <select 
                value={selectedDropping || ''} 
                onChange={(e) => setSelectedDropping(Number(e.target.value))}
                style={{ width: '100%', padding: '0.45rem', borderRadius: 6, border: '1px solid var(--border)' }}
              >
                {layoutData.dropping_points.map(dp => (
                  <option key={dp.stop_id} value={dp.stop_id}>
                    {dp.stop_name} ({dp.landmark || 'Terminal'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Passenger Information Forms */}
        {selectedSeats.length > 0 && (
          <div>
            <div className="section-subhead">Passenger Details</div>
            {selectedSeats.map((seat, idx) => {
              const psg = passengersMap[seat.seat_id] || { name: '', age: 25, gender: 'MALE', caption: '' };
              return (
                <div key={seat.seat_id} className="passenger-entry-box">
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.4rem' }}>
                    Passenger {idx + 1} — Seat {seat.seat_number}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input 
                      type="text" 
                      placeholder="Full Name"
                      value={psg.name}
                      onChange={(e) => handlePassengerChange(seat.seat_id, 'name', e.target.value)}
                      style={{ padding: '0.35rem 0.5rem', border: '1px solid var(--border)', borderRadius: 4 }}
                      required
                    />
                    <input 
                      type="number" 
                      placeholder="Age"
                      min="1"
                      max="100"
                      value={psg.age}
                      onChange={(e) => handlePassengerChange(seat.seat_id, 'age', e.target.value)}
                      style={{ padding: '0.35rem 0.5rem', border: '1px solid var(--border)', borderRadius: 4 }}
                      required
                    />
                    <select 
                      value={psg.gender}
                      onChange={(e) => handlePassengerChange(seat.seat_id, 'gender', e.target.value)}
                      style={{ padding: '0.35rem 0.5rem', border: '1px solid var(--border)', borderRadius: 4 }}
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  {/* Travel Caption / Note */}
                  <div style={{ background: '#f8fafc', padding: '0.45rem', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Tag size={12} color="#2563eb" />
                      <span>Travel Note / Tag (shown on seat hover):</span>
                    </div>
                    <input 
                      type="text" 
                      placeholder="e.g. Carrying a baby, In a wheelchair, Sound sleeper, No swaps..."
                      value={psg.caption || ''}
                      onChange={(e) => handlePassengerChange(seat.seat_id, 'caption', e.target.value)}
                      style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid var(--border)', borderRadius: 4, fontSize: '0.78rem', marginBottom: 4 }}
                    />
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {CAPTION_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handlePassengerChange(seat.seat_id, 'caption', preset)}
                          style={{
                            fontSize: '0.67rem',
                            padding: '2px 6px',
                            background: psg.caption === preset ? '#dbeafe' : '#ffffff',
                            color: psg.caption === preset ? '#1e40af' : '#475569',
                            border: psg.caption === preset ? '1px solid #93c5fd' : '1px solid #cbd5e1',
                            borderRadius: 4,
                            cursor: 'pointer'
                          }}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Contact Details */}
        <div>
          <div className="section-subhead">Ticket Contact Info</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <input 
              type="email" 
              placeholder="Email address"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              style={{ padding: '0.45rem', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.88rem' }}
              required
            />
            <input 
              type="tel" 
              placeholder="Phone number"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              style={{ padding: '0.45rem', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.88rem' }}
              required
            />
          </div>
        </div>

        {/* Coupon Applicator */}
        <div>
          <div className="section-subhead">
            <Tag size={14} style={{ display: 'inline', marginRight: 4 }} />
            Apply Promo Code
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="e.g. BLUEFIRST"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.toUpperCase());
                setCouponStatus(null);
              }}
              style={{ flex: 1, padding: '0.45rem', textTransform: 'uppercase', border: '1px solid var(--border)', borderRadius: 6, fontWeight: 700 }}
            />
            <button 
              type="button"
              className="btn-secondary"
              onClick={handleApplyCoupon}
              disabled={applyingCoupon || !couponCode.trim() || rawTotalFare === 0}
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
            >
              {applyingCoupon ? 'Checking...' : 'APPLY'}
            </button>
          </div>
          {couponStatus && (
            <div style={{ 
              marginTop: '0.4rem', 
              fontSize: '0.82rem', 
              color: couponStatus.valid ? 'var(--success)' : 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}>
              {couponStatus.valid ? <Check size={14} /> : <AlertCircle size={14} />}
              <span>{couponStatus.message}</span>
            </div>
          )}
        </div>

        {/* Fare Summary Breakdown */}
        <div className="fare-summary-breakdown">
          <div className="fare-row">
            <span>Base Fare ({selectedSeats.length} seats)</span>
            <span>₹{rawTotalFare.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="fare-row" style={{ color: 'var(--success)' }}>
              <span>Coupon Discount ({couponStatus?.code})</span>
              <span>- ₹{discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="fare-row total">
            <span>Total Payable</span>
            <span>₹{finalPayable.toFixed(2)}</span>
          </div>
        </div>

        {/* Proceed Button */}
        <button 
          className="btn-primary" 
          style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
          onClick={handleProceed}
          disabled={selectedSeats.length === 0}
        >
          <Sparkles size={18} />
          <span>PROCEED TO BOOK &bull; ₹{finalPayable.toFixed(2)}</span>
        </button>
      </div>
    </div>
  );
}
