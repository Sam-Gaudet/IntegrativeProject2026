import React, { useState } from 'react';
import { bookingService, queueService } from '../services/bookingService';
import { useAuth } from '../hooks/useAuth';
import './BookingButton.css';

interface Props {
  status: 'available' | 'busy' | 'away';
  professorId: string;
  slotId?: string;
  onBookingSuccess?: () => void;
  onQueueJoin?: () => void;
}

const BookingButton: React.FC<Props> = ({ 
  status, 
  professorId, 
  slotId,
  onBookingSuccess,
  onQueueJoin 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const handleBook = async () => {
    if (!slotId) {
      setError('Slot ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await bookingService.createBooking(slotId);
      onBookingSuccess?.();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to book slot';
      setError(errorMsg);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleQueue = async () => {
    setLoading(true);
    setError(null);

    try {
      await queueService.joinQueue(professorId);
      onQueueJoin?.();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to join queue';
      setError(errorMsg);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  let text = '';
  let onClick = () => {};
  let disabled = false;

  switch (status) {
    case 'available':
      text = loading ? 'Booking...' : 'Book Now';
      onClick = handleBook;
      disabled = loading || !user;
      break;
    case 'busy':
      text = loading ? 'Joining...' : 'Join Queue';
      onClick = handleQueue;
      disabled = loading || !user;
      break;
    case 'away':
      text = 'Unavailable';
      disabled = true;
      break;
  }

  return (
    <div className="booking-button-container">
      <button 
        className={`booking-btn ${status} ${loading ? 'loading' : ''}`}
        onClick={onClick} 
        disabled={disabled}
      >
        {loading && <span className="spinner"></span>}
        {text}
      </button>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default BookingButton;

