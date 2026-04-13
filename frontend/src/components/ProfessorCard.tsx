import React, { useState } from 'react';
import BookingButton from './BookingButton';
import './ProfessorCard.css';

interface Slot {
  id: string;
  start_time: string;
  end_time: string;
  status: 'available' | 'booked' | 'cancelled';
}

interface Props {
  professor: {
    id: string;
    full_name: string;
    department: string;
    availability_status: 'available' | 'busy' | 'away';
  };
  slots: Slot[];
  onBookingSuccess?: () => void;
  onQueueJoin?: () => void;
}

const ProfessorCard: React.FC<Props> = ({
  professor,
  slots,
  onBookingSuccess,
  onQueueJoin,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
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

  const availableSlots = slots.filter((s) => s.status === 'available');
  const totalSlots = slots.length;

  return (
    <div className="professor-card">
      <div className="card-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="professor-header-info">
          <h3 className="professor-name">{professor.full_name}</h3>
          <p className="department">{professor.department}</p>
        </div>

        <div className="professor-header-right">
          <span className={`status-badge ${getStatusBadgeClass(professor.availability_status)}`}>
            {professor.availability_status}
          </span>

          <div className="slot-count">
            <span className="available-count">{availableSlots.length}</span>
            <span className="slot-label">slots</span>
          </div>

          <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="card-content">
          {availableSlots.length === 0 ? (
            <div className="empty-slots">
              <p>No available slots</p>
            </div>
          ) : (
            <div className="slots-list">
              {availableSlots.map((slot) => (
                <div key={slot.id} className="slot-item">
                  <div className="slot-time-info">
                    <div className="date-time">
                      <span className="date">{formatDate(slot.start_time)}</span>
                      <span className="time">
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </span>
                    </div>
                  </div>

                  <BookingButton
                    status={professor.availability_status}
                    professorId={professor.id}
                    slotId={slot.id}
                    onBookingSuccess={onBookingSuccess}
                    onQueueJoin={onQueueJoin}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfessorCard;
