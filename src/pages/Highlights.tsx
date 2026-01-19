import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
  FileText,
  Shield,
  AlertTriangle,
  BarChart3,
  Calendar,
  Loader2,
  PieChartIcon,
  Activity,
  FileDown,
  Star,
  RefreshCw,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTranslation } from "react-i18next";
import { format, subDays, isAfter, isBefore } from "date-fns";
import { useFinancialKPIs } from "@/hooks/useFinancialKPIs";
import { useFinancialAlerts } from "@/hooks/useFinancialAlerts";
import { useFinancialTrends } from "@/hooks/useFinancialTrends";
import { exportFinancialHighlightsToPDF } from "@/utils/exportFinancialHighlights";
import { toast } from "sonner";

const COLORS = ["#22c55e", "#f59e0b", "#f97316", "#ef4444"];

export default function Highlights() {
  const { t } = useTranslation();
  const kpis = useFinancialKPIs();
  const alerts = useFinancialAlerts();
  const trends = useFinancialTrends();
  const [isExporting, setIsExporting] = useState(false);

  const isRefreshing = kpis.isFetching || alerts.isFetching || trends.isFetching;

  const handleRefreshAll = () => {
    kpis.refetch();
    alerts.refetch();
    trends.refetch();
  };

  // Handle PDF export
  const handleExportPDF = async () => {
    setIsExporting(true);
    toast.info("Generating PDF report...");

    try {
      await exportFinancialHighlightsToPDF({
        kpis: {
          monthRevenue: kpis.monthRevenue || 0,
          monthRevenueChange: kpis.monthRevenueChange || 0,
          arAging: kpis.arAging || {
            current: 0,
            days30: 0,
            days60: 0,
            days90: 0,
            total: 0,
          },
          delinquencies: kpis.delinquencies || { count: 0, amount: 0 },
          commissionsDue: kpis.commissionsDue || { count: 0, amount: 0 },
          monthCosts: kpis.monthCosts || 0,
          monthCostsChange: kpis.monthCostsChange || 0,
          marginPerJob: kpis.marginPerJob || 0,
          marginPerJobChange: kpis.marginPerJobChange || 0,
          isLoading: false,
        },
        alerts: {
          invoicesNearingDue: alerts.invoicesNearingDue || [],
          coisExpiring: alerts.coisExpiring || [],
          slasAtRisk: alerts.slasAtRisk || [],
          isLoading: false,
        },
        includeCharts: true,
      });
      toast.success("PDF report downloaded successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to generate PDF report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Show loading state
  if (kpis.isLoading || alerts.isLoading || trends.isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading financial data...</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-600";
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4" />;
    if (change < 0) return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <PageHeader
        title="Financial Highlights"
        subtitle="Real-time financial KPIs and alerts for your business"
        icon={Star}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
            <Button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="gap-2"
              size="lg"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" />
                  Export PDF
              </>
            )}
          </Button>
          </>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Month Revenue */}
        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Month Revenue</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">{formatCurrency(kpis.monthRevenue || 0)}</h3>
                </div>
                <div className={`flex items-center gap-1 text-xs mt-1 ${getTrendColor(kpis.monthRevenueChange || 0)}`}>
                  {getTrendIcon(kpis.monthRevenueChange || 0)}
                  <span>{(kpis.monthRevenueChange || 0) > 0 ? "+" : ""}{(kpis.monthRevenueChange || 0).toFixed(1)}% from last month</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accounts Receivable Aging */}
        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">A/R Aging</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">{formatCurrency(kpis.arAging?.total || 0)}</h3>
                </div>
                <div className="space-y-1 mt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Current:</span>
                    <span className="font-medium">{formatCurrency(kpis.arAging?.current || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">30-60-90+:</span>
                    <span className="font-medium">{formatCurrency((kpis.arAging?.days30 || 0) + (kpis.arAging?.days60 || 0) + (kpis.arAging?.days90 || 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delinquencies */}
        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Delinquencies</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">{kpis.delinquencies?.count || 0}</h3>
                  <span className="text-xs text-muted-foreground">{formatCurrency(kpis.delinquencies?.amount || 0)} outstanding</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commissions Due */}
        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Commissions Due</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">{formatCurrency(kpis.commissionsDue?.amount || 0)}</h3>
                  <span className="text-xs text-muted-foreground">{kpis.commissionsDue?.count || 0} commission{(kpis.commissionsDue?.count || 0) !== 1 ? "s" : ""} pending</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Month Costs */}
        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Month Costs</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">{formatCurrency(kpis.monthCosts || 0)}</h3>
                </div>
                <div className={`flex items-center gap-1 text-xs mt-1 ${getTrendColor(-(kpis.monthCostsChange || 0))}`}>
                  {getTrendIcon(kpis.monthCostsChange || 0)}
                  <span>{(kpis.monthCostsChange || 0) > 0 ? "+" : ""}{(kpis.monthCostsChange || 0).toFixed(1)}% from last month</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Margin Per Job */}
        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Avg. Margin</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">{(kpis.marginPerJob || 0).toFixed(1)}%</h3>
                </div>
                <div className={`flex items-center gap-1 text-xs mt-1 ${getTrendColor(kpis.marginPerJobChange || 0)}`}>
                  {getTrendIcon(kpis.marginPerJobChange || 0)}
                  <span>{(kpis.marginPerJobChange || 0) > 0 ? "+" : ""}{(kpis.marginPerJobChange || 0).toFixed(1)}% from last month</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historical Trends - Full Width */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            6-Month Financial Trends
          </CardTitle>
        </CardHeader>
        <CardContent data-chart="trend">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={trends.monthlyData || []}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                yAxisId="left"
                className="text-xs"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                className="text-xs"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === "margin") {
                    return [`${value.toFixed(1)}%`, "Margin"];
                  }
                  return [
                    formatCurrency(value),
                    name === "revenue" ? "Revenue" : "Costs",
                  ];
                }}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="line" />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="#22c55e"
                strokeWidth={3}
                name="Revenue"
                dot={{ fill: "#22c55e", r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="costs"
                stroke="#f59e0b"
                strokeWidth={3}
                name="Costs"
                dot={{ fill: "#f59e0b", r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="margin"
                stroke="#8b5cf6"
                strokeWidth={3}
                strokeDasharray="5 5"
                name="Margin %"
                dot={{ fill: "#8b5cf6", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts and Analysis Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue vs Costs Trend */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Revenue vs Costs Trend
            </CardTitle>
          </CardHeader>
          <CardContent data-chart="revenue-costs">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={[
                  {
                    name: "Last Month",
                    revenue:
                      kpis.monthRevenue && kpis.monthRevenueChange
                        ? kpis.monthRevenue /
                          (1 + kpis.monthRevenueChange / 100)
                        : 0,
                    costs:
                      kpis.monthCosts && kpis.monthCostsChange
                        ? kpis.monthCosts / (1 + kpis.monthCostsChange / 100)
                        : 0,
                  },
                  {
                    name: "This Month",
                    revenue: kpis.monthRevenue || 0,
                    costs: kpis.monthCosts || 0,
                  },
                ]}
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="revenue"
                  fill="#22c55e"
                  name="Revenue"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="costs"
                  fill="#f59e0b"
                  name="Costs"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* A/R Aging Distribution */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              A/R Aging Distribution
            </CardTitle>
          </CardHeader>
          <CardContent data-chart="ar-aging">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Current", value: kpis.arAging?.current || 0 },
                    { name: "1-30 Days", value: kpis.arAging?.days30 || 0 },
                    { name: "31-60 Days", value: kpis.arAging?.days60 || 0 },
                    { name: "60+ Days", value: kpis.arAging?.days90 || 0 },
                  ].filter((item) => item.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: "Current", value: kpis.arAging?.current || 0 },
                    { name: "1-30 Days", value: kpis.arAging?.days30 || 0 },
                    { name: "31-60 Days", value: kpis.arAging?.days60 || 0 },
                    { name: "60+ Days", value: kpis.arAging?.days90 || 0 },
                  ]
                    .filter((item) => item.value > 0)
                    .map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Financial Health Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Financial Health Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Profit Margin Analysis */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    (kpis.marginPerJob || 0) > 30
                      ? "bg-green-500"
                      : (kpis.marginPerJob || 0) > 15
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                ></div>
                <h4 className="font-medium text-sm">Profit Margin Health</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                {(kpis.marginPerJob || 0) > 30
                  ? "Excellent: Your profit margin is strong and healthy."
                  : (kpis.marginPerJob || 0) > 15
                    ? "Good: Profit margin is acceptable but could be improved."
                    : "Needs Attention: Consider reviewing costs to improve margins."}
              </p>
            </div>

            {/* Cash Flow Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    (kpis.arAging?.total || 0) < (kpis.monthRevenue || 0) * 0.5
                      ? "bg-green-500"
                      : (kpis.arAging?.total || 0) < (kpis.monthRevenue || 0)
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                ></div>
                <h4 className="font-medium text-sm">Cash Flow Status</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                {(kpis.arAging?.total || 0) < (kpis.monthRevenue || 0) * 0.5
                  ? "Strong: Receivables are well-managed and current."
                  : (kpis.arAging?.total || 0) < (kpis.monthRevenue || 0)
                    ? "Moderate: Monitor aging receivables closely."
                    : "Critical: High receivables may impact cash flow."}
              </p>
            </div>

            {/* Delinquency Risk */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    (kpis.delinquencies?.count || 0) === 0
                      ? "bg-green-500"
                      : (kpis.delinquencies?.count || 0) < 5
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                ></div>
                <h4 className="font-medium text-sm">Delinquency Risk</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                {(kpis.delinquencies?.count || 0) === 0
                  ? "Excellent: No delinquent accounts."
                  : (kpis.delinquencies?.count || 0) < 5
                    ? "Manageable: Monitor and follow up on overdue accounts."
                    : "High Risk: Immediate action needed on delinquent accounts."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Section */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
        {/* Invoices Nearing Due */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-500" />
              Invoices Nearing Due
              {(alerts.invoicesNearingDue?.length || 0) > 0 && (
                <Badge variant="outline" className="ml-auto">
                  {alerts.invoicesNearingDue?.length || 0}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(alerts.invoicesNearingDue?.length || 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                No invoices due soon
              </p>
            ) : (
              <div className="space-y-2">
                {(alerts.invoicesNearingDue || [])
                  .slice(0, 5)
                  .map((invoice: any) => (
                    <div
                      key={invoice.id}
                      className="flex items-start justify-between p-2 rounded-md border"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{invoice.number}</p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.guest}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatCurrency(invoice.amount)}
                        </p>
                        <p className="text-xs text-orange-600">
                          Due {invoice.daysUntilDue} days
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* COIs Expiring */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-500" />
              COIs Expiring Soon
              {(alerts.coisExpiring?.length || 0) > 0 && (
                <Badge variant="outline" className="ml-auto">
                  {alerts.coisExpiring?.length || 0}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(alerts.coisExpiring?.length || 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                No COIs expiring soon
              </p>
            ) : (
              <div className="space-y-2">
                {(alerts.coisExpiring || []).slice(0, 5).map((coi: any) => (
                  <div
                    key={coi.id}
                    className="flex items-start justify-between p-2 rounded-md border"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{coi.vendor}</p>
                      <p className="text-xs text-muted-foreground">
                        {coi.type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-red-600">
                        Expires {coi.daysUntilExpiry} days
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SLAs at Risk */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              SLAs at Risk
              {(alerts.slasAtRisk?.length || 0) > 0 && (
                <Badge variant="outline" className="ml-auto">
                  {alerts.slasAtRisk?.length || 0}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(alerts.slasAtRisk?.length || 0) === 0 ? (
              <p className="text-sm text-muted-foreground">All SLAs on track</p>
            ) : (
              <div className="space-y-2">
                {(alerts.slasAtRisk || []).slice(0, 5).map((sla: any) => (
                  <div
                    key={sla.id}
                    className="flex items-start justify-between p-2 rounded-md border"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{sla.job}</p>
                      <p className="text-xs text-muted-foreground">
                        {sla.property}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-yellow-600">
                        Due {sla.hoursRemaining}h
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
