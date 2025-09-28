import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { CalendarDays, Plus, ChevronLeft, ChevronRight, Upload, Download, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MikasaSpinner } from '@/components/ui/mikasa-loader';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface BookingRates {
  rate_id?: string;
  property_id: string;
  low_season_rate: number;
  medium_season_rate: number;
  high_season_rate: number;
  holiday_rate: number;
  extra_guest_price: number;
  pm_commission: number;
  cash_payment: boolean;
  credit_card_payment: boolean;
  debit_card_payment: boolean;
  stripe_payment: boolean;
  deposit_payment: boolean;
}

interface BookingTabProps {
  propertyId: string;
}

export function BookingTab({ propertyId }: BookingTabProps) {
  const [rates, setRates] = useState<BookingRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { toast } = useToast();

  const [formData, setFormData] = useState<BookingRates>({
    property_id: propertyId,
    low_season_rate: 0,
    medium_season_rate: 0,
    high_season_rate: 0,
    holiday_rate: 0,
    extra_guest_price: 0,
    pm_commission: 0,
    cash_payment: false,
    credit_card_payment: false,
    debit_card_payment: false,
    stripe_payment: false,
    deposit_payment: false,
  });

  const emptyRates: BookingRates = {
    property_id: propertyId,
    low_season_rate: 0,
    medium_season_rate: 0,
    high_season_rate: 0,
    holiday_rate: 0,
    extra_guest_price: 0,
    pm_commission: 0,
    cash_payment: false,
    credit_card_payment: false,
    debit_card_payment: false,
    stripe_payment: false,
    deposit_payment: false,
  };

  useEffect(() => {
    fetchBookingRates();
  }, [propertyId]);

  const fetchBookingRates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('property_booking_rates')
        .select('*')
        .eq('property_id', propertyId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const rateData = data || emptyRates;
      setRates(rateData);
      setFormData(rateData);
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
    try {
      setSaving(true);
      
      if (rates?.rate_id) {
        // Update existing rates
        const { error } = await supabase
          .from('property_booking_rates')
          .update(formData)
          .eq('rate_id', rates.rate_id);

        if (error) throw error;
      } else {
        // Create new rates
        const { error } = await supabase
          .from('property_booking_rates')
          .insert([formData]);

        if (error) throw error;
      }

      await fetchBookingRates();
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

  const handleInputChange = (field: keyof BookingRates, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <MikasaSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-secondary rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Booking Management</h2>
            <p className="text-white/80">Set rates, payment methods, and manage calendar</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-white text-primary hover:bg-white/90 font-medium shadow-lg"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      {/* Booking Rates */}
      <Card className="border-0 shadow-card bg-card/60 backdrop-blur-sm">
        <CardHeader className="bg-gradient-primary text-white rounded-t-lg">
          <CardTitle className="flex items-center text-lg">
            <CalendarDays className="mr-2 h-5 w-5" />
            Booking Rates & Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Rates Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-foreground">Seasonal Rates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="low_season_rate" className="text-sm font-medium">Low Season Rate</Label>
                <Input
                  id="low_season_rate"
                  type="number"
                  step="0.01"
                  value={formData.low_season_rate}
                  onChange={(e) => handleInputChange('low_season_rate', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="border-primary/20 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medium_season_rate" className="text-sm font-medium">Medium Season Rate</Label>
                <Input
                  id="medium_season_rate"
                  type="number"
                  step="0.01"
                  value={formData.medium_season_rate}
                  onChange={(e) => handleInputChange('medium_season_rate', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="border-primary/20 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="high_season_rate" className="text-sm font-medium">High Season Rate</Label>
                <Input
                  id="high_season_rate"
                  type="number"
                  step="0.01"
                  value={formData.high_season_rate}
                  onChange={(e) => handleInputChange('high_season_rate', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="border-primary/20 focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="holiday_rate" className="text-sm font-medium">Holiday Rate</Label>
                <Input
                  id="holiday_rate"
                  type="number"
                  step="0.01"
                  value={formData.holiday_rate}
                  onChange={(e) => handleInputChange('holiday_rate', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="border-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Additional Pricing */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-foreground">Additional Pricing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="extra_guest_price" className="text-sm font-medium">Extra Guest Price</Label>
                <Input
                  id="extra_guest_price"
                  type="number"
                  step="0.01"
                  value={formData.extra_guest_price}
                  onChange={(e) => handleInputChange('extra_guest_price', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="border-accent/20 focus:border-accent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pm_commission" className="text-sm font-medium">PM Commission (%)</Label>
                <Input
                  id="pm_commission"
                  type="number"
                  step="0.01"
                  value={formData.pm_commission}
                  onChange={(e) => handleInputChange('pm_commission', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="border-accent/20 focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-foreground">Accepted Payment Methods</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cash_payment"
                  checked={formData.cash_payment}
                  onCheckedChange={(checked) => handleInputChange('cash_payment', checked)}
                />
                <Label htmlFor="cash_payment" className="text-sm">Cash</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="credit_card_payment"
                  checked={formData.credit_card_payment}
                  onCheckedChange={(checked) => handleInputChange('credit_card_payment', checked)}
                />
                <Label htmlFor="credit_card_payment" className="text-sm">Credit Card</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="debit_card_payment"
                  checked={formData.debit_card_payment}
                  onCheckedChange={(checked) => handleInputChange('debit_card_payment', checked)}
                />
                <Label htmlFor="debit_card_payment" className="text-sm">Debit Card</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="stripe_payment"
                  checked={formData.stripe_payment}
                  onCheckedChange={(checked) => handleInputChange('stripe_payment', checked)}
                />
                <Label htmlFor="stripe_payment" className="text-sm">Stripe</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="deposit_payment"
                  checked={formData.deposit_payment}
                  onCheckedChange={(checked) => handleInputChange('deposit_payment', checked)}
                />
                <Label htmlFor="deposit_payment" className="text-sm">Deposit</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Booking Button */}
      <div className="flex justify-center">
        <Button className="bg-accent hover:bg-accent-hover text-accent-foreground px-8 py-3 text-lg font-medium shadow-lg">
          <Plus className="mr-2 h-5 w-5" />
          New Booking
        </Button>
      </div>

      {/* Calendar Section */}
      <Card className="border-0 shadow-card bg-card/60 backdrop-blur-sm">
        <CardHeader className="bg-gradient-subtle border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg">
              <CalendarDays className="mr-2 h-5 w-5 text-primary" />
              Calendar - {format(currentMonth, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="rounded-md border border-border/50 bg-background/50 backdrop-blur-sm pointer-events-auto"
            />
          </div>
        </CardContent>
      </Card>

      {/* Calendar Sync */}
      <Card className="border-0 shadow-card bg-card/60 backdrop-blur-sm">
        <CardHeader className="bg-gradient-primary text-white rounded-t-lg">
          <CardTitle className="flex items-center text-lg">
            <Upload className="mr-2 h-5 w-5" />
            Calendar Synchronization
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="outline" className="flex-1">
              <Upload className="mr-2 h-4 w-4" />
              Import Calendar
            </Button>
            <Button variant="outline" className="flex-1">
              <Download className="mr-2 h-4 w-4" />
              Export Calendar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Warning Alert */}
      <Alert className="border-orange-200 bg-orange-50">
        <AlertCircle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>Note:</strong> There are no future reservations for this property. Consider updating your booking calendar or promotional strategies.
        </AlertDescription>
      </Alert>
    </div>
  );
}