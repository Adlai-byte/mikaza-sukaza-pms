import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Booking } from '@/lib/schemas';

export type ConflictType = 'hard' | 'soft' | 'none';

export interface BookingConflict {
  type: ConflictType;
  conflicts: Booking[];
  message: string;
  canProceed: boolean;
}

/**
 * Hook to check for booking conflicts on a property
 * Hard conflicts: confirmed, checked_in, blocked
 * Soft conflicts: pending, inquiry
 */
export function useBookingConflicts(
  propertyId: string | undefined,
  checkInDate: string | undefined,
  checkOutDate: string | undefined,
  excludeBookingId?: string
) {
  const [conflictStatus, setConflictStatus] = useState<BookingConflict>({
    type: 'none',
    conflicts: [],
    message: '',
    canProceed: true,
  });
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Reset if required params are missing
    if (!propertyId || !checkInDate || !checkOutDate) {
      setConflictStatus({
        type: 'none',
        conflicts: [],
        message: '',
        canProceed: true,
      });
      return;
    }

    // Validate dates
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (checkOut <= checkIn) {
      setConflictStatus({
        type: 'none',
        conflicts: [],
        message: '',
        canProceed: true,
      });
      return;
    }

    // Check for conflicts
    checkConflicts();
  }, [propertyId, checkInDate, checkOutDate, excludeBookingId]);

  const checkConflicts = async () => {
    if (!propertyId || !checkInDate || !checkOutDate) return;

    setIsChecking(true);

    try {
      // Query for overlapping bookings
      // A booking overlaps if:
      // 1. It starts before our checkout AND ends after our checkin
      // OR
      // 2. It starts between our checkin and checkout
      let query = supabase
        .from('property_bookings')
        .select('*')
        .eq('property_id', propertyId)
        .not('booking_status', 'in', '(completed,checked_out,cancelled)');

      // Exclude current booking when editing
      if (excludeBookingId) {
        query = query.neq('booking_id', excludeBookingId);
      }

      // Check for date overlaps
      // Booking overlaps if: existing.check_in < new.check_out AND existing.check_out > new.check_in
      query = query
        .lt('check_in_date', checkOutDate)
        .gt('check_out_date', checkInDate);

      const { data: conflicts, error } = await query;

      if (error) {
        console.error('Error checking booking conflicts:', error);
        setConflictStatus({
          type: 'none',
          conflicts: [],
          message: 'Unable to check for conflicts',
          canProceed: true,
        });
        return;
      }

      if (!conflicts || conflicts.length === 0) {
        setConflictStatus({
          type: 'none',
          conflicts: [],
          message: '',
          canProceed: true,
        });
        return;
      }

      // Categorize conflicts
      const hardConflictStatuses = ['confirmed', 'checked_in', 'blocked'];
      const softConflictStatuses = ['pending', 'inquiry'];

      const hardConflicts = conflicts.filter(
        (b: Booking) => hardConflictStatuses.includes(b.booking_status || '')
      );
      const softConflicts = conflicts.filter(
        (b: Booking) => softConflictStatuses.includes(b.booking_status || '')
      );

      // Hard conflicts take priority
      if (hardConflicts.length > 0) {
        const conflict = hardConflicts[0];
        const statusLabel = conflict.booking_status === 'blocked' ? 'blocked for maintenance' : conflict.booking_status;

        setConflictStatus({
          type: 'hard',
          conflicts: hardConflicts,
          message: `This property is ${statusLabel} from ${formatDate(conflict.check_in_date)} to ${formatDate(conflict.check_out_date)}`,
          canProceed: false,
        });
      } else if (softConflicts.length > 0) {
        const conflict = softConflicts[0];

        setConflictStatus({
          type: 'soft',
          conflicts: softConflicts,
          message: `This property has a ${conflict.booking_status} booking from ${formatDate(conflict.check_in_date)} to ${formatDate(conflict.check_out_date)}`,
          canProceed: true,
        });
      }
    } catch (error) {
      console.error('Error in conflict checking:', error);
      setConflictStatus({
        type: 'none',
        conflicts: [],
        message: '',
        canProceed: true,
      });
    } finally {
      setIsChecking(false);
    }
  };

  // Manual recheck function
  const recheckConflicts = () => {
    checkConflicts();
  };

  return {
    conflictStatus,
    isChecking,
    recheckConflicts,
  };
}

// Helper function to format dates
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
