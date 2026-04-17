import React, { useState, useEffect, useRef } from 'react';
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
  promoted_at?: string | null;
  student_name?: string;
  students?: { full_name: string; email?: string } | null;
  professors?: { full_name: string; department?: string } | null;
}

interface Props {
  professorId: string;
  isProfessor?: boolean;
  isStudentView?: boolean;
  onAccepted?: () => void;
}

const QueueList: React.FC<Props> = ({ professorId, isProfessor = false, isStudentView = false, onAccepted }) => {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promotionToast, setPromotionToast] = useState(false);
  const prevQueueRef = useRef<QueueEntry[]>([]);
  const { queueEntries } = useRealtimeQueue(professorId);

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        if (isStudentView) {
          // Fetch all queue entries for the current student across all professors
          const token = sessionStorage.getItem('token');
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          const res = await api.get('/api/queue', { headers });
          const newQueue: QueueEntry[] = res.data.data || [];

          // Detect if any entry just transitioned from 'waiting' → 'promoted'
          const wasJustPromoted = newQueue.some(
            (e) => e.status === 'promoted' &&
              prevQueueRef.current.some((p) => p.id === e.id && p.status === 'waiting')
          );
          if (wasJustPromoted) {
            setPromotionToast(true);
            setTimeout(() => setPromotionToast(false), 7000);
          }

          prevQueueRef.current = newQueue;
          setQueue(newQueue);
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

  const [, setTick] = useState(0);

  // Tick every second to update the countdown display for promoted/waiting entries
  useEffect(() => {
    const hasPromoted = queue.some((e) => e.status === 'promoted');
    const hasWaiting = queue.some((e) => e.status === 'waiting');
    if (!hasPromoted && !hasWaiting) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [queue]);

  const handleLeaveQueue = async (queueId: string) => {
    if (isProfessor) return;
    try {
      await queueService.leaveQueue(queueId);
      setQueue((prev) => prev.filter((entry) => entry.id !== queueId));
    } catch (err) {
      setError('Failed to leave queue');
    }
  };

  const handleAcceptPromotion = async (queueId: string) => {
    try {
      await queueService.acceptPromotion(queueId);
      setQueue((prev) => prev.filter((entry) => entry.id !== queueId));
      // Immediately notify parent so bookings section refreshes without waiting for next poll
      onAccepted?.();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to accept promotion';
      setError(msg);
      setTimeout(() => setError(null), 5000);
    }
  };

  // Countdown from promoted_at with 2-minute window
  const getCountdown = (promotedAt: string | null | undefined): string => {
    if (!promotedAt) return '2:00';
    const elapsed = Date.now() - new Date(promotedAt).getTime();
    const remaining = Math.max(0, 2 * 60 * 1000 - elapsed);
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="queue-list-container"><p>Loading queue...</p></div>;
  }

  const waitingCount = queue.filter((e) => e.status === 'waiting').length;

  // Estimated wait: position × 10 min, counting down live from when the student joined.
  const estimateWait = (position: number, joinedAt: string): string => {
    const totalMs = position * 10 * 60 * 1000;
    const elapsed = Date.now() - new Date(joinedAt).getTime();
    const remaining = Math.max(0, totalMs - elapsed);
    if (remaining === 0) return 'Any moment now';
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    return `~${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isStudentView) {
    const activeQueue = queue.filter((e) => e.status === 'waiting' || e.status === 'promoted');
    return (
      <div className="queue-list-container">
        {promotionToast && (
          <div className="promotion-toast">
            🎉 You've been promoted! Accept within 2 minutes or you'll lose your spot.
          </div>
        )}
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
                  <p className="name">
                    {entry.status === 'promoted'
                      ? '🎉 You\'re next!'
                      : `Position: ${entry.position !== null && entry.position !== undefined ? `#${entry.position}` : '—'}`}
                  </p>
                  <p className="time">
                    Joined: {new Date(entry.created_at).toLocaleTimeString()}
                  </p>
                  {entry.status === 'waiting' && (
                    <p className="wait-estimate">
                      Est. wait: {estimateWait(
                        entry.position !== null && entry.position !== undefined ? entry.position : 1,
                        entry.created_at
                      )}
                    </p>
                  )}
                  {entry.status === 'promoted' && (
                    <p className="countdown-text">
                      Accept within: {getCountdown(entry.promoted_at)}
                    </p>
                  )}
                </div>
                {entry.status === 'promoted' ? (
                  <div className="promotion-actions">
                    <button
                      className="accept-btn"
                      onClick={() => handleAcceptPromotion(entry.id)}
                    >
                      Accept
                    </button>
                    <button
                      className="leave-btn"
                      onClick={() => handleLeaveQueue(entry.id)}
                    >
                      Decline
                    </button>
                  </div>
                ) : (
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
