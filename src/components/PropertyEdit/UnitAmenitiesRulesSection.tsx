/**
 * Component for managing per-unit amenities and rules
 * Embedded in the unit settings expandable panel
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  Search,
  Sparkles,
  ScrollText,
} from 'lucide-react';
import { useAmenities, useRules } from '@/hooks/useAmenitiesAndRules';
import {
  useUnitAmenities,
  useUnitRules,
  useUpdateUnitAmenities,
  useUpdateUnitRules,
  useClearUnitAmenities,
  useClearUnitRules,
} from '@/hooks/useUnitAmenitiesAndRules';
import { Amenity, Rule } from '@/lib/schemas';

interface UnitAmenitiesRulesSectionProps {
  unitId: string;
  propertyAmenities?: Amenity[];
  propertyRules?: Rule[];
}

export function UnitAmenitiesRulesSection({
  unitId,
  propertyAmenities = [],
  propertyRules = [],
}: UnitAmenitiesRulesSectionProps) {
  // State
  const [isAmenitiesOpen, setIsAmenitiesOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [amenitySearch, setAmenitySearch] = useState('');
  const [ruleSearch, setRuleSearch] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(new Set());
  const [selectedRules, setSelectedRules] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch all available amenities and rules
  const { data: allAmenities = [], isLoading: loadingAmenities } = useAmenities();
  const { data: allRules = [], isLoading: loadingRules } = useRules();

  // Fetch current unit amenities and rules
  const { data: unitAmenities = [], isLoading: loadingUnitAmenities } = useUnitAmenities(unitId);
  const { data: unitRules = [], isLoading: loadingUnitRules } = useUnitRules(unitId);

  // Mutations
  const updateAmenities = useUpdateUnitAmenities();
  const updateRules = useUpdateUnitRules();
  const clearAmenities = useClearUnitAmenities();
  const clearRules = useClearUnitRules();

  // Determine if using unit-specific or property-level
  const hasUnitAmenities = unitAmenities.length > 0;
  const hasUnitRules = unitRules.length > 0;

  // Initialize selected amenities from unit or property
  useEffect(() => {
    if (!loadingUnitAmenities) {
      if (hasUnitAmenities) {
        setSelectedAmenities(new Set(unitAmenities.map(a => a.amenity_id!)));
      } else {
        setSelectedAmenities(new Set(propertyAmenities.map(a => a.amenity_id!)));
      }
    }
  }, [unitAmenities, propertyAmenities, loadingUnitAmenities, hasUnitAmenities]);

  // Initialize selected rules from unit or property
  useEffect(() => {
    if (!loadingUnitRules) {
      if (hasUnitRules) {
        setSelectedRules(new Set(unitRules.map(r => r.rule_id!)));
      } else {
        setSelectedRules(new Set(propertyRules.map(r => r.rule_id!)));
      }
    }
  }, [unitRules, propertyRules, loadingUnitRules, hasUnitRules]);

  // Filter amenities by search
  const filteredAmenities = useMemo(() => {
    if (!amenitySearch.trim()) return allAmenities;
    const search = amenitySearch.toLowerCase();
    return allAmenities.filter(a => a.amenity_name.toLowerCase().includes(search));
  }, [allAmenities, amenitySearch]);

  // Filter rules by search
  const filteredRules = useMemo(() => {
    if (!ruleSearch.trim()) return allRules;
    const search = ruleSearch.toLowerCase();
    return allRules.filter(r => r.rule_name.toLowerCase().includes(search));
  }, [allRules, ruleSearch]);

  // Handle amenity toggle
  const handleAmenityToggle = (amenityId: string) => {
    setSelectedAmenities(prev => {
      const next = new Set(prev);
      if (next.has(amenityId)) {
        next.delete(amenityId);
      } else {
        next.add(amenityId);
      }
      return next;
    });
    setHasChanges(true);
  };

  // Handle rule toggle
  const handleRuleToggle = (ruleId: string) => {
    setSelectedRules(prev => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
    setHasChanges(true);
  };

  // Save amenities
  const handleSaveAmenities = () => {
    updateAmenities.mutate(
      { unitId, amenityIds: Array.from(selectedAmenities) },
      { onSuccess: () => setHasChanges(false) }
    );
  };

  // Save rules
  const handleSaveRules = () => {
    updateRules.mutate(
      { unitId, ruleIds: Array.from(selectedRules) },
      { onSuccess: () => setHasChanges(false) }
    );
  };

  // Reset to property defaults (amenities)
  const handleResetAmenities = () => {
    clearAmenities.mutate(unitId, {
      onSuccess: () => {
        setSelectedAmenities(new Set(propertyAmenities.map(a => a.amenity_id!)));
        setHasChanges(false);
      }
    });
  };

  // Reset to property defaults (rules)
  const handleResetRules = () => {
    clearRules.mutate(unitId, {
      onSuccess: () => {
        setSelectedRules(new Set(propertyRules.map(r => r.rule_id!)));
        setHasChanges(false);
      }
    });
  };

  const isLoading = loadingAmenities || loadingRules || loadingUnitAmenities || loadingUnitRules;
  const isSaving = updateAmenities.isPending || updateRules.isPending || clearAmenities.isPending || clearRules.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading amenities & rules...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Amenities Section */}
      <Collapsible open={isAmenitiesOpen} onOpenChange={setIsAmenitiesOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Amenities
                <Badge variant={hasUnitAmenities ? 'default' : 'secondary'} className="text-xs">
                  {selectedAmenities.size} selected
                </Badge>
                {!hasUnitAmenities && (
                  <span className="text-xs font-normal text-gray-500">(using property defaults)</span>
                )}
                {isAmenitiesOpen ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
              </h4>
            </Button>
          </CollapsibleTrigger>
          {hasUnitAmenities && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetAmenities}
              disabled={isSaving}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Use Property Defaults
            </Button>
          )}
        </div>
        <CollapsibleContent className="pt-3">
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search amenities..."
                value={amenitySearch}
                onChange={(e) => setAmenitySearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            {/* Checkbox list */}
            <div className="max-h-48 overflow-y-auto border rounded-md p-2 bg-white">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {filteredAmenities.map((amenity) => (
                  <div key={amenity.amenity_id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`amenity-${unitId}-${amenity.amenity_id}`}
                      checked={selectedAmenities.has(amenity.amenity_id!)}
                      onCheckedChange={() => handleAmenityToggle(amenity.amenity_id!)}
                    />
                    <Label
                      htmlFor={`amenity-${unitId}-${amenity.amenity_id}`}
                      className="text-xs cursor-pointer truncate"
                      title={amenity.amenity_name}
                    >
                      {amenity.amenity_name}
                    </Label>
                  </div>
                ))}
              </div>
              {filteredAmenities.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">No amenities found</p>
              )}
            </div>
            {/* Save button */}
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleSaveAmenities}
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {updateAmenities.isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Amenities'
                )}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Rules Section */}
      <Collapsible open={isRulesOpen} onOpenChange={setIsRulesOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <ScrollText className="h-4 w-4" />
                Rules
                <Badge variant={hasUnitRules ? 'default' : 'secondary'} className="text-xs">
                  {selectedRules.size} selected
                </Badge>
                {!hasUnitRules && (
                  <span className="text-xs font-normal text-gray-500">(using property defaults)</span>
                )}
                {isRulesOpen ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
              </h4>
            </Button>
          </CollapsibleTrigger>
          {hasUnitRules && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetRules}
              disabled={isSaving}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Use Property Defaults
            </Button>
          )}
        </div>
        <CollapsibleContent className="pt-3">
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search rules..."
                value={ruleSearch}
                onChange={(e) => setRuleSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            {/* Checkbox list */}
            <div className="max-h-48 overflow-y-auto border rounded-md p-2 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredRules.map((rule) => (
                  <div key={rule.rule_id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`rule-${unitId}-${rule.rule_id}`}
                      checked={selectedRules.has(rule.rule_id!)}
                      onCheckedChange={() => handleRuleToggle(rule.rule_id!)}
                    />
                    <Label
                      htmlFor={`rule-${unitId}-${rule.rule_id}`}
                      className="text-xs cursor-pointer truncate"
                      title={rule.rule_name}
                    >
                      {rule.rule_name}
                    </Label>
                  </div>
                ))}
              </div>
              {filteredRules.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">No rules found</p>
              )}
            </div>
            {/* Save button */}
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleSaveRules}
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {updateRules.isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Rules'
                )}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
