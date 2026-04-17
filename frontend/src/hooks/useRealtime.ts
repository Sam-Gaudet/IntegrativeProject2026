import { useState } from 'react';

// Realtime subscriptions disabled - Supabase local WebSocket server (localhost:54321) not running
// Components should use polling instead for real-time updates
// This prevents WebSocket connection errors from cluttering the console

export const useRealtimeProfessors = () => {
  const [professors, setProfessors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Realtime disabled - use polling in components instead

  return { professors, setProfessors, loading, setLoading };
};

export const useRealtimeQueue = (professorId: string) => {
  const [queueEntries, setQueueEntries] = useState<any[]>([]);

  // Realtime disabled - use polling in components instead

  return { queueEntries, setQueueEntries };
};

export const useRealtimeAvailability = (professorId?: string) => {
  const [slots, setSlots] = useState<any[]>([]);

  // Realtime disabled - use polling in components instead

  return { slots, setSlots };
};
