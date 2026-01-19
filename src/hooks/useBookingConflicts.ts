import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Booking } from '@/lib/schemas';

export type ConflictType = 'hard' | 'soft' | 'none';

export interface BookingConflict {
  type: ConflictType;
  conflicts: Booking[];
  message: string;
  canProceed: boolean;
  unitContext?: {
    isUnitBooking: boolean;
    unitName?: string;
    conflictingUnitNames?: string[];
  };
}

/**
 * Hook to check for booking conflicts on a property
 * Hard conflicts: confirmed, checked_in, blocked
 * Soft conflicts: pending, inquiry
 *
 * Unit-aware conflict logic:
 * - Entire Property booking (unitId = null): conflicts with ALL bookings for property
 * - Unit-specific booking (unitId = X): conflicts with same unit OR entire property bookings
 */
export function useBookingConflicts(
  propertyId: string | undefined,
  checkInDate: string | undefined,
  checkOutDate: string | undefined,
  unitId?: string | null,
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
  }, [propertyId, checkInDate, checkOutDate, unitId, excludeBookingId]);

  const checkConflicts = async () => {
    if (!propertyId || !checkInDate || !checkOutDate) return;

    setIsChecking(true);

    try {
      // Query for overlapping bookings with unit data
      let query = supabase
        .from('property_bookings')
        .select(`
          *,
          unit:units!property_bookings_unit_id_fkey(
            unit_id,
            property_name
          )
        `)
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

      const { data: allOverlappingBookings, error } = await query;

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

      if (!allOverlappingBookings || allOverlappingBookings.length === 0) {
        setConflictStatus({
          type: 'none',
          conflicts: [],
          message: '',
          canProceed: true,
        });
        return;
      }

      // Apply unit-aware filtering
      // If unitId is null/undefined: booking entire property - conflicts with ALL bookings
      // If unitId is set: booking specific unit - conflicts with same unit OR entire property bookings
      const isEntirePropertyBooking = unitId === null || unitId === undefined;

      const relevantConflicts = allOverlappingBookings.filter((booking: any) => {
        if (isEntirePropertyBooking) {
          // Entire property booking conflicts with ANY booking for this property
          return true;
        }
        // Unit-specific booking conflicts with:
        // 1. Same unit bookings (booking.unit_id === unitId)
        // 2. Entire property bookings (booking.unit_id === null)
        return booking.unit_id === unitId || booking.unit_id === null;
      });

      if (relevantConflicts.length === 0) {
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

      const hardConflicts = relevantConflicts.filter(
        (b: Booking) => hardConflictStatuses.includes(b.booking_status || '')
      );
      const softConflicts = relevantConflicts.filter(
        (b: Booking) => softConflictStatuses.includes(b.booking_status || '')
      );

      // Build unit context for messaging
      const conflictingUnitNames = relevantConflicts
        .map((b: any) => b.unit?.property_name || (b.unit_id === null ? 'Entire Property' : 'Unknown Unit'))
        .filter((name: string, index: number, self: string[]) => self.indexOf(name) === index);

      // Hard conflicts take priority
      if (hardConflicts.length > 0) {
        const conflict = hardConflicts[0] as any;
        const statusLabel = conflict.booking_status === 'blocked' ? 'blocked for maintenance' : conflict.booking_status;
        const conflictLocation = conflict.unit_id === null
          ? 'entire property'
          : conflict.unit?.property_name || 'this unit';

        setConflictStatus({
          type: 'hard',
          conflicts: hardConflicts,
          message: `The ${conflictLocation} is ${statusLabel} from ${formatDate(conflict.check_in_date)} to ${formatDate(conflict.check_out_date)}`,
          canProceed: false,
          unitContext: {
            isUnitBooking: !isEntirePropertyBooking,
            unitName: isEntirePropertyBooking ? undefined : (relevantConflicts[0] as any)?.unit?.property_name,
            conflictingUnitNames,
          },
        });
      } else if (softConflicts.length > 0) {
        const conflict = softConflicts[0] as any;
        const conflictLocation = conflict.unit_id === null
          ? 'entire property'
          : conflict.unit?.property_name || 'this unit';

        setConflictStatus({
          type: 'soft',
          conflicts: softConflicts,
          message: `The ${conflictLocation} has a ${conflict.booking_status} booking from ${formatDate(conflict.check_in_date)} to ${formatDate(conflict.check_out_date)}`,
          canProceed: true,
          unitContext: {
            isUnitBooking: !isEntirePropertyBooking,
            unitName: isEntirePropertyBooking ? undefined : (relevantConflicts[0] as any)?.unit?.property_name,
            conflictingUnitNames,
          },
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
