import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useCheckOutKey, usePropertyKeySummary } from '@/hooks/useKeyControl';
import { useUsers } from '@/hooks/useUsers';
import {
  KeyCategory,
  KeyType,
  KEY_TYPE_LABELS,
  KEY_CATEGORY_LABELS,
  BorrowerType,
} from '@/lib/schemas';
import { cn } from '@/lib/utils';

const KEY_TYPES: KeyType[] = ['house_key', 'mailbox_key', 'storage_key', 'remote_control'];
const CATEGORIES: KeyCategory[] = ['office', 'operational', 'housekeepers', 'extras'];

const lendKeySchema = z.object({
  keyType: z.enum(['house_key', 'mailbox_key', 'storage_key', 'remote_control']),
  category: z.enum(['office', 'operational', 'housekeepers', 'extras']),
  quantity: z.number().int().min(1, 'At least 1 key required'),
  keyHolder: z.string().min(1, 'Please select who is taking the key'),
  dueBack: z.date().optional(),
  notes: z.string().optional(),
});

type LendKeyFormData = z.infer<typeof lendKeySchema>;

interface LendKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string | null;
  propertyName: string;
}

export function LendKeyDialog({
  open,
  onOpenChange,
  propertyId,
  propertyName,
}: LendKeyDialogProps) {
  const { t } = useTranslation();
  const { users } = useUsers();
  const { data: propertySummary } = usePropertyKeySummary(propertyId);
  const checkOutKey = useCheckOutKey();

  // Filter to admin/ops users only for key holders
  const keyHolders = users?.filter(
    (user) => user.user_type === 'admin' || user.user_type === 'ops'
  ) || [];

  const form = useForm<LendKeyFormData>({
    resolver: zodResolver(lendKeySchema),
    defaultValues: {
      keyType: 'house_key',
      category: 'office',
      quantity: 1,
      keyHolder: '',
      notes: '',
    },
  });

  const selectedCategory = form.watch('category');
  const selectedKeyType = form.watch('keyType');

  // Get available quantity for selected combination
  const availableQty = propertySummary?.inventory[selectedCategory]?.[selectedKeyType] || 0;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        keyType: 'house_key',
        category: 'office',
        quantity: 1,
        keyHolder: '',
        notes: '',
      });
    }
  }, [open, form]);

  const onSubmit = async (data: LendKeyFormData) => {
    if (!propertyId) return;

    // Find the selected user's name and type
    const selectedUser = keyHolders.find(u => u.user_id === data.keyHolder);
    const borrowerName = selectedUser
      ? `${selectedUser.first_name} ${selectedUser.last_name}`.trim()
      : 'Unknown';

    // Explicitly validate borrower_type - database constraint only allows 'admin' or 'ops'
    // Default to 'ops' if user type is not valid (safety fallback)
    const userType = selectedUser?.user_type;
    const borrowerType: BorrowerType = (userType === 'admin' || userType === 'ops')
      ? userType
      : 'ops';

    console.log('[LendKey] Submitting with borrower_type:', borrowerType, 'from user_type:', userType);

    await checkOutKey.mutateAsync({
      propertyId,
      keyType: data.keyType,
      category: data.category,
      quantity: data.quantity,
      borrowerName,
      borrowerType,
      expectedReturnDate: data.dueBack ? format(data.dueBack, 'yyyy-MM-dd') : undefined,
      notes: data.notes,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('keyControl.lendKeyTitle', 'Lend Key')}</DialogTitle>
          <DialogDescription>
            {t('keyControl.lendKeyDescription', 'Record lending a key from {{property}}', {
              property: propertyName,
            })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Key Type */}
            <FormField
              control={form.control}
              name="keyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('keyControl.keyType', 'Key Type')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {KEY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {KEY_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Storage Location (Category) */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('keyControl.storageLocation', 'Storage Location')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {KEY_CATEGORY_LABELS[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity with available info */}
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('keyControl.quantity', 'Quantity')}
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({availableQty} {t('keyControl.available', 'available')})
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={availableQty}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Key Holder */}
            <FormField
              control={form.control}
              name="keyHolder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('keyControl.keyHolder', 'Key Holder')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('keyControl.selectKeyHolder', 'Select who is taking the key')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {keyHolders.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.first_name} {user.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Due Back Date */}
            <FormField
              control={form.control}
              name="dueBack"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('keyControl.dueBack', 'Due Back')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>{t('common.selectDate', 'Select date')}</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('keyControl.notes', 'Notes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('keyControl.notesPlaceholder', 'Add any notes...')}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                disabled={checkOutKey.isPending || availableQty < 1}
              >
                {checkOutKey.isPending
                  ? t('keyControl.lending', 'Lending...')
                  : t('keyControl.lendKey', 'Lend Key')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default LendKeyDialog;
