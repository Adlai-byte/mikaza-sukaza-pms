import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
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
  History,
  RefreshCw,
} from 'lucide-react';
import { useBookings } from '@/hooks/useBookings';
import { BookingDialogEnhanced } from '@/components/BookingDialogEnhanced';
import { BookingsTable } from '@/components/BookingsTable';
import { Pagination } from '@/components/Pagination';
import { Booking, BookingInsert } from '@/lib/schemas';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function BookingManagement() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { bookings, loading, createBooking, updateBooking, isCreating, isUpdating, refetch } = useBookings();
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'history'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 10;

  // Auto-open booking dialog if navigated from dashboard
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setShowBookingDialog(true);
      // Remove the query parameter
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Separate active and completed bookings
  const activeBookings = bookings.filter(b =>
    b.booking_status !== 'completed' &&
    b.booking_status !== 'checked_out'
  );

  const historyBookings = bookings.filter(b =>
    b.booking_status === 'completed' ||
    b.booking_status === 'checked_out'
  );

  // Filter bookings based on search and status
  const filteredBookings = activeBookings.filter((booking) => {
    const matchesSearch =
      booking.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.guest_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.guest_phone?.includes(searchQuery);

    const matchesStatus = statusFilter === 'all' || booking.booking_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filter history bookings
  const filteredHistoryBookings = historyBookings.filter((booking) => {
    const matchesSearch =
      booking.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.guest_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.guest_phone?.includes(searchQuery);

    return matchesSearch;
  });

  // Calculate statistics (only active bookings)
  const totalActiveBookings = activeBookings.length;
  const confirmedBookings = activeBookings.filter(b => b.booking_status === 'confirmed').length;
  const pendingBookings = activeBookings.filter(b => b.booking_status === 'pending').length;
  const totalRevenue = activeBookings
    .filter(b => b.booking_status !== 'cancelled')
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);
  const totalHistoryBookings = historyBookings.length;

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

  // Pagination calculations for active bookings
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

  // Pagination calculations for history bookings
  const totalHistoryPages = Math.ceil(filteredHistoryBookings.length / itemsPerPage);
  const historyStartIndex = (historyPage - 1) * itemsPerPage;
  const historyEndIndex = historyStartIndex + itemsPerPage;
  const paginatedHistoryBookings = filteredHistoryBookings.slice(historyStartIndex, historyEndIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    setHistoryPage(1);
  }, [searchQuery]);

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
    <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title={t('bookings.title')}
          subtitle={t('bookings.subtitle')}
          icon={CalendarDays}
          actions={
            <>
              <Button variant="outline" onClick={() => refetch()} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {t('common.refresh')}
              </Button>
              <Button variant="outline" onClick={handleExportBookings}>
                <Download className="mr-2 h-4 w-4" />
                {t('common.export')}
              </Button>
              <Button onClick={handleCreateBooking} className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                {t('bookings.newBooking')}
              </Button>
            </>
          }
        />

        {/* Statistics Dashboard */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">{t('bookings.activeBookings')}</p>
                  <h3 className="text-3xl font-bold text-blue-900 mt-1">{totalActiveBookings}</h3>
                  <p className="text-xs text-blue-600 mt-1">
                    {totalHistoryBookings} {t('bookings.inHistory')}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <CalendarDays className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">{t('bookings.confirmedBookings')}</p>
                  <h3 className="text-3xl font-bold text-green-900 mt-1">{confirmedBookings}</h3>
                  <p className="text-xs text-green-600 mt-1">
                    {t('bookings.confirmedDesc')}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700">{t('bookings.pendingBookings')}</p>
                  <h3 className="text-3xl font-bold text-amber-900 mt-1">{pendingBookings}</h3>
                  <p className="text-xs text-amber-600 mt-1">
                    {t('bookings.pendingDesc')}
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
                  <CalendarIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">{t('bookings.totalRevenue')}</p>
                  <h3 className="text-3xl font-bold text-purple-900 mt-1">
                    ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </h3>
                  <p className="text-xs text-purple-600 mt-1">
                    {t('bookings.revenueDesc')}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search */}
        <Card className="shadow-card border-0 bg-card/60 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('bookings.filtersAndSearch')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">{t('bookings.searchBookings')}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder={t('bookings.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{t('bookings.statusFilter')}</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder={t('bookings.allStatuses')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('bookings.allStatuses')}</SelectItem>
                    <SelectItem value="inquiry">{t('bookings.status.inquiry')}</SelectItem>
                    <SelectItem value="pending">{t('bookings.status.pending')}</SelectItem>
                    <SelectItem value="confirmed">{t('bookings.status.confirmed')}</SelectItem>
                    <SelectItem value="checked_in">{t('bookings.status.checkedIn')}</SelectItem>
                    <SelectItem value="cancelled">{t('bookings.status.cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {viewMode === 'history'
                  ? `${filteredHistoryBookings.length} ${filteredHistoryBookings.length !== 1 ? t('bookings.results') : t('bookings.result')}`
                  : viewMode === 'calendar'
                  ? `${bookings.length} ${bookings.length !== 1 ? t('bookings.results') : t('bookings.result')}`
                  : `${filteredBookings.length} ${filteredBookings.length !== 1 ? t('bookings.results') : t('bookings.result')}`
                }
              </Badge>
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="h-8"
                >
                  {t('bookings.clearSearch')}
                </Button>
              )}
              {statusFilter !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className="h-8"
                >
                  {t('bookings.clearFilter')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content - Tabs for List, Calendar, and History View */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'calendar' | 'list' | 'history')}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              {t('bookings.activeBookings')}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              {t('bookings.calendarView')}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              {t('bookings.bookingHistory')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-0">
            <Card className="shadow-card border-0 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-0">
                <BookingsTable
                  bookings={paginatedBookings}
                  onEdit={handleEditBooking}
                  emptyMessage={t('bookings.noBookingsFound')}
                />
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredBookings.length}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="mt-0">
            <Card className="shadow-card border-0 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    {t('bookings.bookingCalendar')} - {format(currentMonth, 'MMMM yyyy')}
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
                  {t('bookings.calendarDescription')}
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
                      {t('bookings.bookingsFor')} {format(selectedDate, 'MMMM dd, yyyy')}
                    </h3>
                    <BookingsTable
                      bookings={bookings.filter((booking) => {
                        const selectedDateStr = selectedDate.toISOString().split('T')[0];
                        const checkIn = new Date(booking.check_in_date).toISOString().split('T')[0];
                        const checkOut = new Date(booking.check_out_date).toISOString().split('T')[0];
                        const matchesDate = selectedDateStr >= checkIn && selectedDateStr <= checkOut;

                        // Also apply search filter if there is one
                        const matchesSearch = !searchQuery ||
                          booking.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          booking.guest_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          booking.guest_phone?.includes(searchQuery);

                        return matchesDate && matchesSearch;
                      })}
                      onEdit={handleEditBooking}
                      emptyMessage={t('bookings.noBookingsOnDate')}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <Card className="shadow-card border-0 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  {t('bookings.bookingHistory')}
                </CardTitle>
                <CardDescription>
                  {t('bookings.completedBookings')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-6 pt-0">
                  <BookingsTable
                    bookings={paginatedHistoryBookings}
                    onEdit={handleEditBooking}
                    emptyMessage={t('bookings.noCompletedBookings')}
                  />
                </div>
                <Pagination
                  currentPage={historyPage}
                  totalPages={totalHistoryPages}
                  onPageChange={setHistoryPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredHistoryBookings.length}
                />
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
  );
}
