import { InvoiceLineItem } from "@/lib/schemas";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Home,
  Sparkles,
  Package,
  Receipt,
  MoreHorizontal,
} from "lucide-react";

interface InvoiceLineItemsSummaryProps {
  lineItems: InvoiceLineItem[];
  editable?: boolean;
  onUpdateAmount?: (lineItemId: string, newAmount: number) => void;
}

type ItemType = "accommodation" | "cleaning" | "extras" | "tax" | "other" | "commission";

const typeConfig: Record<ItemType, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  accommodation: { icon: Home, color: "text-blue-600" },
  cleaning: { icon: Sparkles, color: "text-green-600" },
  extras: { icon: Package, color: "text-purple-600" },
  tax: { icon: Receipt, color: "text-orange-600" },
  commission: { icon: Receipt, color: "text-pink-600" },
  other: { icon: MoreHorizontal, color: "text-gray-600" },
};

export function InvoiceLineItemsSummary({
  lineItems,
  editable = false,
  onUpdateAmount,
}: InvoiceLineItemsSummaryProps) {
  const { t } = useTranslation();

  // Group items by type
  const groupedItems = lineItems.reduce((acc, item) => {
    const type = (item.item_type as ItemType) || "other";
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(item);
    return acc;
  }, {} as Record<ItemType, InvoiceLineItem[]>);

  // Calculate totals by type
  const typeTotals = Object.entries(groupedItems).map(([type, items]) => ({
    type: type as ItemType,
    items,
    total: items.reduce((sum, item) => sum + (item.quantity || 1) * (item.unit_price || 0), 0),
  }));

  // Sort by display order
  const displayOrder: ItemType[] = ["accommodation", "cleaning", "extras", "tax", "commission", "other"];
  typeTotals.sort((a, b) => displayOrder.indexOf(a.type) - displayOrder.indexOf(b.type));

  if (typeTotals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {typeTotals.map(({ type, items, total }) => {
        const config = typeConfig[type] || typeConfig.other;
        const Icon = config.icon;

        return (
          <div key={type} className="flex items-center justify-between py-1.5 border-b border-dashed last:border-0">
            <div className="flex items-center gap-2">
              <Icon className={cn("h-4 w-4", config.color)} />
              <span className="text-sm font-medium">
                {t(`propertyBookingsInvoices.lineItems.${type}`)}
              </span>
              {items.length > 1 && (
                <span className="text-xs text-muted-foreground">({items.length} items)</span>
              )}
            </div>

            {editable ? (
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={total}
                  onChange={(e) => {
                    // For simplicity, distribute the change proportionally
                    // In a real implementation, you might want to edit individual items
                    const newTotal = parseFloat(e.target.value) || 0;
                    if (items.length === 1 && onUpdateAmount) {
                      onUpdateAmount(items[0].line_item_id!, newTotal);
                    }
                  }}
                  className="w-24 h-8 text-right"
                  min={0}
                  step={0.01}
                />
              </div>
            ) : (
              <span className="text-sm font-medium">
                ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
