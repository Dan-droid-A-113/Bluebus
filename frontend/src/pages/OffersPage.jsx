import React, { useState, useEffect } from 'react';
import { getCouponsApi } from '../api';
import { Tag, Copy, Check, Sparkles, Percent, Calendar, ShieldCheck, Loader2 } from 'lucide-react';

export default function OffersPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const data = await getCouponsApi();
      setCoupons(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem 4rem' }}>
      {/* Header Banner */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eff6ff', color: 'var(--primary)', padding: '0.4rem 0.85rem', borderRadius: 9999, fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.85rem' }}>
          <Sparkles size={16} />
          <span>EXCLUSIVE TRAVEL DISCOUNTS</span>
        </div>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
          Blue Bus Offers &amp; Promo Codes
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: 600, margin: '0.5rem auto 0' }}>
          Save big on your next journey with verified promotional discounts across top interstate sleeper and seater routes.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--primary)' }} />
          <div>Loading best available offers...</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {coupons.map(coupon => {
            const isCopied = copiedCode === coupon.code;
            return (
              <div 
                key={coupon.coupon_id}
                style={{ 
                  background: 'white', 
                  border: '1px solid var(--border)', 
                  borderRadius: 14, 
                  boxShadow: 'var(--shadow-sm)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative'
                }}
              >
                {/* Coupon Top Accent Strip */}
                <div style={{ 
                  background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', 
                  padding: '1.25rem', 
                  color: 'white',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
                      {coupon.discount_type === 'PERCENTAGE' ? `${coupon.discount_val}% OFF` : `₹${coupon.discount_val} FLAT OFF`}
                    </div>
                    <div style={{ fontSize: '0.82rem', opacity: 0.9 }}>
                      Max discount up to ₹{coupon.max_discount}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 10 }}>
                    <Tag size={24} />
                  </div>
                </div>

                {/* Coupon Body */}
                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>
                      {coupon.title}
                    </h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.4, marginBottom: '1rem' }}>
                      {coupon.description}
                    </p>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: '1.25rem' }}>
                      <div>&bull; Minimum booking amount: <strong>₹{coupon.min_booking_amount}</strong></div>
                      <div>&bull; Valid until: <strong>{coupon.valid_until}</strong></div>
                    </div>
                  </div>

                  {/* Coupon Code Pill & Copy Button */}
                  <div style={{ 
                    background: '#f8fafc', 
                    border: '1.5px dashed #93c5fd', 
                    borderRadius: 8, 
                    padding: '0.5rem 0.85rem', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center' 
                  }}>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)', letterSpacing: '1px' }}>
                      {coupon.code}
                    </span>
                    <button 
                      onClick={() => handleCopy(coupon.code)}
                      className={isCopied ? 'btn-primary' : 'btn-secondary'}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      {isCopied ? (
                        <>
                          <Check size={14} />
                          <span>COPIED!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>COPY CODE</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
