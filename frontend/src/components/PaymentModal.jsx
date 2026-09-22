import React, { useState } from 'react';
import { X, CreditCard, QrCode, Building2, CheckCircle2, Loader2, ShieldCheck, Lock } from 'lucide-react';
import { createBookingApi } from '../api';

export default function PaymentModal({ bookingPayload, onClose, onSuccess }) {
  const [method, setMethod] = useState('UPI');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form states
  const [upiId, setUpiId] = useState('user@okhdfcbank');
  const [cardNumber, setCardNumber] = useState('4532 8812 9901 3456');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('884');
  const [bank, setBank] = useState('HDFC');

  const handlePay = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Simulate realistic payment gateway processing delay
      await new Promise(r => setTimeout(r, 1200));

      const apiPayload = {
        trip_id: bookingPayload.trip_id,
        boarding_point_id: bookingPayload.boarding_point_id || null,
        dropping_point_id: bookingPayload.dropping_point_id || null,
        coupon_code: bookingPayload.coupon_code || null,
        contact_email: (bookingPayload.contact_email || '').trim(),
        contact_phone: (bookingPayload.contact_phone || '').trim(),
        payment_method: method,
        passengers: (bookingPayload.passengers || []).map(p => ({
          seat_id: p.seat_id,
          name: (p.name || 'Passenger').trim(),
          age: Number(p.age) || 25,
          gender: (p.gender || 'MALE').toUpperCase()
        }))
      };

      const bookingResponse = await createBookingApi(apiPayload);
      onSuccess(bookingResponse);
    } catch (err) {
      setError(typeof err === 'string' ? err : (err.message || 'Payment processing failed. Please try again.'));
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 540 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ background: '#dbeafe', color: '#1d4ed8', padding: 6, borderRadius: 6 }}>
              <Lock size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Blue Bus Secure Checkout</h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>256-Bit Encrypted Payment Simulation</div>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }} disabled={loading}>
            <X size={20} />
          </button>
        </div>

        {/* Amount to Pay Pill */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', 
          color: 'white', 
          borderRadius: 8, 
          padding: '1rem', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1.25rem' 
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>Total Payable Amount</div>
            <div style={{ fontSize: '0.85rem' }}>
              Seats: {bookingPayload.passengers.map(p => p.seat_number).join(', ')} ({bookingPayload.passengers.length} Passengers)
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>
            ₹{bookingPayload.final_amount.toFixed(2)}
          </div>
        </div>

        {/* Payment Methods Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {[
            { id: 'UPI', label: 'UPI / QR', icon: <QrCode size={18} /> },
            { id: 'CREDIT_CARD', label: 'Cards', icon: <CreditCard size={18} /> },
            { id: 'NET_BANKING', label: 'Net Banking', icon: <Building2 size={18} /> }
          ].map(m => (
            <button 
              key={m.id} 
              type="button"
              onClick={() => setMethod(m.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '0.65rem',
                borderRadius: 8,
                border: method === m.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                background: method === m.id ? 'var(--primary-light)' : '#ffffff',
                color: method === m.id ? 'var(--primary)' : 'var(--text-main)',
                fontWeight: 700,
                fontSize: '0.82rem'
              }}
            >
              {m.icon}
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 6, fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* Payment Form */}
        <form onSubmit={handlePay}>
          {method === 'UPI' && (
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '0.85rem' }}>
                <div style={{ 
                  display: 'inline-block', 
                  padding: '12px', 
                  background: 'white', 
                  borderRadius: 8, 
                  border: '1px dashed #94a3b8' 
                }}>
                  {/* SVG Mock QR Code */}
                  <svg width="120" height="120" viewBox="0 0 120 120" fill="#0f172a">
                    <rect x="10" y="10" width="30" height="30" fill="none" stroke="#0f172a" strokeWidth="6" />
                    <rect x="20" y="20" width="10" height="10" />
                    <rect x="80" y="10" width="30" height="30" fill="none" stroke="#0f172a" strokeWidth="6" />
                    <rect x="90" y="20" width="10" height="10" />
                    <rect x="10" y="80" width="30" height="30" fill="none" stroke="#0f172a" strokeWidth="6" />
                    <rect x="20" y="90" width="10" height="10" />
                    <rect x="50" y="20" width="20" height="10" />
                    <rect x="50" y="50" width="20" height="20" />
                    <rect x="80" y="60" width="30" height="10" />
                    <rect x="60" y="90" width="40" height="20" />
                  </svg>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Scan with GooglePay, PhonePe or Paytm</div>
                </div>
              </div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Or Enter Virtual Payment Address (VPA)</label>
              <input 
                type="text" 
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="username@bank"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6, fontWeight: 600 }}
                required
              />
            </div>
          )}

          {method === 'CREDIT_CARD' && (
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Card Number</label>
                <input 
                  type="text" 
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6, fontWeight: 600 }}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Valid Thru</label>
                  <input 
                    type="text" 
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6 }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>CVV</label>
                  <input 
                    type="password" 
                    maxLength="4"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6 }}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {method === 'NET_BANKING' && (
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Select Bank</label>
              <select 
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 6, fontWeight: 600 }}
              >
                <option value="HDFC">HDFC Bank</option>
                <option value="ICICI">ICICI Bank</option>
                <option value="SBI">State Bank of India</option>
                <option value="AXIS">Axis Bank</option>
                <option value="KOTAK">Kotak Mahindra Bank</option>
              </select>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            <ShieldCheck size={16} color="var(--success)" />
            <span>Safe &amp; Verified Sandbox Gateway with 100% Guaranteed Refund Protection</span>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', padding: '0.85rem', fontSize: '1.05rem' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Simulating Bank Authorization...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>SIMULATE PAYMENT &bull; ₹{bookingPayload.final_amount.toFixed(2)}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
