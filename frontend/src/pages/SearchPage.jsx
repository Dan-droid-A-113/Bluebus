import React, { useState, useEffect } from 'react';
import HeroSearch from '../components/HeroSearch';
import FilterSidebar from '../components/FilterSidebar';
import BusCard from '../components/BusCard';
import PaymentModal from '../components/PaymentModal';
import TicketModal from '../components/TicketModal';
import ReviewModal from '../components/ReviewModal';
import CancelModal from '../components/CancelModal';
import { searchBusesApi } from '../api';
import { ArrowUpDown, Loader2, AlertCircle } from 'lucide-react';

export default function SearchPage({ currentUser, onRequireAuth }) {
  const [searchParams, setSearchParams] = useState({
    source: 'Chennai',
    destination: 'Bangalore',
    date: new Date().toISOString().split('T')[0]
  });

  const [filters, setFilters] = useState({
    bus_type: 'ALL',
    operator_name: '',
    time_slot: 'ALL',
    max_price: 1500
  });

  const [sortBy, setSortBy] = useState('departure_asc');
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modals state
  const [paymentBookingPayload, setPaymentBookingPayload] = useState(null);
  const [activeTicket, setActiveTicket] = useState(null);
  const [reviewTrip, setReviewTrip] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(null);

  useEffect(() => {
    fetchBuses();
  }, [searchParams, filters.bus_type, filters.operator_name, filters.max_price, sortBy]);

  const fetchBuses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchBusesApi({
        source: searchParams.source,
        destination: searchParams.destination,
        date: searchParams.date,
        bus_type: filters.bus_type,
        operator_name: filters.operator_name,
        max_price: filters.max_price,
        sort_by: sortBy
      });
      setTrips(data);
    } catch (err) {
      setError(err.message || 'Failed to find buses for the selected route');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (newParams) => {
    setSearchParams(newParams);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      bus_type: 'ALL',
      operator_name: '',
      time_slot: 'ALL',
      max_price: 1500
    });
  };

  // Filter trips locally for time slot if selected
  const filteredTrips = trips.filter(t => {
    if (filters.time_slot === 'MORNING') {
      const h = parseInt(t.departure_time.split(':')[0], 10);
      return h >= 6 && h < 12;
    }
    if (filters.time_slot === 'AFTERNOON') {
      const h = parseInt(t.departure_time.split(':')[0], 10);
      return h >= 12 && h < 18;
    }
    if (filters.time_slot === 'NIGHT') {
      const h = parseInt(t.departure_time.split(':')[0], 10);
      return h >= 18 || h < 6;
    }
    return true;
  });

  const handleProceedToPayment = (payload) => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    setPaymentBookingPayload(payload);
  };

  const handlePaymentSuccess = (bookingResponse) => {
    setPaymentBookingPayload(null);
    setActiveTicket(bookingResponse);
    fetchBuses(); // Refresh seat counts
  };

  return (
    <div>
      {/* Hero Search Section */}
      <HeroSearch 
        defaultSource={searchParams.source}
        defaultDest={searchParams.destination}
        defaultDate={searchParams.date}
        onSearch={handleSearchSubmit}
      />

      {/* Main Results Body */}
      <div className="container results-page">
        <div className="results-grid">
          {/* Left: Filter Sidebar */}
          <FilterSidebar 
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />

          {/* Right: Buses List */}
          <div>
            {/* Results Header Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', background: 'white', padding: '0.85rem 1.25rem', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                  {filteredTrips.length} Buses Found
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: 8 }}>
                  for {searchParams.source} &rarr; {searchParams.destination}
                </span>
              </div>

              {/* Sort By Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Sort by:</span>
                {[
                  { id: 'departure_asc', label: 'Departure' },
                  { id: 'price_asc', label: 'Price (Cheapest)' },
                  { id: 'price_desc', label: 'Price (Highest)' },
                  { id: 'rating_desc', label: 'Rating' }
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSortBy(s.id)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      borderRadius: 6,
                      fontWeight: 600,
                      background: sortBy === s.id ? 'var(--primary)' : '#f1f5f9',
                      color: sortBy === s.id ? 'white' : 'var(--text-muted)',
                      border: '1px solid transparent'
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error or Empty state */}
            {loading ? (
              <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--primary)' }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Searching live bus routes &amp; schedules...</div>
              </div>
            ) : error ? (
              <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 10 }}>
                <AlertCircle size={32} style={{ margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 700 }}>{error}</div>
              </div>
            ) : filteredTrips.length === 0 ? (
              <div style={{ padding: '4rem 1rem', textAlign: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: 10 }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                  No buses found matching your search filters
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.2rem' }}>
                  Try resetting filters or adjusting departure times.
                </div>
                <button className="btn-primary" onClick={handleResetFilters}>
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="bus-list">
                {filteredTrips.map(trip => (
                  <BusCard 
                    key={trip.trip_id}
                    trip={trip}
                    currentUser={currentUser}
                    onProceedToPayment={handleProceedToPayment}
                    onOpenReviews={(t) => setReviewTrip(t)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Gateway Modal */}
      {paymentBookingPayload && (
        <PaymentModal 
          bookingPayload={paymentBookingPayload}
          onClose={() => setPaymentBookingPayload(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Confirmed E-Ticket Modal */}
      {activeTicket && (
        <TicketModal 
          booking={activeTicket}
          onClose={() => setActiveTicket(null)}
          onCancelClick={(b) => {
            setActiveTicket(null);
            setCancellingBooking(b);
          }}
          onReviewClick={(b) => {
            setActiveTicket(null);
            setReviewTrip(b);
          }}
        />
      )}

      {/* Cancellation Modal */}
      {cancellingBooking && (
        <CancelModal 
          booking={cancellingBooking}
          onClose={() => setCancellingBooking(null)}
          onSuccess={(cancelRes) => {
            alert(`Ticket cancelled successfully! Refund ID: ${cancelRes.refund_transaction_id}. ₹${cancelRes.refund_amount.toFixed(2)} will be credited back.`);
            setCancellingBooking(null);
            fetchBuses();
          }}
        />
      )}

      {/* Reviews Modal */}
      {reviewTrip && (
        <ReviewModal 
          bus={reviewTrip}
          currentUser={currentUser}
          onClose={() => setReviewTrip(null)}
          onReviewSubmitted={() => {
            fetchBuses();
          }}
        />
      )}
    </div>
  );
}
