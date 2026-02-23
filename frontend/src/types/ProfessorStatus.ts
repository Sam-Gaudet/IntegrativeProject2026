export type AvailabilityStatus = 'available' | 'busy' | 'away';

export interface Professor {
  id: string;
  full_name: string;
  department: string;
  availability_status: AvailabilityStatus;
}
