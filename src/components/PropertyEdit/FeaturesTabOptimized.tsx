import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Sparkles, FileText, Save, Loader2, Check, AlertCircle } from 'lucide-react';
import { useAmenities, useRules } from '@/hooks/useAmenitiesAndRules';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyKeys } from '@/hooks/usePropertiesOptimized';

interface FeaturesTabOptimizedProps {
  propertyId: string;
}

export function FeaturesTabOptimized({ propertyId }: FeaturesTabOptimizedProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: amenities = [], isLoading: amenitiesLoading } = useAmenities();
  const { data: rules = [], isLoading: rulesLoading } = useRules();

  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialAmenities, setInitialAmenities] = useState<string[]>([]);
  const [initialRules, setInitialRules] = useState<string[]>([]);

  // Fetch currently selected amenities and rules for this property
  useEffect(() => {
    const fetchPropertyFeatures = async () => {
      // Fetch amenities
      const { data: propertyAmenities } = await supabase
        .from('property_amenities')
        .select('amenity_id')
        .eq('property_id', propertyId);

      // Fetch rules
      const { data: propertyRules } = await supabase
        .from('property_rules')
        .select('rule_id')
        .eq('property_id', propertyId);

      const amenityIds = propertyAmenities?.map(pa => pa.amenity_id) || [];
      const ruleIds = propertyRules?.map(pr => pr.rule_id) || [];

      setSelectedAmenities(amenityIds);
      setSelectedRules(ruleIds);
      setInitialAmenities(amenityIds);
      setInitialRules(ruleIds);
    };

    fetchPropertyFeatures();
  }, [propertyId]);

  // Track changes
  useEffect(() => {
    const amenitiesChanged = JSON.stringify(selectedAmenities.sort()) !== JSON.stringify(initialAmenities.sort());
    const rulesChanged = JSON.stringify(selectedRules.sort()) !== JSON.stringify(initialRules.sort());
    setHasUnsavedChanges(amenitiesChanged || rulesChanged);

    // Emit event for parent to know about unsaved changes
    const event = new CustomEvent('property-edit-unsaved-changes', {
      detail: { hasChanges: amenitiesChanged || rulesChanged }
    });
    window.dispatchEvent(event);
  }, [selectedAmenities, selectedRules, initialAmenities, initialRules]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Delete existing amenities and rules
      await Promise.all([
        supabase.from('property_amenities').delete().eq('property_id', propertyId),
        supabase.from('property_rules').delete().eq('property_id', propertyId),
      ]);

      // Insert new amenities
      if (selectedAmenities.length > 0) {
        const amenityInserts = selectedAmenities.map(amenityId => ({
          property_id: propertyId,
          amenity_id: amenityId,
        }));
        await supabase.from('property_amenities').insert(amenityInserts);
      }

      // Insert new rules
      if (selectedRules.length > 0) {
        const ruleInserts = selectedRules.map(ruleId => ({
          property_id: propertyId,
          rule_id: ruleId,
        }));
        await supabase.from('property_rules').insert(ruleInserts);
      }
    },
    onSuccess: () => {
      // Update initial values
      setInitialAmenities(selectedAmenities);
      setInitialRules(selectedRules);
      setHasUnsavedChanges(false);

      // Invalidate property detail cache to refresh the data
      queryClient.invalidateQueries({ queryKey: propertyKeys.detail(propertyId) });
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });

      toast({
        title: 'Success',
        description: 'Property features updated successfully',
      });

      // Emit event to notify parent
      window.dispatchEvent(new Event('property-updated'));
    },
    onError: (error) => {
      console.error('Error saving features:', error);
      toast({
        title: 'Error',
        description: 'Failed to update property features',
        variant: 'destructive',
      });
    },
  });

  const handleAmenityToggle = (amenityId: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenityId)
        ? prev.filter(id => id !== amenityId)
        : [...prev, amenityId]
    );
  };

  const handleRuleToggle = (ruleId: string) => {
    setSelectedRules(prev =>
      prev.includes(ruleId)
        ? prev.filter(id => id !== ruleId)
        : [...prev, ruleId]
    );
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  if (amenitiesLoading || rulesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Unsaved changes indicator */}
      {hasUnsavedChanges && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-amber-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-amber-800">You have unsaved changes</p>
              <p className="text-sm text-amber-700">Don't forget to save your changes.</p>
            </div>
          </div>
        </div>
      )}

      {/* Amenities Section */}
      <Card className="border-l-4 border-l-teal-500">
        <CardHeader className="bg-gradient-to-r from-teal-50 to-teal-100">
          <CardTitle className="flex items-center gap-3 text-teal-900">
            <Sparkles className="h-5 w-5" />
            Amenities
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {amenities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <p className="mb-2">No amenities available</p>
              <p className="text-xs">Add amenities in Property Settings first</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {amenities.map((amenity) => (
                  <div key={amenity.amenity_id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`amenity-${amenity.amenity_id}`}
                      checked={selectedAmenities.includes(amenity.amenity_id!)}
                      onCheckedChange={() => handleAmenityToggle(amenity.amenity_id!)}
                    />
                    <label
                      htmlFor={`amenity-${amenity.amenity_id}`}
                      className="text-sm cursor-pointer"
                    >
                      {amenity.amenity_name}
                    </label>
                  </div>
                ))}
              </div>
              {selectedAmenities.length > 0 && (
                <div className="mt-4 p-3 bg-teal-50 border border-teal-200 rounded-md">
                  <p className="text-sm text-teal-800">
                    <strong>{selectedAmenities.length}</strong> amenities selected
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Rules Section */}
      <Card className="border-l-4 border-l-rose-500">
        <CardHeader className="bg-gradient-to-r from-rose-50 to-rose-100">
          <CardTitle className="flex items-center gap-3 text-rose-900">
            <FileText className="h-5 w-5" />
            Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <p className="mb-2">No rules available</p>
              <p className="text-xs">Add rules in Property Settings first</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {rules.map((rule) => (
                  <div key={rule.rule_id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`rule-${rule.rule_id}`}
                      checked={selectedRules.includes(rule.rule_id!)}
                      onCheckedChange={() => handleRuleToggle(rule.rule_id!)}
                    />
                    <label
                      htmlFor={`rule-${rule.rule_id}`}
                      className="text-sm cursor-pointer"
                    >
                      {rule.rule_name}
                    </label>
                  </div>
                ))}
              </div>
              {selectedRules.length > 0 && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-md">
                  <p className="text-sm text-rose-800">
                    <strong>{selectedRules.length}</strong> rules selected
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                <AlertCircle className="w-3 h-3 mr-1" />
                Unsaved changes
              </Badge>
            )}
            {!hasUnsavedChanges && !saveMutation.isPending && (
              <Badge variant="outline" className="text-green-600 border-green-300">
                <Check className="w-3 h-3 mr-1" />
                All changes saved
              </Badge>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || !hasUnsavedChanges}
            className="bg-primary hover:bg-primary/90 shadow-lg min-w-[120px]"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
