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
  onError?: (msg: string) => void;
}

const friendlyError = (raw: string): string => {
  if (raw.includes('MAX_BOOKING_LIMIT')) return 'You already have an active booking. Cancel it first.';
  if (raw.includes('SLOT_NOT_AVAILABLE')) return 'This slot is no longer available.';
  if (raw.includes('ALREADY_IN_QUEUE')) return "You're already in this professor's queue.";
  return raw;
};

const BookingButton: React.FC<Props> = ({ 
  status, 
  professorId, 
  slotId,
  onBookingSuccess,
  onQueueJoin,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleBook = async () => {
    if (!slotId) {
      onError?.('Slot ID is required');
      return;
    }

    setLoading(true);

    try {
      await bookingService.createBooking(slotId);
      onBookingSuccess?.();
    } catch (err: any) {
      const msg = friendlyError(err.response?.data?.error || 'Failed to book slot');
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQueue = async () => {
    setLoading(true);

    try {
      await queueService.joinQueue(professorId);
      onQueueJoin?.();
    } catch (err: any) {
      const msg = friendlyError(err.response?.data?.error || 'Failed to join queue');
      onError?.(msg);
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
    </div>
  );
};

export default BookingButton;

