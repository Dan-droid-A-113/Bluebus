import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { previewCancellationApi, cancelBookingApi } from '../api';

export default function CancelModal({ booking, onClose, onSuccess }) {
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [preview, setPreview] = useState(null);
  const [reason, setReason] = useState('Change of travel schedule');
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPreview();
  }, [booking.pnr_number]);

  const loadPreview = async () => {
    setLoadingPreview(true);
    setError(null);
    try {
      const data = await previewCancellationApi(booking.pnr_number);
      setPreview(data);
    } catch (e) {
      setError(e.message || 'Failed to calculate refund preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmCancel = async () => {
    setCancelling(true);
    setError(null);
    try {
      const res = await cancelBookingApi(booking.pnr_number, reason);
      onSuccess(res);
    } catch (e) {
      setError(e.message || 'Failed to cancel ticket');
      setCancelling(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 500 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
            <AlertTriangle size={20} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Cancel Booking &amp; Refund</h3>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }} disabled={cancelling}>
            <X size={20} />
          </button>
        </div>

        {loadingPreview ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            <div>Calculating refund according to Blue Bus policy...</div>
          </div>
        ) : error ? (
          <div style={{ padding: '1rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 8, marginBottom: '1rem' }}>
            {error}
          </div>
        ) : (
          <div>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>PNR Number:</span>
                <strong>{booking.pnr_number}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Route:</span>
                <strong>{booking.source_city} &rarr; {booking.destination_city}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Amount Paid:</span>
                <strong>₹{preview.total_paid.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.88rem', color: 'var(--danger)' }}>
                <span>Cancellation Fee:</span>
                <span>- ₹{preview.cancellation_fee.toFixed(2)}</span>
              </div>
              <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: 'var(--success)' }}>
                <span>Net Refund to Source:</span>
                <span>₹{preview.refund_amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Policy badge */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '0.6rem 0.85rem', fontSize: '0.78rem', color: '#1e40af', marginBottom: '1.25rem' }}>
              <strong>Policy Applied:</strong> {preview.policy_applied}
            </div>

            {/* Cancellation Reason */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Reason for Cancellation
              </label>
              <select 
                value={reason} 
                onChange={(e) => setReason(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.9rem' }}
              >
                <option value="Change of travel schedule">Change of travel schedule</option>
                <option value="Selected wrong bus or date">Selected wrong bus or date</option>
                <option value="Personal emergency">Personal emergency</option>
                <option value="Found alternative transit">Found alternative transit</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }} disabled={cancelling}>
                Keep Ticket
              </button>
              <button 
                className="btn-danger" 
                onClick={handleConfirmCancel} 
                style={{ flex: 1.5, justifyContent: 'center' }}
                disabled={cancelling}
              >
                {cancelling ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Processing Refund...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Cancel &amp; Refund</span>
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
