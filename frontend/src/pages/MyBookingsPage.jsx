import React, { useState, useEffect } from 'react';
import { 
  getMyBookingsApi, getBookingByPnrApi,
  getIncomingSwapRequestsApi, getOutgoingSwapRequestsApi,
  respondSwapRequestApi, cancelSwapRequestApi
} from '../api';
import TicketModal from '../components/TicketModal';
import CancelModal from '../components/CancelModal';
import ReviewModal from '../components/ReviewModal';
import SeatSwapModal from '../components/SeatSwapModal';
import { 
  Ticket, Search, Ban, Eye, Star, AlertCircle, Loader2, ArrowRightLeft, 
  Check, X, Clock, Inbox, Send, RefreshCw, CheckCircle, XCircle 
} from 'lucide-react';

export default function MyBookingsPage({ currentUser, onRequireAuth }) {
  const [pageTab, setPageTab] = useState('bookings'); // 'bookings' or 'swaps'
  const [swapSubTab, setSwapSubTab] = useState('incoming'); // 'incoming' or 'outgoing'
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Peer Swap Requests State
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loadingSwaps, setLoadingSwaps] = useState(false);
  const [respondingId, setRespondingId] = useState(null);

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
      loadSwapRequests();
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

  const loadSwapRequests = async () => {
    setLoadingSwaps(true);
    try {
      const [inc, out] = await Promise.all([
        getIncomingSwapRequestsApi(),
        getOutgoingSwapRequestsApi()
      ]);
      setIncomingRequests(inc || []);
      setOutgoingRequests(out || []);
    } catch (e) {
      console.error('Failed to load swap requests:', e);
    } finally {
      setLoadingSwaps(false);
    }
  };

  const handleRespondSwap = async (requestId, action) => {
    const confirmMsg = action === 'ACCEPT'
      ? 'Are you sure you want to accept this seat swap? Your seat will be updated immediately.'
      : 'Are you sure you want to decline this seat swap request?';
    if (!window.confirm(confirmMsg)) return;

    setRespondingId(requestId);
    try {
      const res = await respondSwapRequestApi(requestId, action);
      alert(res.message || `Swap request ${action.toLowerCase()}ed successfully.`);
      await Promise.all([loadBookings(), loadSwapRequests()]);
    } catch (err) {
      alert(err.message || `Failed to respond to swap request.`);
    } finally {
      setRespondingId(null);
    }
  };

  const handleCancelSwap = async (requestId) => {
    if (!window.confirm('Cancel this pending seat swap request?')) return;
    setRespondingId(requestId);
    try {
      await cancelSwapRequestApi(requestId);
      alert('Swap request cancelled.');
      await loadSwapRequests();
    } catch (err) {
      alert(err.message || 'Failed to cancel swap request.');
    } finally {
      setRespondingId(null);
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

  const pendingIncomingCount = incomingRequests.filter(r => r.status === 'PENDING').length;

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
      ) : (
        <>
          {/* Tab Navigation: My Reservations vs Seat Swap Requests */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setPageTab('bookings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0.6rem 1.2rem',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: '0.92rem',
                border: 'none',
                cursor: 'pointer',
                background: pageTab === 'bookings' ? 'var(--primary)' : '#f1f5f9',
                color: pageTab === 'bookings' ? 'white' : 'var(--text-muted)',
                boxShadow: pageTab === 'bookings' ? '0 2px 4px rgba(37,99,235,0.2)' : 'none'
              }}
            >
              <Ticket size={17} />
              <span>My Reservations ({bookings.length})</span>
            </button>

            <button
              onClick={() => {
                setPageTab('swaps');
                loadSwapRequests();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0.6rem 1.2rem',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: '0.92rem',
                border: 'none',
                cursor: 'pointer',
                background: pageTab === 'swaps' ? 'var(--primary)' : '#f1f5f9',
                color: pageTab === 'swaps' ? 'white' : 'var(--text-muted)',
                position: 'relative',
                boxShadow: pageTab === 'swaps' ? '0 2px 4px rgba(37,99,235,0.2)' : 'none'
              }}
            >
              <ArrowRightLeft size={17} />
              <span>Seat Swap Requests</span>
              {pendingIncomingCount > 0 && (
                <span style={{
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '1px 7px',
                  borderRadius: 12
                }}>
                  {pendingIncomingCount} NEW
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: MY RESERVATIONS */}
          {pageTab === 'bookings' && (
            <div>
              {loading ? (
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
            </div>
          )}

          {/* TAB 2: SEAT SWAP REQUESTS CONSOLE */}
          {pageTab === 'swaps' && (
            <div>
              {/* Header and Sub-tabs */}
              <div style={{ 
                background: 'white', 
                border: '1px solid var(--border)', 
                borderRadius: 12, 
                padding: '1.25rem 1.5rem', 
                boxShadow: 'var(--shadow-sm)',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ArrowRightLeft size={20} color="var(--primary)" />
                    <span>Peer-to-Peer Seat Swap Console</span>
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                    Exchange seats safely with booked co-passengers. Approvals swap tickets in real time.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
                    <button
                      onClick={() => setSwapSubTab('incoming')}
                      style={{
                        padding: '0.45rem 0.9rem',
                        borderRadius: 6,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        background: swapSubTab === 'incoming' ? 'white' : 'transparent',
                        color: swapSubTab === 'incoming' ? 'var(--primary)' : 'var(--text-muted)',
                        boxShadow: swapSubTab === 'incoming' ? 'var(--shadow-sm)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <Inbox size={15} />
                      <span>Incoming Requests ({incomingRequests.length})</span>
                      {pendingIncomingCount > 0 && (
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                      )}
                    </button>
                    <button
                      onClick={() => setSwapSubTab('outgoing')}
                      style={{
                        padding: '0.45rem 0.9rem',
                        borderRadius: 6,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        background: swapSubTab === 'outgoing' ? 'white' : 'transparent',
                        color: swapSubTab === 'outgoing' ? 'var(--primary)' : 'var(--text-muted)',
                        boxShadow: swapSubTab === 'outgoing' ? 'var(--shadow-sm)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <Send size={15} />
                      <span>Sent Requests ({outgoingRequests.length})</span>
                    </button>
                  </div>

                  <button 
                    className="btn-secondary" 
                    onClick={loadSwapRequests} 
                    disabled={loadingSwaps}
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem' }}
                    title="Refresh requests"
                  >
                    <RefreshCw size={14} className={loadingSwaps ? 'animate-spin' : ''} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {loadingSwaps ? (
                <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader2 size={30} className="animate-spin" style={{ margin: '0 auto 10px', color: 'var(--primary)' }} />
                  <div>Loading seat swap requests...</div>
                </div>
              ) : swapSubTab === 'incoming' ? (
                /* INCOMING SWAP REQUESTS */
                <div>
                  {incomingRequests.length === 0 ? (
                    <div style={{ background: 'white', padding: '3.5rem 1.5rem', textAlign: 'center', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <Inbox size={48} color="var(--text-light)" style={{ margin: '0 auto 1rem' }} />
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 6 }}>No Incoming Requests</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        When another passenger requests to swap seats with you, their request will appear here for your approval.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {incomingRequests.map(r => {
                        const isPending = r.status === 'PENDING';
                        const isAccepted = r.status === 'ACCEPTED';
                        const isRejected = r.status === 'REJECTED';
                        const badgeColor = isPending ? 'badge-yellow' : isAccepted ? 'badge-green' : 'badge-red';

                        return (
                          <div 
                            key={r.request_id}
                            style={{ 
                              background: 'white', 
                              border: isPending ? '2px solid #93c5fd' : '1px solid var(--border)', 
                              borderRadius: 12, 
                              padding: '1.25rem 1.5rem',
                              boxShadow: 'var(--shadow-sm)',
                              position: 'relative'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                                    Request #{r.request_id} from {r.requester_user_name}
                                  </span>
                                  <span className={`badge ${badgeColor}`} style={{ fontSize: '0.75rem' }}>
                                    {r.status}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                  Trip: <strong>{r.source_city} &rarr; {r.destination_city}</strong> &bull; {r.travel_date} ({r.departure_time}) &bull; {r.bus_name}
                                </div>
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                Received: {r.created_at}
                              </div>
                            </div>

                            {/* Visual Seat Swap Flow */}
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '1.5rem', 
                              background: '#f8fafc', 
                              border: '1px solid #e2e8f0', 
                              borderRadius: 8, 
                              padding: '0.85rem 1.25rem',
                              marginBottom: '1rem',
                              flexWrap: 'wrap'
                            }}>
                              <div style={{ flex: 1, minWidth: 160 }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>THEY OFFER (THEIR SEAT)</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                                  Seat {r.requester_seat_number}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                  Passenger: {r.requester_passenger_name}
                                </div>
                                {r.requester_caption && (
                                  <div style={{ fontSize: '0.74rem', color: '#2563eb', marginTop: 2 }}>
                                    🏷️ "{r.requester_caption}"
                                  </div>
                                )}
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#2563eb' }}>
                                <ArrowRightLeft size={24} />
                                <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>SWAP</span>
                              </div>

                              <div style={{ flex: 1, minWidth: 160 }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>FOR YOUR CURRENT SEAT</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16a34a' }}>
                                  Seat {r.target_seat_number}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                  Passenger: {r.target_passenger_name}
                                </div>
                                {r.target_caption && (
                                  <div style={{ fontSize: '0.74rem', color: '#16a34a', marginTop: 2 }}>
                                    🏷️ "{r.target_caption}"
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Reason */}
                            {r.reason && (
                              <div style={{ fontSize: '0.85rem', color: '#334155', background: '#f1f5f9', padding: '0.5rem 0.75rem', borderRadius: 6, marginBottom: '1rem' }}>
                                <strong>Message from passenger:</strong> "{r.reason}"
                              </div>
                            )}

                            {/* Action or Outcome */}
                            {isPending ? (
                              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <button
                                  className="btn-primary"
                                  onClick={() => handleRespondSwap(r.request_id, 'ACCEPT')}
                                  disabled={respondingId === r.request_id}
                                  style={{ background: '#16a34a', borderColor: '#16a34a', padding: '0.5rem 1.25rem' }}
                                >
                                  {respondingId === r.request_id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                  <span>Accept Swap</span>
                                </button>
                                <button
                                  className="btn-secondary"
                                  onClick={() => handleRespondSwap(r.request_id, 'REJECT')}
                                  disabled={respondingId === r.request_id}
                                  style={{ color: '#dc2626', borderColor: '#fca5a5', padding: '0.5rem 1.25rem' }}
                                >
                                  <X size={16} />
                                  <span>Decline</span>
                                </button>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                  Accepting will instantly exchange your Seat {r.target_seat_number} for Seat {r.requester_seat_number}.
                                </span>
                              </div>
                            ) : isAccepted ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#15803d', fontSize: '0.88rem', fontWeight: 700, background: '#f0fdf4', padding: '0.5rem 0.75rem', borderRadius: 6 }}>
                                <CheckCircle size={18} />
                                <span>Swap Accepted! You now occupy Seat {r.requester_seat_number}. Your official ticket has been updated.</span>
                              </div>
                            ) : isRejected ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b91c1c', fontSize: '0.88rem', fontWeight: 600, background: '#fef2f2', padding: '0.5rem 0.75rem', borderRadius: 6 }}>
                                <XCircle size={18} />
                                <span>Swap request was declined. You remain in Seat {r.target_seat_number}.</span>
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                Request is {r.status.toLowerCase()}.
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* OUTGOING / SENT SWAP REQUESTS */
                <div>
                  {outgoingRequests.length === 0 ? (
                    <div style={{ background: 'white', padding: '3.5rem 1.5rem', textAlign: 'center', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <Send size={48} color="var(--text-light)" style={{ margin: '0 auto 1rem' }} />
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 6 }}>No Sent Requests</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Want to change your seat? Go to "My Reservations", click "Swap Seat" on your confirmed booking, and request to swap with any occupied seat.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {outgoingRequests.map(r => {
                        const isPending = r.status === 'PENDING';
                        const isAccepted = r.status === 'ACCEPTED';
                        const isRejected = r.status === 'REJECTED';
                        const badgeColor = isPending ? 'badge-yellow' : isAccepted ? 'badge-green' : 'badge-red';

                        return (
                          <div 
                            key={r.request_id}
                            style={{ 
                              background: 'white', 
                              border: isPending ? '1.5px solid #fed7aa' : '1px solid var(--border)', 
                              borderRadius: 12, 
                              padding: '1.25rem 1.5rem',
                              boxShadow: 'var(--shadow-sm)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                                    Swap Request #{r.request_id} to {r.target_user_name}
                                  </span>
                                  <span className={`badge ${badgeColor}`} style={{ fontSize: '0.75rem' }}>
                                    {r.status}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                  Trip: <strong>{r.source_city} &rarr; {r.destination_city}</strong> &bull; {r.travel_date} ({r.departure_time}) &bull; {r.bus_name}
                                </div>
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                Sent: {r.created_at}
                              </div>
                            </div>

                            {/* Visual Seat Swap Flow */}
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '1.5rem', 
                              background: '#f8fafc', 
                              border: '1px solid #e2e8f0', 
                              borderRadius: 8, 
                              padding: '0.85rem 1.25rem',
                              marginBottom: '1rem',
                              flexWrap: 'wrap'
                            }}>
                              <div style={{ flex: 1, minWidth: 160 }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>YOUR CURRENT SEAT</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                                  Seat {r.requester_seat_number}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                  Passenger: {r.requester_passenger_name}
                                </div>
                                {r.requester_caption && (
                                  <div style={{ fontSize: '0.74rem', color: '#2563eb', marginTop: 2 }}>
                                    🏷️ "{r.requester_caption}"
                                  </div>
                                )}
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#2563eb' }}>
                                <ArrowRightLeft size={24} />
                                <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>SWAP</span>
                              </div>

                              <div style={{ flex: 1, minWidth: 160 }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TARGET DESIRED SEAT</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16a34a' }}>
                                  Seat {r.target_seat_number}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                  Occupied by: {r.target_passenger_name}
                                </div>
                                {r.target_caption && (
                                  <div style={{ fontSize: '0.74rem', color: '#16a34a', marginTop: 2 }}>
                                    🏷️ "{r.target_caption}"
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Reason */}
                            {r.reason && (
                              <div style={{ fontSize: '0.85rem', color: '#334155', background: '#f1f5f9', padding: '0.5rem 0.75rem', borderRadius: 6, marginBottom: '1rem' }}>
                                <strong>Your message:</strong> "{r.reason}"
                              </div>
                            )}

                            {/* Status Notification & Actions */}
                            {isPending ? (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: '#fffbeb', border: '1px solid #fef3c7', padding: '0.65rem 0.85rem', borderRadius: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#92400e', fontSize: '0.85rem' }}>
                                  <Clock size={16} />
                                  <span>Awaiting passenger approval. The passenger will see this request in their Blue Bus account.</span>
                                </div>
                                <button
                                  className="btn-secondary"
                                  onClick={() => handleCancelSwap(r.request_id)}
                                  disabled={respondingId === r.request_id}
                                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: '#fca5a5' }}
                                >
                                  {respondingId === r.request_id ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                                  <span>Cancel Request</span>
                                </button>
                              </div>
                            ) : isAccepted ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#15803d', fontSize: '0.88rem', fontWeight: 700, background: '#f0fdf4', padding: '0.5rem 0.75rem', borderRadius: 6 }}>
                                <CheckCircle size={18} />
                                <span>🎉 The passenger accepted! Your seat has been successfully swapped to Seat {r.target_seat_number}.</span>
                              </div>
                            ) : isRejected ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b91c1c', fontSize: '0.88rem', fontWeight: 600, background: '#fef2f2', padding: '0.5rem 0.75rem', borderRadius: 6 }}>
                                <XCircle size={18} />
                                <span>The passenger declined your swap request. Your original Seat {r.requester_seat_number} remains booked.</span>
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                Request is {r.status.toLowerCase()}.
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
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
            loadSwapRequests();
            setPageTab('swaps');
            setSwapSubTab('outgoing');
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
