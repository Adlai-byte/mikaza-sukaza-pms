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
import { ExpenseInsert } from '@/lib/schemas';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { expenseSchema } from '@/lib/schemas';

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

  const { expenses, loading } = useExpenses(filters);
  const { properties } = usePropertiesOptimized();
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
    if (confirm('Are you sure you want to delete this expense?')) {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Receipt className="h-8 w-8" />
            Expenses
          </h1>
          <p className="text-muted-foreground mt-1">
            Track property expenses and vendor payments
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          New Expense
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Expenses</p>
                <h3 className="text-3xl font-bold text-blue-900 mt-1">{stats.total}</h3>
                <p className="text-xs text-blue-600 mt-1">All time</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Receipt className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Total Amount</p>
                <h3 className="text-3xl font-bold text-purple-900 mt-1">
                  ${stats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-xs text-purple-600 mt-1">Combined total</p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <Receipt className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Paid</p>
                <h3 className="text-3xl font-bold text-green-900 mt-1">
                  ${stats.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-xs text-green-600 mt-1">{stats.paid} paid expenses</p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Outstanding</p>
                <h3 className="text-3xl font-bold text-amber-900 mt-1">
                  ${stats.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-xs text-amber-600 mt-1">Pending payment</p>
              </div>
              <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Property Filter */}
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger>
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map((property) => (
                  <SelectItem key={property.property_id} value={property.property_id!}>
                    {property.property_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partially_paid">Partially Paid</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range */}
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="From"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="To"
              />
            </div>
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
              <p className="text-lg font-medium">No expenses found</p>
              <p className="text-sm">Add your first expense to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'New Expense'}</DialogTitle>
            <DialogDescription>
              {editingExpense ? 'Update expense details' : 'Add a new expense entry'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="property_id">Property *</Label>
                <Select
                  value={form.watch('property_id')}
                  onValueChange={(value) => form.setValue('property_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
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
                <Label htmlFor="expense_date">Date *</Label>
                <Input
                  type="date"
                  {...form.register('expense_date')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
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
                        {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor_name">Vendor</Label>
                <Input
                  {...form.register('vendor_name')}
                  placeholder="Vendor name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                {...form.register('description')}
                placeholder="Expense description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('amount', { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_amount">Tax Amount</Label>
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
                <Label htmlFor="payment_status">Payment Status *</Label>
                <Select
                  value={form.watch('payment_status')}
                  onValueChange={(value) => form.setValue('payment_status', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partially_paid">Partially Paid</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={form.watch('payment_method') || ''}
                  onValueChange={(value) => form.setValue('payment_method', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                {...form.register('notes')}
                placeholder="Additional notes"
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createExpense.isPending || updateExpense.isPending}>
                {editingExpense ? 'Update' : 'Create'} Expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
