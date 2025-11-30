import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Invoice } from '@/lib/schemas';
import { CACHE_CONFIG } from '@/lib/cache-config';

// Query keys for property invoices
export const propertyInvoiceKeys = {
  all: ['property-invoices'] as const,
  property: (propertyId: string) => [...propertyInvoiceKeys.all, propertyId] as const,
};

// Fetch invoices for a specific property
const fetchPropertyInvoices = async (propertyId: string): Promise<Invoice[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      property:properties(property_id, property_name),
      booking:property_bookings!invoices_booking_id_fkey(booking_id, guest_name, check_in_date, check_out_date),
      line_items:invoice_line_items(*)
    `)
    .eq('property_id', propertyId)
    .order('issue_date', { ascending: false });

  if (error) throw error;
  return (data || []) as Invoice[];
};

// Hook for fetching invoices for a specific property
export function usePropertyInvoices(propertyId: string | undefined) {
  const {
    data: invoices = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: propertyInvoiceKeys.property(propertyId || ''),
    queryFn: () => fetchPropertyInvoices(propertyId!),
    enabled: !!propertyId,
    staleTime: CACHE_CONFIG.CRITICAL.staleTime, // 1 minute
    gcTime: CACHE_CONFIG.CRITICAL.gcTime, // 30 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  return {
    invoices,
    loading: isLoading,
    isFetching,
    error,
    refetch,
  };
}
