/**
 * Report Data Hooks
 * Custom hooks for fetching and aggregating data for various report types
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseISO, differenceInDays } from 'date-fns';

// Query keys for report data caching
export const reportKeys = {
  currentBalance: (filters: CurrentBalanceFilters) => ['reports', 'current-balance', JSON.stringify(filters)],
  financialEntries: (filters: FinancialEntriesFilters) => ['reports', 'financial-entries', JSON.stringify(filters)],
  activeClients: (filters: ClientFilters) => ['reports', 'active-clients', JSON.stringify(filters)],
  inactiveClients: (filters: InactiveClientsFilters) => ['reports', 'inactive-clients', JSON.stringify(filters)],
  bookingsEnhanced: (filters: EnhancedBookingsFilters) => ['reports', 'bookings-enhanced', JSON.stringify(filters)],
  rentalRevenue: (filters: RevenueFilters) => ['reports', 'rental-revenue', JSON.stringify(filters)],
  clients: () => ['reports', 'clients-list'],
};

// Filter interfaces
export interface CurrentBalanceFilters {
  clientId?: string;
  includeInactive?: boolean;
  dateFrom?: string;
  dateTo?: string;
  enabled?: boolean;
}

export interface FinancialEntriesFilters {
  clientId?: string;
  includeInactive?: boolean;
  propertyId?: string;
  dateFrom?: string;
  dateTo?: string;
  showDebit?: boolean;
  showCredit?: boolean;
  showOwnerTransactions?: boolean;
  enabled?: boolean;
}

export interface ClientFilters {
  dateFrom?: string;
  dateTo?: string;
  enabled?: boolean;
}

export interface InactiveClientsFilters {
  dateFrom?: string;
  dateTo?: string;
  inactivityDays?: number;
  enabled?: boolean;
}

export interface EnhancedBookingsFilters {
  clientId?: string;
  includeInactive?: boolean;
  propertyId?: string;
  dateFrom?: string;
  dateTo?: string;
  withFinancial?: boolean;
  showTaxDetails?: boolean;
  enabled?: boolean;
}

export interface RevenueFilters {
  dateFrom?: string;
  dateTo?: string;
  propertyId?: string;
  enabled?: boolean;
}

// Data interfaces
export interface ClientBalanceData {
  guest_name: string;
  guest_email: string | null;
  total_invoiced: number;
  total_paid: number;
  balance_due: number;
  last_booking_date: string | null;
  is_inactive: boolean;
}

export interface FinancialEntryData {
  expense_id: string;
  date: string;
  property_name: string;
  property_id: string;
  entry_type: 'credit' | 'debit' | 'owner_payment';
  description: string;
  amount: number;
  running_balance: number;
  attachment_count: number;
  note_count: number;
}

export interface ActiveClientData {
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  last_booking: string | null;
  total_bookings: number;
  total_spent: number;
}

export interface InactiveClientData {
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  last_booking_date: string | null;
  days_since_last_booking: number;
}

export interface EnhancedBookingData {
  booking_id: string;
  guest_name: string;
  guest_email: string | null;
  property_id: string;
  property_name: string;
  check_in_date: string;
  check_out_date: string;
  booking_status: string;
  total_price: number;
  tax_amount: number;
  invoice_number?: string | null;
  invoice_paid?: number;
  invoice_balance?: number;
}

export interface RentalRevenueData {
  byProperty: {
    property_id: string;
    property_name: string;
    base_amount: number;
    extras: number;
    cleaning: number;
    deposits: number;
    total: number;
  }[];
  byChannel: {
    channel: string;
    revenue: number;
  }[];
  invoiceRevenue: number;
  totalBookingRevenue: number;
}

// Fetch clients list (unique guests from bookings and invoices)
const fetchClients = async (): Promise<{ id: string; name: string; email: string | null }[]> => {
  const { data: bookings, error: bookingsError } = await supabase
    .from('property_bookings')
    .select('guest_name, guest_email')
    .not('guest_name', 'is', null);

  if (bookingsError) throw bookingsError;

  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('guest_name, guest_email')
    .not('guest_name', 'is', null);

  if (invoicesError) throw invoicesError;

  // Combine and deduplicate
  const clientMap = new Map<string, { id: string; name: string; email: string | null }>();

  [...(bookings || []), ...(invoices || [])].forEach(record => {
    const key = record.guest_email || record.guest_name;
    if (key && !clientMap.has(key)) {
      clientMap.set(key, {
        id: key,
        name: record.guest_name,
        email: record.guest_email,
      });
    }
  });

  return Array.from(clientMap.values()).sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Hook to get list of unique clients (guests)
 */
