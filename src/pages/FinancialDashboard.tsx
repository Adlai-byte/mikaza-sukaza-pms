import React, { useState } from "react";
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
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Building2,
  Calendar,
  Receipt,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  useDashboardSummary,
  useRevenueByProperty,
  useExpensesByCategory,
  useFinancialOverTime,
} from "@/hooks/useFinancialDashboard";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

const COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

export default function FinancialDashboard() {
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear() - 1, date.getMonth(), 1)
      .toISOString()
      .split("T")[0];
  });
  const [dateTo, setDateTo] = useState(
    () => new Date().toISOString().split("T")[0],
  );

  const { summary, loading: summaryLoading, refetch: refetchSummary } = useDashboardSummary(
    dateFrom,
    dateTo,
  );
  const { revenueByProperty, loading: revenueLoading, refetch: refetchRevenue } = useRevenueByProperty(
    dateFrom,
    dateTo,
  );
  const { expensesByCategory, loading: expensesLoading, refetch: refetchExpenses } =
    useExpensesByCategory(dateFrom, dateTo);
  const { financialOverTime, loading: overTimeLoading, refetch: refetchOverTime } = useFinancialOverTime(
    dateFrom,
    dateTo,
  );

  const isLoading =
    summaryLoading || revenueLoading || expensesLoading || overTimeLoading;

  const handleRefreshAll = () => {
    refetchSummary();
    refetchRevenue();
    refetchExpenses();
    refetchOverTime();
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Custom tooltip for charts
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-1">{label}</p>
          {payload.map(
            (
              entry: { name: string; value: number; color: string },
              index: number,
            ) => (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: {formatCurrency(entry.value)}
              </p>
            ),
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Financial Dashboard"
        subtitle={t("financialDashboard.subtitle")}
        icon={TrendingUp}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        }
      />

      {/* Date Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("financialDashboard.dateRange")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">
                {t("financialDashboard.fromDate")}
              </Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">{t("financialDashboard.toDate")}</Label>
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
            <Card className="transition-colors hover:bg-accent/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">
                      {t("financialDashboard.summaryCards.totalRevenue")}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-2xl font-semibold">
                        {formatCurrency(summary?.total_revenue || 0)}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {summary?.paid_invoices || 0} {t("financialDashboard.summaryCards.paidInvoices")}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="transition-colors hover:bg-accent/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">
                      {t("financialDashboard.summaryCards.totalExpenses")}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-2xl font-semibold">
                        {formatCurrency(summary?.total_expenses || 0)}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {t("financialDashboard.summaryCards.allCategories")}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="transition-colors hover:bg-accent/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Net Income</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-2xl font-semibold">
                        {(summary?.net_income || 0) >= 0 ? "+" : ""}
                        {formatCurrency(summary?.net_income || 0)}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {(summary?.net_income || 0) >= 0
                          ? t("financialDashboard.summaryCards.profit")
                          : t("financialDashboard.summaryCards.loss")}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="transition-colors hover:bg-accent/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">
                      {t("financialDashboard.summaryCards.activeProperties")}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-2xl font-semibold">
                        {summary?.total_properties || 0}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {summary?.active_bookings || 0} {t("financialDashboard.summaryCards.activeBookings")}
                      </span>
                    </div>
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
                    <p className="text-sm text-muted-foreground">
                      {t("financialDashboard.invoiceStatus.paidInvoices")}
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {summary?.paid_invoices || 0}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("financialDashboard.invoiceStatus.pendingInvoices")}
                    </p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {summary?.pending_invoices || 0}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("financialDashboard.invoiceStatus.overdueInvoices")}
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                      {summary?.overdue_invoices || 0}
                    </p>
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
              <CardDescription>
                {t("financialDashboard.charts.monthlyTrend")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {financialOverTime.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t("financialDashboard.charts.noFinancialData")}
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={financialOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(value) =>
                        format(new Date(value + "-01"), "MMM yyyy")
                      }
                    />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#22c55e"
                      strokeWidth={2}
                      name={t("financialDashboard.charts.revenue")}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name={t("financialDashboard.charts.expenses")}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="net_income"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name={t("financialDashboard.charts.netIncome")}
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
                <CardDescription>
                  {t("financialDashboard.charts.topPerforming")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {revenueByProperty.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {t("financialDashboard.charts.noPropertyRevenue")}
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={revenueByProperty} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        tickFormatter={(value) => formatCurrency(value)}
                      />
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
                <CardDescription>
                  {t("financialDashboard.charts.expenseBreakdown")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {expensesByCategory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {t("financialDashboard.charts.noExpenseData")}
                  </p>
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
                        label={(entry) =>
                          `${entry.category.replace(/_/g, " ")}: ${entry.percentage.toFixed(1)}%`
                        }
                        labelLine
                      >
                        {expensesByCategory.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Legend
                        formatter={(value) =>
                          value
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())
                        }
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
              <CardDescription>
                {t("financialDashboard.propertyPerformance.subtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {revenueByProperty.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t("financialDashboard.propertyPerformance.noPropertyData")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">
                          {t(
                            "financialDashboard.propertyPerformance.tableHeaders.property",
                          )}
                        </th>
                        <th className="text-right py-3 px-4 font-semibold">
                          {t(
                            "financialDashboard.propertyPerformance.tableHeaders.revenue",
                          )}
                        </th>
                        <th className="text-right py-3 px-4 font-semibold">
                          {t(
                            "financialDashboard.propertyPerformance.tableHeaders.invoices",
                          )}
                        </th>
                        <th className="text-right py-3 px-4 font-semibold">
                          {t(
                            "financialDashboard.propertyPerformance.tableHeaders.occupancyDays",
                          )}
                        </th>
                        <th className="text-right py-3 px-4 font-semibold">
                          {t(
                            "financialDashboard.propertyPerformance.tableHeaders.avgPerInvoice",
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueByProperty.map((property, index) => (
                        <tr
                          key={property.property_id}
                          className="border-b hover:bg-muted/50"
                        >
                          <td className="py-3 px-4 font-medium">
                            {property.property_name}
                          </td>
                          <td className="py-3 px-4 text-right text-green-600 font-semibold">
                            {formatCurrency(property.revenue)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {property.invoice_count}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {property.occupancy_days}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {formatCurrency(
                              property.revenue / property.invoice_count,
                            )}
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
