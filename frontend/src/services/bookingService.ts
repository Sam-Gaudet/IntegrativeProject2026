import api from './api';

export interface Booking {
  id: string;
  student_id: string;
  slot_id: string;
  status: 'active' | 'completed' | 'cancelled' | 'pending';
  created_at: string;
}

export interface AvailabilitySlot {
  id: string;
  professor_id: string;
  start_time: string;
  end_time: string;
  status: 'available' | 'booked' | 'cancelled';
  created_at: string;
}

export interface QueueEntry {
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

const getAuthHeader = () => {
  const token = sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Booking Operations
export const bookingService = {
  async createBooking(slotId: string): Promise<Booking> {
    const res = await api.post('/api/bookings', { slot_id: slotId }, { headers: getAuthHeader() });
    return res.data.data;
  },

  async getStudentBookings(): Promise<Booking[]> {
    const res = await api.get('/api/bookings', { headers: getAuthHeader() });
    return res.data.data;
  },

  async cancelBooking(bookingId: string): Promise<void> {
    await api.delete(`/api/bookings/${bookingId}`, { headers: getAuthHeader() });
  },

  async completeBooking(bookingId: string): Promise<void> {
    await api.patch(`/api/bookings/${bookingId}/complete`, {}, { headers: getAuthHeader() });
  },

  async getProfessorBookings(): Promise<Booking[]> {
    const res = await api.get('/api/bookings', { headers: getAuthHeader() });
    return res.data.data;
  },
};

// Availability Slot Operations
export const availabilityService = {
  async getSlots(professorId?: string): Promise<AvailabilitySlot[]> {
    const params = professorId ? `?professor_id=${professorId}` : '';
    const res = await api.get(`/api/availability${params}`, { headers: getAuthHeader() });
    return res.data.data;
  },

  async createSlot(startTime: string, endTime: string): Promise<AvailabilitySlot> {
    const res = await api.post('/api/availability', {
      start_time: startTime,
      end_time: endTime,
    }, { headers: getAuthHeader() });
    return res.data.data;
  },

  async updateSlotStatus(slotId: string, status: string): Promise<AvailabilitySlot> {
    const res = await api.patch(`/api/availability/${slotId}`, { status }, { headers: getAuthHeader() });
    return res.data.data;
  },

  async cancelSlot(slotId: string): Promise<void> {
    await api.patch(`/api/availability/${slotId}`, { status: 'cancelled' }, { headers: getAuthHeader() });
  },

  async deleteSlot(slotId: string): Promise<void> {
    await api.delete(`/api/availability/${slotId}`, { headers: getAuthHeader() });
  },
};

// Queue Operations
export const queueService = {
  async joinQueue(professorId: string): Promise<QueueEntry> {
    const res = await api.post('/api/queue', { professor_id: professorId }, { headers: getAuthHeader() });
    return res.data.data;
  },

  async leaveQueue(queueId: string): Promise<void> {
    await api.delete(`/api/queue/${queueId}`, { headers: getAuthHeader() });
  },

  async acceptPromotion(queueId: string): Promise<void> {
    await api.patch(`/api/queue/${queueId}/accept`, {}, { headers: getAuthHeader() });
  },

  async getStudentQueueStatus(professorId: string): Promise<QueueEntry | null> {
    const res = await api.get(`/api/queue/me/${professorId}`, { headers: getAuthHeader() });
    return res.data.data || null;
  },

  async getProfessorQueue(professorId: string): Promise<QueueEntry[]> {
    const res = await api.get(`/api/queue/professor/${professorId}`, { headers: getAuthHeader() });
    return res.data.data;
  },

  async callNextStudent(professorId: string): Promise<QueueEntry | null> {
    const res = await api.post(`/api/queue/professor/${professorId}/next`, {}, { headers: getAuthHeader() });
    return res.data.data || null;
  },
};

// Professor Operations
export const professorService = {
  async updateStatus(status: 'available' | 'busy' | 'away'): Promise<{ id: string; availability_status: string }> {
    const res = await api.patch('/api/professors/status', { availability_status: status }, { headers: getAuthHeader() });
    return res.data.data;
  },
};
