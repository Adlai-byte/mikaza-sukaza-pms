import React, { useState } from 'react';
import { format } from 'date-fns';
import { X, Edit, Mail, Phone, MapPin, Calendar, DollarSign, FileText, Receipt } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useGuest } from '@/hooks/useGuests';
import { useGuestHistory } from '@/hooks/useGuestHistory';
import { GuestHistoryItem } from '@/hooks/useGuestHistory';

interface GuestDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  guestId: string | null;
  onEdit?: (guestId: string) => void;
}

export function GuestDetailsDialog({ open, onClose, guestId, onEdit }: GuestDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const { data: guest, isLoading: loadingGuest } = useGuest(guestId);
  const { data: history, isLoading: loadingHistory } = useGuestHistory(guestId);

  if (!guestId) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle>
                {loadingGuest ? 'Loading...' : `${guest?.first_name} ${guest?.last_name}`}
              </DialogTitle>
              <DialogDescription>
                {guest?.email}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(guestId)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* PROFILE TAB */}
          <TabsContent value="profile" className="space-y-4 mt-4">
            {loadingGuest ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading guest information...</p>
              </div>
            ) : guest ? (
              <>
                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{guest.total_bookings || 0}</div>
                      {guest.last_booking_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last: {format(new Date(guest.last_booking_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ${(guest.total_spent || 0).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Lifetime value
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <div className="flex items-center gap-2 mt-1">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={`mailto:${guest.email}`}
                            className="text-blue-600 hover:underline"
                          >
                            {guest.email}
                          </a>
                        </div>
                      </div>

                      {guest.phone_primary && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Primary Phone
                          </label>
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a
                              href={`tel:${guest.phone_primary}`}
                              className="text-blue-600 hover:underline"
                            >
                              {guest.phone_primary}
                            </a>
                          </div>
                        </div>
                      )}

                      {guest.phone_secondary && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Secondary Phone
                          </label>
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a
                              href={`tel:${guest.phone_secondary}`}
                              className="text-blue-600 hover:underline"
                            >
                              {guest.phone_secondary}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Address Information */}
                {(guest.address || guest.city || guest.state || guest.postal_code) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Address</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                        <div>
                          {guest.address && <p>{guest.address}</p>}
                          <p>
                            {[guest.city, guest.state, guest.postal_code]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                          {guest.country && <p>{guest.country}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Internal Notes */}
                {guest.internal_notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Internal Notes</CardTitle>
                      <CardDescription>Staff notes - not visible to guest</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{guest.internal_notes}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Metadata */}
                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>
                        {guest.created_at
                          ? format(new Date(guest.created_at), 'MMM d, yyyy h:mm a')
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Updated:</span>
                      <span>
                        {guest.updated_at
                          ? format(new Date(guest.updated_at), 'MMM d, yyyy h:mm a')
                          : 'N/A'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Guest not found</p>
              </div>
            )}
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="space-y-4 mt-4">
            {loadingHistory ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading history...</p>
              </div>
            ) : history ? (
              <>
                {/* Stats Summary */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Bookings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{history.stats.totalBookings}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Invoices</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{history.stats.totalInvoices}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ${history.stats.totalSpent.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Avg Booking</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ${Math.round(history.stats.averageBookingValue).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Timeline</CardTitle>
                    <CardDescription>
                      {history.timeline.length} total activities
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {history.timeline.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No activity yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {history.timeline.map((item: GuestHistoryItem, index: number) => (
                          <div key={item.id}>
                            <div className="flex items-start gap-4">
                              <div
                                className={`mt-1 p-2 rounded-full ${
                                  item.type === 'booking'
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-green-100 text-green-600'
                                }`}
                              >
                                {item.type === 'booking' ? (
                                  <Calendar className="h-4 w-4" />
                                ) : (
                                  <Receipt className="h-4 w-4" />
                                )}
                              </div>

                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {item.type === 'booking' ? 'Booking' : 'Invoice'}
                                    </span>
                                    <Badge
                                      variant={
                                        item.status === 'confirmed' || item.status === 'paid'
                                          ? 'default'
                                          : item.status === 'cancelled'
                                          ? 'destructive'
                                          : 'secondary'
                                      }
                                    >
                                      {item.status}
                                    </Badge>
                                  </div>
                                  {item.amount && (
                                    <span className="font-semibold">
                                      ${item.amount.toLocaleString()}
                                    </span>
                                  )}
                                </div>

                                <p className="text-sm text-muted-foreground">
                                  {item.description}
                                </p>

                                {item.property_name && (
                                  <p className="text-sm text-muted-foreground">
                                    Property: {item.property_name}
                                  </p>
                                )}

                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(item.date), 'MMM d, yyyy h:mm a')}
                                </p>
                              </div>
                            </div>

                            {index < history.timeline.length - 1 && (
                              <Separator className="my-4" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No history available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
