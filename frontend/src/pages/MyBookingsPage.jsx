import React, { useState, useEffect } from 'react';
import { getMyBookingsApi, getBookingByPnrApi } from '../api';
import TicketModal from '../components/TicketModal';
import CancelModal from '../components/CancelModal';
import ReviewModal from '../components/ReviewModal';
import SeatSwapModal from '../components/SeatSwapModal';
import { Ticket, Search, Ban, Eye, Star, AlertCircle, Loader2, ArrowRightLeft } from 'lucide-react';

export default function MyBookingsPage({ currentUser, onRequireAuth }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Search by PNR state
  const [searchPnr, setSearchPnr] = useState('');
  const [searchingPnr, setSearchingPnr] = useState(false);
  const [pnrResult, setPnrResult] = useState(null);

  // Modals
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [swappingBooking, setSwappingBooking] = useState(null);

  useEffect(() => {
    if (currentUser) {
      loadBookings();
    }
  }, [currentUser]);

  const loadBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyBookingsApi();
      setBookings(data);
    } catch (e) {
      setError(e.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handlePnrLookup = async (e) => {
    e.preventDefault();
    if (!searchPnr.trim()) return;
    setSearchingPnr(true);
    setError(null);
    try {
      const result = await getBookingByPnrApi(searchPnr.trim());
      setPnrResult(result);
      setSelectedTicket(result);
    } catch (err) {
      alert(err.message || 'PNR not found');
    } finally {
      setSearchingPnr(false);
    }
  };

  const handleCancelSuccess = (cancelRes) => {
    alert(`Booking cancelled successfully! Refund ID: ${cancelRes.refund_transaction_id}. ₹${cancelRes.refund_amount.toFixed(2)} refunded.`);
    setCancellingBooking(null);
    loadBookings();
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem 4rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>My Bookings &amp; Tickets</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Manage reservations, download official e-tickets, track refunds, or rate your travels.
          </p>
        </div>

        {/* PNR Search Box */}
        <form onSubmit={handlePnrLookup} style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            placeholder="Find by PNR (e.g. BB-PNR-772901)"
            value={searchPnr}
            onChange={(e) => setSearchPnr(e.target.value.toUpperCase())}
            style={{ padding: '0.55rem 0.85rem', border: '1px solid var(--border)', borderRadius: 6, fontWeight: 700, textTransform: 'uppercase', minWidth: 260 }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '0.55rem 1rem' }} disabled={searchingPnr}>
            {searchingPnr ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            <span>Lookup</span>
          </button>
        </form>
      </div>

      {!currentUser ? (
        <div style={{ background: 'white', padding: '3.5rem 1.5rem', textAlign: 'center', borderRadius: 12, border: '1px solid var(--border)' }}>
          <Ticket size={48} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 6 }}>Sign in to View Your Bookings</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Log in to view all your upcoming bus journeys, printable receipts, and refund statuses.
          </p>
          <button className="btn-primary" onClick={onRequireAuth}>
            Sign In Now
          </button>
        </div>
      ) : loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--primary)' }} />
          <div>Loading your bus bookings...</div>
        </div>
      ) : error ? (
        <div style={{ padding: '1.5rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 8 }}>
          {error}
        </div>
      ) : bookings.length === 0 ? (
        <div style={{ background: 'white', padding: '3.5rem 1.5rem', textAlign: 'center', borderRadius: 12, border: '1px solid var(--border)' }}>
          <Ticket size={48} color="var(--text-light)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 6 }}>No Bookings Yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            You haven't booked any trips yet. Explore our 500+ routes and book your next comfortable journey!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {bookings.map(booking => {
            const isConfirmed = booking.status === 'CONFIRMED';
            return (
              <div 
                key={booking.booking_id}
                style={{ 
                  background: 'white', 
                  border: '1px solid var(--border)', 
                  borderRadius: 12, 
                  padding: '1.5rem',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 1.5fr 1fr auto',
                  alignItems: 'center',
                  gap: '1.5rem'
                }}
              >
                {/* PNR & Operator */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>
                      {booking.pnr_number}
                    </span>
                    <span className={`badge ${isConfirmed ? 'badge-green' : 'badge-red'}`}>
                      {booking.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {booking.operator_name}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {booking.bus_name} &bull; {booking.bus_type}
                  </div>
                </div>

                {/* Route & Timings */}
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>
                    {booking.source_city} &rarr; {booking.destination_city}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Travel Date: <strong>{booking.travel_date}</strong>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Timing: <strong>{booking.departure_time} - {booking.arrival_time}</strong>
                  </div>
                </div>

                {/* Passengers & Fare */}
                <div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Seats: <strong>{booking.passengers.map(p => p.seat_number).join(', ')}</strong>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {booking.passengers.length} Passenger{booking.passengers.length > 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>
                    ₹{booking.final_amount.toFixed(2)}
                  </div>
                  {booking.cancellation && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>
                      Refunded: ₹{booking.cancellation.refund_amount.toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 140 }}>
                  <button 
                    className="btn-primary" 
                    style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}
                    onClick={() => setSelectedTicket(booking)}
                  >
                    <Eye size={15} />
                    <span>View Ticket</span>
                  </button>

                  {isConfirmed && (
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem', color: '#2563eb' }}
                      onClick={() => setSwappingBooking(booking)}
                    >
                      <ArrowRightLeft size={15} />
                      <span>Swap Seat</span>
                    </button>
                  )}

                  {isConfirmed && (
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem', color: 'var(--danger)', borderColor: '#fecaca' }}
                      onClick={() => setCancellingBooking(booking)}
                    >
                      <Ban size={15} />
                      <span>Cancel</span>
                    </button>
                  )}

                  {isConfirmed && (
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}
                      onClick={() => setReviewBooking(booking)}
                    >
                      <Star size={15} color="#f59e0b" />
                      <span>Rate Trip</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket Modal */}
      {selectedTicket && (
        <TicketModal 
          booking={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onCancelClick={(b) => {
            setSelectedTicket(null);
            setCancellingBooking(b);
          }}
          onReviewClick={(b) => {
            setSelectedTicket(null);
            setReviewBooking(b);
          }}
          onSwapClick={(b) => {
            setSelectedTicket(null);
            setSwappingBooking(b);
          }}
        />
      )}

      {/* Seat Swap Modal */}
      {swappingBooking && (
        <SeatSwapModal 
          booking={swappingBooking}
          onClose={() => setSwappingBooking(null)}
          onSuccess={() => {
            setSwappingBooking(null);
            loadBookings();
          }}
        />
      )}

      {/* Cancel Modal */}
      {cancellingBooking && (
        <CancelModal 
          booking={cancellingBooking}
          onClose={() => setCancellingBooking(null)}
          onSuccess={handleCancelSuccess}
        />
      )}

      {/* Review Modal */}
      {reviewBooking && (
        <ReviewModal 
          booking={reviewBooking}
          currentUser={currentUser}
          onClose={() => setReviewBooking(null)}
          onReviewSubmitted={() => {
            alert('Review submitted successfully!');
            setReviewBooking(null);
          }}
        />
      )}
    </div>
  );
}
