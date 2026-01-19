import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { usePropertyBookings, useBookings } from '@/hooks/useBookings';
import { BookingDialogEnhanced } from '@/components/BookingDialogEnhanced';
import { BookingsTable } from '@/components/BookingsTable';
import { Pagination } from '@/components/Pagination';
import { Booking, BookingInsert, BookingJobConfig } from '@/lib/schemas';
import { CreateBookingParams } from '@/hooks/useBookings';
import { useTranslation } from 'react-i18next';

interface BookingsTabProps {
  propertyId: string;
  propertyName: string;
}

export function BookingsTab({ propertyId, propertyName }: BookingsTabProps) {
  const { t } = useTranslation();
  const { bookings, loading, refetch } = usePropertyBookings(propertyId);
  const { createBooking, updateBooking, isCreating, isUpdating } = useBookings();

  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter bookings based on search and status
  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.guest_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.guest_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.guest_phone?.includes(searchQuery);

    const matchesStatus = statusFilter === 'all' || booking.booking_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBookings = filteredBookings.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Calculate statistics
  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.booking_status === 'confirmed').length,
    pending: bookings.filter(b => b.booking_status === 'pending').length,
    checkedIn: bookings.filter(b => b.booking_status === 'checked_in').length,
  };

  const handleCreateBooking = () => {
    setEditingBooking(null);
    setShowBookingDialog(true);
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setShowBookingDialog(true);
  };

  const handleBookingSubmit = async (bookingData: CreateBookingParams) => {
    try {
      // Extract jobConfigs and customTasks from booking data
      const { jobConfigs, customTasks, ...bookingFields } = bookingData;

      if (editingBooking?.booking_id) {
        // Pass jobConfigs and customTasks when updating to create tasks for existing booking
        await updateBooking(editingBooking.booking_id, bookingFields, jobConfigs, customTasks);
      } else {
        await createBooking({
          ...bookingData,
          property_id: propertyId, // Ensure property_id is set
        });
      }
      setShowBookingDialog(false);
      setEditingBooking(null);
      refetch();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Bookings
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage bookings for {propertyName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => refetch()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button type="button" onClick={handleCreateBooking} className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="pt-4 pb-4">
            <div className="text-sm font-medium text-blue-700">Total Bookings</div>
            <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="pt-4 pb-4">
            <div className="text-sm font-medium text-green-700">Confirmed</div>
            <div className="text-2xl font-bold text-green-900">{stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-amber-50">
          <CardContent className="pt-4 pb-4">
            <div className="text-sm font-medium text-amber-700">Pending</div>
            <div className="text-2xl font-bold text-amber-900">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-purple-50">
          <CardContent className="pt-4 pb-4">
            <div className="text-sm font-medium text-purple-700">Checked In</div>
            <div className="text-2xl font-bold text-purple-900">{stats.checkedIn}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-0 bg-card/60">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by guest name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
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
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Badge variant="secondary">
              {filteredBookings.length} {filteredBookings.length !== 1 ? 'results' : 'result'}
            </Badge>
            {(searchQuery || statusFilter !== 'all') && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="h-8"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card className="shadow-sm border-0 bg-card/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all'
                  ? 'No bookings match your filters'
                  : 'No bookings for this property yet'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={handleCreateBooking}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Booking
                </Button>
              )}
            </div>
          ) : (
            <>
              <BookingsTable
                bookings={paginatedBookings}
                onEdit={handleEditBooking}
                emptyMessage="No bookings found"
              />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredBookings.length}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Booking Dialog */}
      <BookingDialogEnhanced
        open={showBookingDialog}
        onOpenChange={setShowBookingDialog}
        onSubmit={handleBookingSubmit}
        isSubmitting={isCreating || isUpdating}
        propertyId={propertyId}
        booking={editingBooking}
      />
    </div>
  );
}
