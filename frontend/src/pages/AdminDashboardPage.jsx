import React, { useState, useEffect } from 'react';
import { 
  getAdminAnalyticsApi, getAdminAllBookingsApi, 
  createBusApi, createTripApi, createCouponApi, loginApi,
  getAllBusesApi, getBusSeatsApi, toggleBusSeatOperableApi
} from '../api';
import { 
  DollarSign, Ticket, Bus, Users, TrendingUp, AlertTriangle, 
  CheckCircle, PlusCircle, Search, Star, Shield, Loader2, Sparkles,
  Wrench, Check, X, RefreshCw, AlertCircle
} from 'lucide-react';

export default function AdminDashboardPage({ currentUser, onAdminLoginSuccess }) {
  const [adminTab, setAdminTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // All Bookings state
  const [allBookings, setAllBookings] = useState([]);
  const [bookingFilterStatus, setBookingFilterStatus] = useState('ALL');
  const [bookingSearch, setBookingSearch] = useState('');
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Seat Health / Maintenance State
  const [fleetBuses, setFleetBuses] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [busSeats, setBusSeats] = useState([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [togglingSeat, setTogglingSeat] = useState(null);
  const [seatReasonInput, setSeatReasonInput] = useState('Damaged / Under Maintenance');

  // Form states for Bus, Trip, Coupon creation
  const [busForm, setBusForm] = useState({
    operator_id: 1,
    bus_number: 'TN-01-BB-9988',
    bus_name: 'BlueBus Starliner AC Sleeper',
    bus_type: 'AC Sleeper (2+1)',
    has_ac: true,
    is_sleeper: true,
    total_seats: 30,
    amenities: 'WiFi,Charging Point,Water Bottle,Blanket,Reading Light,GPS',
    inoperable_seats_input: '',
    inoperable_reason: 'Damaged / Under Maintenance'
  });

  const [tripForm, setTripForm] = useState({
    bus_id: 1,
    route_id: 1,
    travel_date: new Date().toISOString().split('T')[0],
    departure_time: '21:00',
    arrival_time: '05:30',
    fare: 850.0
  });

  const [couponForm, setCouponForm] = useState({
    code: 'MEGA50',
    title: '50% Weekend Special',
    description: 'Get up to ₹250 discount on all bookings',
    discount_type: 'PERCENTAGE',
    discount_val: 50.0,
    min_booking_amount: 600.0,
    max_discount: 250.0,
    valid_until: '2026-12-31'
  });

  const [formMsg, setFormMsg] = useState('');

  const isAdmin = currentUser && currentUser.role === 'ADMIN';

  useEffect(() => {
    if (isAdmin) {
      loadAnalytics();
    }
  }, [isAdmin]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminAnalyticsApi();
      setAnalytics(data);
    } catch (e) {
      setError(e.message || 'Failed to load admin analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadAllBookings = async () => {
    setLoadingBookings(true);
    try {
      const data = await getAdminAllBookingsApi({
        status: bookingFilterStatus,
        search: bookingSearch
      });
      setAllBookings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (isAdmin && adminTab === 'bookings') {
      loadAllBookings();
    }
  }, [adminTab, bookingFilterStatus]);

  const loadFleetBuses = async () => {
    try {
      const data = await getAllBusesApi();
      setFleetBuses(data);
      if (data.length > 0 && !selectedBusId) {
        setSelectedBusId(data[0].bus_id);
      }
    } catch (e) {
      console.error('Failed to load fleet buses:', e);
    }
  };

  const loadBusSeats = async (busId) => {
    if (!busId) return;
    setLoadingSeats(true);
    try {
      const data = await getBusSeatsApi(busId);
      setBusSeats(data);
    } catch (e) {
      console.error('Failed to load bus seats:', e);
    } finally {
      setLoadingSeats(false);
    }
  };

  useEffect(() => {
    if (isAdmin && adminTab === 'seat_health') {
      loadFleetBuses();
    }
  }, [isAdmin, adminTab]);

  useEffect(() => {
    if (selectedBusId && adminTab === 'seat_health') {
      loadBusSeats(selectedBusId);
    }
  }, [selectedBusId, adminTab]);

  const handleToggleSeat = async (seat) => {
    setTogglingSeat(seat.seat_number);
    try {
      const newOperable = !seat.is_operable;
      const res = await toggleBusSeatOperableApi(selectedBusId, seat.seat_number, {
        is_operable: newOperable,
        reason: newOperable ? null : (seatReasonInput || 'Damaged / Under Maintenance')
      });
      alert(res.message);
      await loadBusSeats(selectedBusId);
    } catch (err) {
      alert(err.message || 'Failed to toggle seat operable state');
    } finally {
      setTogglingSeat(null);
    }
  };

  const handleAdminQuickLogin = async () => {
    try {
      const user = await loginApi('admin@bluebus.com', 'Admin123!');
      onAdminLoginSuccess(user);
    } catch (e) {
      alert('Admin login failed: ' + e.message);
    }
  };

  const handleCreateBus = async (e) => {
    e.preventDefault();
    try {
      const inopList = (busForm.inoperable_seats_input || '')
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);

      const payload = {
        operator_id: Number(busForm.operator_id),
        bus_number: busForm.bus_number.trim(),
        bus_name: busForm.bus_name.trim(),
        bus_type: busForm.bus_type.trim(),
        has_ac: Boolean(busForm.has_ac),
        is_sleeper: Boolean(busForm.is_sleeper),
        total_seats: Number(busForm.total_seats),
        amenities: busForm.amenities,
        inoperable_seats: inopList,
        inoperable_reason: busForm.inoperable_reason || 'Damaged / Under Maintenance'
      };

      await createBusApi(payload);
      setFormMsg(`New bus successfully registered to fleet! ${inopList.length > 0 ? `Marked ${inopList.length} seat(s) [${inopList.join(', ')}] as inoperable/damaged.` : 'All seats marked operable.'}`);
      loadAnalytics();
      loadFleetBuses();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    try {
      await createTripApi(tripForm);
      setFormMsg('Trip successfully scheduled on route!');
      loadAnalytics();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    try {
      await createCouponApi(couponForm);
      setFormMsg('New coupon code created and activated!');
    } catch (e) {
      alert(e.message);
    }
  };

  if (!isAdmin) {
    return (
      <div className="container" style={{ padding: '4rem 1.25rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', background: 'white', border: '1px solid var(--border)', borderRadius: 14, padding: '2.5rem 1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ background: '#fef3c7', color: '#d97706', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <Shield size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>
            Admin Access Required
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
            You need an Administrator account to view revenue analytics, manage fleet buses, schedule trips, and review cancellations.
          </p>
          <button className="btn-primary" onClick={handleAdminQuickLogin} style={{ width: '100%', padding: '0.75rem' }}>
            <Sparkles size={16} />
            <span>Sign In as Demo Admin (admin@bluebus.com)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem 4rem' }}>
      {/* Admin Title */}
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Blue Bus Admin Operations Console
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Real-time fleet operations, revenue reporting, bookings manifest, and scheduling.
          </p>
        </div>

        {/* Subtab navigation */}
        <div style={{ display: 'flex', gap: '0.4rem', background: '#e2e8f0', padding: 4, borderRadius: 8 }}>
          {[
            { id: 'overview', label: 'Overview Metrics' },
            { id: 'bookings', label: 'Bookings Manifest' },
            { id: 'add_bus', label: 'Add Bus' },
            { id: 'seat_health', label: 'Seat Maintenance' },
            { id: 'schedule_trip', label: 'Schedule Trip' },
            { id: 'add_coupon', label: 'Create Coupon' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setAdminTab(tab.id);
                setFormMsg('');
              }}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: 6,
                fontSize: '0.85rem',
                fontWeight: 700,
                background: adminTab === tab.id ? 'white' : 'transparent',
                color: adminTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: adminTab === tab.id ? 'var(--shadow-sm)' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--primary)' }} />
          <div>Loading fleet metrics...</div>
        </div>
      ) : error ? (
        <div style={{ padding: '1.5rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 8 }}>
          {error}
        </div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {adminTab === 'overview' && analytics && (
            <div>
              {/* Top KPI Metrics Cards */}
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-icon" style={{ background: '#1d4ed8' }}>
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <div className="kpi-val">₹{analytics.total_revenue.toFixed(2)}</div>
                    <div className="kpi-lbl">Total Net Revenue</div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon" style={{ background: '#16a34a' }}>
                    <Ticket size={24} />
                  </div>
                  <div>
                    <div className="kpi-val">{analytics.total_bookings}</div>
                    <div className="kpi-lbl">Total Reservations</div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon" style={{ background: '#7c3aed' }}>
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <div className="kpi-val">{analytics.occupancy_rate_percent}%</div>
                    <div className="kpi-lbl">Fleet Occupancy</div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon" style={{ background: '#ea580c' }}>
                    <Bus size={24} />
                  </div>
                  <div>
                    <div className="kpi-val">{analytics.active_buses} Buses</div>
                    <div className="kpi-lbl">Active Fleet Size</div>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-icon" style={{ background: '#dc2626' }}>
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <div className="kpi-val">{analytics.cancelled_bookings}</div>
                    <div className="kpi-lbl">Cancellations (₹{analytics.total_refunded.toFixed(0)} refunded)</div>
                  </div>
                </div>
              </div>

              {/* Analytics 2-Column Split */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Popular Routes */}
                <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingUp size={18} color="var(--primary)" />
                    <span>Top Performing Routes</span>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {analytics.popular_routes.map((r, i) => (
                      <div key={i} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 }}>
                          <span>{r.route}</span>
                          <span style={{ color: 'var(--primary)' }}>₹{r.revenue.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <span>{r.distance_km} km</span>
                          <span>{r.bookings} Bookings</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Operator Performance */}
                <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Bus size={18} color="var(--primary)" />
                    <span>Bus Operator Rankings</span>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {analytics.operator_performance.map((op, i) => (
                      <div key={i} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 }}>
                          <span>{op.operator_name}</span>
                          <span style={{ color: '#16a34a' }}>₹{op.revenue.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <span>★ {op.rating} &bull; {op.fleet_size} buses</span>
                          <span>{op.bookings} Bookings</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Bookings Feed */}
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>
                  Live Reservation Stream
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>PNR</th>
                        <th>Passenger</th>
                        <th>Route</th>
                        <th>Date</th>
                        <th>Seats</th>
                        <th>Fare</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.recent_bookings.map(rb => (
                        <tr key={rb.booking_id}>
                          <td><strong>{rb.pnr_number}</strong></td>
                          <td>{rb.customer_name}</td>
                          <td>{rb.route}</td>
                          <td>{rb.travel_date}</td>
                          <td>{rb.seats}</td>
                          <td><strong>₹{rb.final_amount.toFixed(2)}</strong></td>
                          <td>
                            <span className={`badge ${rb.status === 'CONFIRMED' ? 'badge-green' : 'badge-red'}`}>
                              {rb.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ALL BOOKINGS MANIFEST TAB */}
          {adminTab === 'bookings' && (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
              {/* Filter controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['ALL', 'CONFIRMED', 'CANCELLED'].map(st => (
                    <button
                      key={st}
                      onClick={() => setBookingFilterStatus(st)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: 6,
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        background: bookingFilterStatus === st ? 'var(--primary)' : '#f1f5f9',
                        color: bookingFilterStatus === st ? 'white' : 'var(--text-muted)'
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    placeholder="Search PNR or Email..."
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    style={{ padding: '0.4rem 0.75rem', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.88rem' }}
                  />
                  <button className="btn-secondary" onClick={loadAllBookings} style={{ padding: '0.4rem 0.75rem' }}>
                    <Search size={15} />
                    <span>Search</span>
                  </button>
                </div>
              </div>

              {loadingBookings ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                  <div>Loading manifest...</div>
                </div>
              ) : allBookings.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No bookings found matching filter criteria.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>PNR</th>
                        <th>Customer</th>
                        <th>Route &amp; Date</th>
                        <th>Bus</th>
                        <th>Seats &amp; Passengers</th>
                        <th>Amount</th>
                        <th>Status / Refund</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allBookings.map(b => (
                        <tr key={b.booking_id}>
                          <td><strong>{b.pnr_number}</strong></td>
                          <td>
                            <div>{b.customer_name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.contact_email}</div>
                          </td>
                          <td>
                            <div>{b.route}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.travel_date}</div>
                          </td>
                          <td>{b.bus_name}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {b.seats.map((st, i) => (
                                <span key={i} className="badge badge-blue" style={{ fontSize: '0.72rem' }}>{st}</span>
                              ))}
                            </div>
                          </td>
                          <td><strong>₹{b.final_amount.toFixed(2)}</strong></td>
                          <td>
                            <span className={`badge ${b.status === 'CONFIRMED' ? 'badge-green' : 'badge-red'}`}>
                              {b.status}
                            </span>
                            {b.refund_info && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: 2 }}>
                                Refund: ₹{b.refund_info.refund_amount} ({b.refund_info.refund_txn})
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ADD BUS FORM TAB */}
          {adminTab === 'add_bus' && (
            <div style={{ maxWidth: 680, background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '1.75rem', boxShadow: 'var(--shadow-sm)', margin: '0 auto' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem' }}>Register New Bus to Fleet</h3>
              {formMsg && (
                <div style={{ padding: '0.65rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 6, marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {formMsg}
                </div>
              )}
              <form onSubmit={handleCreateBus} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Bus Name</label>
                  <input 
                    type="text" 
                    value={busForm.bus_name} 
                    onChange={(e) => setBusForm({ ...busForm, bus_name: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6 }}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Bus Number</label>
                    <input 
                      type="text" 
                      value={busForm.bus_number} 
                      onChange={(e) => setBusForm({ ...busForm, bus_number: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6 }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Operator ID</label>
                    <input 
                      type="number" 
                      value={busForm.operator_id} 
                      onChange={(e) => setBusForm({ ...busForm, operator_id: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6 }}
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Bus Type</label>
                    <input 
                      type="text" 
                      value={busForm.bus_type} 
                      onChange={(e) => setBusForm({ ...busForm, bus_type: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6 }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Total Berths/Seats</label>
                    <input 
                      type="number" 
                      value={busForm.total_seats} 
                      onChange={(e) => setBusForm({ ...busForm, total_seats: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6 }}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Amenities (comma-separated)</label>
                  <input 
                    type="text" 
                    value={busForm.amenities} 
                    onChange={(e) => setBusForm({ ...busForm, amenities: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6 }}
                    required
                  />
                </div>

                {/* Inoperable / Damaged Seats Specification */}
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '1rem', marginTop: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.85rem', color: '#991b1b', marginBottom: 6 }}>
                    <Wrench size={16} />
                    <span>Mark Damaged / Inoperable Seats (Optional)</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#7f1d1d', marginBottom: 10 }}>
                    Mark seats out of order (e.g. damaged recliner, window crack, maintenance). These seats will be rendered as Damaged/Inoperable on the bus layout and passengers cannot book or swap into them.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#991b1b', display: 'block', marginBottom: 3 }}>
                        Inoperable Seat Numbers (e.g. L2, U15)
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. L2, U15"
                        value={busForm.inoperable_seats_input} 
                        onChange={(e) => setBusForm({ ...busForm, inoperable_seats_input: e.target.value.toUpperCase() })}
                        style={{ width: '100%', padding: '0.45rem', border: '1px solid #fca5a5', borderRadius: 6, fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#991b1b', display: 'block', marginBottom: 3 }}>
                        Reason / Issue Description
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. Broken recliner, torn berth upholstery"
                        value={busForm.inoperable_reason} 
                        onChange={(e) => setBusForm({ ...busForm, inoperable_reason: e.target.value })}
                        style={{ width: '100%', padding: '0.45rem', border: '1px solid #fca5a5', borderRadius: 6 }}
                      />
                    </div>
                  </div>

                  {/* Quick Berth Selector Chips */}
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#991b1b', display: 'block', marginBottom: 4 }}>
                      CLICK BERTHS BELOW TO TOGGLE DAMAGED STATUS:
                    </label>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {Array.from({ length: 15 }, (_, i) => `L${i + 1}`).concat(Array.from({ length: 15 }, (_, i) => `U${i + 1}`)).map(seatNum => {
                        const selectedList = (busForm.inoperable_seats_input || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
                        const isMarked = selectedList.includes(seatNum);
                        return (
                          <button
                            type="button"
                            key={seatNum}
                            onClick={() => {
                              let nextList;
                              if (isMarked) {
                                nextList = selectedList.filter(s => s !== seatNum);
                              } else {
                                nextList = [...selectedList, seatNum];
                              }
                              setBusForm({ ...busForm, inoperable_seats_input: nextList.join(', ') });
                            }}
                            style={{
                              padding: '2px 7px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              borderRadius: 4,
                              border: isMarked ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                              background: isMarked ? '#fee2e2' : 'white',
                              color: isMarked ? '#b91c1c' : '#334155',
                              cursor: 'pointer'
                            }}
                          >
                            {isMarked ? `🛠️ ${seatNum}` : seatNum}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn-primary" style={{ padding: '0.75rem', marginTop: '0.5rem' }}>
                  Register Bus
                </button>
              </form>
            </div>
          )}

          {/* FLEET SEAT HEALTH & MAINTENANCE TAB */}
          {adminTab === 'seat_health' && (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Wrench size={20} color="var(--primary)" />
                    <span>Fleet Seat Health &amp; Inoperable Seat Controls</span>
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                    Mark damaged berths as out-of-service, or restore repaired seats back into active bookable service anytime.
                  </p>
                </div>

                {/* Bus Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>SELECT BUS:</label>
                  <select
                    value={selectedBusId || ''}
                    onChange={(e) => setSelectedBusId(Number(e.target.value))}
                    style={{ padding: '0.45rem 0.85rem', border: '1px solid var(--border)', borderRadius: 6, fontWeight: 700 }}
                  >
                    {fleetBuses.map(b => (
                      <option key={b.bus_id} value={b.bus_id}>
                        {b.bus_name} ({b.bus_number}) - {b.bus_type}
                      </option>
                    ))}
                  </select>
                  <button 
                    className="btn-secondary" 
                    onClick={() => loadBusSeats(selectedBusId)} 
                    disabled={loadingSeats}
                    style={{ padding: '0.45rem 0.75rem' }}
                    title="Refresh seats"
                  >
                    <RefreshCw size={14} className={loadingSeats ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* Maintenance Reason Setting */}
              <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 8, padding: '0.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    MAINTENANCE / DAMAGE REASON (Applied when marking seat inoperable):
                  </label>
                  <input
                    type="text"
                    value={seatReasonInput}
                    onChange={(e) => setSeatReasonInput(e.target.value)}
                    placeholder="e.g. Broken recliner mechanism, AC vent damage, stained upholstery"
                    style={{ width: '100%', padding: '0.45rem 0.75rem', border: '1px solid var(--border)', borderRadius: 6, fontSize: '0.88rem' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: '#22c55e', display: 'inline-block' }} />
                    <span>Operable: <strong>{busSeats.filter(s => s.is_operable !== false).length}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: '#ef4444', display: 'inline-block' }} />
                    <span>Inoperable: <strong>{busSeats.filter(s => s.is_operable === false).length}</strong></span>
                  </div>
                </div>
              </div>

              {/* Seats Matrix */}
              {loadingSeats ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 8px', color: 'var(--primary)' }} />
                  <div>Loading bus seats configuration...</div>
                </div>
              ) : busSeats.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No seats found for selected bus.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.85rem' }}>
                  {busSeats.map(seat => {
                    const isOp = seat.is_operable !== false;
                    const isToggling = togglingSeat === seat.seat_number;

                    return (
                      <div
                        key={seat.seat_id}
                        style={{
                          background: isOp ? '#f0fdf4' : '#fef2f2',
                          border: isOp ? '1px solid #bbf7d0' : '1.5px solid #fca5a5',
                          borderRadius: 8,
                          padding: '0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: isOp ? '#15803d' : '#b91c1c' }}>
                            {seat.seat_number}
                          </span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: isOp ? '#dcfce7' : '#fee2e2', color: isOp ? '#166534' : '#991b1b' }}>
                            {seat.deck} &bull; {seat.seat_type}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.78rem', color: isOp ? '#16a34a' : '#dc2626', minHeight: 28 }}>
                          {isOp ? (
                            <span>✓ Operable / Active</span>
                          ) : (
                            <span style={{ fontWeight: 600 }}>🛠️ {seat.inoperable_reason || 'Damaged'}</span>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => handleToggleSeat(seat)}
                          style={{
                            marginTop: 'auto',
                            padding: '0.35rem 0.5rem',
                            borderRadius: 6,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            border: isOp ? '1px solid #fca5a5' : '1px solid #86efac',
                            background: isOp ? 'white' : '#16a34a',
                            color: isOp ? '#dc2626' : 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4
                          }}
                        >
                          {isToggling ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : isOp ? (
                            <>
                              <Wrench size={13} />
                              <span>Mark Inoperable</span>
                            </>
                          ) : (
                            <>
                              <Check size={13} />
                              <span>Mark Repaired</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SCHEDULE TRIP FORM TAB */}
          {adminTab === 'schedule_trip' && (
            <div style={{ maxWidth: 600, background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '1.75rem', boxShadow: 'var(--shadow-sm)', margin: '0 auto' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem' }}>Schedule Route Trip</h3>
              {formMsg && (
                <div style={{ padding: '0.65rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 6, marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {formMsg}
                </div>
              )}
              <form onSubmit={handleCreateTrip} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Bus ID</label>
                    <input 
                      type="number" 
                      value={tripForm.bus_id} 
                      onChange={(e) => setTripForm({ ...tripForm, bus_id: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6 }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Route ID (1: Chennai-BLR, 2: BLR-Chennai, 3: Mumbai-Pune)</label>
                    <input 
                      type="number" 
                      value={tripForm.route_id} 
                      onChange={(e) => setTripForm({ ...tripForm, route_id: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6 }}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Travel Date</label>
                  <input 
                    type="date" 
                    value={tripForm.travel_date} 
                    onChange={(e) => setTripForm({ ...tripForm, travel_date: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6 }}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Departure Time</label>
                    <input 
                      type="text" 
                      placeholder="HH:MM"
                      value={tripForm.departure_time} 
                      onChange={(e) => setTripForm({ ...tripForm, departure_time: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6 }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Arrival Time</label>
                    <input 
                      type="text" 
                      placeholder="HH:MM"
                      value={tripForm.arrival_time} 
                      onChange={(e) => setTripForm({ ...tripForm, arrival_time: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6 }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Fare (₹)</label>
                    <input 
                      type="number" 
                      value={tripForm.fare} 
                      onChange={(e) => setTripForm({ ...tripForm, fare: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6 }}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary" style={{ padding: '0.75rem', marginTop: '0.5rem' }}>
                  Schedule Trip
                </button>
              </form>
            </div>
          )}

          {/* CREATE COUPON FORM TAB */}
          {adminTab === 'add_coupon' && (
            <div style={{ maxWidth: 600, background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '1.75rem', boxShadow: 'var(--shadow-sm)', margin: '0 auto' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem' }}>Create Promotional Promo Code</h3>
              {formMsg && (
                <div style={{ padding: '0.65rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 6, marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {formMsg}
                </div>
              )}
              <form onSubmit={handleCreateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Coupon Code</label>
                    <input 
                      type="text" 
                      value={couponForm.code} 
                      onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6, fontWeight: 700 }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Discount Type</label>
                    <select
                      value={couponForm.discount_type}
                      onChange={(e) => setCouponForm({ ...couponForm, discount_type: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6 }}
                    >
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED">Flat (₹)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Offer Title</label>
                  <input 
                    type="text" 
                    value={couponForm.title} 
                    onChange={(e) => setCouponForm({ ...couponForm, title: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6 }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Offer Description</label>
                  <input 
                    type="text" 
                    value={couponForm.description} 
                    onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6 }}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Discount Val</label>
                    <input 
                      type="number" 
                      value={couponForm.discount_val} 
                      onChange={(e) => setCouponForm({ ...couponForm, discount_val: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6 }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Min Booking (₹)</label>
                    <input 
                      type="number" 
                      value={couponForm.min_booking_amount} 
                      onChange={(e) => setCouponForm({ ...couponForm, min_booking_amount: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6 }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Max Discount (₹)</label>
                    <input 
                      type="number" 
                      value={couponForm.max_discount} 
                      onChange={(e) => setCouponForm({ ...couponForm, max_discount: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6 }}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary" style={{ padding: '0.75rem', marginTop: '0.5rem' }}>
                  Save &amp; Activate Coupon
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
