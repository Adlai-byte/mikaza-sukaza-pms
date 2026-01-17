import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  ArrowRight,
  FileText,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBookings } from '@/hooks/useBookings';
import { usePropertiesOptimized } from '@/hooks/usePropertiesOptimized';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { CalendarCheck } from 'lucide-react';

export default function BookingSelector() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const { bookings, loading } = useBookings();
  const { properties } = usePropertiesOptimized();

  // Filter bookings
  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      !searchTerm ||
      booking.guest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.guest_email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProperty =
      selectedProperty === 'all' || booking.property_id === selectedProperty;

    const matchesStatus =
      selectedStatus === 'all' || booking.booking_status === selectedStatus;

    return matchesSearch && matchesProperty && matchesStatus;
  });

  const getStatusBadge = (status: string | null | undefined) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      inquiry: { variant: 'secondary', label: 'Inquiry' },
      pending: { variant: 'secondary', label: 'Pending' },
      confirmed: { variant: 'default', label: 'Confirmed' },
      checked_in: { variant: 'default', label: 'Checked In' },
      checked_out: { variant: 'default', label: 'Checked Out' },
      completed: { variant: 'default', label: 'Completed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
      blocked: { variant: 'outline', label: 'Blocked' },
    };

    const config = statusConfig[status || 'pending'] || statusConfig.pending;

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPropertyName = (propertyId: string) => {
    const property = properties.find((p) => p.property_id === propertyId);
    return property?.property_name || 'Unknown Property';
  };

  const handleSelectBooking = (bookingId: string) => {
    navigate(`/invoices/new/from-booking/${bookingId}`);
  };

  const handleCreateManualInvoice = () => {
    navigate('/invoices/new/manual');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={CalendarCheck}
        title="Select Booking for Invoice"
        subtitle="Choose a booking to create an invoice, or create a manual invoice"
        action={
          <Button onClick={handleCreateManualInvoice} size="lg" variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Create Manual Invoice
          </Button>
        }
      />

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">Two Ways to Create an Invoice</h3>
              <p className="text-sm text-blue-700 mt-1">
                <strong>From Booking:</strong> Select a booking below to auto-populate invoice
                details (guest info, property, dates, amounts).
              </p>
              <p className="text-sm text-blue-700 mt-1">
                <strong>Manual Invoice:</strong> Click "Create Manual Invoice" to start with an
                empty form for custom invoices.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="shadow-md border-0">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search guest name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Property Filter */}
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger>
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map((property) => (
                  <SelectItem key={property.property_id} value={property.property_id!}>
                    {property.property_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="inquiry">Inquiry</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="checked_in">Checked In</SelectItem>
                <SelectItem value="checked_out">Checked Out</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Calendar className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">No bookings found</p>
              <p className="text-sm">Try adjusting your filters or create a manual invoice</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={handleCreateManualInvoice}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Manual Invoice
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Check-In</TableHead>
                    <TableHead>Check-Out</TableHead>
                    <TableHead>Guests</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => (
                    <TableRow
                      key={booking.booking_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSelectBooking(booking.booking_id!)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{booking.guest_name}</div>
                          {booking.guest_email && (
                            <div className="text-xs text-muted-foreground">
                              {booking.guest_email}
                            </div>
                          )}
                          {booking.guest_phone && (
                            <div className="text-xs text-muted-foreground">
                              {booking.guest_phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {getPropertyName(booking.property_id)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(booking.check_in_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(booking.check_out_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{booking.number_of_guests || 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(booking.booking_status)}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            'font-medium flex items-center justify-end gap-1',
                            (booking.total_amount || 0) > 0
                              ? 'text-green-600'
                              : 'text-muted-foreground'
                          )}
                        >
                          <DollarSign className="h-3 w-3" />
                          {(booking.total_amount || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectBooking(booking.booking_id!);
                          }}
                        >
                          Select
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Stats */}
      {filteredBookings.length > 0 && (
        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Bookings Found</p>
                  <h3 className="text-2xl font-semibold">
                    {filteredBookings.length}
                  </h3>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Combined Value</p>
                  <h3 className="text-2xl font-semibold">
                    ${filteredBookings
                      .reduce((sum, b) => sum + (b.total_amount || 0), 0)
                      .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </h3>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
