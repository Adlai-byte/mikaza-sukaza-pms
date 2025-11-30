import { supabase } from '@/integrations/supabase/client';
import { Booking } from '@/lib/schemas';
import { format } from 'date-fns';

interface NotificationRecipient {
  userId: string;
  role?: string;
}

/**
 * Create a notification for when a booking is created
 */
export async function notifyBookingCreated(
  booking: Booking,
  propertyName: string,
  createdBy?: string
): Promise<void> {
  try {
    // Get property owner to notify
    const { data: property } = await supabase
      .from('properties')
      .select('owner_id')
      .eq('property_id', booking.property_id)
      .single();

    if (!property) return;

    const notification = {
      user_id: property.owner_id,
      type: 'booking_created' as const,
      title: 'New Booking Created',
      message: `A new booking has been created for ${propertyName} by ${booking.guest_name} from ${format(new Date(booking.check_in_date), 'MMM dd')} to ${format(new Date(booking.check_out_date), 'MMM dd, yyyy')}.`,
      link: `/bookings`,
      booking_id: booking.booking_id,
      action_by: createdBy || null,
      metadata: {
        property_name: propertyName,
        guest_name: booking.guest_name,
        check_in: booking.check_in_date,
        check_out: booking.check_out_date,
      },
    };

    await supabase.from('notifications').insert([notification]);
  } catch (error) {
    console.error('Failed to create booking notification:', error);
  }
}

/**
 * Create a notification for when a booking is confirmed
 */
export async function notifyBookingConfirmed(
  booking: Booking,
  propertyName: string,
  confirmedBy?: string
): Promise<void> {
  try {
    // Get property owner to notify
    const { data: property } = await supabase
      .from('properties')
      .select('owner_id')
      .eq('property_id', booking.property_id)
      .single();

    if (!property) return;

    const notification = {
      user_id: property.owner_id,
      type: 'booking_confirmed' as const,
      title: 'Booking Confirmed',
      message: `Booking for ${propertyName} by ${booking.guest_name} has been confirmed. Check-in: ${format(new Date(booking.check_in_date), 'MMM dd, yyyy')}.`,
      link: `/bookings`,
      booking_id: booking.booking_id,
      action_by: confirmedBy || null,
      metadata: {
        property_name: propertyName,
        guest_name: booking.guest_name,
        check_in: booking.check_in_date,
        total_amount: booking.total_amount,
      },
    };

    await supabase.from('notifications').insert([notification]);
  } catch (error) {
    console.error('Failed to create booking confirmation notification:', error);
  }
}

/**
 * Create a notification for when a booking is cancelled
 */
