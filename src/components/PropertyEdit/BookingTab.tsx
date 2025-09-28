import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, AlertTriangle, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BookingRates {
  rate_id: string;
  holiday_rate: number;
  high_season_rate: number;
  medium_season_rate: number;
  low_season_rate: number;
  extra_guest_price: number;
  pm_commission: number;
  cash_payment: boolean;
  credit_card_payment: boolean;
  debit_card_payment: boolean;
  deposit_payment: boolean;
  stripe_payment: boolean;
}

interface BookingTabProps {
  propertyId: string;
}

export function BookingTab({ propertyId }: BookingTabProps) {
  const [rates, setRates] = useState<BookingRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const emptyRates = {
    holiday_rate: 0,
    high_season_rate: 0,
    medium_season_rate: 0,
    low_season_rate: 0,
    extra_guest_price: 0,
    pm_commission: 0,
    cash_payment: false,
    credit_card_payment: false,
    debit_card_payment: false,
    deposit_payment: false,
    stripe_payment: false,
  };

  const [formData, setFormData] = useState(emptyRates);

  useEffect(() => {
    fetchBookingRates();
  }, [propertyId]);

  const fetchBookingRates = async () => {
    try {
      const { data, error } = await supabase
        .from('property_booking_rates')
        .select('*')
        .eq('property_id', propertyId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }

      if (data) {
        setRates(data);
        setFormData({
          holiday_rate: data.holiday_rate || 0,
          high_season_rate: data.high_season_rate || 0,
          medium_season_rate: data.medium_season_rate || 0,
          low_season_rate: data.low_season_rate || 0,
          extra_guest_price: data.extra_guest_price || 0,
          pm_commission: data.pm_commission || 0,
          cash_payment: data.cash_payment || false,
          credit_card_payment: data.credit_card_payment || false,
          debit_card_payment: data.debit_card_payment || false,
          deposit_payment: data.deposit_payment || false,
          stripe_payment: data.stripe_payment || false,
        });
      }
    } catch (error) {
      console.error('Error fetching booking rates:', error);
      toast({
        title: "Error",
        description: "Failed to load booking rates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (rates) {
        // Update existing rates
        const { error } = await supabase
          .from('property_booking_rates')
          .update(formData)
          .eq('rate_id', rates.rate_id);

        if (error) throw error;
      } else {
        // Create new rates
        const { data, error } = await supabase
          .from('property_booking_rates')
          .insert({
            ...formData,
            property_id: propertyId,
          })
          .select()
          .single();

        if (error) throw error;
        setRates(data);
      }

      toast({
        title: "Success",
        description: "Booking rates saved successfully",
      });
    } catch (error) {
      console.error('Error saving booking rates:', error);
      toast({
        title: "Error",
        description: "Failed to save booking rates",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const currentDate = new Date();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentMonth = monthNames[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-64 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Booking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Define the rate section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Define the rate</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div>
                <Label htmlFor="holiday_rate">Holiday</Label>
                <Input
                  id="holiday_rate"
                  type="number"
                  step="0.01"
                  value={formData.holiday_rate}
                  onChange={(e) => handleInputChange('holiday_rate', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="high_season_rate">High season</Label>
                <Input
                  id="high_season_rate"
                  type="number"
                  step="0.01"
                  value={formData.high_season_rate}
                  onChange={(e) => handleInputChange('high_season_rate', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="medium_season_rate">Medium season</Label>
                <Input
                  id="medium_season_rate"
                  type="number"
                  step="0.01"
                  value={formData.medium_season_rate}
                  onChange={(e) => handleInputChange('medium_season_rate', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="low_season_rate">Low season</Label>
                <Input
                  id="low_season_rate"
                  type="number"
                  step="0.01"
                  value={formData.low_season_rate}
                  onChange={(e) => handleInputChange('low_season_rate', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="pm_commission">PM Commission</Label>
                <div className="flex items-center">
                  <Input
                    id="pm_commission"
                    type="number"
                    step="0.01"
                    max="100"
                    value={formData.pm_commission}
                    onChange={(e) => handleInputChange('pm_commission', parseFloat(e.target.value) || 0)}
                  />
                  <span className="ml-2 text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <Label htmlFor="extra_guest_price">Extra Guest Price</Label>
              <Input
                id="extra_guest_price"
                type="number"
                step="0.01"
                value={formData.extra_guest_price}
                onChange={(e) => handleInputChange('extra_guest_price', parseFloat(e.target.value) || 0)}
                className="w-40"
              />
            </div>

            {/* Payment Methods */}
            <div className="mb-6">
              <Label className="text-base font-medium mb-3 block">Payments Methods</Label>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cash_payment"
                    checked={formData.cash_payment}
                    onCheckedChange={(checked) => handleInputChange('cash_payment', !!checked)}
                  />
                  <Label htmlFor="cash_payment">Cash</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="credit_card_payment"
                    checked={formData.credit_card_payment}
                    onCheckedChange={(checked) => handleInputChange('credit_card_payment', !!checked)}
                  />
                  <Label htmlFor="credit_card_payment">Credit Card</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="debit_card_payment"
                    checked={formData.debit_card_payment}
                    onCheckedChange={(checked) => handleInputChange('debit_card_payment', !!checked)}
                  />
                  <Label htmlFor="debit_card_payment">Debit Card</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="deposit_payment"
                    checked={formData.deposit_payment}
                    onCheckedChange={(checked) => handleInputChange('deposit_payment', !!checked)}
                  />
                  <Label htmlFor="deposit_payment">Deposit</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="stripe_payment"
                    checked={formData.stripe_payment}
                    onCheckedChange={(checked) => handleInputChange('stripe_payment', !!checked)}
                  />
                  <Label htmlFor="stripe_payment">Stripe</Label>
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>

          {/* New booking button */}
          <div>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="mr-2 h-4 w-4" />
              New booking
            </Button>
          </div>

          {/* Calendar Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{currentMonth}, {currentYear}</h3>
              <div className="flex gap-2">
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                  This Month
                </Button>
                <Button size="sm" variant="outline">
                  <Calendar className="mr-2 h-4 w-4" />
                  {currentMonth.slice(0, 3)}
                </Button>
                <Button size="sm" variant="outline">
                  <Calendar className="mr-2 h-4 w-4" />
                  {(currentDate.getMonth() + 1) % 12 === 0 ? 'Jan' : monthNames[(currentDate.getMonth() + 1) % 12].slice(0, 3)}
                </Button>
              </div>
            </div>

            {/* Calendar Grid */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {/* Sample calendar days */}
                  {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
                    <div
                      key={day}
                      className="aspect-square border border-muted p-1 text-sm hover:bg-muted cursor-pointer flex items-center justify-center"
                    >
                      {day}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sync Calendars */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Sync Calendars</h3>
            <Button className="bg-orange-500 hover:bg-orange-600 mb-4">
              Import Calendar
            </Button>
            
            <div className="bg-muted p-4 rounded-lg mb-4">
              <h4 className="font-medium mb-2">Export Url</h4>
              <p className="text-sm text-muted-foreground break-all">
                http://app.mikasasukaza.com/Calendar/iCal/5e000028-2417-09ea-0c12-49c5f7a622461
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              There is no calendars imported for this unit. Click the button below to import a new calendar.
            </p>
          </div>

          {/* Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Warning: There is no future reservations for this property.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}