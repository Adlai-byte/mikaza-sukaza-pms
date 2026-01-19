import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Search, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOutstandingBorrowings, useCheckInKey } from '@/hooks/useKeyControl';
import { KEY_TYPE_LABELS, KEY_CATEGORY_LABELS, KeyBorrowing } from '@/lib/schemas';

interface ReturnKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId?: string | null;
}

export function ReturnKeyDialog({
  open,
  onOpenChange,
  propertyId,
}: ReturnKeyDialogProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBorrowing, setSelectedBorrowing] = useState<KeyBorrowing | null>(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: borrowings, isLoading } = useOutstandingBorrowings(propertyId || undefined);
  const checkInKey = useCheckInKey();

  // Filter borrowings by search term
  const filteredBorrowings = borrowings?.filter((b) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      b.borrower_name.toLowerCase().includes(searchLower) ||
      (b.property as any)?.property_name?.toLowerCase().includes(searchLower) ||
      KEY_TYPE_LABELS[b.key_type].toLowerCase().includes(searchLower)
    );
  }) || [];

  const handleReturnClick = (borrowing: KeyBorrowing) => {
    setSelectedBorrowing(borrowing);
    setReturnNotes('');
    setShowConfirm(true);
  };

  const handleConfirmReturn = async () => {
    if (!selectedBorrowing) return;

    await checkInKey.mutateAsync({
      borrowingId: selectedBorrowing.id,
      notes: returnNotes || undefined,
    });

    setShowConfirm(false);
    setSelectedBorrowing(null);
    setReturnNotes('');
  };

  const getStatusBadge = (status: string) => {
    if (status === 'overdue') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {t('keyControl.statusOverdue', 'Overdue')}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        {t('keyControl.statusBorrowed', 'Out')}
      </Badge>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{t('keyControl.returnKeyTitle', 'Return Key')}</DialogTitle>
            <DialogDescription>
              {t('keyControl.returnKeyDescription', 'Record a key being returned')}
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('keyControl.searchByHolder', 'Search by key holder...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Keys Currently Out Table */}
          <ScrollArea className="h-[350px] rounded-md border">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-muted-foreground">Loading...</span>
              </div>
            ) : filteredBorrowings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                <p className="font-medium">{t('keyControl.noKeysOut', 'No keys currently out')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('keyControl.allKeysReturned', 'All keys have been returned')}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('keyControl.holder', 'Key Holder')}</TableHead>
                    {!propertyId && <TableHead>{t('keyControl.property', 'Property')}</TableHead>}
                    <TableHead>{t('keyControl.key', 'Key')}</TableHead>
                    <TableHead className="text-center">{t('keyControl.qty', 'Qty')}</TableHead>
                    <TableHead>{t('keyControl.lentOn', 'Lent')}</TableHead>
                    <TableHead>{t('keyControl.status', 'Status')}</TableHead>
                    <TableHead className="text-right">{t('keyControl.actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBorrowings.map((borrowing) => (
                    <TableRow key={borrowing.id}>
                      <TableCell className="font-medium">
                        {borrowing.borrower_name}
                      </TableCell>
                      {!propertyId && (
                        <TableCell className="text-sm text-muted-foreground">
                          {(borrowing.property as any)?.property_name || '-'}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="text-sm">
                          {KEY_TYPE_LABELS[borrowing.key_type]}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {KEY_CATEGORY_LABELS[borrowing.category]}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{borrowing.quantity}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(borrowing.checked_out_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{getStatusBadge(borrowing.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReturnClick(borrowing)}
                        >
                          {t('keyControl.returnKey', 'Return')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.close', 'Close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Return Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('keyControl.confirmReturn', 'Confirm Return')}</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedBorrowing && t('keyControl.confirmReturnDescription', 'Return {{quantity}} {{keyType}} from {{holder}}?', {
                quantity: selectedBorrowing.quantity,
                keyType: KEY_TYPE_LABELS[selectedBorrowing.key_type],
                holder: selectedBorrowing.borrower_name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-2">
            <Textarea
              placeholder={t('keyControl.returnNotesPlaceholder', 'Add return notes (optional)...')}
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              className="resize-none"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReturn}
              disabled={checkInKey.isPending}
            >
              {checkInKey.isPending
                ? t('keyControl.returning', 'Returning...')
                : t('keyControl.confirmReturnBtn', 'Confirm Return')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ReturnKeyDialog;
