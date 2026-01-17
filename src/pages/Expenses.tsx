import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Trash2,
  FileText,
  Edit,
  RefreshCw,
} from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, useMarkExpenseAsPaid } from '@/hooks/useExpenses';
import { usePropertiesOptimized } from '@/hooks/usePropertiesOptimized';
import { useProviders } from '@/hooks/useProviders';
import { ExpenseInsert } from '@/lib/schemas';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { expenseSchema } from '@/lib/schemas';
import { useTranslation } from 'react-i18next';

const EXPENSE_CATEGORIES = [
  'maintenance',
  'utilities',
  'cleaning',
  'supplies',
  'marketing',
  'channel_commission',
  'insurance',
  'property_tax',
  'hoa_fees',
  'professional_services',
  'repairs',
  'landscaping',
  'pest_control',
  'other',
];

const PAYMENT_METHODS = ['cash', 'credit_card', 'bank_transfer', 'check', 'other'];

export default function Expenses() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);

  // Build filters
  const filters = {
    property_id: selectedProperty !== 'all' ? selectedProperty : undefined,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    payment_status: selectedStatus !== 'all' ? selectedStatus : undefined,
    vendor_name: searchTerm || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  };

  const { expenses, loading, isFetching, refetch } = useExpenses(filters);
  const { properties } = usePropertiesOptimized();
  const { providers } = useProviders('service');
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const markAsPaid = useMarkExpenseAsPaid();

  const form = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      property_id: '',
      expense_date: new Date().toISOString().split('T')[0],
      category: 'other' as any,
      description: '',
      vendor_name: '',
      amount: 0,
      tax_amount: 0,
      payment_status: 'unpaid' as any,
      payment_method: undefined,
      notes: '',
    },
  });

  const handleOpenDialog = (expense?: any) => {
    if (expense) {
      setEditingExpense(expense);
      form.reset({
        property_id: expense.property_id,
        expense_date: expense.expense_date,
        category: expense.category,
        description: expense.description,
        vendor_name: expense.vendor_name || '',
        amount: expense.amount,
        tax_amount: expense.tax_amount || 0,
        payment_status: expense.payment_status,
        payment_method: expense.payment_method,
        notes: expense.notes || '',
      });
    } else {
      setEditingExpense(null);
      form.reset();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = form.handleSubmit((data) => {
    if (editingExpense) {
      updateExpense.mutate(
        { expenseId: editingExpense.expense_id, updates: data },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            form.reset();
          },
        }
      );
    } else {
      createExpense.mutate(data as ExpenseInsert, {
        onSuccess: () => {
          setIsDialogOpen(false);
          form.reset();
        },
      });
    }
  });

  const handleDelete = (expenseId: string) => {
    if (confirm(t('expenses.confirmDelete'))) {
      deleteExpense.mutate(expenseId);
    }
  };

  const handleMarkAsPaid = (expenseId: string) => {
    markAsPaid.mutate({ expenseId });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: React.ReactNode; label: string }> = {
      unpaid: { variant: 'secondary', icon: <Clock className="h-3 w-3" />, label: 'Unpaid' },
      paid: { variant: 'default', icon: <CheckCircle className="h-3 w-3" />, label: 'Paid' },
      partially_paid: { variant: 'outline', icon: <Clock className="h-3 w-3" />, label: 'Partial' },
      refunded: { variant: 'outline', icon: <XCircle className="h-3 w-3" />, label: 'Refunded' },
    };

    const config = variants[status] || variants.unpaid;

    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getCategoryBadge = (category: string) => {
    return (
      <Badge variant="outline" className="capitalize">
        {category.replace(/_/g, ' ')}
      </Badge>
    );
  };

  // Calculate summary stats
  const stats = {
    total: expenses.length,
    unpaid: expenses.filter(e => e.payment_status === 'unpaid').length,
    paid: expenses.filter(e => e.payment_status === 'paid').length,
    totalAmount: expenses.reduce((sum, e) => sum + (e.amount || 0) + (e.tax_amount || 0), 0),
    paidAmount: expenses.filter(e => e.payment_status === 'paid').reduce((sum, e) => sum + (e.amount || 0) + (e.tax_amount || 0), 0),
    outstanding: expenses.filter(e => ['unpaid', 'partially_paid'].includes(e.payment_status || '')).reduce((sum, e) => sum + (e.amount || 0) + (e.tax_amount || 0), 0),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('expenses.title')}
        subtitle={t('expenses.subtitle')}
        icon={Receipt}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
            <Button onClick={() => handleOpenDialog()} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              {t('expenses.newExpense')}
            </Button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <Receipt className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{t('expenses.totalExpenses')}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">{stats.total}</h3>
                  <span className="text-xs text-muted-foreground">{t('expenses.allTime')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <Receipt className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{t('expenses.totalAmount')}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">
                    ${stats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </h3>
                  <span className="text-xs text-muted-foreground">{t('expenses.combinedTotal')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{t('expenses.paid')}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">
                    ${stats.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </h3>
                  <span className="text-xs text-muted-foreground">{t('expenses.paidExpenses', { count: stats.paid })}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{t('expenses.outstanding')}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">
                    ${stats.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </h3>
                  <span className="text-xs text-muted-foreground">{t('expenses.pendingPayment')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* {t('expenses.filters')} */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('expenses.filters')}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-hidden">
          <div className="flex flex-wrap gap-3 max-w-full">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('expenses.searchVendorPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>

            {/* Property Filter */}
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder={t('expenses.allProperties')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('expenses.allProperties')}</SelectItem>
                {properties.map((property) => (
                  <SelectItem key={property.property_id} value={property.property_id!}>
                    {property.property_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder={t('expenses.allCategories')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('expenses.allCategories')}</SelectItem>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {t(`expenses.categories.${cat}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder={t('expenses.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('expenses.allStatuses')}</SelectItem>
                <SelectItem value="unpaid">{t('expenses.status.unpaid')}</SelectItem>
                <SelectItem value="paid">{t('expenses.status.paid')}</SelectItem>
                <SelectItem value="partially_paid">{t('expenses.status.partially_paid')}</SelectItem>
                <SelectItem value="refunded">{t('expenses.status.refunded')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Date From */}
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From"
              className="w-full sm:w-[140px]"
            />

            {/* Date To */}
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
              className="w-full sm:w-[140px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Receipt className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">{t('expenses.noExpensesFound')}</p>
              <p className="text-sm">{t('expenses.addFirstExpense')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('expenses.date')}</TableHead>
                    <TableHead>{t('common.property')}</TableHead>
                    <TableHead>{t('expenses.vendor')}</TableHead>
                    <TableHead>{t('expenses.category')}</TableHead>
                    <TableHead>{t('common.description')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="text-right">{t('common.amount')}</TableHead>
                    <TableHead className="text-right">{t('common.tax')}</TableHead>
                    <TableHead className="text-right">{t('common.total')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => {
                    const total = (expense.amount || 0) + (expense.tax_amount || 0);
                    return (
                      <TableRow key={expense.expense_id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {format(new Date(expense.expense_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>{expense.property?.property_name || 'N/A'}</TableCell>
                        <TableCell>{expense.vendor_name || expense.vendor?.company_name || 'N/A'}</TableCell>
                        <TableCell>{getCategoryBadge(expense.category)}</TableCell>
                        <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                        <TableCell>{getStatusBadge(expense.payment_status || 'unpaid')}</TableCell>
                        <TableCell className="text-right">${expense.amount?.toLocaleString()}</TableCell>
                        <TableCell className="text-right">${expense.tax_amount?.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">${total.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(expense)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            {expense.payment_status === 'unpaid' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsPaid(expense.expense_id!)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(expense.expense_id!)}
                              disabled={deleteExpense.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expense Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExpense ? t('expenses.editExpense') : t('expenses.newExpense')}</DialogTitle>
            <DialogDescription>
              {editingExpense ? t('expenses.updateExpenseDetails') : t('expenses.addNewExpenseEntry')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="property_id">{t('common.property')} *</Label>
                <Select
                  value={form.watch('property_id')}
                  onValueChange={(value) => form.setValue('property_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.selectProperty')} />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.property_id} value={property.property_id!}>
                        {property.property_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense_date">{t('expenses.expenseDate')} *</Label>
                <Input
                  type="date"
                  {...form.register('expense_date')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">{t('expenses.category')} *</Label>
                <Select
                  value={form.watch('category')}
                  onValueChange={(value) => form.setValue('category', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {t(`expenses.categories.${cat}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor_name">{t('expenses.vendor')}</Label>
                {(() => {
                  const currentVendor = form.watch('vendor_name');
                  const providerNames = providers?.map(p => p.provider_name) || [];
                  const isKnownProvider = providerNames.includes(currentVendor);
                  const isCustomVendor = currentVendor && currentVendor !== 'other' && !isKnownProvider;

                  return (
                    <>
                      <Select
                        value={isCustomVendor ? 'other' : currentVendor}
                        onValueChange={(value) => {
                          if (value === 'other') {
                            // Keep current custom value if already custom, else clear for input
                            if (!isCustomVendor) {
                              form.setValue('vendor_name', 'other');
                            }
                          } else {
                            form.setValue('vendor_name', value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('expenses.selectVendor')} />
                        </SelectTrigger>
                        <SelectContent>
                          {providers?.map((provider) => (
                            <SelectItem
                              key={provider.provider_id}
                              value={provider.provider_name}
                            >
                              {provider.provider_name}
                            </SelectItem>
                          ))}
                          <SelectItem value="other">{t('expenses.otherVendor')}</SelectItem>
                        </SelectContent>
                      </Select>
                      {(currentVendor === 'other' || isCustomVendor) && (
                        <Input
                          placeholder={t('expenses.enterCustomVendor')}
                          value={isCustomVendor ? currentVendor : ''}
                          onChange={(e) => form.setValue('vendor_name', e.target.value || 'other')}
                          className="mt-2"
                        />
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('expenses.expenseDescription')} *</Label>
              <Textarea
                {...form.register('description')}
                placeholder={t('expenses.expenseDescriptionPlaceholder')}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">{t('common.amount')} *</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('amount', { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_amount">{t('expenses.taxAmount')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('tax_amount', { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_status">{t('expenses.paymentStatus')} *</Label>
                <Select
                  value={form.watch('payment_status')}
                  onValueChange={(value) => form.setValue('payment_status', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">{t('expenses.status.unpaid')}</SelectItem>
                    <SelectItem value="paid">{t('expenses.status.paid')}</SelectItem>
                    <SelectItem value="partially_paid">{t('expenses.status.partially_paid')}</SelectItem>
                    <SelectItem value="refunded">{t('expenses.status.refunded')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">{t('common.paymentMethod')}</Label>
                <Select
                  value={form.watch('payment_method') || ''}
                  onValueChange={(value) => form.setValue('payment_method', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.selectMethod')} />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {t(`expenses.paymentMethods.${method}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t('common.notes')}</Label>
              <Textarea
                {...form.register('notes')}
                placeholder={t('common.additionalNotes')}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createExpense.isPending || updateExpense.isPending}>
                {editingExpense ? t('expenses.updateExpense') : t('expenses.createExpense')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
