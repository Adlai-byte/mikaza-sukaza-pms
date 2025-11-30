import { Invoice } from "@/lib/schemas";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  FileText,
  CreditCard,
  Download,
  Mail,
  Pencil,
  Calendar,
} from "lucide-react";
import { InvoiceLineItemsSummary } from "./InvoiceLineItemsSummary";

interface InvoiceCardProps {
  invoice: Invoice;
  onEdit: () => void;
  onRecordPayment: () => void;
  onDownloadPdf: () => void;
}

const statusConfig: Record<string, { color: string; borderColor: string }> = {
  draft: { color: "bg-gray-100 text-gray-800", borderColor: "border-l-gray-400" },
  sent: { color: "bg-blue-100 text-blue-800", borderColor: "border-l-blue-400" },
  paid: { color: "bg-green-100 text-green-800", borderColor: "border-l-green-500" },
  overdue: { color: "bg-red-100 text-red-800", borderColor: "border-l-red-500" },
  cancelled: { color: "bg-gray-100 text-gray-500", borderColor: "border-l-gray-400" },
  refunded: { color: "bg-purple-100 text-purple-800", borderColor: "border-l-purple-400" },
};

export function InvoiceCard({
  invoice,
  onEdit,
  onRecordPayment,
  onDownloadPdf,
}: InvoiceCardProps) {
  const { t } = useTranslation();

  const status = invoice.status || "draft";
  const config = statusConfig[status] || statusConfig.draft;

  const totalAmount = invoice.total_amount || 0;
  const amountPaid = invoice.amount_paid || 0;
  const balanceDue = totalAmount - amountPaid;

  return (
    <Card className={cn("border-l-4 hover:shadow-md transition-shadow", config.borderColor)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-semibold text-base">{invoice.invoice_number}</h4>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{invoice.guest_name}</p>
          </div>
          <Badge className={config.color}>
            {t(`invoices.status.${status}`)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-3 space-y-4">
        {/* Dates */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Issue:</span>
            <span>{invoice.issue_date ? format(parseISO(invoice.issue_date), "MMM dd, yyyy") : "N/A"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Due:</span>
            <span className={cn(status === "overdue" && "text-red-600 font-medium")}>
              {invoice.due_date ? format(parseISO(invoice.due_date), "MMM dd, yyyy") : "N/A"}
            </span>
          </div>
        </div>

        {/* Amount Summary */}
        <div className="grid grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{t("propertyBookingsInvoices.total")}</p>
            <p className="font-bold text-lg">${totalAmount.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{t("propertyBookingsInvoices.paid")}</p>
            <p className="font-bold text-lg text-green-600">${amountPaid.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{t("propertyBookingsInvoices.balance")}</p>
            <p className={cn(
              "font-bold text-lg",
              balanceDue > 0 ? "text-orange-600" : "text-green-600"
            )}>
              ${balanceDue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Line Items Summary */}
        {invoice.line_items && invoice.line_items.length > 0 && (
          <InvoiceLineItemsSummary lineItems={invoice.line_items} />
        )}
      </CardContent>

      <CardFooter className="pt-0 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          {t("propertyBookingsInvoices.editInvoice")}
        </Button>

        {balanceDue > 0 && status !== "cancelled" && (
          <Button variant="default" size="sm" onClick={onRecordPayment}>
            <CreditCard className="mr-1.5 h-3.5 w-3.5" />
            {t("propertyBookingsInvoices.recordPayment")}
          </Button>
        )}

        <Button variant="ghost" size="sm" onClick={onDownloadPdf}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          {t("propertyBookingsInvoices.downloadPdf")}
        </Button>
      </CardFooter>
    </Card>
  );
}