export function useClientsList() {
  return useQuery({
    queryKey: reportKeys.clients(),
    queryFn: fetchClients,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook: Current Balance Report
 * Shows outstanding invoice balances per guest/client
 */
export function useCurrentBalanceReport(filters: CurrentBalanceFilters) {
  const { enabled = true, ...queryFilters } = filters;
  return useQuery({
    queryKey: reportKeys.currentBalance(queryFilters),
    queryFn: async (): Promise<ClientBalanceData[]> => {
      // Fetch invoices
      let invoicesQuery = supabase
        .from('invoices')
        .select('guest_name, guest_email, total_amount, amount_paid, issue_date')
        .not('guest_name', 'is', null);

      if (queryFilters.dateFrom) {
        invoicesQuery = invoicesQuery.gte('issue_date', queryFilters.dateFrom);
      }
      if (queryFilters.dateTo) {
        invoicesQuery = invoicesQuery.lte('issue_date', queryFilters.dateTo);
      }

      const { data: invoices, error: invoicesError } = await invoicesQuery;
      if (invoicesError) throw invoicesError;

      // Fetch bookings for activity status
      const { data: bookings, error: bookingsError } = await supabase
        .from('property_bookings')
        .select('guest_name, guest_email, check_out_date')
        .not('guest_name', 'is', null)
        .order('check_out_date', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Group invoices by guest
      const clientMap = new Map<string, ClientBalanceData>();

      (invoices || []).forEach(invoice => {
        const key = invoice.guest_email || invoice.guest_name;
        const existing = clientMap.get(key);

        if (existing) {
          existing.total_invoiced += invoice.total_amount || 0;
          existing.total_paid += invoice.amount_paid || 0;
          existing.balance_due = existing.total_invoiced - existing.total_paid;
        } else {
          clientMap.set(key, {
            guest_name: invoice.guest_name,
            guest_email: invoice.guest_email || null,
            total_invoiced: invoice.total_amount || 0,
            total_paid: invoice.amount_paid || 0,
            balance_due: (invoice.total_amount || 0) - (invoice.amount_paid || 0),
            last_booking_date: null,
            is_inactive: false,
          });
        }
      });

      // Enrich with booking data
      const today = new Date();
      const inactivityThreshold = 90; // days

      (bookings || []).forEach(booking => {
        const key = booking.guest_email || booking.guest_name;
        const client = clientMap.get(key);

        if (client && booking.check_out_date) {
          if (!client.last_booking_date || booking.check_out_date > client.last_booking_date) {
            client.last_booking_date = booking.check_out_date;
          }
          const bookingDate = parseISO(booking.check_out_date);
          client.is_inactive = differenceInDays(today, bookingDate) > inactivityThreshold;
        }
      });

      // Apply filters
      let results = Array.from(clientMap.values());

      if (queryFilters.clientId && queryFilters.clientId !== 'all') {
        results = results.filter(c =>
          c.guest_email === queryFilters.clientId || c.guest_name === queryFilters.clientId
        );
      }

      if (!queryFilters.includeInactive) {
        results = results.filter(c => !c.is_inactive);
      }

      return results.sort((a, b) => b.balance_due - a.balance_due);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled,
  });
}

/**
 * Hook: Financial Entries Report
 * Shows credits, debits, owner payments with running balance
 */
export function useFinancialEntriesReport(filters: FinancialEntriesFilters) {
  const { enabled = true, ...queryFilters } = filters;
  return useQuery({
    queryKey: reportKeys.financialEntries(queryFilters),
    queryFn: async (): Promise<FinancialEntryData[]> => {
      let query = supabase
        .from('expenses')
        .select(`
          expense_id,
          expense_date,
          property_id,
          entry_type,
          description,
          amount,
          property:properties(property_id, property_name),
          expense_attachments(attachment_id),
          expense_notes(note_id)
        `)
        .order('expense_date', { ascending: true });

      if (queryFilters.propertyId && queryFilters.propertyId !== 'all') {
        query = query.eq('property_id', queryFilters.propertyId);
      }

      if (queryFilters.dateFrom) {
        query = query.gte('expense_date', queryFilters.dateFrom);
      }

      if (queryFilters.dateTo) {
        query = query.lte('expense_date', queryFilters.dateTo);
      }

      // Build entry type filter - collect selected types
      const entryTypes: string[] = [];
      if (queryFilters.showDebit) entryTypes.push('debit');
      if (queryFilters.showCredit) entryTypes.push('credit');
      if (queryFilters.showOwnerTransactions) entryTypes.push('owner_payment');

      // Apply filter if at least one type is selected
      if (entryTypes.length > 0) {
        query = query.in('entry_type', entryTypes);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calculate running balance
      let runningBalance = 0;
      const results: FinancialEntryData[] = (data || []).map((expense: any) => {
        const amount = expense.amount || 0;
        const entryType = expense.entry_type || 'debit';

        if (entryType === 'credit') {
          runningBalance += amount;
        } else {
          runningBalance -= amount;
        }

        return {
          expense_id: expense.expense_id,
          date: expense.expense_date,
          property_id: expense.property_id,
          property_name: expense.property?.property_name || 'N/A',
          entry_type: entryType,
          description: expense.description || '',
          amount,
          running_balance: runningBalance,
          attachment_count: expense.expense_attachments?.length || 0,
          note_count: expense.expense_notes?.length || 0,
        };
      });

      return results;
    },
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}

/**
 * Hook: Active Clients Report
 * Guests with bookings within date range
 */
export function useActiveClientsReport(filters: ClientFilters) {
  const { enabled = true, ...queryFilters } = filters;
  return useQuery({
    queryKey: reportKeys.activeClients(queryFilters),
    queryFn: async (): Promise<ActiveClientData[]> => {
      let query = supabase
        .from('property_bookings')
        .select('guest_name, guest_email, guest_phone, check_in_date, check_out_date, total_amount, booking_status')
        .not('guest_name', 'is', null)
        .neq('booking_status', 'cancelled');

      if (queryFilters.dateFrom) {
        query = query.gte('check_in_date', queryFilters.dateFrom);
      }

      if (queryFilters.dateTo) {
        query = query.lte('check_in_date', queryFilters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by guest
      const clientMap = new Map<string, ActiveClientData>();

      (data || []).forEach(booking => {
        const key = booking.guest_email || booking.guest_name;
        const existing = clientMap.get(key);

        if (existing) {
          existing.total_bookings += 1;
          existing.total_spent += booking.total_amount || 0;
          if (!existing.last_booking || (booking.check_in_date && booking.check_in_date > existing.last_booking)) {
            existing.last_booking = booking.check_in_date;
          }
        } else {
          clientMap.set(key, {
            guest_name: booking.guest_name,
            guest_email: booking.guest_email || null,
            guest_phone: booking.guest_phone || null,
            last_booking: booking.check_in_date,
            total_bookings: 1,
            total_spent: booking.total_amount || 0,
          });
        }
      });

      return Array.from(clientMap.values()).sort((a, b) => b.total_spent - a.total_spent);
    },
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}

/**
 * Hook: Inactive Clients Report
 * Guests without recent bookings
 */
export function useInactiveClientsReport(filters: InactiveClientsFilters) {
  const { enabled = true, ...queryFilters } = filters;
  return useQuery({
    queryKey: reportKeys.inactiveClients(queryFilters),
    queryFn: async (): Promise<InactiveClientData[]> => {
      const { data, error } = await supabase
        .from('property_bookings')
        .select('guest_name, guest_email, guest_phone, check_out_date')
        .not('guest_name', 'is', null)
        .order('check_out_date', { ascending: false });

      if (error) throw error;

      const inactivityThreshold = queryFilters.inactivityDays || 90;
      const today = new Date();

      // Get the most recent booking per guest
      const clientMap = new Map<string, InactiveClientData>();

      (data || []).forEach(booking => {
        const key = booking.guest_email || booking.guest_name;
        if (!clientMap.has(key)) {
          const daysSince = booking.check_out_date
            ? differenceInDays(today, parseISO(booking.check_out_date))
            : 9999;

          clientMap.set(key, {
            guest_name: booking.guest_name,
            guest_email: booking.guest_email || null,
            guest_phone: booking.guest_phone || null,
            last_booking_date: booking.check_out_date,
            days_since_last_booking: daysSince,
          });
        }
      });

      // Filter to only inactive clients
      return Array.from(clientMap.values())
        .filter(c => c.days_since_last_booking >= inactivityThreshold)
        .sort((a, b) => b.days_since_last_booking - a.days_since_last_booking);
    },
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}

/**
 * Hook: Enhanced Bookings Report
 * Bookings with optional financial and tax details
 */
export function useEnhancedBookingsReport(filters: EnhancedBookingsFilters) {
  const { enabled = true, ...queryFilters } = filters;
  return useQuery({
    queryKey: reportKeys.bookingsEnhanced(queryFilters),
    queryFn: async (): Promise<EnhancedBookingData[]> => {
      let query = supabase
        .from('property_bookings')
        .select(`
          booking_id,
          guest_name,
          guest_email,
          property_id,
          check_in_date,
          check_out_date,
          booking_status,
          total_amount,
          deposit_amount,
          property:properties(property_id, property_name)
        `)
        .not('guest_name', 'is', null)
        .order('check_in_date', { ascending: false });

      if (queryFilters.propertyId && queryFilters.propertyId !== 'all') {
        query = query.eq('property_id', queryFilters.propertyId);
      }

      if (queryFilters.dateFrom) {
        query = query.gte('check_in_date', queryFilters.dateFrom);
      }

      if (queryFilters.dateTo) {
        query = query.lte('check_in_date', queryFilters.dateTo);
      }

      if (queryFilters.clientId && queryFilters.clientId !== 'all') {
        query = query.or(`guest_email.eq.${queryFilters.clientId},guest_name.eq.${queryFilters.clientId}`);
      }

      const { data: bookings, error: bookingsError } = await query;
      if (bookingsError) throw bookingsError;

      // Fetch invoices if withFinancial is true
      let invoiceMap = new Map<string, { invoice_number: string; amount_paid: number; balance_due: number }>();

      if (queryFilters.withFinancial) {
        const bookingIds = (bookings || []).filter(b => b.invoice_id).map(b => b.invoice_id);

        if (bookingIds.length > 0) {
          const { data: invoices, error: invoicesError } = await supabase
            .from('invoices')
            .select('invoice_id, invoice_number, total_amount, amount_paid')
            .in('invoice_id', bookingIds);

          if (invoicesError) throw invoicesError;

          (invoices || []).forEach(inv => {
            invoiceMap.set(inv.invoice_id, {
              invoice_number: inv.invoice_number || '',
              amount_paid: inv.amount_paid || 0,
              balance_due: (inv.total_amount || 0) - (inv.amount_paid || 0),
            });
          });
        }
      }

      return (bookings || []).map((booking: any) => {
        return {
          booking_id: booking.booking_id,
          guest_name: booking.guest_name,
          guest_email: booking.guest_email,
          property_id: booking.property_id,
          property_name: booking.property?.property_name || 'N/A',
          check_in_date: booking.check_in_date,
          check_out_date: booking.check_out_date,
          booking_status: booking.booking_status || 'pending',
          total_price: booking.total_amount || 0,
          tax_amount: 0, // Not available in current schema
          invoice_number: null,
          invoice_paid: 0,
          invoice_balance: 0,
        };
      });
    },
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}

/**
 * Hook: Rental Revenue Report
 * Revenue breakdown by property and channel
 */
export function useRentalRevenueReport(filters: RevenueFilters) {
  const { enabled = true, ...queryFilters } = filters;
  return useQuery({
    queryKey: reportKeys.rentalRevenue(queryFilters),
    queryFn: async (): Promise<RentalRevenueData> => {
      // Fetch bookings
      let bookingsQuery = supabase
        .from('property_bookings')
        .select(`
          property_id,
          total_amount,
          deposit_amount,
          booking_status,
          check_in_date,
          property:properties(property_id, property_name)
        `)
        .neq('booking_status', 'cancelled');

      if (queryFilters.propertyId && queryFilters.propertyId !== 'all') {
        bookingsQuery = bookingsQuery.eq('property_id', queryFilters.propertyId);
      }

      if (queryFilters.dateFrom) {
        bookingsQuery = bookingsQuery.gte('check_in_date', queryFilters.dateFrom);
      }

      if (queryFilters.dateTo) {
        bookingsQuery = bookingsQuery.lte('check_in_date', queryFilters.dateTo);
      }

      const { data: bookings, error: bookingsError } = await bookingsQuery;
      if (bookingsError) throw bookingsError;

      // Fetch paid invoices
      let invoicesQuery = supabase
        .from('invoices')
        .select('property_id, total_amount, paid_date')
        .eq('status', 'paid')
        .not('paid_date', 'is', null);

      if (queryFilters.propertyId && queryFilters.propertyId !== 'all') {
        invoicesQuery = invoicesQuery.eq('property_id', queryFilters.propertyId);
      }

      if (queryFilters.dateFrom) {
        invoicesQuery = invoicesQuery.gte('paid_date', queryFilters.dateFrom);
      }

      if (queryFilters.dateTo) {
        invoicesQuery = invoicesQuery.lte('paid_date', queryFilters.dateTo);
      }

      const { data: invoices, error: invoicesError } = await invoicesQuery;
      if (invoicesError) throw invoicesError;

      // Aggregate by property
      const byPropertyMap = new Map<string, {
        property_id: string;
        property_name: string;
        base_amount: number;
        extras: number;
        cleaning: number;
        deposits: number;
        total: number;
      }>();

      const byChannelMap = new Map<string, number>();

      (bookings || []).forEach((booking: any) => {
        const propKey = booking.property_id;
        const propName = booking.property?.property_name || propKey;
        const existing = byPropertyMap.get(propKey);
        const totalAmt = booking.total_amount || 0;
        const depositAmt = booking.deposit_amount || 0;

        if (existing) {
          existing.base_amount += totalAmt;
          existing.deposits += depositAmt;
          existing.total += totalAmt;
        } else {
          byPropertyMap.set(propKey, {
            property_id: propKey,
            property_name: propName,
            base_amount: totalAmt,
            extras: 0, // Not available in current schema
            cleaning: 0, // Not available in current schema
            deposits: depositAmt,
            total: totalAmt,
          });
        }

        // By channel - use "direct" as default since booking_channel not in schema
        const channel = 'direct';
        byChannelMap.set(channel, (byChannelMap.get(channel) || 0) + totalAmt);
      });

      // Calculate invoice revenue
      const invoiceRevenue = (invoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const totalBookingRevenue = (bookings || []).reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);

      return {
        byProperty: Array.from(byPropertyMap.values()).sort((a, b) => b.total - a.total),
        byChannel: Array.from(byChannelMap.entries())
          .map(([channel, revenue]) => ({ channel, revenue }))
          .sort((a, b) => b.revenue - a.revenue),
        invoiceRevenue,
        totalBookingRevenue,
      };
    },
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}
