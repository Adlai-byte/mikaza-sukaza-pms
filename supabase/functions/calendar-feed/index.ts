import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

/**
 * ICS Calendar Feed Generator for Casa & Concierge
 *
 * Endpoints:
 * - /calendar-feed?type=all - All bookings
 * - /calendar-feed?type=property&id=<property_id> - Bookings for a specific property
 * - /calendar-feed?type=user&id=<user_id> - Bookings managed by a specific user
 *
 * Optional parameters:
 * - token=<auth_token> - For authenticated feeds
 * - from=YYYY-MM-DD - Start date filter
 * - to=YYYY-MM-DD - End date filter
 */

// Helper: Format date for iCalendar (YYYYMMDD)
function formatICSDate(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// Helper: Format datetime for iCalendar (YYYYMMDDTHHmmssZ)
function formatICSDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

// Helper: Escape ICS text fields
function escapeICSText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n');
}

// Helper: Map booking status to ICS status
function mapBookingStatus(status: string): 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED' {
  const normalized = status?.toLowerCase() || 'pending';

  switch (normalized) {
    case 'confirmed':
    case 'checked_in':
    case 'completed':
      return 'CONFIRMED';
    case 'cancelled':
      return 'CANCELLED';
    default:
      return 'TENTATIVE';
  }
}

// Generate ICS event from booking
function generateICSEvent(booking: any, propertyName?: string, propertyAddress?: string): string {
  const uid = `booking-${booking.booking_id}@casaconcierge.com`;
  const summary = escapeICSText(`${booking.guest_name}${propertyName ? ` - ${propertyName}` : ''}`);
  const status = mapBookingStatus(booking.booking_status);

  // Build description
  const descParts: string[] = [];
  descParts.push(`Guest: ${booking.guest_name}`);
  if (booking.guest_email) descParts.push(`Email: ${booking.guest_email}`);
  if (booking.guest_phone) descParts.push(`Phone: ${booking.guest_phone}`);
  if (booking.num_guests) descParts.push(`Number of Guests: ${booking.num_guests}`);
  if (propertyName) descParts.push(`Property: ${propertyName}`);
  if (booking.total_amount) descParts.push(`Total: $${booking.total_amount}`);
  if (booking.payment_status) descParts.push(`Payment: ${booking.payment_status}`);
  if (booking.booking_channel) descParts.push(`Channel: ${booking.booking_channel}`);
  if (booking.special_requests) descParts.push(`Special Requests: ${booking.special_requests}`);
  descParts.push(`Status: ${booking.booking_status || 'pending'}`);

  const description = escapeICSText(descParts.join('\\n'));
  const location = escapeICSText(propertyAddress || propertyName || 'Property');

  // Dates
  const dtstart = formatICSDate(booking.check_in_date);
  const dtend = formatICSDate(booking.check_out_date);
  const created = formatICSDateTime(booking.created_at || new Date().toISOString());
  const lastModified = formatICSDateTime(booking.updated_at || booking.created_at || new Date().toISOString());
  const dtstamp = formatICSDateTime(new Date().toISOString());

  return `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART;VALUE=DATE:${dtstart}
DTEND;VALUE=DATE:${dtend}
SUMMARY:${summary}
DESCRIPTION:${description}
LOCATION:${location}
STATUS:${status}
CREATED:${created}
LAST-MODIFIED:${lastModified}
SEQUENCE:0
END:VEVENT`;
}

// Generate complete ICS calendar
function generateICSCalendar(events: string[], calendarName: string, description?: string): string {
  const escapedName = escapeICSText(calendarName);
  const escapedDesc = description ? escapeICSText(description) : '';

  let cal = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Casa & Concierge//Property Management System//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${escapedName}`;

  if (description) {
    cal += `\nX-WR-CALDESC:${escapedDesc}`;
  }

  cal += `
X-WR-TIMEZONE:UTC
BEGIN:VTIMEZONE
TZID:UTC
BEGIN:STANDARD
DTSTART:19700101T000000
TZOFFSETFROM:+0000
TZOFFSETTO:+0000
TZNAME:UTC
END:STANDARD
END:VTIMEZONE
`;

  // Add all events
  events.forEach(event => {
    cal += event + '\n';
  });

  cal += 'END:VCALENDAR';

  return cal;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Parse query parameters
    const url = new URL(req.url);
    const feedType = url.searchParams.get('type') || 'all';
    const id = url.searchParams.get('id');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const token = url.searchParams.get('token');

    console.log('Calendar feed request:', { feedType, id, from, to, hasToken: !!token });

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Server configuration error');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Build query
    let query = supabase
      .from('property_bookings')
      .select(`
        *,
        property:properties(property_id, property_name)
      `)
      .neq('booking_status', 'cancelled')
      .order('check_in_date', { ascending: true });

    // Apply filters
    if (feedType === 'property' && id) {
      query = query.eq('property_id', id);
    }

    if (from) {
      query = query.gte('check_in_date', from);
    }

    if (to) {
      query = query.lte('check_out_date', to);
    }

    // Fetch bookings
    const { data: bookings, error } = await query;

    if (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }

    console.log(`Fetched ${bookings?.length || 0} bookings`);

    // Generate ICS events
    const events = (bookings || []).map(booking => {
      const property = Array.isArray(booking.property)
        ? booking.property[0]
        : booking.property;

      return generateICSEvent(
        booking,
        property?.property_name,
        undefined // We can add address later if needed
      );
    });

    // Generate calendar name and description
    let calendarName = 'Casa & Concierge Bookings';
    let calendarDescription = 'Property bookings managed by Casa & Concierge';

    if (feedType === 'property' && id) {
      const firstBooking = bookings?.[0];
      const property = Array.isArray(firstBooking?.property)
        ? firstBooking.property[0]
        : firstBooking?.property;

      if (property?.property_name) {
        calendarName = `${property.property_name} - Bookings`;
        calendarDescription = `Bookings for ${property.property_name}`;
      }
    }

    // Generate ICS calendar
    const icsContent = generateICSCalendar(events, calendarName, calendarDescription);

    // Return ICS file
    return new Response(icsContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="bookings.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('Error generating calendar feed:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate calendar feed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
