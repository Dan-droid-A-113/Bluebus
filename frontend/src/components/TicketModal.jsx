import React from 'react';
import { X, Printer, Ban, Bus, QrCode, CheckCircle, ShieldAlert, Star, ArrowRightLeft } from 'lucide-react';

export default function TicketModal({ booking, onClose, onCancelClick, onReviewClick, onSwapClick }) {
  if (!booking) return null;

  const handlePrint = () => {
    window.print();
  };

  const isConfirmed = booking.status === 'CONFIRMED';

  return (
    <div className="modal-overlay">
      <div className="modal-content printable-ticket" style={{ maxWidth: 680, padding: '1.75rem' }}>
        {/* Modal Top Actions */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={handlePrint} style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}>
              <Printer size={15} />
              <span>Print / Save PDF</span>
            </button>
            {isConfirmed && onSwapClick && (
              <button 
                className="btn-secondary" 
                onClick={() => onSwapClick(booking)}
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', color: '#2563eb' }}
              >
                <ArrowRightLeft size={15} />
                <span>Swap Seat</span>
              </button>
            )}
            {isConfirmed && onCancelClick && (
              <button 
                className="btn-secondary" 
                onClick={() => onCancelClick(booking)}
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', color: 'var(--danger)', borderColor: '#fecaca' }}
              >
                <Ban size={15} />
                <span>Cancel Ticket</span>
              </button>
            )}
            {isConfirmed && onReviewClick && (
              <button 
                className="btn-secondary" 
                onClick={() => onReviewClick(booking)}
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', color: 'var(--primary)' }}
              >
                <Star size={15} />
                <span>Rate Journey</span>
              </button>
            )}
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* E-Ticket Paper Layout */}
        <div className="ticket-paper">
          {/* Ticket Header */}
          <div className="ticket-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 800, fontSize: '1.5rem' }}>
                <Bus size={26} />
                <span>BLUE BUS</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Electronic Bus Reservation Receipt
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>PNR NUMBER</div>
              <div className="ticket-pnr-badge">{booking.pnr_number}</div>
              <div style={{ marginTop: 4 }}>
                <span className={`badge ${isConfirmed ? 'badge-green' : 'badge-red'}`}>
                  {booking.status}
                </span>
              </div>
            </div>
          </div>

          {/* Route & Bus Info */}
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {booking.source_city} &rarr; {booking.destination_city}
              </div>
              <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                Date: {booking.travel_date}
              </div>
            </div>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              <strong>{booking.operator_name}</strong> &bull; {booking.bus_name} ({booking.bus_type})
            </div>
            <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem', fontSize: '0.88rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Departure: </span>
                <strong>{booking.departure_time}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Arrival: </span>
                <strong>{booking.arrival_time}</strong>
              </div>
            </div>
          </div>

          {/* Boarding & Dropping Point Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            <div style={{ background: '#f1f5f9', padding: '0.75rem', borderRadius: 6 }}>
              <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: 2 }}>Boarding Point:</strong>
              <div style={{ color: 'var(--text-muted)' }}>{booking.boarding_point || 'Main Station Point'}</div>
            </div>
            <div style={{ background: '#f1f5f9', padding: '0.75rem', borderRadius: 6 }}>
              <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: 2 }}>Dropping Point:</strong>
              <div style={{ color: 'var(--text-muted)' }}>{booking.dropping_point || 'City Destination Stand'}</div>
            </div>
          </div>

          {/* Passengers Table */}
          <div style={{ marginBottom: '1.25rem' }}>
            <strong style={{ fontSize: '0.88rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Passenger Roster</strong>
            <table className="ticket-passengers-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Age / Gender</th>
                  <th>Seat No.</th>
                  <th style={{ textAlign: 'right' }}>Seat Fare</th>
                </tr>
              </thead>
              <tbody>
                {booking.passengers.map((p, index) => (
                  <tr key={p.passenger_id || index}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{p.name}</strong>
                      {p.caption && (
                        <div style={{ fontSize: '0.72rem', color: '#2563eb', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>🏷️</span>
                          <span style={{ fontStyle: 'italic', fontWeight: 600 }}>"{p.caption}"</span>
                        </div>
                      )}
                    </td>
                    <td>{p.age} yrs / {p.gender}</td>
                    <td>
                      <span className="badge badge-blue">Seat {p.seat_number}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>₹{p.seat_fare.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment & Refund Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            {/* Left: Transaction details */}
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {booking.payment && (
                <>
                  <div>Txn ID: <strong>{booking.payment.transaction_id}</strong></div>
                  <div>Payment Method: <strong>{booking.payment.payment_method}</strong></div>
                </>
              )}
              {booking.coupon_code && (
                <div style={{ color: 'var(--success)' }}>
                  Promo Applied: <strong>{booking.coupon_code}</strong> (-₹{booking.discount_amount.toFixed(2)})
                </div>
              )}
              {booking.cancellation && (
                <div style={{ marginTop: '0.4rem', color: 'var(--danger)' }}>
                  Refund ID: <strong>{booking.cancellation.refund_transaction_id}</strong> &bull; Refunded: <strong>₹{booking.cancellation.refund_amount.toFixed(2)}</strong>
                </div>
              )}
            </div>

            {/* Right: Total Paid & QR */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FINAL AMOUNT</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                  ₹{booking.final_amount.toFixed(2)}
                </div>
              </div>
              {/* SVG QR Code for e-ticket verification */}
              <svg width="64" height="64" viewBox="0 0 80 80" fill="#1e3a8a">
                <rect x="5" y="5" width="22" height="22" fill="none" stroke="#1e3a8a" strokeWidth="4" />
                <rect x="11" y="11" width="10" height="10" />
                <rect x="53" y="5" width="22" height="22" fill="none" stroke="#1e3a8a" strokeWidth="4" />
                <rect x="59" y="11" width="10" height="10" />
                <rect x="5" y="53" width="22" height="22" fill="none" stroke="#1e3a8a" strokeWidth="4" />
                <rect x="11" y="59" width="10" height="10" />
                <rect x="35" y="12" width="10" height="10" />
                <rect x="35" y="35" width="12" height="12" />
                <rect x="55" y="45" width="18" height="8" />
                <rect x="40" y="60" width="25" height="12" />
              </svg>
            </div>
          </div>
        </div>

        {/* Footer Support Info */}
        <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Need assistance? 24/7 Blue Bus Support Hotline: <strong>1800-258-3287</strong> &bull; support@bluebus.com
        </div>
      </div>
    </div>
  );
}
