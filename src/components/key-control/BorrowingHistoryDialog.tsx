import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useKeyBorrowings } from '@/hooks/useKeyControl';
import {
  KEY_TYPE_LABELS,
  KEY_CATEGORY_LABELS,
  BORROWER_TYPE_LABELS,
  BORROWING_STATUS_LABELS,
  BorrowingStatus,
} from '@/lib/schemas';

interface BorrowingHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId?: string;
  propertyName?: string;
}

export function BorrowingHistoryDialog({
  open,
  onOpenChange,
  propertyId,
  propertyName,
}: BorrowingHistoryDialogProps) {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<BorrowingStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: borrowings, isLoading } = useKeyBorrowings({
    property_id: propertyId,
    status: statusFilter === 'all' ? undefined : statusFilter,
    borrower_name: searchTerm || undefined,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'returned':
        return (
          <Badge variant="default" className="bg-green-600 flex items-center gap-1 w-fit">
            <CheckCircle className="h-3 w-3" />
            {BORROWING_STATUS_LABELS.returned}
          </Badge>
        );
      case 'overdue':
        return (
          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
            <AlertTriangle className="h-3 w-3" />
            {BORROWING_STATUS_LABELS.overdue}
          </Badge>
        );
      case 'borrowed':
      default:
        return (
          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
            <Clock className="h-3 w-3" />
            {BORROWING_STATUS_LABELS.borrowed}
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('keyControl.borrowingHistory', 'Borrowing History')}
          </DialogTitle>
          <DialogDescription>
            {propertyName
              ? t('keyControl.borrowingHistoryFor', 'Key borrowing history for {{property}}', { property: propertyName })
              : t('keyControl.allBorrowingHistory', 'Complete key borrowing history')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 mb-4">
          <Input
            placeholder={t('keyControl.searchByBorrower', 'Search by borrower name...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as BorrowingStatus | 'all')}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t('keyControl.filterStatus', 'Filter status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('keyControl.allStatuses', 'All Statuses')}</SelectItem>
              <SelectItem value="borrowed">{BORROWING_STATUS_LABELS.borrowed}</SelectItem>
              <SelectItem value="returned">{BORROWING_STATUS_LABELS.returned}</SelectItem>
              <SelectItem value="overdue">{BORROWING_STATUS_LABELS.overdue}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (borrowings || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mb-2" />
              <p>{t('keyControl.noBorrowingHistory', 'No borrowing history found')}</p>
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
                  <TableHead>{t('keyControl.checkedIn', 'Checked In')}</TableHead>
                  <TableHead>{t('keyControl.status', 'Status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(borrowings || []).map((borrowing) => (
                  <TableRow key={borrowing.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{borrowing.borrower_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {BORROWER_TYPE_LABELS[borrowing.borrower_type as keyof typeof BORROWER_TYPE_LABELS]}
                        </div>
                      </div>
                    </TableCell>
                    {!propertyId && (
                      <TableCell>{borrowing.property?.property_name}</TableCell>
                    )}
                    <TableCell>
                      <div>
                        <div>{KEY_TYPE_LABELS[borrowing.key_type as keyof typeof KEY_TYPE_LABELS]}</div>
                        <div className="text-xs text-muted-foreground">
                          {KEY_CATEGORY_LABELS[borrowing.category as keyof typeof KEY_CATEGORY_LABELS]}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{borrowing.quantity}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(borrowing.checked_out_at), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(borrowing.checked_out_at), 'h:mm a')}
                      </div>
                      {borrowing.checked_out_by_user && (
                        <div className="text-xs text-muted-foreground">
                          by {borrowing.checked_out_by_user.first_name} {borrowing.checked_out_by_user.last_name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {borrowing.checked_in_at ? (
                        <>
                          <div className="text-sm">
                            {format(new Date(borrowing.checked_in_at), 'MMM d, yyyy')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(borrowing.checked_in_at), 'h:mm a')}
                          </div>
                          {borrowing.checked_in_by_user && (
                            <div className="text-xs text-muted-foreground">
                              by {borrowing.checked_in_by_user.first_name} {borrowing.checked_in_by_user.last_name}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(borrowing.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
