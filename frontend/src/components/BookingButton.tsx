import React from 'react';

interface Props {
  status: 'available' | 'busy' | 'away';
}

const BookingButton: React.FC<Props> = ({ status }) => {
  let text = '';
  switch (status) {
    case 'available':
      text = 'Book Now';
      break;
    case 'busy':
      text = 'Join Queue';
      break;
    case 'away':
      text = 'Unavailable';
      break;
  }
  return <button disabled={status === 'away'}>{text}</button>;
};

export default BookingButton;
