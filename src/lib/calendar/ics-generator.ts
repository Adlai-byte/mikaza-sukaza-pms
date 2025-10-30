/**
 * ICS/iCal Calendar Feed Generator
 *
 * Generates iCalendar format feeds for property bookings
 * RFC 5545 compliant: https://tools.ietf.org/html/rfc5545
 *
 * Features:
 * - Generate ICS files for individual bookings
 * - Generate feed for all bookings (for calendar subscription)
 * - Generate feed for specific property
 * - Include all booking details (guest, property, status, etc.)
 * - Support for updates (SEQUENCE field)
 * - Timezone support
 */

import { format, parseISO } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';

type Booking = Tables<'property_bookings'>;

interface ICSEvent {
  uid: string;
  summary: string;
  description: string;
  location: string;
  dtstart: string;
  dtend: string;
  status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  created: string;
  lastModified: string;
  sequence: number;
  organizer?: string;
  url?: string;
}

/**
 * Format date for iCalendar (YYYYMMDD format)
 */
const formatICSDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyyMMdd');
};

/**
 * Format datetime for iCalendar (YYYYMMDDTHHmmssZ format)
 */
const formatICSDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, "yyyyMMdd'T'HHmmss'Z'");
};

/**
 * Escape special characters in ICS text fields
 */
const escapeICSText = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n');
};

/**
 * Map booking status to ICS status
 */
const mapBookingStatus = (status: string): 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED' => {
  const normalizedStatus = status?.toLowerCase() || 'pending';

  switch (normalizedStatus) {
    case 'confirmed':
    case 'checked_in':
    case 'completed':
      return 'CONFIRMED';
    case 'cancelled':
      return 'CANCELLED';
    case 'pending':
    case 'blocked':
    default:
      return 'TENTATIVE';
  }
};

/**
 * Convert booking to ICS event object
 */
export const bookingToICSEvent = (
  booking: Booking,
  propertyName?: string,
  propertyAddress?: string
): ICSEvent => {
  const status = mapBookingStatus(booking.booking_status || 'pending');

  // Create unique identifier
  const uid = `booking-${booking.booking_id}@casaconcierge.com`;

  // Build summary (calendar event title)
  const summary = `${booking.guest_name}${propertyName ? ` - ${propertyName}` : ''}`;

  // Build description with all relevant details
  const descriptionParts: string[] = [];
  descriptionParts.push(`Guest: ${booking.guest_name}`);
  if (booking.guest_email) descriptionParts.push(`Email: ${booking.guest_email}`);
  if (booking.guest_phone) descriptionParts.push(`Phone: ${booking.guest_phone}`);
  if (booking.num_guests) descriptionParts.push(`Number of Guests: ${booking.num_guests}`);
  if (propertyName) descriptionParts.push(`Property: ${propertyName}`);
  if (booking.total_amount) descriptionParts.push(`Total: $${booking.total_amount}`);
  if (booking.payment_status) descriptionParts.push(`Payment: ${booking.payment_status}`);
  if (booking.booking_channel) descriptionParts.push(`Channel: ${booking.booking_channel}`);
  if (booking.special_requests) descriptionParts.push(`Special Requests: ${booking.special_requests}`);
  descriptionParts.push(`Status: ${booking.booking_status || 'pending'}`);

  const description = escapeICSText(descriptionParts.join('\\n'));

  // Build location
  const location = escapeICSText(propertyAddress || propertyName || 'Property');

  // Dates - use VALUE=DATE for all-day events
  const dtstart = formatICSDate(booking.check_in_date);
  const dtend = formatICSDate(booking.check_out_date);

  // Timestamps
  const created = formatICSDateTime(booking.created_at || new Date().toISOString());
  const lastModified = formatICSDateTime(booking.updated_at || booking.created_at || new Date().toISOString());

  return {
    uid,
    summary,
    description,
    location,
    dtstart,
    dtend,
    status,
    created,
    lastModified,
    sequence: 0, // Increment this for updates
  };
};

/**
 * Generate ICS event block from ICSEvent object
 */
