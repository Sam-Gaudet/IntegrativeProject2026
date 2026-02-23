export interface QueueItem {
  id: string;
  studentName: string;
  status: 'waiting' | 'in-progress' | 'done';
  bookedAt: string;
}
