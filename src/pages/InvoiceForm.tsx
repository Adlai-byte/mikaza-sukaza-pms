import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Download, Calendar, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCreateInvoice, useUpdateInvoice, useInvoice } from '@/hooks/useInvoices';
import { useBookingDetail } from '@/hooks/useBookings';
import { usePropertiesOptimized } from '@/hooks/usePropertiesOptimized';
import { useUsers } from '@/hooks/useUsers';
import { useInvoiceTips, useCreateInvoiceTip, useDeleteInvoiceTip } from '@/hooks/useInvoiceTips';
import { InvoiceInsert, InvoiceLineItemInsert, BillTemplateWithItems } from '@/lib/schemas';
import BillTemplateSelector from '@/components/BillTemplateSelector';
import { SendInvoiceEmailDialog } from '@/components/SendInvoiceEmailDialog';
import { differenceInDays } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { invoiceSchema } from '@/lib/schemas';
import { generateInvoicePDF } from '@/lib/pdf-generator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatUserDisplay } from '@/lib/user-display';
import { useTranslation } from 'react-i18next';

const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded'];
const LINE_ITEM_TYPES = ['accommodation', 'cleaning', 'extras', 'tax', 'commission', 'other'];

// Helper function to convert to sentence case
const toSentenceCase = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export default function InvoiceForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { invoiceId, bookingId } = useParams();
  const isEditing = !!invoiceId;
  const isFromBooking = !!bookingId;
  const { toast } = useToast();

  const { properties } = usePropertiesOptimized();
  const { users } = useUsers();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const { invoice, loading } = useInvoice(invoiceId || '');
  const { booking, loading: bookingLoading } = useBookingDetail(bookingId);
  const { tips: existingTips } = useInvoiceTips(invoiceId ? { invoice_id: invoiceId } : undefined);
  const createTip = useCreateInvoiceTip();
  const deleteTip = useDeleteInvoiceTip();

  const [lineItems, setLineItems] = useState<InvoiceLineItemInsert[]>([]);
  const [nextLineNumber, setNextLineNumber] = useState(1);
  const [linkedBookingId, setLinkedBookingId] = useState<string | undefined>(bookingId);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  // Tip form state
  const [tipRecipient, setTipRecipient] = useState('');
  const [tipAmount, setTipAmount] = useState('');
  const [tipReason, setTipReason] = useState('');
  const [tipNotes, setTipNotes] = useState('');

  const form = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      property_id: '',
      guest_name: '',
      guest_email: '',
      guest_phone: '',
      guest_address: '',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'draft' as any,
      notes: '',
      terms: 'Payment due upon receipt',
      payment_method: '',
    },
  });

  // Load invoice data if editing
  useEffect(() => {
    if (invoice && isEditing) {
      console.log('📝 [InvoiceForm] Loading invoice data:', {
        invoice_id: invoice.invoice_id,
        invoice_number: invoice.invoice_number,
        property_id: invoice.property_id,
        guest_name: invoice.guest_name,
        line_items_count: invoice.line_items?.length || 0,
        fullInvoice: invoice,
      });

      form.reset({
        property_id: invoice.property_id,
        guest_name: invoice.guest_name,
        guest_email: invoice.guest_email || '',
        guest_phone: invoice.guest_phone || '',
        guest_address: invoice.guest_address || '',
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        status: invoice.status as any,
        notes: invoice.notes || '',
        terms: invoice.terms || '',
        payment_method: invoice.payment_method || '',
      });

      if (invoice.line_items && Array.isArray(invoice.line_items)) {
        const items = invoice.line_items.map((item: any) => ({
          line_number: item.line_number,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          tax_amount: item.tax_amount,
          item_type: item.item_type,
        }));
        setLineItems(items);
        if (items.length > 0) {
          setNextLineNumber(Math.max(...items.map((i: any) => i.line_number)) + 1);
        }
        console.log('✅ [InvoiceForm] Line items loaded:', items.length);
      } else {
        console.warn('⚠️ [InvoiceForm] No line items found or line_items is not an array');
      }
    }
  }, [invoice, isEditing]);

  // Load booking data and auto-populate if creating from booking
  useEffect(() => {
    if (booking && isFromBooking && !isEditing) {
      console.log('📅 Auto-populating invoice from booking:', booking);

      // Calculate number of nights
      const checkIn = new Date(booking.check_in_date);
      const checkOut = new Date(booking.check_out_date);
      const nights = differenceInDays(checkOut, checkIn);

      // Auto-populate form fields
      form.reset({
        property_id: booking.property_id,
        guest_name: booking.guest_name,
        guest_email: booking.guest_email || '',
        guest_phone: booking.guest_phone || '',
        guest_address: '',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: booking.check_out_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft' as any,
        notes: `Generated from booking: ${booking.confirmation_code || booking.booking_id}\nCheck-in: ${booking.check_in_date}\nCheck-out: ${booking.check_out_date}\nGuests: ${booking.number_of_guests || 'N/A'}`,
        terms: 'Payment due upon receipt',
        payment_method: booking.payment_method || '',
      });

      // Auto-generate line items from booking financial data
      const generatedItems: InvoiceLineItemInsert[] = [];
      let lineNumber = 1;

      // 1. Accommodation (base amount)
      if (booking.base_amount && booking.base_amount > 0) {
        const pricePerNight = nights > 0 ? booking.base_amount / nights : booking.base_amount;
        generatedItems.push({
          invoice_id: '',
          line_number: lineNumber++,
          description: `Accommodation (${nights} ${nights === 1 ? 'night' : 'nights'})`,
          quantity: nights,
          unit_price: pricePerNight,
          tax_rate: 0,
          tax_amount: 0,
          item_type: 'accommodation',
        });
      }

      // 2. Cleaning Fee
      if (booking.cleaning_fee && booking.cleaning_fee > 0) {
        generatedItems.push({
          invoice_id: '',
          line_number: lineNumber++,
          description: 'Cleaning Fee',
          quantity: 1,
          unit_price: booking.cleaning_fee,
          tax_rate: 0,
          tax_amount: 0,
          item_type: 'cleaning',
        });
      }

      // 3. Extras/Services
      if (booking.extras_amount && booking.extras_amount > 0) {
        generatedItems.push({
          invoice_id: '',
          line_number: lineNumber++,
          description: 'Extras & Services',
          quantity: 1,
          unit_price: booking.extras_amount,
          tax_rate: 0,
          tax_amount: 0,
          item_type: 'extras',
        });
      }

      // 4. Taxes
      if (booking.tax_amount && booking.tax_amount > 0) {
        // Calculate tax rate percentage based on subtotal
        const subtotal = (booking.base_amount || 0) + (booking.cleaning_fee || 0) + (booking.extras_amount || 0);
        const taxRate = subtotal > 0 ? (booking.tax_amount / subtotal) * 100 : 0;

        generatedItems.push({
          invoice_id: '',
          line_number: lineNumber++,
          description: 'Taxes',
          quantity: 1,
          unit_price: 0,
          tax_rate: taxRate,
          tax_amount: booking.tax_amount,
          item_type: 'tax',
        });
      }

      // 5. Security Deposit (if applicable)
      if (booking.security_deposit && booking.security_deposit > 0) {
        generatedItems.push({
          invoice_id: '',
          line_number: lineNumber++,
          description: 'Security Deposit (Refundable)',
          quantity: 1,
          unit_price: booking.security_deposit,
          tax_rate: 0,
          tax_amount: 0,
          item_type: 'other',
        });
      }

      setLineItems(generatedItems);
      setNextLineNumber(lineNumber);

      toast({
        title: t('invoices.invoicePrefilledFromBooking'),
        description: t('invoices.invoicePrefilledDesc', { count: generatedItems.length }),
      });
    }
  }, [booking, isFromBooking, isEditing]);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        invoice_id: '',
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

  // Handle adding line items from selected templates
  const handleTemplatesSelected = (templates: BillTemplateWithItems[]) => {
    console.log('📋 Adding line items from templates:', templates);

    let currentLineNumber = nextLineNumber;
    const newItems: InvoiceLineItemInsert[] = [];

    // Extract line items from all selected templates
    templates.forEach((template) => {
      template.items?.forEach((item) => {
        newItems.push({
          invoice_id: '',
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

    // Append to existing line items
    setLineItems([...lineItems, ...newItems]);
    setNextLineNumber(currentLineNumber);

    const templateNames = templates.map((t) => t.template_name).join(', ');
    toast({
      title: 'Templates Added',
      description: `Added ${newItems.length} line items from: ${templateNames}`,
    });
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;

    // Auto-calculate tax amount if tax rate or unit price changes
    if (field === 'tax_rate' || field === 'unit_price' || field === 'quantity') {
      const quantity = field === 'quantity' ? value : updated[index].quantity;
      const unitPrice = field === 'unit_price' ? value : updated[index].unit_price;
      const taxRate = field === 'tax_rate' ? value : updated[index].tax_rate;
      const subtotal = quantity * unitPrice;
      updated[index].tax_amount = subtotal * (taxRate / 100);
    }

    setLineItems(updated);
  };

  // Tip handlers
  const handleAddTip = () => {
    if (!invoiceId) {
      toast({
        title: t('invoices.saveInvoiceFirst'),
        description: t('invoices.saveInvoiceFirstDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (!tipRecipient || !tipAmount) {
      toast({
        title: t('invoices.missingInformation'),
        description: t('invoices.selectStaffAndAmount'),
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(tipAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: t('invoices.invalidTipAmount'),
        description: t('invoices.enterValidTipAmount'),
        variant: 'destructive',
      });
      return;
    }

    createTip.mutate({
      invoice_id: invoiceId,
      recipient_user_id: tipRecipient,
      tip_amount: amount,
      tip_reason: tipReason || undefined,
      guest_notes: tipNotes || undefined,
      status: 'pending',
    }, {
      onSuccess: () => {
        // Reset form
        setTipRecipient('');
        setTipAmount('');
        setTipReason('');
        setTipNotes('');
      },
    });
  };

  const handleRemoveTip = (tipId: string) => {
    if (confirm(t('invoices.confirmRemoveTip'))) {
      deleteTip.mutate(tipId);
    }
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const taxAmount = lineItems.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
    const total = subtotal + taxAmount;

    return { subtotal, taxAmount, total };
  };

  const handleDownloadPDF = () => {
    if (!invoice) {
      toast({
        title: t('common.error'),
        description: t('invoices.invoiceDataNotAvailable'),
        variant: 'destructive',
      });
      return;
    }

    try {
      // Get property name
      const property = properties.find(p => p.property_id === invoice.property_id);

      // Prepare invoice data with current line items
      const invoiceWithDetails = {
        ...invoice,
        property: property ? {
          property_name: property.property_name,
          property_id: property.property_id!,
        } : undefined,
        line_items: invoice.line_items || lineItems,
      };

      generateInvoicePDF(invoiceWithDetails);

      toast({
        title: t('common.success'),
        description: t('invoices.pdfGenSuccess'),
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: t('common.error'),
        description: t('invoices.pdfGenError'),
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    if (lineItems.length === 0) {
      alert(t('invoices.pleaseAddLineItem'));
      return;
    }

    const totals = calculateTotals();
    const invoiceData: InvoiceInsert = {
      ...data,
      subtotal: totals.subtotal,
      tax_amount: totals.taxAmount,
      total_amount: totals.total,
      amount_paid: invoice?.amount_paid || 0,
      booking_id: linkedBookingId || undefined, // Link to booking if created from booking
    };

    if (isEditing) {
      try {
        // Step 1: Update invoice
        console.log('📝 Updating invoice:', invoiceId);
        await updateInvoice.mutateAsync({ invoiceId: invoiceId!, updates: invoiceData });

        // Step 2: Delete existing line items
        console.log('🗑️ Deleting old line items');
        const { error: deleteError } = await supabase
          .from('invoice_line_items')
          .delete()
          .eq('invoice_id', invoiceId!);

        if (deleteError) throw deleteError;

        // Step 3: Insert new line items
        console.log('✨ Inserting new line items:', lineItems.length);
        const lineItemsWithInvoiceId = lineItems.map((item) => ({
          ...item,
          invoice_id: invoiceId!,
        }));

        const { error: insertError } = await supabase
          .from('invoice_line_items')
          .insert(lineItemsWithInvoiceId);

        if (insertError) throw insertError;

        toast({
          title: t('common.success'),
          description: t('invoices.invoiceUpdatedSuccess'),
        });

        navigate('/invoices');
      } catch (error: any) {
        console.error('❌ Error updating invoice:', error);
        toast({
          title: t('common.error'),
          description: error.message || t('invoices.invoiceUpdateError'),
          variant: 'destructive',
        });
      }
    } else {
      createInvoice.mutate(
        { invoice: invoiceData, lineItems },
        {
          onSuccess: () => {
            navigate('/invoices');
          },
        }
      );
    }
  });

  const totals = calculateTotals();

  // Show loading state
  if (isEditing && loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">{t('invoices.loadingInvoice')}</p>
      </div>
    );
  }

  // Show error if invoice not found when editing
  if (isEditing && !loading && !invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="text-destructive text-xl">⚠️</div>
        <h2 className="text-xl font-semibold">{t('invoices.invoiceNotFound')}</h2>
        <p className="text-muted-foreground">{t('invoices.invoiceNotFoundDesc')}</p>
        <Button onClick={() => navigate('/invoices')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('invoices.backToInvoices')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">
                {isEditing ? t('invoices.editInvoice') : t('invoices.newInvoice')}
              </h1>
              {isFromBooking && booking && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {t('invoices.fromBooking')}
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {isEditing ? t('invoices.updateInvoiceDetails') : isFromBooking ? t('invoices.reviewAutoGeneratedInvoice') : t('invoices.createNewInvoiceDesc')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing && invoice && (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={handleDownloadPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                {t('invoices.downloadPDF')}
              </Button>
              {invoice.guest_email && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setEmailDialogOpen(true)}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {t('invoices.sendViaEmail')}
                </Button>
              )}
            </>
          )}
          <Button onClick={handleSubmit} size="lg" disabled={createInvoice.isPending || updateInvoice.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {isEditing ? t('invoices.updateInvoice') : t('invoices.createInvoice')}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* {t('invoices.invoiceDetails')} */}
        <Card>
          <CardHeader>
            <CardTitle>{t('invoices.invoiceDetails')}</CardTitle>
            <CardDescription>{t('invoices.invoiceDetailsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="property_id">{t('invoices.property')} *</Label>
                <Select
                  value={form.watch('property_id')}
                  onValueChange={(value) => form.setValue('property_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('invoices.selectProperty')} />
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
                <Label htmlFor="status">{t('common.status')} *</Label>
                <Select
                  value={form.watch('status')}
                  onValueChange={(value) => form.setValue('status', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVOICE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {t(`invoices.status.${status}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guest_name">{t('invoices.guestName')} *</Label>
                <Input
                  {...form.register('guest_name')}
                  placeholder={t('invoices.guestNamePlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guest_email">{t('invoices.guestEmail')}</Label>
                <Input
                  {...form.register('guest_email')}
                  type="email"
                  placeholder={t('invoices.guestEmailPlaceholder')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guest_phone">{t('invoices.guestPhone')}</Label>
                <Input
                  {...form.register('guest_phone')}
                  placeholder={t('invoices.guestPhonePlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">{t('invoices.paymentMethod')}</Label>
                <Input
                  {...form.register('payment_method')}
                  placeholder={t('invoices.paymentMethodPlaceholder')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="guest_address">{t('invoices.guestAddress')}</Label>
              <Textarea
                {...form.register('guest_address')}
                placeholder={t('invoices.guestAddressPlaceholder')}
                rows={2}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issue_date">{t('invoices.issueDate')} *</Label>
                <Input
                  type="date"
                  {...form.register('issue_date')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">{t('invoices.dueDate')} *</Label>
                <Input
                  type="date"
                  {...form.register('due_date')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="terms">{t('invoices.paymentTerms')}</Label>
              <Textarea
                {...form.register('terms')}
                placeholder={t('invoices.paymentTermsPlaceholder')}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t('invoices.invoiceNotes')}</Label>
              <Textarea
                {...form.register('notes')}
                placeholder={t('invoices.invoiceNotesPlaceholder')}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bill Template Selector - Quick Add */}
        {form.watch('property_id') && (
          <BillTemplateSelector
            propertyId={form.watch('property_id')}
            onTemplatesSelected={handleTemplatesSelected}
          />
        )}

        {/* {t('invoices.lineItems')} */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('invoices.lineItems')}</CardTitle>
                <CardDescription>{t('invoices.lineItemsDesc')}</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" />
                {t('invoices.addLineItem')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {lineItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No line items yet. Click "{t('invoices.addLineItem')}" to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead className="min-w-[200px]">{t('invoices.description')}</TableHead>
                      <TableHead className="w-32">{t('invoices.type')}</TableHead>
                      <TableHead className="w-40">{t('invoices.qty')}</TableHead>
                      <TableHead className="w-36">{t('invoices.unitPrice')}</TableHead>
                      <TableHead className="w-40">{t('invoices.taxPercent')}</TableHead>
                      <TableHead className="w-40">{t('common.tax')}</TableHead>
                      <TableHead className="w-32">{t('common.total')}</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item, index) => {
                      const itemTotal = item.quantity * item.unit_price + (item.tax_amount || 0);
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.line_number}</TableCell>
                          <TableCell>
                            <Input
                              value={item.description}
                              onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                              placeholder={t('invoices.itemDescriptionPlaceholder')}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item.item_type}
                              onValueChange={(value) => updateLineItem(index, 'item_type', value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {LINE_ITEM_TYPES.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {t(`invoices.lineItemType.${type}`)}
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
                              onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.tax_rate}
                              onChange={(e) => updateLineItem(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            ${(item.tax_amount || 0).toFixed(2)}
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
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

        {/* {t('invoices.tipsForStaff')} */}
        {isEditing && (
          <Card>
            <CardHeader>
              <CardTitle>{t('invoices.tipsForStaff')}</CardTitle>
              <CardDescription>
                {t('invoices.tipsForStaffDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Warning when invoice is not saved */}
                {!invoiceId && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
                    <p className="text-sm font-medium">
                      💡 {t('invoices.saveInvoiceBeforeTips', 'Please save this invoice first before adding tips')}
                    </p>
                  </div>
                )}

                {/* {t('invoices.addTip')} Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <Label>{t('invoices.staffMember')}</Label>
                    <Select value={tipRecipient} onValueChange={setTipRecipient}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('invoices.selectStaff')} />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter(u => ['ops', 'admin'].includes(u.user_type || ''))
                          .map((user) => (
                            <SelectItem key={user.user_id} value={user.user_id!}>
                              {formatUserDisplay(user)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('invoices.tipAmount')}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={tipAmount}
                      onChange={(e) => setTipAmount(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('invoices.reasonOptional')}</Label>
                    <Select
                      value={tipReason}
                      onValueChange={setTipReason}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('invoices.selectOrTypeReason')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Excellent cleaning service">{t('invoices.tipReasons.excellentCleaning')}</SelectItem>
                        <SelectItem value="Outstanding guest communication">{t('invoices.tipReasons.outstandingCommunication')}</SelectItem>
                        <SelectItem value="Quick response time">{t('invoices.tipReasons.quickResponse')}</SelectItem>
                        <SelectItem value="Professional maintenance work">{t('invoices.tipReasons.professionalMaintenance')}</SelectItem>
                        <SelectItem value="Exceptional hospitality">{t('invoices.tipReasons.exceptionalHospitality')}</SelectItem>
                        <SelectItem value="Property walkthrough service">{t('invoices.tipReasons.propertyWalkthrough')}</SelectItem>
                        <SelectItem value="Guest amenities setup">{t('invoices.tipReasons.guestAmenities')}</SelectItem>
                        <SelectItem value="Emergency response">{t('invoices.tipReasons.emergencyResponse')}</SelectItem>
                        <SelectItem value="Above and beyond service">{t('invoices.tipReasons.aboveAndBeyond')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder={t('invoices.orTypeCustomReason')}
                      value={tipReason}
                      onChange={(e) => setTipReason(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('invoices.notesOptional')}</Label>
                    <Input
                      placeholder={t('invoices.additionalNotes')}
                      value={tipNotes}
                      onChange={(e) => setTipNotes(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 flex items-end">
                    <Button
                      type="button"
                      onClick={handleAddTip}
                      disabled={!invoiceId || !tipRecipient || !tipAmount}
                      className="w-full"
                      title={!invoiceId ? 'Save invoice first to add tips' : ''}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('invoices.addTip')}
                    </Button>
                  </div>
                </div>

                {/* Existing Tips List */}
                {existingTips && existingTips.length > 0 && (
                  <div className="space-y-2">
                    <Label>{t('invoices.addedTips')}</Label>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('invoices.staffMember')}</TableHead>
                            <TableHead>{t('invoices.amount')}</TableHead>
                            <TableHead>{t('invoices.reason')}</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {existingTips.map((tip) => (
                            <TableRow key={tip.tip_id}>
                              <TableCell>
                                {formatUserDisplay(tip.recipient)}
                              </TableCell>
                              <TableCell className="font-semibold">
                                ${tip.tip_amount.toFixed(2)}
                              </TableCell>
                              <TableCell>{tip.tip_reason || '-'}</TableCell>
                              <TableCell>
                                <span className="capitalize">{tip.status}</span>
                              </TableCell>
                              <TableCell>
                                {tip.status === 'pending' && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveTip(tip.tip_id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t('invoices.tipsWillBeConvertedToCommissions')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => navigate('/invoices')}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={createInvoice.isPending || updateInvoice.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {isEditing ? t('invoices.updateInvoice') : t('invoices.createInvoice')}
          </Button>
        </div>
      </form>

      {/* Send Email Dialog */}
      {isEditing && invoice && (
        <SendInvoiceEmailDialog
          invoice={invoice}
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
        />
      )}
    </div>
  );
}
