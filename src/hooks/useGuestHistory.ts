import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { Booking, Invoice } from '@/lib/schemas';
import { CACHE_CONFIG } from '@/lib/cache-config';
import { guestKeys } from './useGuests';

// =============================================
// TYPES
// =============================================

export type GuestHistoryItem = {
  id: string;
  type: 'booking' | 'invoice';
  date: string; // ISO date string for sorting
  status: string;
  property_name?: string;
  property_id?: string;
  amount?: number;
  description: string;
  data: Booking | Invoice; // Full original data
};

export type GuestHistoryTimeline = {
  bookings: Booking[];
  invoices: Invoice[];
  timeline: GuestHistoryItem[];
  stats: {
    totalBookings: number;
    totalInvoices: number;
    totalSpent: number;
    averageBookingValue: number;
  };
};

// =============================================
// FETCH FUNCTIONS
// =============================================

/**
 * Fetch all bookings for a guest
 */
const fetchGuestBookings = async (guestId: string): Promise<Booking[]> => {
  const { data, error } = await supabase
    .from('property_bookings')
    .select(`
      *,
      property:properties(property_id, property_name)
    `)
    .eq('guest_id', guestId)
    .order('check_in_date', { ascending: false });

  if (error) {
    console.error('Error fetching guest bookings:', error);
    throw error;
  }

  return (data as any[]) || [];
};

/**
 * Fetch all invoices for a guest
 */
const fetchGuestInvoices = async (guestId: string): Promise<Invoice[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      property:properties(property_id, property_name),
      line_items:invoice_line_items(*)
    `)
    .eq('guest_id', guestId)
    .order('issue_date', { ascending: false });

  if (error) {
    console.error('Error fetching guest invoices:', error);
    throw error;
  }

  return (data as any[]) || [];
};

/**
 * Fetch complete guest history and create timeline
 */
const fetchGuestHistory = async (guestId: string): Promise<GuestHistoryTimeline> => {
  // Fetch bookings and invoices in parallel
  const [bookings, invoices] = await Promise.all([
    fetchGuestBookings(guestId),
    fetchGuestInvoices(guestId),
  ]);

  // Convert bookings to timeline items
  const bookingItems: GuestHistoryItem[] = bookings.map((booking) => ({
    id: booking.booking_id!,
    type: 'booking' as const,
    date: booking.check_in_date || booking.created_at || '',
    status: booking.status || 'unknown',
    property_name: (booking as any).property?.property_name,
    property_id: booking.property_id,
    description: `${booking.guest_count_adults || 0} adults, ${booking.guest_count_children || 0} children`,
    data: booking,
  }));

  // Convert invoices to timeline items
  const invoiceItems: GuestHistoryItem[] = invoices.map((invoice) => ({
    id: invoice.invoice_id!,
    type: 'invoice' as const,
    date: invoice.issue_date || invoice.created_at || '',
    status: invoice.status || 'unknown',
    property_name: (invoice as any).property?.property_name,
    property_id: invoice.property_id,
    amount: invoice.total_amount,
    description: `Invoice #${invoice.invoice_number || 'N/A'}`,
    data: invoice,
  }));

  // Combine and sort timeline
  const timeline = [...bookingItems, ...invoiceItems].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Calculate stats
  const totalSpent = invoices
    .filter((inv) => inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

  const paidInvoices = invoices.filter((inv) => inv.status === 'paid');
  const averageBookingValue = paidInvoices.length > 0 ? totalSpent / paidInvoices.length : 0;

  return {
    bookings,
    invoices,
    timeline,
    stats: {
      totalBookings: bookings.length,
      totalInvoices: invoices.length,
      totalSpent,
      averageBookingValue,
    },
  };
};

// =============================================
// HOOKS
// =============================================

/**
 * Hook to fetch complete guest history (bookings + invoices)
 */
export function useGuestHistory(guestId: string | null) {
  const { hasPermission } = usePermissions();

  return useQuery({
    queryKey: guestId ? guestKeys.history(guestId) : ['guests', 'history', 'null'],
    queryFn: () => (guestId ? fetchGuestHistory(guestId) : null),
    enabled: !!guestId && hasPermission(PERMISSIONS.GUESTS_VIEW),
    staleTime: CACHE_CONFIG.CRITICAL.staleTime, // 1 minute - financial data
    gcTime: CACHE_CONFIG.CRITICAL.gcTime,
  });
}

/**
 * Hook to fetch only guest bookings
 */
export function useGuestBookings(guestId: string | null) {
  const { hasPermission } = usePermissions();

  return useQuery({
    queryKey: guestId ? [...guestKeys.detail(guestId), 'bookings'] : ['guests', 'bookings', 'null'],
    queryFn: () => (guestId ? fetchGuestBookings(guestId) : null),
    enabled: !!guestId && hasPermission(PERMISSIONS.GUESTS_VIEW),
    staleTime: CACHE_CONFIG.CRITICAL.staleTime,
    gcTime: CACHE_CONFIG.CRITICAL.gcTime,
  });
}

/**
 * Hook to fetch only guest invoices
 */
export function useGuestInvoices(guestId: string | null) {
  const { hasPermission } = usePermissions();

  return useQuery({
    queryKey: guestId ? [...guestKeys.detail(guestId), 'invoices'] : ['guests', 'invoices', 'null'],
    queryFn: () => (guestId ? fetchGuestInvoices(guestId) : null),
    enabled: !!guestId && hasPermission(PERMISSIONS.GUESTS_VIEW),
    staleTime: CACHE_CONFIG.CRITICAL.staleTime,
    gcTime: CACHE_CONFIG.CRITICAL.gcTime,
  });
}
