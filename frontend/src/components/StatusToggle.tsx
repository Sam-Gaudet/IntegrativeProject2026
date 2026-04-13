import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './StatusToggle.css';

interface Props {
  currentStatus: 'available' | 'busy' | 'away';
  onStatusChange?: (newStatus: 'available' | 'busy' | 'away') => void;
}

const StatusToggle: React.FC<Props> = ({ currentStatus, onStatusChange }) => {
  const [status, setStatus] = useState<'available' | 'busy' | 'away'>(currentStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  const handleStatusChange = async (newStatus: 'available' | 'busy' | 'away') => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await api.patch('/api/professors/status', { availability_status: newStatus }, { headers });
      setStatus(res.data.data.availability_status);
      onStatusChange?.(res.data.data.availability_status);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to update status';
      setError(errorMsg);
      console.error('Status update error:', err);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const statuses: Array<'available' | 'busy' | 'away'> = ['available', 'busy', 'away'];

  return (
    <div className="status-toggle-container">
      <h3>Availability Status</h3>
      <div className="status-buttons">
        {statuses.map((s) => (
          <button
            key={s}
            className={`status-btn ${s} ${status === s ? 'active' : ''}`}
            onClick={() => handleStatusChange(s)}
            disabled={loading}
          >
            <span className={`indicator ${s}`}></span>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {error && <div className="error-message">{error}</div>}
      {loading && <div className="loading-indicator">Updating...</div>}
    </div>
  );
};

export default StatusToggle;
