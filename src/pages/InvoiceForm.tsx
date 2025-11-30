import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Download, Calendar, Send, User, DollarSign, MessageSquare, StickyNote, Sparkles, Loader2, UserPlus, Mail, Phone } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCreateInvoice, useUpdateInvoice, useInvoice, invoiceKeys } from '@/hooks/useInvoices';
import { useBookingDetail } from '@/hooks/useBookings';
import { usePropertiesOptimized } from '@/hooks/usePropertiesOptimized';
import { useUsers } from '@/hooks/useUsers';
import { useGuests } from '@/hooks/useGuests';
import { useQueryClient } from '@tanstack/react-query';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { InvoiceInsert, InvoiceLineItemInsert, BillTemplateWithItems, Guest } from '@/lib/schemas';
import BillTemplateSelector from '@/components/BillTemplateSelector';
import { SendInvoiceEmailDialog } from '@/components/SendInvoiceEmailDialog';
import { GuestDialog } from '@/components/GuestDialog';
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

  const queryClient = useQueryClient();
  const { logActivity } = useActivityLogs();
  const { properties } = usePropertiesOptimized();
  const { users } = useUsers();
  const { data: guests, isLoading: loadingGuests } = useGuests();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const { invoice, loading } = useInvoice(invoiceId || '');
  const { booking, loading: bookingLoading } = useBookingDetail(bookingId);

  const [lineItems, setLineItems] = useState<InvoiceLineItemInsert[]>([]);
  const [nextLineNumber, setNextLineNumber] = useState(1);
  const [linkedBookingId, setLinkedBookingId] = useState<string | undefined>(bookingId);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateGuestDialog, setShowCreateGuestDialog] = useState(false);

  const form = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      property_id: '',
      guest_id: null,
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

  // Handle guest selection
  const handleGuestSelect = (guestId: string) => {
    if (guestId === 'create-new') {
      setShowCreateGuestDialog(true);
      return;
    }

    const selectedGuest = guests?.find((g: Guest) => g.guest_id === guestId);
    if (selectedGuest) {
      form.setValue('guest_id', selectedGuest.guest_id!);
      form.setValue('guest_name', `${selectedGuest.first_name} ${selectedGuest.last_name}`);
      form.setValue('guest_email', selectedGuest.email);
      form.setValue('guest_phone', selectedGuest.phone_primary || '');
      form.setValue('guest_address', selectedGuest.address || '');
    }
  };

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

      const formData = {
        property_id: invoice.property_id,
        guest_id: invoice.guest_id || null,
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
      };

      console.log('📋 [InvoiceForm] Resetting form with data:', formData);
      form.reset(formData);

      // Verify form values after reset
      setTimeout(() => {
        console.log('✅ [InvoiceForm] Form values after reset:', {
          property_id: form.getValues('property_id'),
          guest_name: form.getValues('guest_name'),
        });
      }, 100);

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
        guest_id: booking.guest_id || null,
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

    console.log('💾 [InvoiceForm] Preparing to save invoice data:', {
      property_id: data.property_id,
      guest_name: data.guest_name,
      status: data.status,
      invoiceData,
    });

    if (isEditing) {
      setIsSaving(true);
      try {
        // Step 1: Update invoice (direct DB call to avoid premature cache invalidation)
        console.log('📝 Updating invoice:', invoiceId, 'with data:', invoiceData);
        const { data: updatedInvoice, error: updateError } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('invoice_id', invoiceId!)
          .select()
          .single();

        if (updateError) {
          console.error('❌ Error updating invoice:', updateError);
          throw updateError;
        }
        console.log('✅ Invoice updated successfully:', updatedInvoice);

        // Step 2: Delete existing line items
        console.log('🗑️ Deleting old line items');
        const { error: deleteError } = await supabase
          .from('invoice_line_items')
          .delete()
          .eq('invoice_id', invoiceId!);

        if (deleteError) {
          console.error('❌ Error deleting line items:', deleteError);
          throw deleteError;
        }
        console.log('✅ Old line items deleted successfully');

        // Step 3: Insert new line items
        console.log('✨ Inserting new line items:', lineItems.length, lineItems);
        const lineItemsWithInvoiceId = lineItems.map((item) => {
          // Remove generated fields that cannot be inserted
          const { subtotal, total_amount, line_item_id, created_at, updated_at, ...itemData } = item as any;
          return {
            ...itemData,
            invoice_id: invoiceId!,
          };
        });

        console.log('📦 Line items with invoice_id:', lineItemsWithInvoiceId);

        const { data: insertedData, error: insertError } = await supabase
          .from('invoice_line_items')
          .insert(lineItemsWithInvoiceId)
          .select();

        if (insertError) {
          console.error('❌ Error inserting line items:', insertError);
          throw insertError;
        }
        console.log('✅ Line items inserted successfully:', insertedData?.length);

        // IMPORTANT: Refetch (not just invalidate) to ensure fresh data before navigation
        console.log('🔄 Refetching invoice cache to ensure fresh data');
        await queryClient.refetchQueries({ queryKey: invoiceKeys.detail(invoiceId!) });
        await queryClient.refetchQueries({ queryKey: invoiceKeys.lists() });

        // Log activity
        logActivity('invoice_updated', {
          invoice_id: invoiceId,
          invoice_number: invoice?.invoice_number,
          line_items_count: lineItems.length,
        });

        toast({
          title: t('common.success'),
          description: t('invoices.invoiceUpdatedSuccess'),
        });

        // Navigate after cache is refreshed
        navigate('/invoices');
      } catch (error: any) {
        console.error('❌ Error updating invoice:', error);
        toast({
          title: t('common.error'),
          description: error.message || t('invoices.invoiceUpdateError'),
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
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
          <Button onClick={handleSubmit} size="lg" disabled={isSaving || createInvoice.isPending}>
            {isSaving || createInvoice.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
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

            {/* Guest Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="guest_id">{t('invoices.selectGuest')} *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateGuestDialog(true)}
                  disabled={loadingGuests}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t('invoices.createNewGuest')}
                </Button>
              </div>

              <Select
                value={form.watch('guest_id') || ''}
                onValueChange={handleGuestSelect}
                disabled={loadingGuests}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('invoices.chooseGuest')} />
                </SelectTrigger>
                <SelectContent>
                  {guests?.map((guest: Guest) => (
                    <SelectItem key={guest.guest_id} value={guest.guest_id!}>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {guest.first_name} {guest.last_name}
                        </span>
                        <span className="text-xs text-muted-foreground">{guest.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Display selected guest info */}
              {form.watch('guest_id') && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-900">{form.watch('guest_name')}</span>
                      </div>
                      {form.watch('guest_email') && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-blue-600" />
                          <a
                            href={`mailto:${form.watch('guest_email')}`}
                            className="text-blue-700 hover:underline"
                          >
                            {form.watch('guest_email')}
                          </a>
                        </div>
                      )}
                      {form.watch('guest_phone') && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-blue-600" />
                          <a
                            href={`tel:${form.watch('guest_phone')}`}
                            className="text-blue-700 hover:underline"
                          >
                            {form.watch('guest_phone')}
                          </a>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label htmlFor="payment_method">{t('invoices.paymentMethod')}</Label>
                <Input
                  {...form.register('payment_method')}
                  placeholder={t('invoices.paymentMethodPlaceholder')}
                />
              </div>
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
                      <TableHead className="min-w-[120px]">{t('invoices.qty')}</TableHead>
                      <TableHead className="min-w-[140px]">{t('invoices.unitPrice')}</TableHead>
                      <TableHead className="min-w-[100px]">{t('invoices.taxPercent')}</TableHead>
                      <TableHead className="w-32">{t('common.tax')}</TableHead>
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

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => navigate('/invoices')}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isSaving || createInvoice.isPending}>
            {isSaving || createInvoice.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
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

      {/* Guest Creation Dialog */}
      <GuestDialog
        open={showCreateGuestDialog}
        onClose={() => setShowCreateGuestDialog(false)}
        guestId={null}
      />
    </div>
  );
}
