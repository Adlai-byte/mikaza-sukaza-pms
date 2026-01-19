import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Receipt,
  DollarSign,
  CreditCard,
  Key,
  LogIn,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { PropertyTransactionItem, TransactionType } from '@/hooks/usePropertyTransactions';

// Color mapping for transaction types
const typeColors: Record<TransactionType, { bg: string; text: string; icon: string }> = {
  booking: { bg: 'bg-blue-100', text: 'text-blue-600', icon: 'text-blue-600' },
  invoice: { bg: 'bg-green-100', text: 'text-green-600', icon: 'text-green-600' },
  payment: { bg: 'bg-emerald-100', text: 'text-emerald-600', icon: 'text-emerald-600' },
  expense: { bg: 'bg-red-100', text: 'text-red-600', icon: 'text-red-600' },
  key_borrowing: { bg: 'bg-orange-100', text: 'text-orange-600', icon: 'text-orange-600' },
  check_in_out: { bg: 'bg-purple-100', text: 'text-purple-600', icon: 'text-purple-600' },
};

// Status badge variants
const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status.toLowerCase()) {
    case 'confirmed':
    case 'completed':
    case 'paid':
    case 'returned':
      return 'default';
    case 'pending':
    case 'draft':
    case 'borrowed':
      return 'secondary';
    case 'cancelled':
    case 'overdue':
      return 'destructive';
    default:
      return 'outline';
  }
};

// Get icon for transaction type
const getIcon = (type: TransactionType, metadata?: Record<string, any>) => {
  const iconClass = 'h-4 w-4';

  switch (type) {
    case 'booking':
      return <Calendar className={iconClass} />;
    case 'invoice':
      return <Receipt className={iconClass} />;
    case 'payment':
      return <DollarSign className={iconClass} />;
    case 'expense':
      return <CreditCard className={iconClass} />;
    case 'key_borrowing':
      return <Key className={iconClass} />;
    case 'check_in_out':
      return metadata?.record_type === 'check_in' ? (
        <LogIn className={iconClass} />
      ) : (
        <LogOut className={iconClass} />
      );
    default:
      return <Calendar className={iconClass} />;
  }
};

interface TransactionTimelineItemProps {
  item: PropertyTransactionItem;
  onClick?: () => void;
}

export function TransactionTimelineItem({ item, onClick }: TransactionTimelineItemProps) {
  const colors = typeColors[item.type];

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      {/* Icon */}
      <div className={`mt-0.5 p-2 rounded-full ${colors.bg}`}>
        <span className={colors.icon}>{getIcon(item.type, item.metadata)}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{item.title}</span>
            <Badge variant={getStatusVariant(item.status)} className="text-xs capitalize">
              {item.status.replace('_', ' ')}
            </Badge>
          </div>
          {item.amount !== undefined && (
            <span
              className={`font-semibold text-sm whitespace-nowrap ${
                item.amountType === 'expense' ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {item.amountType === 'expense' ? '-' : '+'}$
              {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{item.description}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {format(new Date(item.date), 'MMM d, yyyy h:mm a')}
        </p>
      </div>

      {/* Chevron */}
      {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground mt-2 flex-shrink-0" />}
    </div>
  );
}

export default TransactionTimelineItem;
