import { Booking } from "@/lib/schemas";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, differenceInDays } from "date-fns";
import { useTranslation } from "react-i18next";
import {
  CalendarDays,
  Users,
  DollarSign,
  FileText,
  Loader2,
  CheckCircle,
} from "lucide-react";

interface BookingCardProps {
  booking: Booking;
  hasInvoice: boolean;
  onGenerateInvoice: (bookingId: string) => Promise<void>;
  isGenerating: boolean;
}

const statusColors: Record<string, string> = {
  inquiry: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  checked_in: "bg-green-100 text-green-800",
  checked_out: "bg-purple-100 text-purple-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  blocked: "bg-orange-100 text-orange-800",
};

export function BookingCard({
  booking,
  hasInvoice,
  onGenerateInvoice,
  isGenerating,
}: BookingCardProps) {
  const { t } = useTranslation();

  const checkInDate = parseISO(booking.check_in_date);
  const checkOutDate = parseISO(booking.check_out_date);
  const nights = differenceInDays(checkOutDate, checkInDate);

  const statusKey = booking.booking_status || "pending";
  const statusColor = statusColors[statusKey] || statusColors.pending;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-base truncate">{booking.guest_name}</h4>
            <p className="text-sm text-muted-foreground">
              {booking.guest_email || booking.guest_phone || "No contact info"}
            </p>
          </div>
          <Badge className={statusColor}>
            {t(`propertyBookingsInvoices.status.${statusKey}`)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {/* Dates */}
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {format(checkInDate, "MMM dd")} - {format(checkOutDate, "MMM dd, yyyy")}
              </p>
              <p className="text-xs text-muted-foreground">
                {nights} {t("propertyBookingsInvoices.nights")}
              </p>
            </div>
          </div>

          {/* Guests */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {booking.number_of_guests || 1} {t("propertyBookingsInvoices.guests")}
              </p>
              {(booking.guest_count_adults || booking.guest_count_children) && (
                <p className="text-xs text-muted-foreground">
                  {booking.guest_count_adults && `${booking.guest_count_adults} adults`}
                  {booking.guest_count_children && `, ${booking.guest_count_children} children`}
                </p>
              )}
            </div>
          </div>

          {/* Amount */}
          {booking.total_amount && (
            <div className="flex items-center gap-2 col-span-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="font-medium">
                ${booking.total_amount.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Special Requests */}
        {booking.special_requests && (
          <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
            <p className="text-muted-foreground line-clamp-2">{booking.special_requests}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <Button
          className="w-full"
          variant={hasInvoice ? "outline" : "default"}
          onClick={() => !hasInvoice && onGenerateInvoice(booking.booking_id!)}
          disabled={hasInvoice || isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("propertyBookingsInvoices.generating")}
            </>
          ) : hasInvoice ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              {t("propertyBookingsInvoices.invoiceExists")}
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              {t("propertyBookingsInvoices.generateInvoice")}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
