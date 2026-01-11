import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Key, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PropertyKeySummary, KeyType, KeyCategory, KEY_TYPE_LABELS, KEY_CATEGORY_LABELS } from '@/lib/schemas';
import { cn } from '@/lib/utils';

interface PropertyKeyRowProps {
  property: PropertyKeySummary;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onLendKey: (propertyId: string, propertyName: string) => void;
  onEditQuantity: (propertyId: string, propertyName: string, keyType: KeyType, category: KeyCategory, currentQty: number, currentNotes: string | null) => void;
}

const KEY_TYPES: KeyType[] = ['house_key', 'mailbox_key', 'storage_key', 'remote_control'];
const CATEGORIES: KeyCategory[] = ['office', 'operational', 'housekeepers', 'extras'];

// Short category labels for table header
const SHORT_CATEGORY_LABELS: Record<KeyCategory, string> = {
  office: 'Main',
  operational: 'Ops',
  housekeepers: 'Clean',
  extras: 'Spare',
};

export function PropertyKeyRow({
  property,
  isExpanded,
  onToggleExpand,
  onLendKey,
  onEditQuantity,
}: PropertyKeyRowProps) {
  const { t } = useTranslation();

  // Calculate totals per category
  const categoryTotals = CATEGORIES.map(category => {
    return KEY_TYPES.reduce((sum, keyType) => {
      return sum + (property.inventory[category]?.[keyType] || 0);
    }, 0);
  });

  return (
    <>
      {/* Main Property Row */}
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={onToggleExpand}
      >
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <Key className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{property.property_name}</span>
          </div>
        </TableCell>
        {categoryTotals.map((total, index) => (
          <TableCell key={CATEGORIES[index]} className="text-center">
            <Badge variant={total > 0 ? 'secondary' : 'outline'} className="min-w-[2rem]">
              {total}
            </Badge>
          </TableCell>
        ))}
        <TableCell className="text-center">
          <Badge variant="default" className="min-w-[2rem]">
            {property.total_keys}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onLendKey(property.property_id, property.property_name);
            }}
          >
            {t('keyControl.lendKey', 'Lend Key')}
          </Button>
        </TableCell>
      </TableRow>

      {/* Expanded Key Type Rows */}
      {isExpanded && KEY_TYPES.map(keyType => {
        const rowTotals = CATEGORIES.map(category => property.inventory[category]?.[keyType] || 0);
        const rowTotal = rowTotals.reduce((sum, qty) => sum + qty, 0);

        return (
          <TableRow key={keyType} className="bg-muted/30">
            <TableCell className="pl-12 text-sm text-muted-foreground">
              {KEY_TYPE_LABELS[keyType]}
            </TableCell>
            {rowTotals.map((qty, index) => (
              <TableCell key={CATEGORIES[index]} className="text-center text-sm">
                {qty}
              </TableCell>
            ))}
            <TableCell className="text-center text-sm font-medium">
              {rowTotal}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  // Edit the first category with keys, or default to 'office'
                  const categoryWithKeys = CATEGORIES.find(cat => property.inventory[cat]?.[keyType] > 0) || 'office';
                  onEditQuantity(
                    property.property_id,
                    property.property_name,
                    keyType,
                    categoryWithKeys,
                    property.inventory[categoryWithKeys]?.[keyType] || 0,
                    property.inventoryNotes?.[categoryWithKeys]?.[keyType] || null
                  );
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}

// Table header component for reuse
export function PropertyKeyTableHeader() {
  const { t } = useTranslation();

  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-[250px]">{t('keyControl.property', 'Property')}</TableHead>
        {CATEGORIES.map(category => (
          <TableHead key={category} className="text-center w-[80px]">
            {SHORT_CATEGORY_LABELS[category]}
          </TableHead>
        ))}
        <TableHead className="text-center w-[80px]">{t('keyControl.total', 'Total')}</TableHead>
        <TableHead className="text-right w-[120px]">{t('keyControl.actions', 'Actions')}</TableHead>
      </TableRow>
    </TableHeader>
  );
}

export default PropertyKeyRow;
