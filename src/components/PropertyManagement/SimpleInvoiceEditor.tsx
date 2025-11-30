import { useState, useEffect } from "react";
import { Invoice, InvoiceLineItemInsert, BillTemplateWithItems } from "@/lib/schemas";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { useUpdateInvoice } from "@/hooks/useInvoices";
import { useQueryClient } from "@tanstack/react-query";
import { invoiceKeys } from "@/hooks/useInvoices";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import BillTemplateSelector from "@/components/BillTemplateSelector";
import {
  FileText,
  X,
  Save,
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  FileStack,
} from "lucide-react";

interface SimpleInvoiceEditorProps {
  invoice: Invoice;
  onSave: () => void;
  onCancel: () => void;
}

const invoiceStatuses = ["draft", "sent", "paid", "overdue", "cancelled", "refunded"];
const LINE_ITEM_TYPES = ["accommodation", "cleaning", "extras", "tax", "commission", "other"];

export function SimpleInvoiceEditor({
  invoice,
  onSave,
  onCancel,
}: SimpleInvoiceEditorProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutateAsync: updateInvoice, isPending: isSaving } = useUpdateInvoice();

  const [formData, setFormData] = useState({
    status: invoice.status || "draft",
    due_date: invoice.due_date || "",
    payment_method: invoice.payment_method || "",
    notes: invoice.notes || "",
  });

  // Line items state
  const [lineItems, setLineItems] = useState<InvoiceLineItemInsert[]>([]);
  const [nextLineNumber, setNextLineNumber] = useState(1);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isLineItemsOpen, setIsLineItemsOpen] = useState(true);

  // Initialize line items from invoice
  useEffect(() => {
    if (invoice.line_items && Array.isArray(invoice.line_items)) {
      const items = invoice.line_items.map((item: any) => ({
        invoice_id: invoice.invoice_id!,
        line_number: item.line_number,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate || 0,
        tax_amount: item.tax_amount || 0,
        item_type: item.item_type || "other",
      }));
      setLineItems(items);
      if (items.length > 0) {
        setNextLineNumber(Math.max(...items.map((i) => i.line_number)) + 1);
      }
    }
  }, [invoice]);

  // Add a new line item
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        invoice_id: invoice.invoice_id!,
        line_number: nextLineNumber,
        description: "",
        quantity: 1,
        unit_price: 0,
        tax_rate: 0,
        tax_amount: 0,
        item_type: "other",
      },
    ]);
    setNextLineNumber(nextLineNumber + 1);
  };

  // Remove a line item
  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Update a line item field
  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;

    // Auto-calculate tax amount if tax rate or unit price changes
    if (field === "tax_rate" || field === "unit_price" || field === "quantity") {
      const quantity = field === "quantity" ? value : updated[index].quantity;
      const unitPrice = field === "unit_price" ? value : updated[index].unit_price;
      const taxRate = field === "tax_rate" ? value : updated[index].tax_rate;
      const subtotal = quantity * unitPrice;
      updated[index].tax_amount = subtotal * (taxRate / 100);
    }

    setLineItems(updated);
  };

  // Handle adding line items from selected templates
  const handleTemplatesSelected = (templates: BillTemplateWithItems[]) => {
    let currentLineNumber = nextLineNumber;
    const newItems: InvoiceLineItemInsert[] = [];

    templates.forEach((template) => {
      template.items?.forEach((item) => {
        newItems.push({
          invoice_id: invoice.invoice_id!,
          line_number: currentLineNumber++,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          tax_amount: item.tax_amount,
          item_type: item.item_type,
        });
      });
    });

    setLineItems([...lineItems, ...newItems]);
    setNextLineNumber(currentLineNumber);
    setIsTemplateOpen(false);

    const templateNames = templates.map((t) => t.template_name).join(", ");
    toast({
      title: t("invoices.templatesAdded"),
      description: `${t("invoices.addedLineItems", { count: newItems.length })}: ${templateNames}`,
    });
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const taxAmount = lineItems.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleSave = async () => {
    try {
      const totals = calculateTotals();

      // Step 1: Update invoice with form data and new totals
      await updateInvoice({
        invoiceId: invoice.invoice_id!,
        updates: {
          status: formData.status,
          due_date: formData.due_date,
          payment_method: formData.payment_method,
          notes: formData.notes,
          subtotal: totals.subtotal,
          tax_amount: totals.taxAmount,
          total_amount: totals.total,
        },
      });

      // Step 2: Delete existing line items
      const { error: deleteError } = await supabase
        .from("invoice_line_items")
        .delete()
        .eq("invoice_id", invoice.invoice_id!);

      if (deleteError) {
        console.error("Error deleting line items:", deleteError);
        throw deleteError;
      }

      // Step 3: Insert new line items if there are any
      if (lineItems.length > 0) {
        const lineItemsToInsert = lineItems.map((item) => ({
          invoice_id: invoice.invoice_id!,
          line_number: item.line_number,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          tax_amount: item.tax_amount,
          item_type: item.item_type,
        }));

        const { error: insertError } = await supabase
          .from("invoice_line_items")
          .insert(lineItemsToInsert);

        if (insertError) {
          console.error("Error inserting line items:", insertError);
          throw insertError;
        }
      }

      // Invalidate and refetch invoice data
      await queryClient.invalidateQueries({ queryKey: invoiceKeys.all });

      toast({
        title: t("common.success"),
        description: t("invoices.invoiceUpdatedSuccess"),
      });

      onSave();
    } catch (error: any) {
      console.error("Error saving invoice:", error);
      toast({
        title: t("common.error"),
        description: error.message || t("invoices.invoiceUpdateError"),
        variant: "destructive",
      });
    }
  };

  const totals = calculateTotals();

  return (
    <Card className="border-2 border-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            {t("propertyBookingsInvoices.editor.title")} - {invoice.invoice_number}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status and Due Date */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("propertyBookingsInvoices.editor.status")}</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {invoiceStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`invoices.status.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("propertyBookingsInvoices.editor.dueDate")}</Label>
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-2">
          <Label>{t("propertyBookingsInvoices.editor.paymentMethod")}</Label>
          <Input
            value={formData.payment_method}
            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
            placeholder="Credit Card, Cash, Bank Transfer..."
          />
        </div>

        {/* Bill Template Selector */}
        <Collapsible open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between" type="button">
              <span className="flex items-center gap-2">
                <FileStack className="h-4 w-4" />
                {t("invoices.addFromTemplate")}
              </span>
              {isTemplateOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <BillTemplateSelector
              propertyId={invoice.property_id}
              onTemplatesSelected={handleTemplatesSelected}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Line Items Section */}
        <Collapsible open={isLineItemsOpen} onOpenChange={setIsLineItemsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between" type="button">
              <span className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {t("invoices.lineItems")} ({lineItems.length})
              </span>
              {isLineItemsOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="space-y-4">
              {/* Add Line Item Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLineItem}
                className="w-full border-dashed"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("invoices.addLineItem")}
              </Button>

              {/* Line Items Table */}
              {lineItems.length > 0 ? (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">{t("invoices.description")}</TableHead>
                        <TableHead className="w-20">{t("invoices.type")}</TableHead>
                        <TableHead className="w-20 text-right">{t("invoices.qty")}</TableHead>
                        <TableHead className="w-24 text-right">{t("invoices.unitPrice")}</TableHead>
                        <TableHead className="w-20 text-right">{t("invoices.taxPercent")}</TableHead>
                        <TableHead className="w-24 text-right">{t("invoices.total")}</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item, index) => {
                        const lineTotal = item.quantity * item.unit_price + (item.tax_amount || 0);
                        return (
                          <TableRow key={index}>
                            <TableCell>
                              <Input
                                value={item.description}
                                onChange={(e) => updateLineItem(index, "description", e.target.value)}
                                placeholder={t("invoices.descriptionPlaceholder")}
                                className="h-8 text-sm"
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={item.item_type}
                                onValueChange={(value) => updateLineItem(index, "item_type", value)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {LINE_ITEM_TYPES.map((type) => (
                                    <SelectItem key={type} value={type} className="text-xs">
                                      {t(`invoices.itemTypes.${type}`)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                value={item.quantity}
                                onChange={(e) => updateLineItem(index, "quantity", parseFloat(e.target.value) || 0)}
                                className="h-8 text-sm text-right"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => updateLineItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                                className="h-8 text-sm text-right"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={item.tax_rate}
                                onChange={(e) => updateLineItem(index, "tax_rate", parseFloat(e.target.value) || 0)}
                                className="h-8 text-sm text-right"
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${lineTotal.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLineItem(index)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground border rounded-md border-dashed">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t("invoices.noLineItems")}</p>
                  <p className="text-xs mt-1">{t("invoices.addLineItemsHint")}</p>
                </div>
              )}

              {/* Totals Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t("invoices.subtotal")}</span>
                  <span>${totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t("invoices.tax")}</span>
                  <span>${totals.taxAmount.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>{t("invoices.total")}</span>
                  <span className="text-primary">${totals.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Notes */}
        <div className="space-y-2">
          <Label>{t("propertyBookingsInvoices.editor.notes")}</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes..."
            rows={3}
          />
        </div>
      </CardContent>

      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          {t("propertyBookingsInvoices.editor.cancel")}
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("propertyBookingsInvoices.editor.saving")}
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {t("propertyBookingsInvoices.editor.save")}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
