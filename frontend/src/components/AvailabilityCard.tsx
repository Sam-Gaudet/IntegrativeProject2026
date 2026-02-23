import React from 'react';
import BookingButton from './BookingButton';

interface Props {
  professor: {
    id: string;
    full_name: string;
    department: string;
    availability_status: 'available' | 'busy' | 'away';
  };
}

const AvailabilityCard: React.FC<Props> = ({ professor }) => (
  <div className="card">
    <h3>{professor.full_name}</h3>
    <p>{professor.department}</p>
    <BookingButton status={professor.availability_status} />
  </div>
);

export default AvailabilityCard;
