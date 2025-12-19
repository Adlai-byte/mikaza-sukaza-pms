import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, KeyRound } from 'lucide-react';
import { useCheckOutKey } from '@/hooks/useKeyControl';
import { useUsers } from '@/hooks/useUsers';
import {
  KeyCategory,
  KeyType,
  KEY_CATEGORY_LABELS,
  KEY_TYPE_LABELS,
  BorrowerType,
  PropertyKeySummary,
} from '@/lib/schemas';

const checkOutFormSchema = z.object({
  key_type: z.enum(['house_key', 'mailbox_key', 'storage_key', 'remote_control']),
  category: z.enum(['office', 'operational', 'housekeepers', 'extras']),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
  borrower_user_id: z.string().min(1, 'Borrower is required'),
  expected_return_date: z.string().optional(),
  notes: z.string().optional(),
});

type CheckOutFormValues = z.infer<typeof checkOutFormSchema>;

interface CheckOutKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: PropertyKeySummary;
}

export function CheckOutKeyDialog({
  open,
  onOpenChange,
  property,
}: CheckOutKeyDialogProps) {
  const { t } = useTranslation();
  const checkOutKey = useCheckOutKey();
  const { users, loading: usersLoading } = useUsers();

  // Filter users to only show admin and ops
  const borrowerUsers = users.filter(
    (user) => user.user_type === 'admin' || user.user_type === 'ops'
  );

  const form = useForm<CheckOutFormValues>({
    resolver: zodResolver(checkOutFormSchema),
    defaultValues: {
      key_type: 'house_key',
      category: 'office',
      quantity: 1,
      borrower_user_id: '',
      expected_return_date: '',
      notes: '',
    },
  });

  const selectedCategory = form.watch('category');
  const selectedKeyType = form.watch('key_type');
  const selectedUserId = form.watch('borrower_user_id');
  const availableQuantity = property.inventory[selectedCategory as KeyCategory]?.[selectedKeyType as KeyType] || 0;

  // Get the selected user details
  const selectedUser = borrowerUsers.find((u) => u.user_id === selectedUserId);

  const onSubmit = async (values: CheckOutFormValues) => {
    const user = borrowerUsers.find((u) => u.user_id === values.borrower_user_id);
    if (!user) return;

    await checkOutKey.mutateAsync({
      propertyId: property.property_id,
      keyType: values.key_type as KeyType,
      category: values.category as KeyCategory,
      quantity: values.quantity,
      borrowerName: `${user.first_name} ${user.last_name}`.trim(),
      borrowerContact: user.email || user.phone || undefined,
      borrowerType: user.user_type as BorrowerType,
      expectedReturnDate: values.expected_return_date || undefined,
      notes: values.notes,
    });
    form.reset();
    onOpenChange(false);
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            {t('keyControl.checkOutKey', 'Check Out Key')}
          </DialogTitle>
          <DialogDescription>
            {t('keyControl.checkOutDescription', 'Record a key being borrowed from {{property}}', { property: property.property_name })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('keyControl.category', 'Category')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(KEY_CATEGORY_LABELS) as KeyCategory[]).map((cat) => (
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

              <FormField
                control={form.control}
                name="key_type"
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
                        {(Object.keys(KEY_TYPE_LABELS) as KeyType[]).map((type) => (
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
            </div>

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('keyControl.quantity', 'Quantity')}
                    <span className="text-muted-foreground ml-2">
                      ({t('keyControl.available', 'Available')}: {availableQuantity})
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={availableQuantity}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="borrower_user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('keyControl.borrower', 'Borrower')} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={usersLoading ? t('common.loading', 'Loading...') : t('keyControl.selectBorrower', 'Select borrower')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {borrowerUsers.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          <div className="flex items-center gap-2">
                            <span>{user.first_name} {user.last_name}</span>
                            <span className="text-muted-foreground text-xs">
                              ({user.user_type === 'admin' ? 'Admin' : 'Ops'})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedUser && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedUser.email || selectedUser.phone || t('keyControl.noContact', 'No contact info')}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expected_return_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('keyControl.expectedReturnDate', 'Expected Return Date')}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('keyControl.notes', 'Notes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('keyControl.notesPlaceholder', 'Any additional notes...')}
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
                disabled={checkOutKey.isPending || usersLoading}
              >
                {checkOutKey.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('keyControl.checkingOut', 'Checking Out...')}
                  </>
                ) : (
                  t('keyControl.checkOut', 'Check Out')
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
