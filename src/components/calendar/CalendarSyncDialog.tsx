/**
 * Calendar Sync Dialog Component
 *
 * Allows users to:
 * - Subscribe to booking calendar in Google Calendar, Apple Calendar, Outlook
 * - Download ICS file for one-time import
 * - Copy calendar feed URL
 * - View subscription instructions
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Copy,
  Download,
  ExternalLink,
  CheckCircle,
  Info,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateBookingsICS, downloadICSFile } from '@/lib/calendar/ics-generator';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Property = Tables<'properties'>;

interface CalendarSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties?: Property[];
}

export function CalendarSyncDialog({
  open,
  onOpenChange,
  properties = [],
}: CalendarSyncDialogProps) {
  const { toast } = useToast();
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Get Supabase project URL
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] || '';
  const [edgeFunctionAvailable, setEdgeFunctionAvailable] = useState<boolean | null>(null);

  // Generate feed URL
  const feedUrl = useMemo(() => {
    const baseUrl = `${supabaseUrl}/functions/v1/calendar-feed`;
    const params = new URLSearchParams();

    if (selectedProperty && selectedProperty !== 'all') {
      params.append('type', 'property');
      params.append('id', selectedProperty);
    } else {
      params.append('type', 'all');
    }

    return `${baseUrl}?${params.toString()}`;
  }, [supabaseUrl, selectedProperty]);

  // Check if Edge Function is available
  React.useEffect(() => {
    const checkEdgeFunction = async () => {
      try {
        const response = await fetch(feedUrl, {
          method: 'HEAD',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        });
        setEdgeFunctionAvailable(response.ok);
      } catch (error) {
        setEdgeFunctionAvailable(false);
      }
    };

    if (open && feedUrl) {
      checkEdgeFunction();
    }
  }, [open, feedUrl]);

  // Generate webcal URL (for subscription)
  const webcalUrl = feedUrl.replace(/^https?:/, 'webcal:');

  // Google Calendar subscription URL
  const googleCalendarUrl = `https://www.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`;

  // Outlook subscription URL
  const outlookUrl = `https://outlook.live.com/owa/?path=/calendar/action/compose&rru=addsubscription&url=${encodeURIComponent(feedUrl)}&name=${encodeURIComponent('Casa & Concierge Bookings')}`;

  // Apple Calendar instruction
  const appleCalendarUrl = webcalUrl;

  // Copy URL to clipboard
  const copyToClipboard = async (text: string, label: string = 'URL') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: `${label} copied to clipboard`,
      });

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the URL manually',
        variant: 'destructive',
      });
    }
  };

  // Download ICS file
  const downloadCalendar = async () => {
    setIsDownloading(true);

    try {
      // Fetch bookings
      let query = supabase
        .from('property_bookings')
        .select(`
          *,
          property:properties(property_id, property_name)
        `)
        .neq('booking_status', 'cancelled')
        .order('check_in_date', { ascending: true });

      if (selectedProperty && selectedProperty !== 'all') {
        query = query.eq('property_id', selectedProperty);
      }

      const { data: bookings, error } = await query;

      if (error) throw error;

      if (!bookings || bookings.length === 0) {
        toast({
          title: 'No bookings found',
          description: 'There are no bookings to export',
          variant: 'destructive',
        });
        return;
      }

      // Build properties map
      const propertiesMap = new Map();
      bookings.forEach(booking => {
        const property = Array.isArray(booking.property)
          ? booking.property[0]
          : booking.property;

        if (property) {
          propertiesMap.set(booking.property_id, {
            name: property.property_name,
          });
        }
      });

      // Generate ICS content
      let calendarName = 'Casa & Concierge Bookings';
      if (selectedProperty && selectedProperty !== 'all') {
        const property = properties.find(p => p.property_id === selectedProperty);
        if (property) {
          calendarName = `${property.property_name} - Bookings`;
        }
      }

      const icsContent = generateBookingsICS(
        bookings as any,
        propertiesMap,
        calendarName,
        'Property bookings managed by Casa & Concierge'
      );

      // Download file
      const filename = selectedProperty && selectedProperty !== 'all'
        ? `${properties.find(p => p.property_id === selectedProperty)?.property_name || 'property'}-bookings.ics`
        : 'all-bookings.ics';

      downloadICSFile(icsContent, filename);

      toast({
        title: 'Success',
        description: 'Calendar file downloaded successfully',
      });
    } catch (error) {
      console.error('Error downloading calendar:', error);
      toast({
        title: 'Error',
        description: 'Failed to download calendar file',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Calendar Sync & Export
          </DialogTitle>
          <DialogDescription>
            Subscribe to your bookings in your favorite calendar app or download for one-time import
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Property Filter */}
          <div className="space-y-2">
            <Label>Filter by Property</Label>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger>
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map(property => (
                  <SelectItem key={property.property_id} value={property.property_id}>
                    {property.property_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Subscribe to all bookings or filter by a specific property
            </p>
          </div>

          {/* Tabs for different sync methods */}
          <Tabs defaultValue="subscribe" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="subscribe">Subscribe (Recommended)</TabsTrigger>
              <TabsTrigger value="download">Download Once</TabsTrigger>
            </TabsList>

            {/* Subscribe Tab */}
            <TabsContent value="subscribe" className="space-y-4 mt-4">
              {edgeFunctionAvailable === false && (
                <Alert className="bg-amber-50 border-amber-200">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-900">
                    <strong>Setup Required:</strong> The calendar feed endpoint needs to be deployed. Please use the <strong>Download</strong> tab for now, or contact your administrator to deploy the calendar-feed Edge Function.
                  </AlertDescription>
                </Alert>
              )}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Live Sync:</strong> Subscribing to the calendar feed will automatically sync new bookings and updates to your calendar app.
                </AlertDescription>
              </Alert>

              {/* Quick Sync Buttons */}
              <div className="space-y-3">
                <Label>Quick Sync</Label>

                {/* Google Calendar */}
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-3"
                  onClick={() => window.open(googleCalendarUrl, '_blank')}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center text-white text-sm font-bold">
                      G
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">Google Calendar</div>
                      <div className="text-xs text-muted-foreground">
                        Subscribe in one click
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Button>

                {/* Apple Calendar */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3 w-full p-3 border rounded-lg">
                    <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded flex items-center justify-center text-white text-sm font-bold">

                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">Apple Calendar</div>
                      <div className="text-xs text-muted-foreground">
                        Open this URL on Mac/iPhone/iPad
                      </div>
                    </div>
                  </div>
                  <Input
                    value={appleCalendarUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(appleCalendarUrl, 'Apple Calendar URL')}
                    className="w-full"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy URL
                      </>
                    )}
                  </Button>
                </div>

                {/* Outlook */}
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-3"
                  onClick={() => window.open(outlookUrl, '_blank')}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded flex items-center justify-center text-white text-sm font-bold">
                      O
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">Outlook / Office 365</div>
                      <div className="text-xs text-muted-foreground">
                        Subscribe in one click
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Button>
              </div>

              {/* Manual Subscription URL */}
              <div className="space-y-2">
                <Label>Manual Subscription (Advanced)</Label>
                <Input
                  value={feedUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(feedUrl, 'Calendar feed URL')}
                  className="w-full"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Feed URL
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Use this URL to subscribe in other calendar applications that support iCal/webcal feeds
                </p>
              </div>

              {/* Sync Info */}
              <Alert className="bg-blue-50 border-blue-200">
                <RefreshCw className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>Auto-sync:</strong> Most calendar apps check for updates every 12-24 hours. New bookings and changes will appear automatically.
                </AlertDescription>
              </Alert>
            </TabsContent>

            {/* Download Tab */}
            <TabsContent value="download" className="space-y-4 mt-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>One-Time Import:</strong> Download an ICS file to import into your calendar app. This is a snapshot and won't auto-update.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Download Calendar File</h4>
                      <p className="text-sm text-muted-foreground">
                        Export {selectedProperty === 'all' ? 'all' : 'selected property'} bookings as ICS file
                      </p>
                    </div>
                    <Badge variant="outline">ICS</Badge>
                  </div>

                  <Button
                    onClick={downloadCalendar}
                    disabled={isDownloading}
                    className="w-full"
                  >
                    {isDownloading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download Calendar File
                      </>
                    )}
                  </Button>
                </div>

                <Alert className="bg-amber-50 border-amber-200">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-900">
                    <strong>Note:</strong> Downloaded files are static snapshots. For automatic updates, use the Subscribe option instead.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
