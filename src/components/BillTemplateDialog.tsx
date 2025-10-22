import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { usePropertiesOptimized } from '@/hooks/usePropertiesOptimized';
import {
  useCreateBillTemplate,
  useUpdateBillTemplate,
} from '@/hooks/useBillTemplates';
import {
  BillTemplateWithItems,
  BillTemplateInsert,
  BillTemplateItemInsert,
} from '@/lib/schemas';
import { cn } from '@/lib/utils';

interface BillTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  template?: BillTemplateWithItems | null;
  defaultPropertyId?: string;
}

const LINE_ITEM_TYPES = ['accommodation', 'cleaning', 'extras', 'tax', 'commission', 'other'];

// Helper function to convert to sentence case
const toSentenceCase = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export default function BillTemplateDialog({
  open,
  onClose,
  template,
  defaultPropertyId,
}: BillTemplateDialogProps) {
  const isEditing = !!template;
  const { properties } = usePropertiesOptimized();
  const createTemplate = useCreateBillTemplate();
  const updateTemplate = useUpdateBillTemplate();

  // Form state
  const [templateName, setTemplateName] = useState('');
  const [propertyId, setPropertyId] = useState(defaultPropertyId || '');
  const [description, setDescription] = useState('');
  const [lineItems, setLineItems] = useState<BillTemplateItemInsert[]>([]);
  const [nextLineNumber, setNextLineNumber] = useState(1);

  // Load template data if editing
  useEffect(() => {
    if (template && isEditing) {
      setTemplateName(template.template_name);
      setPropertyId(template.property_id);
      setDescription(template.description || '');

      if (template.items && template.items.length > 0) {
        const items = template.items.map((item) => ({
          template_id: template.template_id!,
          line_number: item.line_number,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          tax_amount: item.tax_amount,
          item_type: item.item_type,
        }));
        setLineItems(items);
        setNextLineNumber(Math.max(...items.map((i) => i.line_number)) + 1);
      }
    } else {
      // Reset for new template
      setTemplateName('');
      setPropertyId(defaultPropertyId || '');
      setDescription('');
      setLineItems([]);
      setNextLineNumber(1);
    }
  }, [template, isEditing, defaultPropertyId, open]);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        template_id: '',
        line_number: nextLineNumber,
        description: '',
        quantity: 1,
        unit_price: 0,
        tax_rate: 0,
        tax_amount: 0,
        item_type: 'other',
      },
    ]);
    setNextLineNumber(nextLineNumber + 1);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;

    // Auto-calculate tax amount if tax rate changes
    if (field === 'tax_rate' || field === 'unit_price' || field === 'quantity') {
      const quantity = field === 'quantity' ? value : updated[index].quantity;
      const unitPrice = field === 'unit_price' ? value : updated[index].unit_price;
      const taxRate = field === 'tax_rate' ? value : updated[index].tax_rate;
      const subtotal = quantity * unitPrice;
      updated[index].tax_amount = subtotal * (taxRate / 100);
    }

    setLineItems(updated);
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unit_price;
      const taxAmount = item.tax_amount || lineTotal * (item.tax_rate / 100);
      return sum + lineTotal + taxAmount;
    }, 0);
  };

  const handleSubmit = () => {
    if (!templateName || lineItems.length === 0) {
      alert('Please fill in template name and add at least one line item');
      return;
    }

    const templateData: BillTemplateInsert = {
      property_id: propertyId || null,
      template_name: templateName,
      description: description || undefined,
      is_active: true,
      is_global: !propertyId, // If no property selected, make it global
      display_order: 0,
    };

    if (isEditing && template) {
      updateTemplate.mutate(
        {
          templateId: template.template_id!,
          template: templateData,
          items: lineItems,
        },
        {
          onSuccess: () => {
            onClose();
          },
        }
      );
    } else {
      createTemplate.mutate(
        {
          template: templateData,
          items: lineItems,
        },
        {
          onSuccess: () => {
            onClose();
          },
        }
      );
    }
  };

  const total = calculateTotal();
  const isPending = createTemplate.isPending || updateTemplate.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isEditing ? 'Edit Bill Template' : 'New Bill Template'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update template details and line items'
              : 'Create a preset template for fast invoice creation'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Template Details */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="template_name">
                    Template Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="template_name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., Standard 5-Night Package"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="property_id">
                    Property <span className="text-muted-foreground text-sm">(Optional)</span>
                  </Label>
                  <Select value={propertyId || 'NONE'} onValueChange={(value) => setPropertyId(value === 'NONE' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property or leave as global" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None (Global Template)</SelectItem>
                      {properties.map((property) => (
                        <SelectItem key={property.property_id} value={property.property_id!}>
                          {property.property_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of what this template includes"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Line Items</h3>
                  <p className="text-sm text-muted-foreground">
                    Add items that will be included in this template
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line Item
                </Button>
              </div>

              {lineItems.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground">
                    No line items yet. Click "Add Line Item" to get started.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead className="min-w-[200px]">Description</TableHead>
                        <TableHead className="w-32">Type</TableHead>
                        <TableHead className="w-24">Qty</TableHead>
                        <TableHead className="w-32">Unit Price</TableHead>
                        <TableHead className="w-24">Tax %</TableHead>
                        <TableHead className="w-32">Tax Amount</TableHead>
                        <TableHead className="w-32">Total</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item, index) => {
                        const lineTotal = item.quantity * item.unit_price;
                        const taxAmount = item.tax_amount || lineTotal * (item.tax_rate / 100);
                        const itemTotal = lineTotal + taxAmount;

                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.line_number}</TableCell>
                            <TableCell>
                              <Input
                                value={item.description}
                                onChange={(e) =>
                                  updateLineItem(index, 'description', e.target.value)
                                }
                                placeholder="Item description"
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={item.item_type}
                                onValueChange={(value) =>
                                  updateLineItem(index, 'item_type', value)
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {LINE_ITEM_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {toSentenceCase(type)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateLineItem(
                                    index,
                                    'quantity',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) =>
                                  updateLineItem(
                                    index,
                                    'unit_price',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.tax_rate}
                                onChange={(e) =>
                                  updateLineItem(
                                    index,
                                    'tax_rate',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              ${taxAmount.toFixed(2)}
                            </TableCell>
                            <TableCell className="font-bold">
                              ${itemTotal.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLineItem(index)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Total Preview */}
              {lineItems.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between max-w-md ml-auto">
                    <span className="text-lg font-semibold">Template Total:</span>
                    <Badge variant="outline" className="text-xl font-bold px-4 py-2">
                      ${total.toFixed(2)}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            <Save className="h-4 w-4 mr-2" />
            {isPending
              ? 'Saving...'
              : isEditing
              ? 'Update Template'
              : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
