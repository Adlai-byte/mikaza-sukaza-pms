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
import { Calendar } from '@/components/ui/calendar';
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  Download,
  Users,
  DollarSign,
  TrendingUp,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useBookings } from '@/hooks/useBookings';
import { BookingDialogEnhanced } from '@/components/BookingDialogEnhanced';
import { BookingsTable } from '@/components/BookingsTable';
import { Booking, BookingInsert } from '@/lib/schemas';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function BookingManagement() {
  const { bookings, loading, createBooking, updateBooking, isCreating, isUpdating } = useBookings();
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');

  // Filter bookings based on search and status
  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.guest_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.guest_phone?.includes(searchQuery);

    const matchesStatus = statusFilter === 'all' || booking.booking_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => b.booking_status === 'confirmed').length;
  const pendingBookings = bookings.filter(b => b.booking_status === 'pending').length;
  const totalRevenue = bookings
    .filter(b => b.booking_status !== 'cancelled')
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);

  // Get booked dates for calendar
  const getBookedDates = () => {
    const booked = new Set<string>();
    bookings.forEach((booking) => {
      const start = new Date(booking.check_in_date);
      const end = new Date(booking.check_out_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        booked.add(d.toISOString().split('T')[0]);
      }
    });
    return booked;
  };

  const bookedDates = getBookedDates();

  const handleCreateBooking = () => {
    setEditingBooking(null);
    setShowBookingDialog(true);
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setShowBookingDialog(true);
  };

  const handleBookingSubmit = async (bookingData: BookingInsert) => {
    try {
      if (editingBooking?.booking_id) {
        await updateBooking(editingBooking.booking_id, bookingData);
      } else {
        await createBooking(bookingData);
      }
      setShowBookingDialog(false);
      setEditingBooking(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleExportBookings = () => {
    const csv = [
      ['Guest Name', 'Email', 'Phone', 'Check-in', 'Check-out', 'Guests', 'Amount', 'Status'],
      ...filteredBookings.map(b => [
        b.guest_name,
        b.guest_email || '',
        b.guest_phone || '',
        b.check_in_date,
        b.check_out_date,
        b.number_of_guests || '',
        b.total_amount || '',
        b.booking_status || 'pending'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bookings-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto p-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-3">
              <CalendarDays className="h-8 w-8 text-primary" />
              Booking Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage all property bookings, reservations, and schedules in one place
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportBookings}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={handleCreateBooking} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              New Booking
            </Button>
          </div>
        </div>

        {/* Statistics Dashboard */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="shadow-card border-0 bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBookings}</div>
              <p className="text-xs text-muted-foreground">
                All time bookings
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0 bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{confirmedBookings}</div>
              <p className="text-xs text-muted-foreground">
                Active reservations
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0 bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{pendingBookings}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting confirmation
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0 bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                From active bookings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search */}
        <Card className="shadow-card border-0 bg-card/60 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search Bookings</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Guest name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status Filter</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>View Mode</Label>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="mr-2 h-4 w-4" />
                    List
                  </Button>
                  <Button
                    variant={viewMode === 'calendar' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setViewMode('calendar')}
                  >
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    Calendar
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {filteredBookings.length} result{filteredBookings.length !== 1 ? 's' : ''}
              </Badge>
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="h-8"
                >
                  Clear search
                </Button>
              )}
              {statusFilter !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className="h-8"
                >
                  Clear filter
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content - Tabs for Calendar and List View */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'calendar' | 'list')}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Calendar View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-0">
            <BookingsTable
              bookings={filteredBookings}
              onEdit={handleEditBooking}
              emptyMessage="No bookings found. Create your first booking to get started."
            />
          </TabsContent>

          <TabsContent value="calendar" className="mt-0">
            <Card className="shadow-card border-0 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    Booking Calendar - {format(currentMonth, 'MMMM yyyy')}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToNextMonth}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Booked dates are highlighted. Click on a date to see bookings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center mb-6">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    modifiers={{
                      booked: (date) => bookedDates.has(date.toISOString().split('T')[0]),
                    }}
                    modifiersStyles={{
                      booked: {
                        backgroundColor: 'hsl(var(--primary))',
                        color: 'white',
                        fontWeight: 'bold',
                      },
                    }}
                    className="rounded-md border border-border/50 bg-background/50 backdrop-blur-sm"
                  />
                </div>

                {/* Bookings for selected date */}
                {selectedDate && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4">
                      Bookings for {format(selectedDate, 'MMMM dd, yyyy')}
                    </h3>
                    <BookingsTable
                      bookings={filteredBookings.filter((booking) => {
                        const selectedDateStr = selectedDate.toISOString().split('T')[0];
                        const checkIn = new Date(booking.check_in_date).toISOString().split('T')[0];
                        const checkOut = new Date(booking.check_out_date).toISOString().split('T')[0];
                        return selectedDateStr >= checkIn && selectedDateStr <= checkOut;
                      })}
                      onEdit={handleEditBooking}
                      emptyMessage="No bookings on this date"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Booking Dialog */}
        <BookingDialogEnhanced
          open={showBookingDialog}
          onOpenChange={setShowBookingDialog}
          onSubmit={handleBookingSubmit}
          isSubmitting={isCreating || isUpdating}
          booking={editingBooking}
        />
      </div>
    </div>
  );
}
