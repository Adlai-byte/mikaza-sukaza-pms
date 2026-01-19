import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar,
  Receipt,
  DollarSign,
  CreditCard,
  Key,
  LogIn,
} from 'lucide-react';
import { format, subDays, subMonths, subYears } from 'date-fns';
import { TransactionType, TransactionFilters as TFilters } from '@/hooks/usePropertyTransactions';
import { useTranslation } from 'react-i18next';

// Transaction type options with icons
const transactionTypeOptions: { id: TransactionType; label: string; icon: React.ReactNode }[] = [
  { id: 'booking', label: 'Bookings', icon: <Calendar className="h-3 w-3" /> },
  { id: 'invoice', label: 'Invoices', icon: <Receipt className="h-3 w-3" /> },
  { id: 'payment', label: 'Payments', icon: <DollarSign className="h-3 w-3" /> },
  { id: 'expense', label: 'Expenses', icon: <CreditCard className="h-3 w-3" /> },
  { id: 'key_borrowing', label: 'Keys', icon: <Key className="h-3 w-3" /> },
  { id: 'check_in_out', label: 'Check-in/out', icon: <LogIn className="h-3 w-3" /> },
];

// Date range presets
type DateRangePreset = '7d' | '30d' | '90d' | '1y' | 'custom';

interface TransactionFiltersProps {
  filters: TFilters;
  onFiltersChange: (filters: TFilters) => void;
}

export function TransactionFilters({ filters, onFiltersChange }: TransactionFiltersProps) {
  const { t } = useTranslation();
  const [dateRangePreset, setDateRangePreset] = React.useState<DateRangePreset>('30d');

  // Handle date range preset change
  const handleDateRangeChange = (preset: DateRangePreset) => {
    setDateRangePreset(preset);

    if (preset === 'custom') return;

    const endDate = format(new Date(), 'yyyy-MM-dd');
    let startDate: string;

    switch (preset) {
      case '7d':
        startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');
        break;
      case '30d':
        startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
        break;
      case '90d':
        startDate = format(subDays(new Date(), 90), 'yyyy-MM-dd');
        break;
      case '1y':
        startDate = format(subYears(new Date(), 1), 'yyyy-MM-dd');
        break;
      default:
        startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    }

    onFiltersChange({
      ...filters,
      startDate,
      endDate,
    });
  };

  // Toggle transaction type
  const toggleType = (type: TransactionType) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];

    // Ensure at least one type is selected
    if (newTypes.length === 0) return;

    onFiltersChange({
      ...filters,
      types: newTypes,
    });
  };

  // Handle custom date change
  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    onFiltersChange({
      ...filters,
      [field]: value,
    });
  };

  return (
    <div className="flex flex-col gap-3 py-3 border-b">
      {/* Date Range */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={dateRangePreset} onValueChange={(v) => handleDateRangeChange(v as DateRangePreset)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t('calendar.selectPeriod', 'Select period')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">{t('calendar.last7Days', 'Last 7 days')}</SelectItem>
            <SelectItem value="30d">{t('calendar.last30Days', 'Last 30 days')}</SelectItem>
            <SelectItem value="90d">{t('calendar.last90Days', 'Last 90 days')}</SelectItem>
            <SelectItem value="1y">{t('calendar.lastYear', 'Last year')}</SelectItem>
            <SelectItem value="custom">{t('calendar.customRange', 'Custom range')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Custom date inputs */}
        {dateRangePreset === 'custom' && (
          <>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
              className="w-[140px]"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
              className="w-[140px]"
            />
          </>
        )}
      </div>

      {/* Transaction Type Toggles */}
      <div className="flex flex-wrap gap-2">
        {transactionTypeOptions.map((option) => (
          <Button
            key={option.id}
            variant={filters.types.includes(option.id) ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => toggleType(option.id)}
          >
            {option.icon}
            <span className="ml-1">{option.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

export default TransactionFilters;
