import React from 'react';
import { Eye, Edit, Trash2, Mail, Phone, Calendar, DollarSign, CreditCard, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Guest } from '@/lib/schemas';
import { useDeleteGuest } from '@/hooks/useGuests';
import { format } from 'date-fns';

interface GuestsTableProps {
  guests: Guest[];
  isLoading: boolean;
  onView: (guestId: string) => void;
  onEdit: (guestId: string) => void;
  onViewCreditCards?: (guest: Guest) => void;
}

export function GuestsTable({ guests, isLoading, onView, onEdit, onViewCreditCards }: GuestsTableProps) {
  const deleteGuest = useDeleteGuest();

  const handleDelete = async (guestId: string, guestName: string) => {
    try {
      await deleteGuest.mutateAsync(guestId);
    } catch (error) {
      // Error toast handled by mutation
      console.error('Delete failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading guests...</p>
      </div>
    );
  }

  if (!guests || guests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">No guests found</p>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters or create a new guest
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-center">Bookings</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
              <TableHead className="text-center">Last Booking</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guests.map((guest) => (
              <TableRow key={guest.guest_id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="font-medium">
                    {guest.first_name} {guest.last_name}
                  </div>
                </TableCell>
                <TableCell>
                  {guest.email ? (
                    <a
                      href={`mailto:${guest.email}`}
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Mail className="h-3 w-3" />
                      {guest.email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {guest.phone_primary ? (
                    <a
                      href={`tel:${guest.phone_primary}`}
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Phone className="h-3 w-3" />
                      {guest.phone_primary}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={guest.total_bookings! > 1 ? 'default' : 'secondary'}>
                    {guest.total_bookings || 0}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  ${(guest.total_spent || 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  {guest.last_booking_date ? (
                    <div className="flex items-center justify-center gap-1 text-sm">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(guest.last_booking_date), 'MMM d, yyyy')}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Never</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(guest.guest_id!)}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(guest.guest_id!)}
                      title="Edit Guest"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {onViewCreditCards && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewCreditCards(guest)}
                        title="Credit Cards"
                      >
                        <CreditCard className="h-4 w-4" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          title="Delete Guest"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Guest</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {guest.first_name} {guest.last_name}?
                            {(guest.total_bookings || 0) > 0 && (
                              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                                <p className="text-amber-800 text-sm font-medium">
                                  This guest has {guest.total_bookings} booking(s). Deleting may fail if
                                  bookings/invoices exist.
                                </p>
                              </div>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(guest.guest_id!, `${guest.first_name} ${guest.last_name}`)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {guests.map((guest) => (
          <Card key={guest.guest_id} className="border-l-4 border-l-primary">
            <CardContent className="p-4 space-y-3">
              {/* Header: Name and bookings badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base">
                    {guest.first_name} {guest.last_name}
                  </h3>
                  {guest.email && (
                    <a
                      href={`mailto:${guest.email}`}
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1.5 mt-1"
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{guest.email}</span>
                    </a>
                  )}
                  {guest.phone_primary && (
                    <a
                      href={`tel:${guest.phone_primary}`}
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1.5 mt-1"
                    >
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      {guest.phone_primary}
                    </a>
                  )}
                </div>
                <Badge variant={guest.total_bookings! > 1 ? 'default' : 'secondary'}>
                  {guest.total_bookings || 0} bookings
                </Badge>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 py-2 border-t border-b">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Total Spent</div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-green-600 shrink-0" />
                    <span className="font-semibold">${(guest.total_spent || 0).toLocaleString()}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Last Booking</div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm">
                      {guest.last_booking_date
                        ? format(new Date(guest.last_booking_date), 'MMM d, yyyy')
                        : 'Never'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 border-t pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onView(guest.guest_id!)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onEdit(guest.guest_id!)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onViewCreditCards && (
                      <DropdownMenuItem onClick={() => onViewCreditCards(guest)}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Credit Cards
                      </DropdownMenuItem>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={(e) => e.preventDefault()}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Guest</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {guest.first_name} {guest.last_name}?
                            {(guest.total_bookings || 0) > 0 && (
                              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                                <p className="text-amber-800 text-sm font-medium">
                                  This guest has {guest.total_bookings} booking(s). Deleting may fail if
                                  bookings/invoices exist.
                                </p>
                              </div>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(guest.guest_id!, `${guest.first_name} ${guest.last_name}`)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
