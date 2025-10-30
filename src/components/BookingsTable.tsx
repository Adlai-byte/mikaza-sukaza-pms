import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  CheckCircle,
  XCircle,
  Key,
  LogOut,
  CheckCheck,
  Clock,
  FileText,
  Eye,
} from 'lucide-react';
import { Booking } from '@/lib/schemas';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useBookings } from '@/hooks/useBookings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { InvoiceGenerationDialog } from '@/components/InvoiceGenerationDialog';

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
  const navigate = useNavigate();
  const { deleteBooking, isDeleting, updateBooking, isUpdating } = useBookings();
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
  const [bookingToCheckout, setBookingToCheckout] = useState<Booking | null>(null);
  const [invoiceDialogBooking, setInvoiceDialogBooking] = useState<Booking | null>(null);

  const getStatusBadge = (status?: string | null) => {
    const statusValue = status || 'pending';

    const statusConfig = {
      inquiry: { label: 'Inquiry', variant: 'secondary' as const, className: 'bg-purple-100 text-purple-800 hover:bg-purple-200', tooltip: 'Booking is in inquiry stage' },
      pending: { label: 'Pending', variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200', tooltip: 'Awaiting confirmation from guest or host' },
      confirmed: { label: 'Confirmed', variant: 'default' as const, className: 'bg-green-100 text-green-800 hover:bg-green-200', tooltip: 'Booking has been confirmed' },
      checked_in: { label: 'Checked In', variant: 'default' as const, className: 'bg-blue-100 text-blue-800 hover:bg-blue-200', tooltip: 'Guest has checked in to the property' },
      checked_out: { label: 'Checked Out', variant: 'outline' as const, className: 'bg-gray-100 text-gray-800 hover:bg-gray-200', tooltip: 'Guest has checked out from the property' },
      completed: { label: 'Completed', variant: 'outline' as const, className: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200', tooltip: 'Booking has been completed' },
      blocked: { label: 'Blocked', variant: 'secondary' as const, className: 'bg-gray-400 text-white hover:bg-gray-500', tooltip: 'Property is blocked for these dates' },
      cancelled: { label: 'Cancelled', variant: 'destructive' as const, className: 'bg-red-100 text-red-800 hover:bg-red-200', tooltip: 'Booking has been cancelled' },
    };

    const config = statusConfig[statusValue as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant} className={config.className}>
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  const getInvoiceStatusBadge = (booking: Booking) => {
    const invoiceStatus = (booking as any).invoice_status;

    if (!invoiceStatus || invoiceStatus === 'not_generated') {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1">
              <FileText className="h-3 w-3" />
              No Invoice
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Invoice has not been generated for this booking</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode; tooltip: string }> = {
      draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700', icon: <FileText className="h-3 w-3" />, tooltip: 'Invoice is in draft status' },
      sent: { label: 'Sent', className: 'bg-blue-100 text-blue-700', icon: <FileText className="h-3 w-3" />, tooltip: 'Invoice has been sent to the guest' },
      paid: { label: 'Paid', className: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-3 w-3" />, tooltip: 'Invoice has been paid' },
      overdue: { label: 'Overdue', className: 'bg-red-100 text-red-700', icon: <AlertCircle className="h-3 w-3" />, tooltip: 'Invoice payment is overdue' },
      cancelled: { label: 'Cancelled', className: 'bg-gray-200 text-gray-600', icon: <XCircle className="h-3 w-3" />, tooltip: 'Invoice has been cancelled' },
    };

    const config = statusConfig[invoiceStatus] || statusConfig.draft;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`gap-1 ${config.className}`}>
            {config.icon}
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
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

  const handleCheckoutConfirm = () => {
    if (bookingToCheckout?.booking_id) {
      updateBooking(bookingToCheckout.booking_id, { booking_status: 'checked_out' as any });
      setBookingToCheckout(null);
    }
  };

  const handleStatusChange = (bookingId: string, newStatus: string, booking?: Booking) => {
    // Show confirmation dialog for checkout
    if (newStatus === 'checked_out') {
      const bookingToUpdate = booking || bookings.find(b => b.booking_id === bookingId);
      if (bookingToUpdate) {
        setBookingToCheckout(bookingToUpdate);
        return;
      }
    }

    updateBooking(bookingId, { booking_status: newStatus as any });
  };

  const getQuickActions = (booking: Booking) => {
    const status = booking.booking_status || 'pending';
    const actions = [];

    // Based on current status, show relevant quick actions
    switch (status) {
      case 'inquiry':
        actions.push(
          <Button
            key="confirm"
            size="sm"
            variant="outline"
            className="h-7 gap-1 bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
            onClick={() => handleStatusChange(booking.booking_id!, 'confirmed')}
            disabled={isUpdating}
          >
            <CheckCircle className="h-3 w-3" />
            Confirm
          </Button>
        );
        break;

      case 'pending':
        actions.push(
          <Button
            key="confirm"
            size="sm"
            variant="outline"
            className="h-7 gap-1 bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
            onClick={() => handleStatusChange(booking.booking_id!, 'confirmed')}
            disabled={isUpdating}
          >
            <CheckCircle className="h-3 w-3" />
            Confirm
          </Button>
        );
        break;

      case 'confirmed':
        actions.push(
          <Button
            key="checkin"
            size="sm"
            variant="outline"
            className="h-7 gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
            onClick={() => handleStatusChange(booking.booking_id!, 'checked_in')}
            disabled={isUpdating}
          >
            <Key className="h-3 w-3" />
            Check In
          </Button>
        );
        break;

      case 'checked_in':
        actions.push(
          <Button
            key="checkout"
            size="sm"
            variant="outline"
            className="h-7 gap-1 bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
            onClick={() => handleStatusChange(booking.booking_id!, 'checked_out', booking)}
            disabled={isUpdating}
          >
            <LogOut className="h-3 w-3" />
            Check Out
          </Button>
        );
        break;

      case 'checked_out':
        actions.push(
          <Button
            key="complete"
            size="sm"
            variant="outline"
            className="h-7 gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200"
            onClick={() => handleStatusChange(booking.booking_id!, 'completed')}
            disabled={isUpdating}
          >
            <CheckCheck className="h-3 w-3" />
            Complete
          </Button>
        );
        break;

      case 'completed':
      case 'cancelled':
      case 'blocked':
        // No quick actions for terminal states
        break;

      default:
        break;
    }

    return actions;
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
    <TooltipProvider delayDuration={200}>
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
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-md border">
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
                  <TableHead>Invoice</TableHead>
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
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          {getStatusBadge(booking.booking_status)}
                          <div className="flex gap-1">
                            {getQuickActions(booking)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getInvoiceStatusBadge(booking)}
                      </TableCell>
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
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs text-muted-foreground">
                              Change Status
                            </DropdownMenuLabel>
                            {booking.booking_status !== 'inquiry' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(booking.booking_id!, 'inquiry')}>
                                <Clock className="mr-2 h-4 w-4" />
                                Mark as Inquiry
                              </DropdownMenuItem>
                            )}
                            {booking.booking_status !== 'pending' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(booking.booking_id!, 'pending')}>
                                <Clock className="mr-2 h-4 w-4" />
                                Mark as Pending
                              </DropdownMenuItem>
                            )}
                            {booking.booking_status !== 'confirmed' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(booking.booking_id!, 'confirmed')}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark as Confirmed
                              </DropdownMenuItem>
                            )}
                            {booking.booking_status !== 'checked_in' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(booking.booking_id!, 'checked_in')}>
                                <Key className="mr-2 h-4 w-4" />
                                Mark as Checked In
                              </DropdownMenuItem>
                            )}
                            {booking.booking_status !== 'checked_out' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(booking.booking_id!, 'checked_out', booking)}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Mark as Checked Out
                              </DropdownMenuItem>
                            )}
                            {booking.booking_status !== 'completed' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(booking.booking_id!, 'completed')}>
                                <CheckCheck className="mr-2 h-4 w-4" />
                                Mark as Completed
                              </DropdownMenuItem>
                            )}
                            {booking.booking_status !== 'blocked' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(booking.booking_id!, 'blocked')}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Mark as Blocked
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Billing</DropdownMenuLabel>
                            {!(booking as any).invoice_id ? (
                              <DropdownMenuItem onClick={() => setInvoiceDialogBooking(booking)}>
                                <FileText className="mr-2 h-4 w-4" />
                                Generate Invoice
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => navigate(`/invoices/${(booking as any).invoice_id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Invoice
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
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

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {bookings.map((booking) => {
              const nights = calculateNights(booking.check_in_date, booking.check_out_date);
              const additionalOptions = parseAdditionalOptions(booking.special_requests);

              return (
                <Card key={booking.booking_id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4 space-y-3">
                    {/* Guest Info */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-base flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {booking.guest_name}
                        </div>
                        {booking.guest_email && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            {booking.guest_email}
                          </div>
                        )}
                        {booking.guest_phone && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            {booking.guest_phone}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(booking.booking_status)}
                      </div>
                    </div>

                    {/* Check-in / Check-out Dates */}
                    <div className="grid grid-cols-2 gap-3 py-2 border-t border-b">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Check-in</div>
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{formatDate(booking.check_in_date)}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Check-out</div>
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{formatDate(booking.check_out_date)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Nights & Guests */}
                    <div className="flex gap-3">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {nights} {nights === 1 ? 'night' : 'nights'}
                      </Badge>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.number_of_guests || 0} guest{(booking.number_of_guests || 0) !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {/* Additional Options */}
                    {additionalOptions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
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

                    {/* Amount */}
                    <div className="flex items-center justify-between py-2 border-t">
                      <div>
                        <div className="font-semibold text-lg flex items-center gap-1">
                          <DollarSign className="h-5 w-5 text-green-600" />
                          {formatCurrency(booking.total_amount)}
                        </div>
                        {booking.deposit_amount && booking.deposit_amount > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Deposit: {formatCurrency(booking.deposit_amount)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Invoice Status */}
                    <div className="flex items-center gap-2 py-2 border-t">
                      <span className="text-sm text-muted-foreground">Invoice:</span>
                      {getInvoiceStatusBadge(booking)}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {getQuickActions(booking)}
                    </div>

                    {/* Actions Menu */}
                    <div className="flex gap-2 border-t pt-3">
                      {onEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => onEdit(booking)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="flex-1">
                            <MoreHorizontal className="h-4 w-4 mr-2" />
                            More
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {booking.booking_status !== 'inquiry' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(booking.booking_id!, 'inquiry')}>
                              <Clock className="mr-2 h-4 w-4" />
                              Mark as Inquiry
                            </DropdownMenuItem>
                          )}
                          {booking.booking_status !== 'pending' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(booking.booking_id!, 'pending')}>
                              <Clock className="mr-2 h-4 w-4" />
                              Mark as Pending
                            </DropdownMenuItem>
                          )}
                          {booking.booking_status !== 'confirmed' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(booking.booking_id!, 'confirmed')}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark as Confirmed
                            </DropdownMenuItem>
                          )}
                          {booking.booking_status !== 'checked_in' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(booking.booking_id!, 'checked_in')}>
                              <Key className="mr-2 h-4 w-4" />
                              Mark as Checked In
                            </DropdownMenuItem>
                          )}
                          {booking.booking_status !== 'checked_out' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(booking.booking_id!, 'checked_out', booking)}>
                              <LogOut className="mr-2 h-4 w-4" />
                              Mark as Checked Out
                            </DropdownMenuItem>
                          )}
                          {booking.booking_status !== 'completed' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(booking.booking_id!, 'completed')}>
                              <CheckCheck className="mr-2 h-4 w-4" />
                              Mark as Completed
                            </DropdownMenuItem>
                          )}
                          {booking.booking_status !== 'blocked' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(booking.booking_id!, 'blocked')}>
                              <XCircle className="mr-2 h-4 w-4" />
                              Mark as Blocked
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Billing</DropdownMenuLabel>
                          {!(booking as any).invoice_id ? (
                            <DropdownMenuItem onClick={() => setInvoiceDialogBooking(booking)}>
                              <FileText className="mr-2 h-4 w-4" />
                              Generate Invoice
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => navigate(`/invoices/${(booking as any).invoice_id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Invoice
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
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
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Generation Dialog */}
      <InvoiceGenerationDialog
        open={!!invoiceDialogBooking}
        onOpenChange={(open) => !open && setInvoiceDialogBooking(null)}
        booking={invoiceDialogBooking}
      />

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

      {/* Checkout Confirmation Dialog */}
      <AlertDialog open={!!bookingToCheckout} onOpenChange={() => setBookingToCheckout(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-purple-600" />
              Confirm Guest Check-Out
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to check out <strong>{bookingToCheckout?.guest_name}</strong>?
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  <span>Check-out date: {bookingToCheckout && formatDate(bookingToCheckout.check_out_date)}</span>
                </div>
                {bookingToCheckout?.total_amount && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Total amount: {formatCurrency(bookingToCheckout.total_amount)}</span>
                  </div>
                )}
              </div>
              <p className="mt-3 text-muted-foreground">
                This will move the booking to your history and mark it as checked out.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCheckoutConfirm}
              disabled={isUpdating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isUpdating ? 'Checking Out...' : 'Confirm Check-Out'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
    </TooltipProvider>
  );
}
