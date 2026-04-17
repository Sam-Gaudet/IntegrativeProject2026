import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { bookingService, availabilityService, AvailabilitySlot } from '../services/bookingService';
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
  status: 'active' | 'completed' | 'cancelled' | 'pending';
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
  const [slotStartDate, setSlotStartDate] = useState('');
  const [slotStartTimeStr, setSlotStartTimeStr] = useState('');
  const [slotEndDate, setSlotEndDate] = useState('');
  const [slotEndTimeStr, setSlotEndTimeStr] = useState('');
  const [creatingSlot, setCreatingSlot] = useState(false);
  const [lastStatusChangeTime, setLastStatusChangeTime] = useState<number>(0);
  const [professorBookings, setProfessorBookings] = useState<ProfessorBooking[]>([]);
  const [mySlots, setMySlots] = useState<AvailabilitySlot[]>([]);
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
        setError((prev) => prev ?? 'Failed to refresh data — check your connection.');
        setTimeout(() => setError(null), 4000);
      }
    };
    fetchBookings();
    const interval = setInterval(fetchBookings, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!professor) return;
    const fetchSlots = async () => {
      try {
        const slots = await availabilityService.getSlots(professor.id);
        setMySlots(slots);
      } catch (err) {
        console.error('Failed to fetch slots:', err);
        setError((prev) => prev ?? 'Failed to refresh data — check your connection.');
        setTimeout(() => setError(null), 4000);
      }
    };
    fetchSlots();
    const interval = setInterval(fetchSlots, 4000);
    return () => clearInterval(interval);
  }, [professor?.id]);

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
      // Re-fetch from server so any auto-promoted student's new booking appears immediately
      const updated = await bookingService.getProfessorBookings();
      setProfessorBookings(updated);
      setStatusMessage('Meeting ended. Next student promoted if in queue.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      const status: number = err?.response?.status ?? 0;
      const raw: string = err?.response?.data?.error ?? '';
      let msg = 'Failed to end meeting. Please try again.';
      if (raw.includes('Only active bookings')) msg = 'This meeting has already been ended.';
      else if (raw.includes('only complete meetings from your own')) msg = 'You can only end your own meetings.';
      else if (status === 404) msg = 'Meeting not found — it may have already ended.';
      else if (status === 0 || status >= 500) msg = 'Server is unavailable. Please check your connection.';
      setStatusMessage(msg);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      await availabilityService.deleteSlot(slotId);
      setMySlots((prev) => prev.filter((s) => s.id !== slotId));
      setStatusMessage('Slot deleted.');
      setTimeout(() => setStatusMessage(null), 2000);
    } catch (err: any) {
      const raw: string = err?.response?.data?.error ?? '';
      const msg = raw.includes('active booking')
        ? 'This slot has an active booking — end the meeting first.'
        : 'Failed to delete slot. Please try again.';
      setError(msg);
      setTimeout(() => setError(null), 4000);
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
        start_time: new Date(`${slotStartDate}T${slotStartTimeStr}`).toISOString(),
        end_time: new Date(`${slotEndDate}T${slotEndTimeStr}`).toISOString(),
      }, { headers });
      setSlotStartDate('');
      setSlotStartTimeStr('');
      setSlotEndDate('');
      setSlotEndTimeStr('');
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
        <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', gap: '12px' }}>
          <div className="loading-spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }}></div>
          <p style={{ color: '#666', margin: 0 }}>Loading dashboard...</p>
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
                      <label>Start Date</label>
                      <input
                        type="date"
                        value={slotStartDate}
                        onChange={(e) => setSlotStartDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Start Time</label>
                      <input
                        type="time"
                        value={slotStartTimeStr}
                        onChange={(e) => setSlotStartTimeStr(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>End Date</label>
                      <input
                        type="date"
                        value={slotEndDate}
                        onChange={(e) => setSlotEndDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>End Time</label>
                      <input
                        type="time"
                        value={slotEndTimeStr}
                        onChange={(e) => setSlotEndTimeStr(e.target.value)}
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

          {/* My Availability Slots */}
          <div className="section">
            <h3 className="section-title">My Availability Slots</h3>
            {mySlots.length === 0 ? (
              <p className="text-gray">No upcoming slots</p>
            ) : (
              <div className="bookings-list">
                {mySlots.map((slot) => {
                  const activeBooking = professorBookings.find(
                    (b) => b.slot_id === slot.id && (b.status === 'active' || b.status === 'pending')
                  );
                  const isPending = activeBooking?.status === 'pending';
                  return (
                    <div key={slot.id} className="booking-card">
                      <div className="booking-info">
                        <p className="booking-time">
                          {formatDateWithTZ(slot.start_time)}
                          {' – '}
                          {new Date(slot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {slot.status === 'booked' && activeBooking && (
                          <p className="booking-professor">
                            {(activeBooking as any).students?.full_name || 'Student'}
                          </p>
                        )}
                        <p className={`booking-status ${slot.status}`}>
                          {slot.status === 'booked'
                            ? isPending ? 'Arriving...' : 'In meeting'
                            : 'Available'}
                        </p>
                      </div>
                      {slot.status === 'available' && (
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDeleteSlot(slot.id)}
                        >
                          Delete Slot
                        </button>
                      )}
                      {slot.status === 'booked' && activeBooking && !isPending && (
                        <button
                          className="btn btn-success"
                          onClick={() => handleEndMeeting(activeBooking.id)}
                        >
                          End Meeting
                        </button>
                      )}
                      {slot.status === 'booked' && activeBooking && isPending && (
                        <span className="status-pill" style={{ background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>Awaiting student</span>
                      )}
                      {slot.status === 'booked' && !activeBooking && (
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDeleteSlot(slot.id)}
                        >
                          Clear Slot
                        </button>
                      )}
                    </div>
                  );
                })}
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

