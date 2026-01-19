import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useKeyTransactions } from "@/hooks/useKeyControl";
import {
  PropertyKeySummary,
  KEY_TYPE_LABELS,
  KEY_CATEGORY_LABELS,
} from "@/lib/schemas";
import { format } from "date-fns";

interface TransactionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: PropertyKeySummary | null;
}

export function TransactionHistoryDialog({
  open,
  onOpenChange,
  property,
}: TransactionHistoryDialogProps) {
  const { t } = useTranslation();

  const { data: transactions = [], isLoading } = useKeyTransactions(
    property ? { property_id: property.property_id } : {}
  );

  // Filter transactions for this property (if property is null, show all)
  const filteredTransactions = property
    ? transactions.filter((tx) => tx.property_id === property.property_id)
    : transactions;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {t("keyControl.historyDialog.title", "Transaction History")}
          </DialogTitle>
          <DialogDescription>
            {property
              ? t(
                  "keyControl.historyDialog.descriptionProperty",
                  "Key transfer history for {{property}}",
                  { property: property.property_name }
                )
              : t(
                  "keyControl.historyDialog.descriptionAll",
                  "All key transfer history"
                )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground">
                {t("keyControl.historyDialog.noTransactions", "No transactions found")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("keyControl.date", "Date")}</TableHead>
                  {!property && (
                    <TableHead>{t("keyControl.property", "Property")}</TableHead>
                  )}
                  <TableHead>{t("keyControl.keyType", "Key Type")}</TableHead>
                  <TableHead>{t("keyControl.transfer", "Transfer")}</TableHead>
                  <TableHead className="text-center">
                    {t("keyControl.quantity", "Qty")}
                  </TableHead>
                  <TableHead>{t("keyControl.performedBy", "By")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(transaction.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    {!property && (
                      <TableCell>
                        {transaction.property?.property_name || "—"}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="secondary">
                        {KEY_TYPE_LABELS[transaction.key_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-sm">
                          {KEY_CATEGORY_LABELS[transaction.from_category]}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {KEY_CATEGORY_LABELS[transaction.to_category]}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge>{transaction.quantity}</Badge>
                    </TableCell>
                    <TableCell>
                      {transaction.performer
                        ? `${transaction.performer.first_name} ${transaction.performer.last_name}`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
