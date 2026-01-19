import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { History, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  usePropertyTransactions,
  defaultTransactionFilters,
  TransactionFilters as TFilters,
} from '@/hooks/usePropertyTransactions';
import { TransactionFilters } from './TransactionFilters';
import { TransactionTimelineItem } from './TransactionTimelineItem';

interface PropertyTransactionsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string | null;
  propertyName?: string;
}

// Loading skeleton
function TimelineSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Empty state
function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <History className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium">
        {t('calendar.noTransactionsFound', 'No transactions found')}
      </h3>
      <p className="text-sm text-muted-foreground mt-1">
        {t(
          'calendar.noTransactionsDescription',
          'No transactions found for the selected period and filters'
        )}
      </p>
    </div>
  );
}

export function PropertyTransactionsDrawer({
  open,
  onOpenChange,
  propertyId,
  propertyName,
}: PropertyTransactionsDrawerProps) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<TFilters>(defaultTransactionFilters);

  const { data, isLoading } = usePropertyTransactions(propertyId, filters);

  const items = data?.items || [];
  const stats = data?.stats || {
    totalBookings: 0,
    totalInvoices: 0,
    totalExpenses: 0,
    totalIncome: 0,
    totalExpenseAmount: 0,
    keyBorrowingsOut: 0,
    checkInsOuts: 0,
  };

  const handleItemClick = (item: any) => {
    // TODO: Open detail view based on item type
    console.log('Transaction clicked:', item);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('calendar.propertyTransactions', 'Property Transactions')}
          </SheetTitle>
          <SheetDescription>
            {propertyName || t('calendar.transactionsHistory', 'Transaction History')}
          </SheetDescription>
        </SheetHeader>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-3 gap-2 py-4 flex-shrink-0">
          <Card className="p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-600" />
              {t('calendar.totalIncome', 'Income')}
            </div>
            <div className="text-lg font-semibold text-green-600">
              ${stats.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 text-red-600" />
              {t('calendar.totalExpenses', 'Expenses')}
            </div>
            <div className="text-lg font-semibold text-red-600">
              ${stats.totalExpenseAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {t('calendar.bookings', 'Bookings')}
            </div>
            <div className="text-lg font-semibold">{stats.totalBookings}</div>
          </Card>
        </div>

        {/* Filters */}
        <TransactionFilters filters={filters} onFiltersChange={setFilters} />

        {/* Timeline */}
        <ScrollArea className="flex-1 mt-4">
          <div className="space-y-3 pr-4 pb-4">
            {isLoading ? (
              <TimelineSkeleton />
            ) : items.length === 0 ? (
              <EmptyState />
            ) : (
              items.map((item) => (
                <TransactionTimelineItem
                  key={`${item.type}-${item.id}`}
                  item={item}
                  onClick={() => handleItemClick(item)}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer with transaction count */}
        {!isLoading && items.length > 0 && (
          <div className="flex-shrink-0 pt-3 border-t text-xs text-muted-foreground text-center">
            {t('calendar.showingTransactions', 'Showing {{count}} transactions', {
              count: items.length,
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default PropertyTransactionsDrawer;
