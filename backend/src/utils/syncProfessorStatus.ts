import { supabaseAdmin } from '../config/supabase';

// Sets professor to 'busy' if any active or pending bookings exist on their slots,
// or if any student is in a promoted queue position waiting to accept.
// Resets to 'available' only when the queue and bookings are both fully clear.
export async function syncProfessorStatus(professorId: string): Promise<void> {
  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('id, availability_slots!inner(professor_id)')
    .eq('availability_slots.professor_id', professorId)
    .in('status', ['active', 'pending'])
    .limit(1);

  const hasBooking = (bookings?.length ?? 0) > 0;

  if (!hasBooking) {
    // Also check for promoted queue entries (student has been called but hasn't accepted yet)
    const { data: promoted } = await supabaseAdmin
      .from('queue_entries')
      .select('id')
      .eq('professor_id', professorId)
      .eq('status', 'promoted')
      .limit(1);

    const hasPromoted = (promoted?.length ?? 0) > 0;

    await supabaseAdmin
      .from('professors')
      .update({ availability_status: hasPromoted ? 'busy' : 'available' })
      .eq('id', professorId);
  } else {
    await supabaseAdmin
      .from('professors')
      .update({ availability_status: 'busy' })
      .eq('id', professorId);
  }
}
