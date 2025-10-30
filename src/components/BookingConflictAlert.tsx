import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, XCircle, Calendar, User } from 'lucide-react';
import { BookingConflict } from '@/hooks/useBookingConflicts';
import { Badge } from '@/components/ui/badge';

interface BookingConflictAlertProps {
  conflict: BookingConflict;
  onViewBooking?: (bookingId: string) => void;
  onChangeDates?: () => void;
  onProceedAnyway?: () => void;
  onCancel?: () => void;
}

export function BookingConflictAlert({
  conflict,
  onViewBooking,
  onChangeDates,
  onProceedAnyway,
  onCancel,
}: BookingConflictAlertProps) {
  // Don't render if no conflict
  if (conflict.type === 'none') {
    return null;
  }

  const isHardConflict = conflict.type === 'hard';
  const conflictBooking = conflict.conflicts[0];

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'checked_in':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'blocked':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'inquiry':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Alert
      variant={isHardConflict ? 'destructive' : 'default'}
      className={
        isHardConflict
          ? 'border-red-300 bg-red-50'
          : 'border-yellow-300 bg-yellow-50'
      }
    >
      <div className="flex items-start gap-3">
        {isHardConflict ? (
          <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
        )}

        <div className="flex-1">
          <AlertTitle className="text-base font-semibold mb-2">
            {isHardConflict ? '❌ Property Unavailable' : '⚠️ Potential Booking Conflict'}
          </AlertTitle>

          <AlertDescription className="space-y-3">
            {/* Conflict message */}
            <p className={isHardConflict ? 'text-red-800' : 'text-yellow-800'}>
              {conflict.message}
            </p>

            {/* Existing booking details */}
            {conflictBooking && (
              <div className="bg-white rounded-md p-3 border border-gray-200">
                <div className="space-y-2 text-sm">
                  {/* Guest name */}
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-900">
                      {conflictBooking.guest_name || 'Guest Name Unknown'}
                    </span>
                    <Badge
                      className={`text-xs ${getStatusColor(
                        conflictBooking.booking_status || 'unknown'
                      )}`}
                    >
                      {(conflictBooking.booking_status || 'unknown').replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(conflictBooking.check_in_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                      {' → '}
                      {new Date(conflictBooking.check_out_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  {/* Created date */}
                  {conflictBooking.created_at && (
                    <div className="text-xs text-gray-500">
                      Created: {new Date(conflictBooking.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric'
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Multiple conflicts notice */}
            {conflict.conflicts.length > 1 && (
              <p className="text-sm text-gray-600">
                + {conflict.conflicts.length - 1} more conflicting booking
                {conflict.conflicts.length - 1 > 1 ? 's' : ''}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              {isHardConflict ? (
                <>
                  {/* Hard conflict: Cannot proceed */}
                  {onChangeDates && (
                    <Button
                      onClick={onChangeDates}
                      variant="default"
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Change Dates
                    </Button>
                  )}
                  {onViewBooking && conflictBooking && (
                    <Button
                      onClick={() => onViewBooking(conflictBooking.booking_id!)}
                      variant="outline"
                      size="sm"
                    >
                      View Existing Booking
                    </Button>
                  )}
                  {onCancel && (
                    <Button onClick={onCancel} variant="ghost" size="sm">
                      Cancel
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {/* Soft conflict: Can proceed with warning */}
                  {onProceedAnyway && (
                    <Button
                      onClick={onProceedAnyway}
                      variant="default"
                      size="sm"
                      className="bg-yellow-600 hover:bg-yellow-700"
                    >
                      Proceed Anyway
                    </Button>
                  )}
                  {onChangeDates && (
                    <Button onClick={onChangeDates} variant="outline" size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      Change Dates
                    </Button>
                  )}
                  {onViewBooking && conflictBooking && (
                    <Button
                      onClick={() => onViewBooking(conflictBooking.booking_id!)}
                      variant="ghost"
                      size="sm"
                    >
                      View Booking
                    </Button>
                  )}
                  {onCancel && (
                    <Button onClick={onCancel} variant="ghost" size="sm">
                      Cancel
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Warning message for soft conflicts */}
            {!isHardConflict && (
              <p className="text-xs text-yellow-700 mt-2">
                ⓘ You can proceed with this booking, but be aware of the potential conflict.
                Consider contacting the other guest or confirming property availability.
              </p>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
