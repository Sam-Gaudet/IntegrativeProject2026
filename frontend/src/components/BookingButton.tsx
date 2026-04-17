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

const friendlyError = (err: any): string => {
  const code: string = err?.response?.data?.code ?? '';
  const raw: string = err?.response?.data?.error ?? '';
  const status: number = err?.response?.status ?? 0;

  if (code === 'MAX_BOOKING_LIMIT' || raw.includes('max_booking_limit'))
    return 'You already have an active booking with this professor. Cancel it first.';
  if (code === 'SLOT_NOT_AVAILABLE' || raw.includes('slot_not_available'))
    return 'This slot is no longer available. Please choose another.';
  if (code === 'SLOT_ALREADY_BOOKED' || raw.includes('slot_already_booked'))
    return 'This slot was just taken by someone else. Please try another.';
  if (code === 'ALREADY_IN_QUEUE' || raw.includes('already_in_queue'))
    return "You're already in this professor's queue.";
  if (code === 'ALREADY_IN_MEETING' || raw.includes('active meeting'))
    return "You already have an active meeting with this professor. Wait for it to finish.";
  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 403) return 'You do not have permission to do this.';
  if (status === 0 || status >= 500) return 'Server is unavailable. Please try again later.';
  return raw || 'Something went wrong. Please try again.';
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
      const msg = friendlyError(err);
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
      const msg = friendlyError(err);
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

