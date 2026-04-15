export interface QueueItem {
  id: string;
  studentName: string;
  status: 'waiting' | 'in-progress' | 'done';
  bookedAt: string;
}

export interface QueueEntry {
  id: string;
  professor_id: string;
  student_id?: string;
  status: 'waiting' | 'promoted' | 'cancelled' | 'expired';
  promoted_at: string | null;
  created_at: string;
  position?: number;
  // Nested relations (present when fetched with select joins)
  students?: { full_name: string; email: string } | null;
  professors?: { full_name: string; department: string } | null;
  // Frontend-only alias sometimes used in display
  student_name?: string;
}
