import React, { useState, useEffect } from 'react';
import { X, Star, MessageSquare, Check, Loader2 } from 'lucide-react';
import { getReviewsApi, submitReviewApi } from '../api';

export default function ReviewModal({ bus, booking, currentUser, onClose, onReviewSubmitted }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const busId = bus ? bus.bus_id : (booking ? booking.trip?.bus_id : null);
  const busName = bus ? bus.bus_name : (booking ? booking.bus_name : 'Bus');

  useEffect(() => {
    loadReviews();
  }, [busId]);

  const loadReviews = async () => {
    if (!busId) return;
    setLoading(true);
    try {
      const data = await getReviewsApi(busId);
      setReviews(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Please log in to submit a review.');
      return;
    }
    if (!comment.trim()) {
      alert('Please share a few words about your journey.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const newRev = await submitReviewApi({
        bus_id: busId,
        booking_id: booking ? booking.booking_id : null,
        rating,
        comment: comment.trim()
      });
      setReviews(prev => [newRev, ...prev]);
      setSuccessMsg('Thank you! Your verified traveler review has been posted.');
      setComment('');
      if (onReviewSubmitted) onReviewSubmitted(newRev);
    } catch (err) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 580 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Ratings &amp; Reviews &bull; {busName}</h3>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Submit Review Section if logged in */}
        {currentUser && (
          <form onSubmit={handleSubmit} style={{ background: '#f8fafc', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Rate Your Experience</div>
            
            {/* Star Selector */}
            <div style={{ display: 'flex', gap: 6, marginBottom: '0.75rem', cursor: 'pointer' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{ background: 'none', border: 'none', padding: 0 }}
                >
                  <Star 
                    size={24} 
                    fill={(hoverRating || rating) >= star ? '#f59e0b' : 'none'} 
                    color={(hoverRating || rating) >= star ? '#f59e0b' : '#94a3b8'} 
                  />
                </button>
              ))}
              <span style={{ fontSize: '0.85rem', fontWeight: 700, marginLeft: 8, color: '#f59e0b', alignSelf: 'center' }}>
                {rating} / 5 Stars
              </span>
            </div>

            <textarea 
              rows="3"
              placeholder="Tell other travelers about bus punctuality, seat comfort, cleanliness, AC cooling, and staff behavior..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.88rem', marginBottom: '0.75rem' }}
              required
            />

            {error && (
              <div style={{ color: 'var(--danger)', fontSize: '0.82rem', marginBottom: '0.5rem' }}>{error}</div>
            )}
            {successMsg && (
              <div style={{ color: 'var(--success)', fontSize: '0.82rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check size={14} />
                <span>{successMsg}</span>
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.88rem' }} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Post Verified Review'}
            </button>
          </form>
        )}

        {/* Existing Reviews List */}
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Verified Traveler Reviews ({reviews.length})
          </div>

          {loading ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No reviews yet for this bus. Be the first to share your experience!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '280px', overflowY: 'auto' }}>
              {reviews.map(rev => (
                <div key={rev.review_id} style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: 6, padding: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{rev.user_name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#f59e0b', fontSize: '0.82rem', fontWeight: 700 }}>
                      <Star size={13} fill="currentColor" />
                      <span>{rev.rating}.0</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                    "{rev.comment}"
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
