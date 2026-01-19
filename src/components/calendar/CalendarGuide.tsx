/**
 * CalendarGuide - Collapsible information card explaining calendar features
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Building,
  Home,
  Calendar,
  MousePointer,
  Palette,
  Info,
} from 'lucide-react';

export function CalendarGuide() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm overflow-hidden">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-4 hover:bg-blue-100/50 rounded-lg"
          >
            <div className="flex items-center gap-2 text-blue-700">
              <HelpCircle className="h-5 w-5" />
              <span className="font-medium">
                {t('calendar.guide.title', 'Calendar Guide - How to Use')}
              </span>
            </div>
            {isOpen ? (
              <ChevronUp className="h-5 w-5 text-blue-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-blue-600" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Booking Types Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-800 font-semibold border-b pb-2">
                  <Building className="h-4 w-4 text-blue-600" />
                  <span>{t('calendar.guide.bookingTypes.title', 'Booking Types')}</span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-gray-700">
                        {t('calendar.guide.bookingTypes.entireProperty', 'Entire Property')}
                      </span>
                      <p className="text-xs text-gray-500">
                        {t('calendar.guide.bookingTypes.entirePropertyDesc', 'Blocks all units under the property. Shown on property row and all unit rows.')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-purple-500 rounded mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-gray-700">
                        {t('calendar.guide.bookingTypes.unitSpecific', 'Unit-Specific')}
                      </span>
                      <p className="text-xs text-gray-500">
                        {t('calendar.guide.bookingTypes.unitSpecificDesc', 'Only blocks the selected unit. Other units remain available for booking.')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 p-2 bg-blue-100/50 rounded text-xs">
                    <Info className="h-3 w-3 inline mr-1 text-blue-600" />
                    {t('calendar.guide.bookingTypes.tip', 'Click on a unit row to pre-select that unit when creating a booking.')}
                  </div>
                </div>
              </div>

              {/* Color Legend Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-800 font-semibold border-b pb-2">
                  <Palette className="h-4 w-4 text-blue-600" />
                  <span>{t('calendar.guide.colorLegend.title', 'Status Colors')}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded" />
                    <span className="text-gray-600">
                      {t('calendar.guide.colorLegend.confirmed', 'Confirmed - Booking is confirmed')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded" />
                    <span className="text-gray-600">
                      {t('calendar.guide.colorLegend.pending', 'Pending - Awaiting confirmation')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded" />
                    <span className="text-gray-600">
                      {t('calendar.guide.colorLegend.checkedIn', 'Checked In - Guest has arrived')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-500 rounded" />
                    <span className="text-gray-600">
                      {t('calendar.guide.colorLegend.checkedOut', 'Checked Out - Stay completed')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded" />
                    <span className="text-gray-600">
                      {t('calendar.guide.colorLegend.cancelled', 'Cancelled - Booking cancelled')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-800 rounded" />
                    <span className="text-gray-600">
                      {t('calendar.guide.colorLegend.blocked', 'Blocked - Dates unavailable')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation & Actions Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-800 font-semibold border-b pb-2">
                  <MousePointer className="h-4 w-4 text-blue-600" />
                  <span>{t('calendar.guide.actions.title', 'Actions & Navigation')}</span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-gray-700">
                        {t('calendar.guide.actions.createBooking', 'Create Booking')}
                      </span>
                      <p className="text-xs text-gray-500">
                        {t('calendar.guide.actions.createBookingDesc', 'Click on an empty date cell to create a new booking.')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MousePointer className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-gray-700">
                        {t('calendar.guide.actions.viewBooking', 'View/Edit Booking')}
                      </span>
                      <p className="text-xs text-gray-500">
                        {t('calendar.guide.actions.viewBookingDesc', 'Click on a booking bar to view details or edit.')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Home className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-gray-700">
                        {t('calendar.guide.actions.expandUnits', 'Expand Units')}
                      </span>
                      <p className="text-xs text-gray-500">
                        {t('calendar.guide.actions.expandUnitsDesc', 'Click the arrow or property row to show/hide individual units.')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 p-2 bg-amber-100/50 rounded text-xs">
                    <Info className="h-3 w-3 inline mr-1 text-amber-600" />
                    {t('calendar.guide.actions.tip', 'Right-click on dates for more options like blocking dates or quick actions.')}
                  </div>
                </div>
              </div>

            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
