import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Loader2, KeyRound, ArrowLeftRight, Clock, AlertTriangle } from 'lucide-react';
import { useOutstandingBorrowings, useCheckInKey } from '@/hooks/useKeyControl';
import { KEY_TYPE_LABELS, KEY_CATEGORY_LABELS, BORROWER_TYPE_LABELS, KeyBorrowing } from '@/lib/schemas';

interface CheckInKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId?: string;
  propertyName?: string;
}

export function CheckInKeyDialog({
  open,
  onOpenChange,
  propertyId,
  propertyName,
}: CheckInKeyDialogProps) {
  const { t } = useTranslation();
  const { data: outstandingBorrowings, isLoading } = useOutstandingBorrowings(propertyId);
  const checkInKey = useCheckInKey();

  const [selectedBorrowing, setSelectedBorrowing] = useState<KeyBorrowing | null>(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBorrowings = (outstandingBorrowings || []).filter((b) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.borrower_name.toLowerCase().includes(term) ||
      b.property?.property_name?.toLowerCase().includes(term) ||
      KEY_TYPE_LABELS[b.key_type as keyof typeof KEY_TYPE_LABELS].toLowerCase().includes(term)
    );
  });

  const handleCheckIn = async () => {
    if (!selectedBorrowing) return;

    await checkInKey.mutateAsync({
      borrowingId: selectedBorrowing.id,
      notes: returnNotes,
    });

    setSelectedBorrowing(null);
    setReturnNotes('');
    setConfirmOpen(false);
  };

  const openConfirmDialog = (borrowing: KeyBorrowing) => {
    setSelectedBorrowing(borrowing);
    setConfirmOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              {t('keyControl.checkInKey', 'Check In Key')}
            </DialogTitle>
            <DialogDescription>
              {propertyName
                ? t('keyControl.outstandingKeysFor', 'Outstanding keys for {{property}}', { property: propertyName })
                : t('keyControl.allOutstandingKeys', 'All outstanding borrowed keys')}
            </DialogDescription>
          </DialogHeader>

          <div className="mb-4">
            <Input
              placeholder={t('keyControl.searchBorrowings', 'Search by borrower, property, or key type...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredBorrowings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <KeyRound className="h-12 w-12 mb-2" />
                <p>{t('keyControl.noOutstandingKeys', 'No outstanding borrowed keys')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('keyControl.borrower', 'Borrower')}</TableHead>
                    {!propertyId && <TableHead>{t('keyControl.property', 'Property')}</TableHead>}
                    <TableHead>{t('keyControl.key', 'Key')}</TableHead>
                    <TableHead>{t('keyControl.qty', 'Qty')}</TableHead>
                    <TableHead>{t('keyControl.checkedOut', 'Checked Out')}</TableHead>
                    <TableHead>{t('keyControl.status', 'Status')}</TableHead>
                    <TableHead className="text-right">{t('keyControl.actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBorrowings.map((borrowing) => {
                    const isOverdue = borrowing.expected_return_date && isPast(new Date(borrowing.expected_return_date));
                    return (
                      <TableRow key={borrowing.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{borrowing.borrower_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {BORROWER_TYPE_LABELS[borrowing.borrower_type as keyof typeof BORROWER_TYPE_LABELS]}
                            </div>
                            {borrowing.borrower_contact && (
                              <div className="text-xs text-muted-foreground">{borrowing.borrower_contact}</div>
                            )}
                          </div>
                        </TableCell>
                        {!propertyId && (
                          <TableCell>{borrowing.property?.property_name}</TableCell>
                        )}
                        <TableCell>
                          <div>
                            <div>{KEY_TYPE_LABELS[borrowing.key_type as keyof typeof KEY_TYPE_LABELS]}</div>
                            <div className="text-xs text-muted-foreground">
                              from {KEY_CATEGORY_LABELS[borrowing.category as keyof typeof KEY_CATEGORY_LABELS]}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{borrowing.quantity}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {formatDistanceToNow(new Date(borrowing.checked_out_at), { addSuffix: true })}
                            </span>
                          </div>
                          {borrowing.expected_return_date && (
                            <div className={`text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                              Due: {format(new Date(borrowing.expected_return_date), 'MMM d, yyyy')}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {borrowing.status === 'overdue' || isOverdue ? (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                              <AlertTriangle className="h-3 w-3" />
                              Overdue
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Borrowed</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => openConfirmDialog(borrowing)}
                            disabled={checkInKey.isPending}
                          >
                            {t('keyControl.return', 'Return')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('keyControl.confirmReturn', 'Confirm Key Return')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedBorrowing && (
                <>
                  {t('keyControl.confirmReturnDescription', 'Return {{quantity}} {{keyType}} from {{borrower}}?', {
                    quantity: selectedBorrowing.quantity,
                    keyType: KEY_TYPE_LABELS[selectedBorrowing.key_type as keyof typeof KEY_TYPE_LABELS],
                    borrower: selectedBorrowing.borrower_name,
                  })}
                  <div className="mt-4">
                    <Textarea
                      placeholder={t('keyControl.returnNotesPlaceholder', 'Add return notes (optional)...')}
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                    />
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReturnNotes('')}>
              {t('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCheckIn}
              disabled={checkInKey.isPending}
            >
              {checkInKey.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('keyControl.returning', 'Returning...')}
                </>
              ) : (
                t('keyControl.confirmReturnBtn', 'Confirm Return')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
