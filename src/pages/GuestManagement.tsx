import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Plus, Search, Filter, UserPlus, UserCheck, DollarSign, Calendar, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGuests, useGuestStats } from '@/hooks/useGuests';
import { GuestFilters, Guest } from '@/lib/schemas';
import { GuestsTable } from '@/components/GuestsTable';
import { GuestDialog } from '@/components/GuestDialog';
import { GuestDetailsDialog } from '@/components/guests/GuestDetailsDialog';
import { GuestCreditCardDialog } from '@/components/guests/GuestCreditCardDialog';

export default function GuestManagement() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [minBookings, setMinBookings] = useState<string>('all');
  const [minSpent, setMinSpent] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewingGuest, setViewingGuest] = useState<string | null>(null);
  const [editingGuest, setEditingGuest] = useState<string | null>(null);
  const [creditCardGuest, setCreditCardGuest] = useState<Guest | null>(null);

  // Build filters
  const filters: GuestFilters = {
    search: searchTerm || undefined,
    min_bookings: minBookings !== 'all' ? parseInt(minBookings) : undefined,
    min_spent: minSpent !== 'all' ? parseFloat(minSpent) : undefined,
  };

  const { data: guests, isLoading, isFetching, refetch } = useGuests(filters);
  const { data: stats, isLoading: statsLoading } = useGuestStats();

  return (
    <div className="h-full flex flex-col p-6">
      {/* Page Header */}
      <PageHeader
        title="Guest Management"
        subtitle="Manage guest profiles, view history, and track relationships"
        icon={Users}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              type="button"
              onClick={() => setShowCreateDialog(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Guest
            </Button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* Total Guests Card */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Guests</p>
                <h3 className="text-3xl font-bold text-blue-900 mt-1">
                  {statsLoading ? '...' : stats?.totalGuests || 0}
                </h3>
                <p className="text-xs text-blue-600 mt-1">All registered guests</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New This Month Card */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">New This Month</p>
                <h3 className="text-3xl font-bold text-green-900 mt-1">
                  {statsLoading ? '...' : stats?.newThisMonth || 0}
                </h3>
                <p className="text-xs text-green-600 mt-1">Recently added</p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Repeat Guests Card */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Repeat Guests</p>
                <h3 className="text-3xl font-bold text-purple-900 mt-1">
                  {statsLoading ? '...' : stats?.repeatGuests || 0}
                </h3>
                <p className="text-xs text-purple-600 mt-1">With 2+ bookings</p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue Card */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Total Revenue</p>
                <h3 className="text-3xl font-bold text-amber-900 mt-1">
                  ${statsLoading ? '...' : (stats?.totalRevenue || 0).toLocaleString()}
                </h3>
                <p className="text-xs text-amber-600 mt-1">From all guests</p>
              </div>
              <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
          <CardDescription>Search and filter guests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Minimum Bookings Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum Bookings</label>
              <Select value={minBookings} onValueChange={setMinBookings}>
                <SelectTrigger>
                  <SelectValue placeholder="All guests" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All guests</SelectItem>
                  <SelectItem value="1">1+ bookings</SelectItem>
                  <SelectItem value="2">2+ bookings (repeat)</SelectItem>
                  <SelectItem value="5">5+ bookings (loyal)</SelectItem>
                  <SelectItem value="10">10+ bookings (VIP)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Minimum Spent Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum Spent</label>
              <Select value={minSpent} onValueChange={setMinSpent}>
                <SelectTrigger>
                  <SelectValue placeholder="All amounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All amounts</SelectItem>
                  <SelectItem value="500">$500+</SelectItem>
                  <SelectItem value="1000">$1,000+</SelectItem>
                  <SelectItem value="5000">$5,000+</SelectItem>
                  <SelectItem value="10000">$10,000+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchTerm || minBookings !== 'all' || minSpent !== 'all') && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setMinBookings('all');
                setMinSpent('all');
              }}
              className="mt-4"
            >
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Guests Table */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Guests</CardTitle>
          <CardDescription>
            {isLoading ? 'Loading...' : `${guests?.length || 0} guest${guests?.length === 1 ? '' : 's'} found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GuestsTable
            guests={guests || []}
            isLoading={isLoading}
            onView={(guestId) => setViewingGuest(guestId)}
            onEdit={(guestId) => setEditingGuest(guestId)}
            onViewCreditCards={(guest) => setCreditCardGuest(guest)}
          />
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <GuestDialog
        open={showCreateDialog || !!editingGuest}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingGuest(null);
        }}
        guestId={editingGuest}
      />

      {/* View Details Dialog */}
      <GuestDetailsDialog
        open={!!viewingGuest}
        onClose={() => setViewingGuest(null)}
        guestId={viewingGuest}
        onEdit={(guestId) => {
          setViewingGuest(null);
          setEditingGuest(guestId);
        }}
      />

      {/* Credit Card Dialog */}
      {creditCardGuest && (
        <GuestCreditCardDialog
          open={!!creditCardGuest}
          onOpenChange={(open) => !open && setCreditCardGuest(null)}
          guest={creditCardGuest}
        />
      )}
    </div>
  );
}
