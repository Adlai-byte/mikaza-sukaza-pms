import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGuest, useCreateGuest, useUpdateGuest, useCheckEmailExists } from '@/hooks/useGuests';
import { guestSchema, GuestInsert } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';

interface GuestDialogProps {
  open: boolean;
  onClose: () => void;
  guestId?: string | null;
  onSuccess?: (guest: any) => void; // Callback when guest is created/updated
}

export function GuestDialog({ open, onClose, guestId, onSuccess }: GuestDialogProps) {
  const { toast } = useToast();
  const isEditing = !!guestId;

  const { data: guest, isLoading: loadingGuest } = useGuest(guestId || null);
  const createGuest = useCreateGuest();
  const updateGuest = useUpdateGuest();
  const checkEmail = useCheckEmailExists();

  const form = useForm<GuestInsert>({
    resolver: zodResolver(guestSchema.omit({
      guest_id: true,
      total_bookings: true,
      total_spent: true,
      last_booking_date: true,
      created_at: true,
      updated_at: true,
      created_by: true,
    })),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone_primary: '',
      phone_secondary: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'USA',
      internal_notes: '',
      is_verified: false,
      marketing_opt_in: true,
    },
  });

  // Load guest data when editing
  useEffect(() => {
    if (guest && isEditing) {
      form.reset({
        first_name: guest.first_name,
        last_name: guest.last_name,
        email: guest.email,
        phone_primary: guest.phone_primary || '',
        phone_secondary: guest.phone_secondary || '',
        address: guest.address || '',
        city: guest.city || '',
        state: guest.state || '',
        postal_code: guest.postal_code || '',
        country: guest.country || 'USA',
        internal_notes: guest.internal_notes || '',
        is_verified: guest.is_verified || false,
        marketing_opt_in: guest.marketing_opt_in ?? true,
      });
    }
  }, [guest, isEditing, form]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit = async (data: GuestInsert) => {
    try {
      if (isEditing && guestId) {
        const updatedGuest = await updateGuest.mutateAsync({ guestId, updates: data });
        onSuccess?.(updatedGuest);
      } else {
        const newGuest = await createGuest.mutateAsync(data);
        onSuccess?.(newGuest);
      }
      onClose();
    } catch (error) {
      // Error handled by mutation
      console.error('Failed to save guest:', error);
    }
  };

  const isPending = createGuest.isPending || updateGuest.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Guest' : 'Create New Guest'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update guest information' : 'Add a new guest to the system'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="first_name"
                  {...form.register('first_name')}
                  placeholder="John"
                />
                {form.formState.errors.first_name && (
                  <p className="text-sm text-red-500">{form.formState.errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="last_name"
                  {...form.register('last_name')}
                  placeholder="Doe"
                />
                {form.formState.errors.last_name && (
                  <p className="text-sm text-red-500">{form.formState.errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                {...form.register('email')}
                placeholder="john.doe@example.com"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone_primary">Primary Phone</Label>
                <Input
                  id="phone_primary"
                  {...form.register('phone_primary')}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_secondary">Secondary Phone</Label>
                <Input
                  id="phone_secondary"
                  {...form.register('phone_secondary')}
                  placeholder="(555) 987-6543"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold">Address</h3>
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                {...form.register('address')}
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...form.register('city')} placeholder="Miami" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" {...form.register('state')} placeholder="FL" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input id="postal_code" {...form.register('postal_code')} placeholder="33101" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...form.register('country')} placeholder="USA" />
            </div>
          </div>

          {/* Internal Notes */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold">Internal Notes</h3>
            <div className="space-y-2">
              <Label htmlFor="internal_notes">Staff Notes (Not visible to guest)</Label>
              <Textarea
                id="internal_notes"
                {...form.register('internal_notes')}
                placeholder="Any important notes about this guest..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              <Save className="mr-2 h-4 w-4" />
              {isPending ? 'Saving...' : isEditing ? 'Update Guest' : 'Create Guest'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
