import React, { useState, useEffect } from 'react';
import { queueService } from '../services/bookingService';
import { useRealtimeQueue } from '../hooks/useRealtime';
import api from '../services/api';
import './QueueList.css';

interface QueueEntry {
  id: string;
  professor_id: string;
  student_id: string;
  status: 'waiting' | 'promoted' | 'cancelled' | 'expired';
  position: number;
  created_at: string;
  student_name?: string;
  students?: { full_name: string; email?: string } | null;
  professors?: { full_name: string; department?: string } | null;
}

interface Props {
  professorId: string;
  isProfessor?: boolean;
  isStudentView?: boolean;
}

const QueueList: React.FC<Props> = ({ professorId, isProfessor = false, isStudentView = false }) => {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callingNext, setCallingNext] = useState(false);
  const { queueEntries } = useRealtimeQueue(professorId);

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        if (isStudentView) {
          // Fetch all queue entries for the current student across all professors
          const token = sessionStorage.getItem('token');
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const res = await api.get('/api/queue', { headers });
          setQueue(res.data.data || []);
        } else if (isProfessor && professorId) {
          const entries = await queueService.getProfessorQueue(professorId);
          setQueue(entries);
        }
      } catch (err: any) {
        console.error('Queue fetch error:', err);
        setError(err.response?.data?.error || 'Failed to load queue');
      } finally {
        setLoading(false);
      }
    };

    fetchQueue();
    
    // Poll for queue updates every 3 seconds since realtime is disabled
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, [professorId, isProfessor, isStudentView]);

  // Update queue when real-time entries change
  useEffect(() => {
    if (!isStudentView && queueEntries.length >= 0) {
      setQueue(queueEntries);
    }
  }, [queueEntries, isStudentView]);

  const handleCallNext = async () => {
    if (!isProfessor || !professorId) return;

    setCallingNext(true);
    try {
      await queueService.callNextStudent(professorId);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to call next student');
    } finally {
      setCallingNext(false);
    }
  };

  const handleLeaveQueue = async (queueId: string) => {
    if (isProfessor) return;

    try {
      await queueService.leaveQueue(queueId);
      setQueue((prev) => prev.filter((entry) => entry.id !== queueId));
    } catch (err) {
      setError('Failed to leave queue');
    }
  };

  if (loading) {
    return <div className="queue-list-container"><p>Loading queue...</p></div>;
  }

  const waitingCount = queue.filter((e) => e.status === 'waiting').length;

  if (isStudentView) {
    const activeQueue = queue.filter((e) => e.status === 'waiting' || e.status === 'promoted');
    return (
      <div className="queue-list-container">
        {error && <div className="error-message">{error}</div>}
        
        {activeQueue.length === 0 ? (
          <p className="empty-queue">Not in any professor queues</p>
        ) : (
          <div className="queue-items">
            {activeQueue.map((entry) => (
              <div key={entry.id} className={`queue-item ${entry.status}`}>
                <div className="queue-position">
                  {entry.professors?.full_name}
                </div>
                <div className="queue-info">
                  <p className="name">Position: {entry.position !== null && entry.position !== undefined ? entry.position : '—'}</p>
                  <p className="time">
                    Joined: {new Date(entry.created_at).toLocaleTimeString()}
                  </p>
                  <p className={`status-badge ${entry.status}`}>
                    {entry.status}
                  </p>
                </div>
                {(entry.status === 'waiting' || entry.status === 'expired' || entry.status === 'promoted') && (
                  <button
                    className="leave-btn"
                    onClick={() => handleLeaveQueue(entry.id)}
                  >
                    Leave
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="queue-list-container">
      <div className="queue-header">
        <h3>Queue {waitingCount > 0 && `(${waitingCount})`}</h3>
        {isProfessor && waitingCount > 0 && (
          <button
            className="call-next-btn"
            onClick={handleCallNext}
            disabled={callingNext}
          >
            {callingNext ? 'Calling...' : 'Call Next'}
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {queue.length === 0 ? (
        <p className="empty-queue">No one waiting</p>
      ) : (
        <div className="queue-items">
          {queue.map((entry, index) => (
            <div key={entry.id} className={`queue-item ${entry.status}`}>
              <div className="queue-position">#{index + 1}</div>
              <div className="queue-info">
                <p className="name">
                  {(entry.students as any)?.full_name || entry.student_name || `Student ${entry.student_id?.substring(0, 8) || ''}`}
                </p>
                <p className="time">
                  Joined: {new Date(entry.created_at).toLocaleTimeString()}
                </p>
              </div>
              {entry.status === 'promoted' && (
                <span className="called-badge">Promoted</span>
              )}
              {entry.status === 'cancelled' && (
                <span className="completed-badge">Cancelled</span>
              )}
              {!isProfessor && entry.status === 'waiting' && (
                <button
                  className="leave-btn"
                  onClick={() => handleLeaveQueue(entry.id)}
                >
                  Leave
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QueueList;
