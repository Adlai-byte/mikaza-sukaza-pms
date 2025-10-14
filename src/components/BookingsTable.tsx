import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CalendarDays,
  MoreHorizontal,
  Edit,
  Trash2,
  User,
  Mail,
  Phone,
  DollarSign,
  Users,
  AlertCircle,
  Plus,
  Sparkles,
} from 'lucide-react';
import { Booking } from '@/lib/schemas';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useBookings } from '@/hooks/useBookings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface BookingsTableProps {
  bookings: Booking[];
  onEdit?: (booking: Booking) => void;
  showPropertyColumn?: boolean;
  emptyMessage?: string;
}

export function BookingsTable({
  bookings,
  onEdit,
  showPropertyColumn = false,
  emptyMessage = 'No bookings found',
}: BookingsTableProps) {
  const { deleteBooking, isDeleting } = useBookings();
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);

  const getStatusBadge = (status?: string | null) => {
    const statusValue = status || 'pending';

    const statusConfig = {
      pending: { label: 'Pending', variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' },
      confirmed: { label: 'Confirmed', variant: 'default' as const, className: 'bg-green-100 text-green-800 hover:bg-green-200' },
      cancelled: { label: 'Cancelled', variant: 'destructive' as const, className: 'bg-red-100 text-red-800 hover:bg-red-200' },
      completed: { label: 'Completed', variant: 'outline' as const, className: 'bg-blue-100 text-blue-800 hover:bg-blue-200' },
    };

    const config = statusConfig[statusValue as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    try {
      const nights = differenceInDays(parseISO(checkOut), parseISO(checkIn));
      return nights > 0 ? nights : 0;
    } catch {
      return 0;
    }
  };

  const handleDeleteConfirm = () => {
    if (bookingToDelete?.booking_id) {
      deleteBooking(bookingToDelete.booking_id);
      setBookingToDelete(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount?: number | null) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const parseAdditionalOptions = (specialRequests?: string | null): string[] => {
    if (!specialRequests) return [];
    try {
      const parsed = JSON.parse(specialRequests);
      if (parsed.options && Array.isArray(parsed.options)) {
        return parsed.options;
      }
    } catch {
      // Not JSON, return empty array
    }
    return [];
  };

  const getOptionLabel = (optionId: string): string => {
    const labels: Record<string, string> = {
      extra_cleaning: 'Extra Cleaning',
      airport_pickup: 'Airport Pickup',
      late_checkin: 'Late Check-in',
      early_checkout: 'Early Check-out',
      pet_fee: 'Pet Friendly',
      parking: 'Parking',
      breakfast: 'Breakfast',
      extra_keys: 'Extra Keys',
    };
    return labels[optionId] || optionId;
  };

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Bookings Yet</h3>
            <p className="text-muted-foreground">{emptyMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Bookings List
          </CardTitle>
          <CardDescription>
            {bookings.length} booking{bookings.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead className="text-center">Nights</TableHead>
                  <TableHead className="text-center">Guests</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => {
                  const nights = calculateNights(booking.check_in_date, booking.check_out_date);
                  const additionalOptions = parseAdditionalOptions(booking.special_requests);

                  return (
                    <TableRow key={booking.booking_id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="font-medium flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {booking.guest_name}
                          </div>
                          {booking.guest_email && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <Mail className="h-3 w-3" />
                              {booking.guest_email}
                            </div>
                          )}
                          {booking.guest_phone && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {booking.guest_phone}
                            </div>
                          )}
                          {additionalOptions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {additionalOptions.map((optionId) => (
                                <Badge
                                  key={optionId}
                                  variant="outline"
                                  className="text-xs bg-purple-50 text-purple-700 border-purple-200"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  {getOptionLabel(optionId)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          {formatDate(booking.check_in_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          {formatDate(booking.check_out_date)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {nights} {nights === 1 ? 'night' : 'nights'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {booking.number_of_guests || 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <div className="font-semibold flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            {formatCurrency(booking.total_amount)}
                          </div>
                          {booking.deposit_amount && booking.deposit_amount > 0 && (
                            <div className="text-sm text-muted-foreground">
                              Deposit: {formatCurrency(booking.deposit_amount)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(booking.booking_status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {onEdit && (
                              <DropdownMenuItem onClick={() => onEdit(booking)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Booking
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setBookingToDelete(booking)}
                              disabled={booking.booking_status === 'cancelled'}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Cancel Booking
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!bookingToDelete} onOpenChange={() => setBookingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Cancel Booking?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the booking for{' '}
              <strong>{bookingToDelete?.guest_name}</strong>? This action will mark the booking as
              cancelled and free up the dates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Cancelling...' : 'Yes, Cancel Booking'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
