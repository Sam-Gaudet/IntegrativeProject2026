import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { availabilityService, bookingService } from '../services/bookingService';
import ProfessorCard from '../components/ProfessorCard';
import QueueList from '../components/QueueList';
import { formatDateWithTZ } from '../utils/dateFormatter';
import './StudentDashboard.css';

interface Professor {
  id: string;
  full_name: string;
  department: string;
  availability_status: 'available' | 'busy' | 'away';
}

interface Slot {
  id: string;
  professor_id: string;
  start_time: string;
  end_time: string;
  status: 'available' | 'booked' | 'cancelled';
}

interface BookingInfo {
  id: string;
  slot_id: string;
  status: 'active' | 'completed' | 'cancelled' | 'pending';
  availability_slots?: {
    start_time: string;
    professors?: {
      full_name: string;
    };
  };
}

const StudentDashboard: React.FC = () => {
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<BookingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = sessionStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Fetch professors
        const professorsRes = await api.get('/api/professors', { headers });
        setProfessors(professorsRes.data.data);

        // Fetch availability slots
        const slotsRes = await availabilityService.getSlots();
        setSlots(slotsRes);

        // Fetch student's bookings
        const bookingsRes = await bookingService.getStudentBookings();
        setBookings(bookingsRes);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Poll everything every 4 seconds for real-time feel (covers professor status, slots, bookings)
    const interval = setInterval(fetchData, 4000);
    
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      logout();
      navigate('/login');
    }
  };

  const handleBookingSuccess = () => {
    setSuccessMessage('Booking confirmed!');
    setTimeout(() => setSuccessMessage(null), 3000);
    // Refresh bookings
    const refreshBookings = async () => {
      try {
        const bookingsRes = await bookingService.getStudentBookings();
        setBookings(bookingsRes);
      } catch (err) {
        console.error('Failed to refresh bookings:', err);
      }
    };
    refreshBookings();
  };

  const handleQueueJoin = () => {
    setSuccessMessage('Joined queue successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const getSlotsForProfessor = (professorId: string) => {
    const now = new Date();
    return slots.filter(
      (slot) =>
        slot.professor_id === professorId &&
        (slot.status === 'available' || slot.status === 'booked') &&
        new Date(slot.end_time) > now
    );
  };

  const getUniqueProfessors = () => {
    const seen = new Set<string>();
    return professors.filter((prof) => {
      if (seen.has(prof.id)) return false;
      seen.add(prof.id);
      return true;
    });
  };

  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const cancelBooking = async (bookingId: string) => {
    setCancellingId(bookingId);
    try {
      await bookingService.cancelBooking(bookingId);
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      setSuccessMessage('Booking cancelled successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const deleteBooking = async (bookingId: string) => {
    try {
      const token = sessionStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await api.delete(`/api/bookings/${bookingId}/delete`, { headers });
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      setSuccessMessage('Booking removed from history');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete booking');
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', gap: '12px' }}>
          <div className="loading-spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }}></div>
          <p style={{ color: '#666', margin: 0 }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <div>
            <h2>Student Dashboard</h2>
            <div className="user-greeting">
              <p>Hello, <strong>{user?.full_name}</strong></p>
              <p className="department">{user?.email}</p>
            </div>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="dashboard-content">
        {error && (
          <div className="toast toast-error">
            <span>⚠️</span>
            {error}
          </div>
        )}

        {successMessage && (
          <div className="toast toast-success">
            <span>✓</span>
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1">
          {/* My Active Bookings */}
          <div className="section">
            <h3 className="section-title">My Active Bookings</h3>
            {bookings.filter((b) => b.status === 'active').length === 0 ? (
              <p className="text-gray">No active bookings</p>
            ) : (
              <div className="bookings-list">
                {bookings.filter((b) => b.status === 'active').map((booking) => (
                  <div key={booking.id} className="booking-card">
                    <div className="booking-info">
                      <p className="booking-professor">
                        {booking.availability_slots?.professors?.full_name || 'Professor'}
                      </p>
                      <p className="booking-time">
                        {formatDateWithTZ(booking.availability_slots?.start_time)}
                      </p>
                      <p className={`booking-status ${booking.status}`}>
                        Status: {booking.status}
                      </p>
                    </div>
                    <button
                      className="btn btn-danger"
                      onClick={() => cancelBooking(booking.id)}
                      disabled={cancellingId === booking.id}
                    >
                      {cancellingId === booking.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Queue Positions */}
          <div className="section">
            <h3 className="section-title">My Queue Positions</h3>
            <QueueList professorId="" isProfessor={false} isStudentView={true} onAccepted={async () => {
              try {
                const bookingsRes = await bookingService.getStudentBookings();
                setBookings(bookingsRes);
              } catch (err) {
                console.error('Failed to refresh bookings after accept:', err);
              }
            }} />
          </div>

          {/* Professors List Section */}
          <div className="section">
            <h3 className="section-title">Available Professors</h3>
            {getUniqueProfessors().length === 0 ? (
              <p className="text-gray">No professors available</p>
            ) : (
              <div className="professors-list">
                {getUniqueProfessors().map((professor) => {
                  const professorSlots = getSlotsForProfessor(professor.id);
                  return (
                    <ProfessorCard
                      key={professor.id}
                      professor={professor}
                      slots={professorSlots}
                      onBookingSuccess={handleBookingSuccess}
                      onQueueJoin={handleQueueJoin}
                      onError={(msg) => {
                        setError(msg);
                        setTimeout(() => setError(null), 4000);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;

