import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { bookingService } from '../services/bookingService';
import StatusToggle from '../components/StatusToggle';
import QueueList from '../components/QueueList';
import { formatDateWithTZ } from '../utils/dateFormatter';
import './ProfessorDashboard.css';

interface ProfessorProfile {
  id: string;
  full_name: string;
  department: string;
  email: string;
  availability_status: 'available' | 'busy' | 'away';
}

interface ProfessorBooking {
  id: string;
  slot_id: string;
  status: 'active' | 'completed' | 'cancelled';
  availability_slots?: {
    start_time: string;
    end_time: string;
  };
  students?: {
    full_name: string;
    email: string;
  };
}

const ProfessorDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [professor, setProfessor] = useState<ProfessorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [slotStartTime, setSlotStartTime] = useState('');
  const [slotEndTime, setSlotEndTime] = useState('');
  const [creatingSlot, setCreatingSlot] = useState(false);
  const [lastStatusChangeTime, setLastStatusChangeTime] = useState<number>(0);
  const [professorBookings, setProfessorBookings] = useState<ProfessorBooking[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfessor = async () => {
      try {
        const token = sessionStorage.getItem('token');
        if (!token) {
          logout();
          navigate('/login');
          return;
        }

        const res = await api.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Only update if 8+ seconds have passed since last status change (to avoid polling overwriting UI updates)
        // This gives the API plenty of time to process and ensures the user sees their change persist
        if (Date.now() - lastStatusChangeTime > 8000) {
          setProfessor(res.data.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfessor();
    
    // Poll for updates every 3 seconds
    const interval = setInterval(fetchProfessor, 3000);
    return () => clearInterval(interval);
  }, [lastStatusChangeTime]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const bookings = await bookingService.getProfessorBookings();
        setProfessorBookings(bookings);
      } catch (err) {
        console.error('Failed to fetch professor bookings:', err);
      }
    };
    fetchBookings();
    const interval = setInterval(fetchBookings, 4000);
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

  const handleStatusChange = (newStatus: 'available' | 'busy' | 'away') => {
    setProfessor((prev) =>
      prev ? { ...prev, availability_status: newStatus } : null
    );
    setLastStatusChangeTime(Date.now());
    setStatusMessage(`Status updated to ${newStatus}`);
    setTimeout(() => setStatusMessage(null), 2000);
  };

  const handleEndMeeting = async (bookingId: string) => {
    try {
      await bookingService.completeBooking(bookingId);
      setProfessorBookings((prev) =>
        prev.map((b) => b.id === bookingId ? { ...b, status: 'completed' } : b)
      );
      setStatusMessage('Meeting ended. Next student promoted if in queue.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to end meeting');
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingSlot(true);
    setError(null);

    try {
      const token = sessionStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await api.post('/api/availability', {
        start_time: new Date(slotStartTime).toISOString(),
        end_time: new Date(slotEndTime).toISOString(),
      }, { headers });
      setSlotStartTime('');
      setSlotEndTime('');
      setShowSlotForm(false);
      setStatusMessage('Availability slot created successfully!');
      setTimeout(() => setStatusMessage(null), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create slot');
    } finally {
      setCreatingSlot(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h2>Loading...</h2>
        </div>
        <div className="dashboard-content">
          <p>Loading professor dashboard...</p>
        </div>
      </div>
    );
  }

  if (!professor) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h2>Error</h2>
        </div>
        <div className="dashboard-content">
          <p>Could not load professor information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <div>
            <h2>Professor Dashboard</h2>
            <div className="user-greeting">
              <p>Hello, <strong>{professor.full_name}</strong></p>
              <p className="department">{professor.department}</p>
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

        {statusMessage && (
          <div className="toast toast-success">
            <span>✓</span>
            {statusMessage}
          </div>
        )}

        <div className="grid grid-cols-1">
          {/* Status Management */}
          <div className="section">
            <StatusToggle
              currentStatus={professor.availability_status}
              onStatusChange={handleStatusChange}
            />
          </div>

          {/* Create Availability Slot */}
          <div className="section">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Create Availability Slot</h3>
              </div>
              <div className="card-content">
                {!showSlotForm ? (
                  <button
                    className="btn btn-success"
                    onClick={() => setShowSlotForm(true)}
                  >
                    + Add Slot
                  </button>
                ) : (
                  <form onSubmit={handleCreateSlot} className="slot-form">
                    <div className="form-group">
                      <label htmlFor="start-time">Start Time</label>
                      <input
                        id="start-time"
                        type="datetime-local"
                        value={slotStartTime}
                        onChange={(e) => setSlotStartTime(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="end-time">End Time</label>
                      <input
                        id="end-time"
                        type="datetime-local"
                        value={slotEndTime}
                        onChange={(e) => setSlotEndTime(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-actions">
                      <button
                        type="submit"
                        className="btn btn-success"
                        disabled={creatingSlot}
                      >
                        {creatingSlot ? 'Creating...' : 'Create Slot'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowSlotForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Student Queue */}
          <div className="section">
            <h3 className="section-title">Student Queue</h3>
            {professor && <QueueList professorId={professor.id} isProfessor={true} />}
          </div>

          {/* Current Bookings */}
          <div className="section">
            <h3 className="section-title">Current Bookings</h3>
            {professorBookings.filter((b) => b.status === 'active').length === 0 ? (
              <p className="text-gray">No active bookings</p>
            ) : (
              <div className="bookings-list">
                {professorBookings
                  .filter((b) => b.status === 'active')
                  .map((booking) => (
                    <div key={booking.id} className="booking-card">
                      <div className="booking-info">
                        <p className="booking-professor">
                          {(booking as any).students?.full_name || 'Student'}
                        </p>
                        <p className="booking-time">
                          {formatDateWithTZ(booking.availability_slots?.start_time)}
                          {' – '}
                          {booking.availability_slots?.end_time
                            ? new Date(booking.availability_slots.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''}
                        </p>
                        <p className="booking-status active">Status: active</p>
                      </div>
                      <button
                        className="btn btn-success"
                        onClick={() => handleEndMeeting(booking.id)}
                      >
                        End Meeting
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Profile Information */}
          <div className="section">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Profile Information</h3>
              </div>
              <div className="profile-info">
                <div className="profile-item">
                  <span className="profile-label">Full Name:</span>
                  <span className="profile-value">{professor.full_name}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Email:</span>
                  <span className="profile-value">{professor.email}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Department:</span>
                  <span className="profile-value">{professor.department}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Current Status:</span>
                  <span className={`status-pill ${professor.availability_status}`}>
                    {professor.availability_status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessorDashboard;

