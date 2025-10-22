import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Building2,
  Calendar,
  Receipt,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  useDashboardSummary,
  useRevenueByProperty,
  useExpensesByCategory,
  useFinancialOverTime,
} from '@/hooks/useFinancialDashboard';
import { format } from 'date-fns';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function FinancialDashboard() {
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear() - 1, date.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  const { summary, loading: summaryLoading } = useDashboardSummary(dateFrom, dateTo);
  const { revenueByProperty, loading: revenueLoading } = useRevenueByProperty(dateFrom, dateTo);
  const { expensesByCategory, loading: expensesLoading } = useExpensesByCategory(dateFrom, dateTo);
  const { financialOverTime, loading: overTimeLoading } = useFinancialOverTime(dateFrom, dateTo);

  const isLoading = summaryLoading || revenueLoading || expensesLoading || overTimeLoading;

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-1">{label}</p>
          {payload.map((entry: { name: string; value: number; color: string }, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Financial Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive financial analytics and insights
          </p>
        </div>
      </div>

      {/* Date Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">Total Revenue</p>
                    <h3 className="text-2xl font-bold text-green-900 mt-1">
                      {formatCurrency(summary?.total_revenue || 0)}
                    </h3>
                    <p className="text-xs text-green-600 mt-1">
                      {summary?.paid_invoices || 0} paid invoices
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-red-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-700">Total Expenses</p>
                    <h3 className="text-2xl font-bold text-red-900 mt-1">
                      {formatCurrency(summary?.total_expenses || 0)}
                    </h3>
                    <p className="text-xs text-red-600 mt-1">All categories</p>
                  </div>
                  <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={cn(
                'border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02]',
                (summary?.net_income || 0) >= 0
                  ? 'bg-gradient-to-br from-emerald-50 to-emerald-100'
                  : 'bg-gradient-to-br from-orange-50 to-orange-100'
              )}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={cn(
                        'text-sm font-medium',
                        (summary?.net_income || 0) >= 0 ? 'text-emerald-700' : 'text-orange-700'
                      )}
                    >
                      Net Income
                    </p>
                    <h3
                      className={cn(
                        'text-2xl font-bold mt-1',
                        (summary?.net_income || 0) >= 0 ? 'text-emerald-900' : 'text-orange-900'
                      )}
                    >
                      {(summary?.net_income || 0) >= 0 ? '+' : ''}
                      {formatCurrency(summary?.net_income || 0)}
                    </h3>
                    <p
                      className={cn(
                        'text-xs mt-1',
                        (summary?.net_income || 0) >= 0 ? 'text-emerald-600' : 'text-orange-600'
                      )}
                    >
                      {(summary?.net_income || 0) >= 0 ? 'Profit' : 'Loss'}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'w-12 h-12 rounded-lg flex items-center justify-center',
                      (summary?.net_income || 0) >= 0 ? 'bg-emerald-500' : 'bg-orange-500'
                    )}
                  >
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Active Properties</p>
                    <h3 className="text-2xl font-bold text-blue-900 mt-1">
                      {summary?.total_properties || 0}
                    </h3>
                    <p className="text-xs text-blue-600 mt-1">
                      {summary?.active_bookings || 0} active bookings
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoice Status Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Paid Invoices</p>
                    <p className="text-2xl font-bold text-green-600">{summary?.paid_invoices || 0}</p>
                  </div>
                  <FileText className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Invoices</p>
                    <p className="text-2xl font-bold text-yellow-600">{summary?.pending_invoices || 0}</p>
                  </div>
                  <FileText className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Overdue Invoices</p>
                    <p className="text-2xl font-bold text-red-600">{summary?.overdue_invoices || 0}</p>
                  </div>
                  <FileText className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue & Expenses Over Time Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Revenue & Expenses Over Time
              </CardTitle>
              <CardDescription>Monthly financial performance trend</CardDescription>
            </CardHeader>
            <CardContent>
              {financialOverTime.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No financial data available for this period</p>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={financialOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(value) => format(new Date(value + '-01'), 'MMM yyyy')}
                    />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#22c55e"
                      strokeWidth={2}
                      name="Revenue"
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="Expenses"
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="net_income"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Net Income"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Revenue by Property & Expenses by Category */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Revenue by Property */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Revenue by Property
                </CardTitle>
                <CardDescription>Top performing properties</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueByProperty.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No property revenue data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={revenueByProperty} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                      <YAxis
                        type="category"
                        dataKey="property_name"
                        width={120}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="revenue" fill="#22c55e" name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Expenses by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Expenses by Category
                </CardTitle>
                <CardDescription>Expense distribution breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {expensesByCategory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No expense data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label={(entry) => `${entry.category.replace(/_/g, ' ')}: ${entry.percentage.toFixed(1)}%`}
                        labelLine
                      >
                        {expensesByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Legend
                        formatter={(value) => value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Property Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Property Performance Details
              </CardTitle>
              <CardDescription>Comprehensive property metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueByProperty.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No property data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Property</th>
                        <th className="text-right py-3 px-4 font-semibold">Revenue</th>
                        <th className="text-right py-3 px-4 font-semibold">Invoices</th>
                        <th className="text-right py-3 px-4 font-semibold">Occupancy Days</th>
                        <th className="text-right py-3 px-4 font-semibold">Avg/Invoice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueByProperty.map((property, index) => (
                        <tr key={property.property_id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">{property.property_name}</td>
                          <td className="py-3 px-4 text-right text-green-600 font-semibold">
                            {formatCurrency(property.revenue)}
                          </td>
                          <td className="py-3 px-4 text-right">{property.invoice_count}</td>
                          <td className="py-3 px-4 text-right">{property.occupancy_days}</td>
                          <td className="py-3 px-4 text-right">
                            {formatCurrency(property.revenue / property.invoice_count)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
