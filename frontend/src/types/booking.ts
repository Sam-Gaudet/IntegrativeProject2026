export interface Booking {
  id: string;
  studentId: string;
  professorId: string;
  status: 'pending' | 'confirmed' | 'completed';
  createdAt: string;
}