const generateEventBlock = (event: ICSEvent): string => {
  const lines: string[] = [];

  lines.push('BEGIN:VEVENT');
  lines.push(`UID:${event.uid}`);
  lines.push(`DTSTAMP:${formatICSDateTime(new Date())}`);
  lines.push(`DTSTART;VALUE=DATE:${event.dtstart}`);
  lines.push(`DTEND;VALUE=DATE:${event.dtend}`);
  lines.push(`SUMMARY:${event.summary}`);
  lines.push(`DESCRIPTION:${event.description}`);
  lines.push(`LOCATION:${event.location}`);
  lines.push(`STATUS:${event.status}`);
  lines.push(`CREATED:${event.created}`);
  lines.push(`LAST-MODIFIED:${event.lastModified}`);
  lines.push(`SEQUENCE:${event.sequence}`);

  if (event.organizer) {
    lines.push(`ORGANIZER:${event.organizer}`);
  }

  if (event.url) {
    lines.push(`URL:${event.url}`);
  }

  lines.push('END:VEVENT');

  return lines.join('\r\n');
};

/**
 * Generate complete ICS calendar file
 */
export const generateICSCalendar = (
  events: ICSEvent[],
  calendarName: string = 'Casa & Concierge Bookings',
  calendarDescription?: string
): string => {
  const lines: string[] = [];

  // Calendar header
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//Casa & Concierge//Property Management System//EN');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');
  lines.push(`X-WR-CALNAME:${escapeICSText(calendarName)}`);

  if (calendarDescription) {
    lines.push(`X-WR-CALDESC:${escapeICSText(calendarDescription)}`);
  }

  lines.push('X-WR-TIMEZONE:UTC');

  // Add timezone definition for UTC
  lines.push('BEGIN:VTIMEZONE');
  lines.push('TZID:UTC');
  lines.push('BEGIN:STANDARD');
  lines.push('DTSTART:19700101T000000');
  lines.push('TZOFFSETFROM:+0000');
  lines.push('TZOFFSETTO:+0000');
  lines.push('TZNAME:UTC');
  lines.push('END:STANDARD');
  lines.push('END:VTIMEZONE');

  // Add all events
  events.forEach(event => {
    lines.push(generateEventBlock(event));
  });

  // Calendar footer
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
};

/**
 * Generate ICS feed for a list of bookings
 */
export const generateBookingsICS = (
  bookings: Booking[],
  properties: Map<string, { name: string; address?: string }>,
  calendarName?: string,
  calendarDescription?: string
): string => {
  const events: ICSEvent[] = bookings.map(booking => {
    const property = properties.get(booking.property_id);
    return bookingToICSEvent(
      booking,
      property?.name,
      property?.address
    );
  });

  return generateICSCalendar(events, calendarName, calendarDescription);
};

/**
 * Generate ICS file for a single booking
 */
export const generateSingleBookingICS = (
  booking: Booking,
  propertyName?: string,
  propertyAddress?: string
): string => {
  const event = bookingToICSEvent(booking, propertyName, propertyAddress);
  const calendarName = `Booking - ${booking.guest_name}`;

  return generateICSCalendar([event], calendarName);
};

/**
 * Download ICS file to user's device
 */
export const downloadICSFile = (icsContent: string, filename: string = 'bookings.ics') => {
  // Ensure filename ends with .ics
  if (!filename.endsWith('.ics')) {
    filename += '.ics';
  }

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

/**
 * Get ICS feed URL for subscription
 * This will point to the API endpoint that generates the feed
 */
export const getICSFeedURL = (
  baseUrl: string,
  feedType: 'all' | 'property',
  identifier?: string,
  token?: string
): string => {
  const params = new URLSearchParams();

  if (identifier) {
    params.append('id', identifier);
  }

  if (token) {
    params.append('token', token);
  }

  const queryString = params.toString();
  const path = feedType === 'property' ? '/api/calendar/property.ics' : '/api/calendar/bookings.ics';

  return `${baseUrl}${path}${queryString ? `?${queryString}` : ''}`;
};

/**
 * Generate Google Calendar subscription URL
 */
export const getGoogleCalendarURL = (icsFeedURL: string): string => {
  // Google Calendar accepts webcal:// protocol for subscriptions
  const webcalUrl = icsFeedURL.replace(/^https?:/, 'webcal:');
  return `https://www.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`;
};

/**
 * Generate Apple Calendar subscription URL
 */
export const getAppleCalendarURL = (icsFeedURL: string): string => {
  // Apple Calendar uses webcal:// protocol
  return icsFeedURL.replace(/^https?:/, 'webcal:');
};

/**
 * Generate Outlook/Office 365 subscription URL
 */
export const getOutlookCalendarURL = (icsFeedURL: string): string => {
  return `https://outlook.live.com/owa/?path=/calendar/action/compose&rru=addsubscription&url=${encodeURIComponent(icsFeedURL)}&name=${encodeURIComponent('Casa & Concierge Bookings')}`;
};
