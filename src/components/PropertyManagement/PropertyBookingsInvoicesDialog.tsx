import { useState } from "react";
import { Property, Booking, Invoice, BookingInsert } from "@/lib/schemas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePropertyBookings, useBookings } from "@/hooks/useBookings";
import { usePropertyInvoices } from "@/hooks/usePropertyInvoices";
import { useCreateInvoiceFromBooking } from "@/hooks/useInvoices";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { BookingCard } from "./BookingCard";
import { InvoiceCard } from "./InvoiceCard";
import { SimpleInvoiceEditor } from "./SimpleInvoiceEditor";
import { InvoicePaymentDialog } from "@/components/InvoicePaymentDialog";
import { BookingDialogEnhanced } from "@/components/BookingDialogEnhanced";
import { downloadInvoicePDF } from "@/lib/invoicePDF";
import {
  Building,
  MapPin,
  CalendarDays,
  FileText,
  Plus,
} from "lucide-react";

interface PropertyBookingsInvoicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property;
}

export function PropertyBookingsInvoicesDialog({
  open,
  onOpenChange,
  property,
}: PropertyBookingsInvoicesDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"bookings" | "invoices">("bookings");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);

  // Fetch bookings and invoices for this property
  const { bookings, loading: bookingsLoading, refetch: refetchBookings } = usePropertyBookings(property.property_id!);
  const { invoices, loading: invoicesLoading, refetch: refetchInvoices } = usePropertyInvoices(property.property_id);

  // Booking creation mutation
  const { createBooking, isCreating: isCreatingBooking } = useBookings();

  // Invoice generation mutation
  const { mutateAsync: createInvoiceFromBooking, isPending: isGeneratingInvoice } = useCreateInvoiceFromBooking();

  // Get booking IDs that already have invoices
  const bookingIdsWithInvoices = new Set(
    invoices
      .filter((inv) => inv.booking_id)
      .map((inv) => inv.booking_id)
  );

  // Handle invoice generation from booking
  const handleGenerateInvoice = async (bookingId: string) => {
    try {
      await createInvoiceFromBooking(bookingId);
      toast({
        title: t("propertyBookingsInvoices.invoiceCreated"),
        description: t("propertyBookingsInvoices.invoiceCreatedDesc"),
      });
      refetchInvoices();
      setActiveTab("invoices");
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to generate invoice",
        variant: "destructive",
      });
    }
  };

  // Handle PDF download
  const handleDownloadPdf = async (invoice: Invoice) => {
    try {
      await downloadInvoicePDF(invoice);
      toast({
        title: t("common.success"),
        description: t("invoices.pdfDownloaded"),
      });
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("invoices.pdfError"),
        variant: "destructive",
      });
    }
  };

  // Handle invoice save from editor
  const handleInvoiceSaved = () => {
    setSelectedInvoice(null);
    refetchInvoices();
  };

  // Handle booking creation
  const handleCreateBooking = async (bookingData: BookingInsert) => {
    try {
      await createBooking(bookingData);
      setIsBookingDialogOpen(false);
      refetchBookings();
      toast({
        title: t("propertyBookingsInvoices.bookingCreated"),
        description: t("propertyBookingsInvoices.bookingCreatedDesc"),
      });
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to create booking",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              <span>{t("propertyBookingsInvoices.title")}</span>
            </DialogTitle>
            {/* Property Info Summary */}
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-2">
              <Badge variant="outline" className="gap-1">
                <Building className="h-3 w-3" />
                {property.property_name || property.property_type}
              </Badge>
              {property.location?.city && (
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {property.location.city}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "bookings" | "invoices")}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bookings" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                {t("propertyBookingsInvoices.bookingsTab")} ({bookings.length})
              </TabsTrigger>
              <TabsTrigger value="invoices" className="gap-2">
                <FileText className="h-4 w-4" />
                {t("propertyBookingsInvoices.invoicesTab")} ({invoices.length})
              </TabsTrigger>
            </TabsList>

            {/* Bookings Tab */}
            <TabsContent value="bookings" className="flex-1 overflow-hidden mt-4">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setIsBookingDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("propertyBookingsInvoices.newBooking")}
                </Button>
              </div>
              <ScrollArea className="h-[460px] pr-4">
                {bookingsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <CalendarDays className="h-12 w-12 mb-4 opacity-50" />
                    <p>{t("propertyBookingsInvoices.noBookings")}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <BookingCard
                        key={booking.booking_id}
                        booking={booking}
                        hasInvoice={bookingIdsWithInvoices.has(booking.booking_id)}
                        onGenerateInvoice={handleGenerateInvoice}
                        isGenerating={isGeneratingInvoice}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Invoices Tab */}
            <TabsContent value="invoices" className="flex-1 overflow-hidden mt-4">
              <ScrollArea className="h-[500px] pr-4">
                {invoicesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-40 w-full" />
                    ))}
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4 opacity-50" />
                    <p>{t("propertyBookingsInvoices.noInvoices")}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {invoices.map((invoice) =>
                      selectedInvoice?.invoice_id === invoice.invoice_id ? (
                        <SimpleInvoiceEditor
                          key={invoice.invoice_id}
                          invoice={invoice}
                          onSave={handleInvoiceSaved}
                          onCancel={() => setSelectedInvoice(null)}
                        />
                      ) : (
                        <InvoiceCard
                          key={invoice.invoice_id}
                          invoice={invoice}
                          onEdit={() => setSelectedInvoice(invoice)}
                          onRecordPayment={() => setPaymentInvoice(invoice)}
                          onDownloadPdf={() => handleDownloadPdf(invoice)}
                        />
                      )
                    )}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      {paymentInvoice && (
        <InvoicePaymentDialog
          open={!!paymentInvoice}
          onOpenChange={(open) => !open && setPaymentInvoice(null)}
          invoice={paymentInvoice}
          onPaymentRecorded={() => {
            setPaymentInvoice(null);
            refetchInvoices();
          }}
        />
      )}

      {/* New Booking Dialog */}
      <BookingDialogEnhanced
        open={isBookingDialogOpen}
        onOpenChange={setIsBookingDialogOpen}
        propertyId={property.property_id}
        onSubmit={handleCreateBooking}
        isSubmitting={isCreatingBooking}
      />
    </>
  );
}