export async function notifyBookingCancelled(
  booking: Booking,
  propertyName: string,
  cancelledBy?: string,
  reason?: string
): Promise<void> {
  try {
    // Get property owner to notify
    const { data: property } = await supabase
      .from('properties')
      .select('owner_id')
      .eq('property_id', booking.property_id)
      .single();

    if (!property) return;

    const notification = {
      user_id: property.owner_id,
      type: 'booking_cancelled' as const,
      title: 'Booking Cancelled',
      message: `Booking for ${propertyName} by ${booking.guest_name} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
      link: `/bookings`,
      booking_id: booking.booking_id,
      action_by: cancelledBy || null,
      metadata: {
        property_name: propertyName,
        guest_name: booking.guest_name,
        check_in: booking.check_in_date,
        check_out: booking.check_out_date,
        cancellation_reason: reason,
      },
    };

    await supabase.from('notifications').insert([notification]);
  } catch (error) {
    console.error('Failed to create booking cancellation notification:', error);
  }
}

/**
 * Create a notification for when booking status changes
 */
export async function notifyBookingStatusChanged(
  booking: Booking,
  propertyName: string,
  oldStatus: string,
  newStatus: string,
  updatedBy?: string
): Promise<void> {
  try {
    // Get property owner to notify
    const { data: property } = await supabase
      .from('properties')
      .select('owner_id')
      .eq('property_id', booking.property_id)
      .single();

    if (!property) return;

    const notification = {
      user_id: property.owner_id,
      type: 'booking_status_changed' as const,
      title: 'Booking Status Updated',
      message: `Booking for ${propertyName} by ${booking.guest_name} status changed from ${oldStatus} to ${newStatus}.`,
      link: `/bookings`,
      booking_id: booking.booking_id,
      action_by: updatedBy || null,
      metadata: {
        property_name: propertyName,
        guest_name: booking.guest_name,
        old_status: oldStatus,
        new_status: newStatus,
      },
    };

    await supabase.from('notifications').insert([notification]);
  } catch (error) {
    console.error('Failed to create booking status change notification:', error);
  }
}

/**
 * Create check-in reminder notifications
 * Should be called by a scheduled job (e.g., for bookings with check-in tomorrow)
 */
export async function notifyCheckInReminder(
  booking: Booking,
  propertyName: string
): Promise<void> {
  try {
    // Get property owner and any assigned ops users
    const { data: property } = await supabase
      .from('properties')
      .select('owner_id')
      .eq('property_id', booking.property_id)
      .single();

    if (!property) return;

    const notification = {
      user_id: property.owner_id,
      type: 'booking_check_in_reminder' as const,
      title: 'Check-In Reminder',
      message: `Reminder: ${booking.guest_name} is checking in to ${propertyName} tomorrow (${format(new Date(booking.check_in_date), 'MMM dd, yyyy')}).`,
      link: `/bookings`,
      booking_id: booking.booking_id,
      metadata: {
        property_name: propertyName,
        guest_name: booking.guest_name,
        check_in: booking.check_in_date,
        guest_email: booking.guest_email,
        guest_phone: booking.guest_phone,
      },
    };

    await supabase.from('notifications').insert([notification]);
  } catch (error) {
    console.error('Failed to create check-in reminder notification:', error);
  }
}

/**
 * Create check-out reminder notifications
 * Should be called by a scheduled job (e.g., for bookings with check-out tomorrow)
 */
export async function notifyCheckOutReminder(
  booking: Booking,
  propertyName: string
): Promise<void> {
  try {
    // Get property owner and any assigned ops users
    const { data: property } = await supabase
      .from('properties')
      .select('owner_id')
      .eq('property_id', booking.property_id)
      .single();

    if (!property) return;

    const notification = {
      user_id: property.owner_id,
      type: 'booking_check_out_reminder' as const,
      title: 'Check-Out Reminder',
      message: `Reminder: ${booking.guest_name} is checking out from ${propertyName} tomorrow (${format(new Date(booking.check_out_date), 'MMM dd, yyyy')}).`,
      link: `/bookings`,
      booking_id: booking.booking_id,
      metadata: {
        property_name: propertyName,
        guest_name: booking.guest_name,
        check_out: booking.check_out_date,
      },
    };

    await supabase.from('notifications').insert([notification]);
  } catch (error) {
    console.error('Failed to create check-out reminder notification:', error);
  }
}

/**
 * Create a notification for when payment is received
 */
export async function notifyPaymentReceived(
  booking: Booking,
  propertyName: string,
  amount: number,
  paymentMethod?: string
): Promise<void> {
  try {
    // Get property owner to notify
    const { data: property } = await supabase
      .from('properties')
      .select('owner_id')
      .eq('property_id', booking.property_id)
      .single();

    if (!property) return;

    const notification = {
      user_id: property.owner_id,
      type: 'booking_payment_received' as const,
      title: 'Payment Received',
      message: `Payment of $${amount.toFixed(2)} received for ${propertyName} booking by ${booking.guest_name}${paymentMethod ? ` via ${paymentMethod}` : ''}.`,
      link: `/bookings`,
      booking_id: booking.booking_id,
      metadata: {
        property_name: propertyName,
        guest_name: booking.guest_name,
        amount,
        payment_method: paymentMethod,
      },
    };

    await supabase.from('notifications').insert([notification]);
  } catch (error) {
    console.error('Failed to create payment received notification:', error);
  }
}

/**
 * Notify multiple users about a booking event
 */
export async function notifyMultipleUsers(
  userIds: string[],
  notification: {
    type: string;
    title: string;
    message: string;
    link?: string;
    booking_id?: string;
    action_by?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    const notifications = userIds.map(userId => ({
      user_id: userId,
      ...notification,
    }));

    await supabase.from('notifications').insert(notifications);
  } catch (error) {
    console.error('Failed to create notifications for multiple users:', error);
  }
}
