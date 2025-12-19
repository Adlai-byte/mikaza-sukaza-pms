import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Search, History, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useKeyBorrowings } from '@/hooks/useKeyControl';
import { KEY_TYPE_LABELS, KEY_CATEGORY_LABELS, BorrowingStatus } from '@/lib/schemas';

interface KeyHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId?: string | null;
  propertyName?: string;
}

type StatusFilter = 'all' | BorrowingStatus;

export function KeyHistoryDialog({
  open,
  onOpenChange,
  propertyId,
  propertyName,
}: KeyHistoryDialogProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filters = {
    property_id: propertyId || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    borrower_name: searchTerm || undefined,
  };

  const { data: borrowings, isLoading } = useKeyBorrowings(filters);

  // Additional client-side filtering for search
  const filteredBorrowings = borrowings?.filter((b) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      b.borrower_name.toLowerCase().includes(searchLower) ||
      (b.property as any)?.property_name?.toLowerCase().includes(searchLower) ||
      KEY_TYPE_LABELS[b.key_type].toLowerCase().includes(searchLower)
    );
  }) || [];

  const getStatusBadge = (status: BorrowingStatus) => {
    switch (status) {
      case 'overdue':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {t('keyControl.statusOverdue', 'Overdue')}
          </Badge>
        );
      case 'returned':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            {t('keyControl.statusReturned', 'Returned')}
          </Badge>
        );
      case 'borrowed':
      default:
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {t('keyControl.statusBorrowed', 'Out')}
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('keyControl.keyHistoryTitle', 'Key History')}
          </DialogTitle>
          <DialogDescription>
            {propertyId
              ? t('keyControl.keyHistoryFor', 'Key history for {{property}}', { property: propertyName })
              : t('keyControl.allKeyHistory', 'All key activity')}
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('keyControl.searchByHolder', 'Search by key holder...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t('keyControl.filterStatus', 'Filter by status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('keyControl.allStatuses', 'All')}</SelectItem>
              <SelectItem value="borrowed">{t('keyControl.statusBorrowed', 'Out')}</SelectItem>
              <SelectItem value="returned">{t('keyControl.statusReturned', 'Returned')}</SelectItem>
              <SelectItem value="overdue">{t('keyControl.statusOverdue', 'Overdue')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* History Table */}
        <ScrollArea className="h-[400px] rounded-md border">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-muted-foreground">Loading...</span>
            </div>
          ) : filteredBorrowings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <History className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="font-medium">{t('keyControl.noHistory', 'No key history found')}</p>
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
                  <TableHead>{t('keyControl.returnedOn', 'Returned')}</TableHead>
                  <TableHead>{t('keyControl.status', 'Status')}</TableHead>
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
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(borrowing.checked_out_at), 'h:mm a')}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {borrowing.checked_in_at ? (
                        <>
                          {format(new Date(borrowing.checked_in_at), 'MMM d, yyyy')}
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(borrowing.checked_in_at), 'h:mm a')}
                          </div>
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
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close', 'Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default KeyHistoryDialog;
