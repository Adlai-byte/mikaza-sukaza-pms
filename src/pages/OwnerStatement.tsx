import React, { useState } from "react";
import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Building2,
  Receipt,
  FileBarChart,
  Layers,
  Users,
  PieChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useOwnerStatement } from "@/hooks/useFinancialReports";
import { usePropertiesOptimized } from "@/hooks/usePropertiesOptimized";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { generateOwnerStatementPDF } from "@/lib/pdf-generator";
import { useToast } from "@/hooks/use-toast";

export default function OwnerStatement() {
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1)
      .toISOString()
      .split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
  });

  const { properties } = usePropertiesOptimized();
  const { statement, loading } = useOwnerStatement(
    selectedProperty,
    dateFrom,
    dateTo,
  );
  const { toast } = useToast();

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!statement) {
      toast({
        title: "No Data Available",
        description: "Please select a property to generate the owner statement",
        variant: "destructive",
      });
      return;
    }

    try {
      generateOwnerStatementPDF(statement);
      toast({
        title: "PDF Generated",
        description: "Owner statement PDF has been downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
      console.error("PDF generation error:", error);
    }
  };

  if (!selectedProperty && properties.length > 0) {
    setSelectedProperty(properties[0].property_id!);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="print:hidden">
        <PageHeader
          title="Owner Statement"
          subtitle="Property financial performance report"
          icon={FileBarChart}
          actions={
            <>
              <Button variant="outline" onClick={handlePrint}>
                <FileText className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </>
          }
        />
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-lg">Report Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Property</label>
              <Select
                value={selectedProperty}
                onValueChange={setSelectedProperty}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem
                      key={property.property_id}
                      value={property.property_id!}
                    >
                      {property.property_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Period Start</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Period End</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : !statement ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <FileBarChart className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm">
              Select a property to view the owner statement
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Report Header */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Building2 className="h-6 w-6" />
                    {statement.property_name}
                  </CardTitle>
                  <CardDescription className="mt-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Period:{" "}
                    {format(
                      new Date(statement.period_start),
                      "MMM d, yyyy",
                    )} - {format(new Date(statement.period_end), "MMM d, yyyy")}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    Generated on
                  </div>
                  <div className="font-medium">
                    {format(new Date(), "MMM d, yyyy")}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Summary Cards */}
          <div className={cn(
            "grid gap-4",
            statement.credits?.total > 0 ? "md:grid-cols-4" : "md:grid-cols-3"
          )}>
            <Card className="transition-colors hover:bg-accent/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-2xl font-semibold">
                        ${statement.revenue.total.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </h3>
                      <span className="text-xs text-muted-foreground">{statement.revenue.by_invoice.length} invoice(s)</span>
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
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-2xl font-semibold">
                        ${statement.expenses.total.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </h3>
                      <span className="text-xs text-muted-foreground">{statement.expenses.by_expense.length} expense(s)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Credits Card - only show if there are credits */}
            {statement.credits?.total > 0 && (
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground">Credits/Refunds</p>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-semibold text-green-600">
                          +${statement.credits.total.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </h3>
                        <span className="text-xs text-muted-foreground">{statement.credits.by_credit.length} credit(s)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="transition-colors hover:bg-accent/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Net Income</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className={cn(
                        "text-2xl font-semibold",
                        statement.net_income >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {statement.net_income >= 0 ? "+" : ""}${statement.net_income.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </h3>
                      <span className="text-xs text-muted-foreground">{statement.net_income >= 0 ? "Profit" : "Loss"}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Revenue Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statement.revenue.by_invoice.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No revenue in this period
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Guest</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statement.revenue.by_invoice.map((invoice, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell>{invoice.guest_name}</TableCell>
                        <TableCell>
                          {format(new Date(invoice.issue_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          $
                          {invoice.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell colSpan={3} className="text-right">
                        Total Revenue
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        $
                        {statement.revenue.total.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Unit Revenue Allocations (for multi-unit properties) */}
          {statement.unit_allocations?.has_allocations && (
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <Layers className="h-5 w-5" />
                  Unit Revenue Allocations
                </CardTitle>
                <CardDescription>
                  Revenue from entire-property bookings split among unit owners
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary by Unit */}
                <div>
                  <h4 className="text-sm font-semibold text-purple-700 mb-3 flex items-center gap-2">
                    <PieChart className="h-4 w-4" />
                    Allocation by Unit
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-center">Bookings</TableHead>
                        <TableHead className="text-center">Share %</TableHead>
                        <TableHead className="text-right">Allocated Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statement.unit_allocations.by_unit.map((unit, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full" />
                              {unit.unit_name}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {unit.booking_count}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">
                              {unit.share_percentage.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium text-purple-700">
                            ${unit.allocated_amount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-purple-100/50 font-medium">
                        <TableCell colSpan={3} className="text-right">
                          Total Allocated
                        </TableCell>
                        <TableCell className="text-right text-purple-800">
                          ${statement.unit_allocations.total_allocated.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Breakdown by Booking */}
                {statement.unit_allocations.by_booking.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-purple-700 mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Entire-Property Booking Details
                    </h4>
                    <div className="space-y-3">
                      {statement.unit_allocations.by_booking.map((booking, index) => (
                        <div key={index} className="bg-white border border-purple-100 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="font-medium">{booking.guest_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(booking.check_in_date), "MMM d")} - {format(new Date(booking.check_out_date), "MMM d, yyyy")}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Total</div>
                              <div className="font-bold">
                                ${booking.total_amount.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {booking.allocations.map((alloc, allocIndex) => (
                              <div key={allocIndex} className="bg-purple-50 rounded px-3 py-2 text-sm">
                                <div className="text-purple-600 font-medium truncate">{alloc.unit_name}</div>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs text-purple-500">{alloc.share_percentage.toFixed(1)}%</span>
                                  <span className="font-semibold text-purple-800">
                                    ${alloc.allocated_amount.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                    })}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Expenses by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Expenses by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statement.expenses.by_category.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No expenses in this period
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statement.expenses.by_category.map((category, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium capitalize">
                          {category.category.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="text-right">
                          {category.count}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          $
                          {category.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell colSpan={2} className="text-right">
                        Total Expenses
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        $
                        {statement.expenses.total.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Expense Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Expense Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statement.expenses.by_expense.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No expenses in this period
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statement.expenses.by_expense.map((expense, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {format(new Date(expense.date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{expense.vendor}</TableCell>
                        <TableCell className="capitalize">
                          {expense.category.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {expense.description}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          $
                          {expense.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Credits Details - only show if there are credits */}
          {statement.credits?.by_credit && statement.credits.by_credit.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Credits / Refunds Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statement.credits.by_credit.map((credit, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {format(new Date(credit.date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{credit.vendor}</TableCell>
                        <TableCell className="capitalize">
                          {credit.category.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {credit.description}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          +$
                          {credit.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell colSpan={4} className="text-right">
                        Total Credits
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        +$
                        {statement.credits.total.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Summary Footer */}
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-lg">
                  <span className="font-medium">Total Revenue:</span>
                  <span className="font-bold text-green-600">
                    $
                    {statement.revenue.total.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-lg">
                  <span className="font-medium">Total Expenses:</span>
                  <span className="font-bold text-red-600">
                    -$
                    {statement.expenses.total.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                {/* Credits line - only show if there are credits */}
                {statement.credits?.total > 0 && (
                  <div className="flex items-center justify-between text-lg">
                    <span className="font-medium">Credits / Refunds:</span>
                    <span className="font-bold text-green-600">
                      +$
                      {statement.credits.total.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between text-2xl">
                  <span className="font-bold">Net Income:</span>
                  <span
                    className={cn(
                      "font-bold",
                      statement.net_income >= 0
                        ? "text-green-600"
                        : "text-red-600",
                    )}
                  >
                    {statement.net_income >= 0 ? "+" : ""}$
                    {statement.net_income.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
