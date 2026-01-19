import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  Building2,
  History,
  ArrowRightLeft,
  Pencil,
  LogOut,
  LogIn,
} from "lucide-react";
import {
  PropertyKeySummary,
  KeyCategory,
  KeyType,
  KEY_TYPE_LABELS,
  KEY_CATEGORY_LABELS,
} from "@/lib/schemas";

interface PropertyKeyCardProps {
  property: PropertyKeySummary;
  isExpanded: boolean;
  onToggle: () => void;
  onTransfer: (property: PropertyKeySummary, fromCategory: KeyCategory, keyType: KeyType) => void;
  onEdit: (property: PropertyKeySummary, category: KeyCategory, keyType: KeyType) => void;
  onViewHistory: () => void;
  onCheckOut?: () => void;
  onCheckIn?: () => void;
}

const CATEGORIES: KeyCategory[] = ["office", "operational", "housekeepers", "extras"];
const KEY_TYPES: KeyType[] = ["house_key", "mailbox_key", "storage_key", "remote_control"];

// Colors for categories
const CATEGORY_COLORS: Record<KeyCategory, string> = {
  office: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  operational: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  housekeepers: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  extras: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export function PropertyKeyCard({
  property,
  isExpanded,
  onToggle,
  onTransfer,
  onEdit,
  onViewHistory,
  onCheckOut,
  onCheckIn,
}: PropertyKeyCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{property.property_name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">
                  {property.total_keys} {t("keyControl.keys", "keys")}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onCheckOut && property.total_keys > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onCheckOut();
                }}
              >
                <LogOut className="h-4 w-4 mr-1" />
                {t("keyControl.checkOut", "Check Out")}
              </Button>
            )}
            {onCheckIn && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onCheckIn();
                }}
              >
                <LogIn className="h-4 w-4 mr-1" />
                {t("keyControl.checkIn", "Check In")}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewHistory();
              }}
            >
              <History className="h-4 w-4 mr-1" />
              {t("keyControl.history", "History")}
            </Button>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {CATEGORIES.map((category) => (
              <div key={category} className="space-y-2">
                <div className={`rounded-lg p-3 ${CATEGORY_COLORS[category]}`}>
                  <h4 className="font-semibold text-center">
                    {KEY_CATEGORY_LABELS[category]}
                  </h4>
                </div>
                <div className="space-y-2">
                  {KEY_TYPES.map((keyType) => {
                    const quantity = property.inventory[category][keyType];
                    return (
                      <div
                        key={keyType}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded-lg group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{KEY_TYPE_LABELS[keyType]}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={quantity > 0 ? "default" : "secondary"}
                            className="min-w-[2rem] justify-center"
                          >
                            {quantity}
                          </Badge>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => onEdit(property, category, keyType)}
                              title={t("keyControl.edit", "Edit")}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            {quantity > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => onTransfer(property, category, keyType)}
                                title={t("keyControl.transfer", "Transfer")}
                              >
                                <ArrowRightLeft className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
