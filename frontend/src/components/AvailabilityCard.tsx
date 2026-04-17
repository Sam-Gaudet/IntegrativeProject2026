import React, { useState } from 'react';
import BookingButton from './BookingButton';
import './AvailabilityCard.css';

interface Props {
  professor: {
    id: string;
    full_name: string;
    department: string;
    availability_status: 'available' | 'busy' | 'away';
  };
  slot?: {
    id: string;
    start_time: string;
    end_time: string;
    status: 'available' | 'booked' | 'cancelled';
  };
  onBookingSuccess?: () => void;
  onQueueJoin?: () => void;
}

const AvailabilityCard: React.FC<Props> = ({ 
  professor, 
  slot,
  onBookingSuccess,
  onQueueJoin 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'available':
        return 'status-available';
      case 'busy':
        return 'status-busy';
      case 'away':
        return 'status-away';
      case 'booked':
        return 'status-booked';
      default:
        return '';
    }
  };

  return (
    <div className="availability-card">
      <div className="card-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="professor-info">
          <h3>{professor.full_name}</h3>
          <p className="department">{professor.department}</p>
        </div>
        <div className="status-section">
          <span className={`status-badge ${getStatusBadgeClass(professor.availability_status)}`}>
            {professor.availability_status}
          </span>
          <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="card-content">
          {slot ? (
            <div className="slot-details">
              <div className="time-info">
                <span className="date">{formatDate(slot.start_time)}</span>
                <span className="time">
                  {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                </span>
              </div>
              <div className="slot-status">
                <span className={`badge ${getStatusBadgeClass(slot.status)}`}>
                  {slot.status === 'available' ? 'Available' : slot.status}
                </span>
              </div>
            </div>
          ) : (
            <p className="no-slots">No specific slot information available</p>
          )}
          
          <div className="action-button">
            <BookingButton
              status={professor.availability_status}
              professorId={professor.id}
              slotId={slot?.id}
              onBookingSuccess={onBookingSuccess}
              onQueueJoin={onQueueJoin}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilityCard;

