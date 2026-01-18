import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
} from "@/components/ui/table";
import {
  Key,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  History,
  AlertTriangle,
  HandHelping,
  RotateCcw,
} from "lucide-react";
import {
  useAllPropertiesKeySummary,
  useBorrowingStats,
  useKeyControlRealtime,
} from "@/hooks/useKeyControl";
import {
  PropertyKeySummary,
  KeyCategory,
  KeyType,
} from "@/lib/schemas";
import {
  PropertyKeyRow,
  PropertyKeyTableHeader,
  LendKeyDialog,
  ReturnKeyDialog,
  KeyHistoryDialog,
  EditQuantityDialog,
} from "@/components/key-control";

export default function KeyControl() {
  const { t } = useTranslation();

  // Enable realtime updates
  useKeyControlRealtime();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());

  // Dialog states
  const [showLendDialog, setShowLendDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Selected property for dialogs
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedPropertyName, setSelectedPropertyName] = useState("");

  // Edit quantity state
  const [editKeyType, setEditKeyType] = useState<KeyType>("house_key");
  const [editCategory, setEditCategory] = useState<KeyCategory>("office");
  const [editCurrentQty, setEditCurrentQty] = useState(0);
  const [editCurrentNotes, setEditCurrentNotes] = useState<string | null>(null);

  // Data fetching
  const { data: propertySummaries, isLoading, refetch } = useAllPropertiesKeySummary(searchQuery || undefined);
  const { data: borrowingStats } = useBorrowingStats();

  // Calculate total keys
  const totalKeys = propertySummaries?.reduce((sum, p) => sum + p.total_keys, 0) || 0;
  const keysOut = borrowingStats?.currentlyOut || 0;
  const overdueKeys = borrowingStats?.totalOverdue || 0;

  // Toggle property expansion
  const togglePropertyExpansion = (propertyId: string) => {
    setExpandedProperties((prev) => {
      const next = new Set(prev);
      if (next.has(propertyId)) {
        next.delete(propertyId);
      } else {
        next.add(propertyId);
      }
      return next;
    });
  };

  // Expand/Collapse all
  const expandAll = () => {
    if (propertySummaries) {
      setExpandedProperties(new Set(propertySummaries.map((p) => p.property_id)));
    }
  };

  const collapseAll = () => {
    setExpandedProperties(new Set());
  };

  // Handle Lend Key
  const handleLendKey = (propertyId: string, propertyName: string) => {
    setSelectedPropertyId(propertyId);
    setSelectedPropertyName(propertyName);
    setShowLendDialog(true);
  };

  // Handle Edit Quantity
  const handleEditQuantity = (
    propertyId: string,
    propertyName: string,
    keyType: KeyType,
    category: KeyCategory,
    currentQty: number,
    currentNotes: string | null
  ) => {
    setSelectedPropertyId(propertyId);
    setSelectedPropertyName(propertyName);
    setEditKeyType(keyType);
    setEditCategory(category);
    setEditCurrentQty(currentQty);
    setEditCurrentNotes(currentNotes);
    setShowEditDialog(true);
  };

  // Open global dialogs
  const handleOpenReturn = () => {
    setSelectedPropertyId(null);
    setShowReturnDialog(true);
  };

  const handleOpenHistory = () => {
    setSelectedPropertyId(null);
    setSelectedPropertyName("");
    setShowHistoryDialog(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t("keyControl.title", "Key Inventory")}
        description={t("keyControl.description", "Manage property keys and track who has them")}
        icon={Key}
      >
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("common.refresh", "Refresh")}
        </Button>
      </PageHeader>

      {/* Stats Cards - Simplified to 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Keys */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Key className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("keyControl.stats.totalKeys", "Total Keys")}
                </p>
                <p className="text-2xl font-bold">{totalKeys}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Keys Out */}
        <Card className={keysOut > 0 ? "border-orange-300 bg-orange-50" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${keysOut > 0 ? "bg-orange-100" : "bg-gray-100"}`}>
                <HandHelping className={`h-6 w-6 ${keysOut > 0 ? "text-orange-600" : "text-gray-600"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("keyControl.stats.keysOut", "Keys Out")}
                </p>
                <p className="text-2xl font-bold">{keysOut}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card className={overdueKeys > 0 ? "border-red-300 bg-red-50" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${overdueKeys > 0 ? "bg-red-100" : "bg-gray-100"}`}>
                <AlertTriangle className={`h-6 w-6 ${overdueKeys > 0 ? "text-red-600" : "text-gray-600"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("keyControl.stats.overdue", "Overdue")}
                </p>
                <p className="text-2xl font-bold">{overdueKeys}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("keyControl.searchPlaceholder", "Search properties...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={expandAll}>
                <ChevronDown className="h-4 w-4 mr-1" />
                {t("keyControl.expandAll", "Expand All")}
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                <ChevronUp className="h-4 w-4 mr-1" />
                {t("keyControl.collapseAll", "Collapse All")}
              </Button>
              <Button variant="outline" onClick={handleOpenReturn}>
                <RotateCcw className="h-4 w-4 mr-2" />
                {t("keyControl.returnKey", "Return Key")}
                {keysOut > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {keysOut}
                  </Badge>
                )}
              </Button>
              <Button variant="outline" onClick={handleOpenHistory}>
                <History className="h-4 w-4 mr-2" />
                {t("keyControl.history", "Key History")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Property Keys Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !propertySummaries || propertySummaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Key className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">
                {t("keyControl.noProperties", "No properties found")}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery
                  ? t("keyControl.noSearchResults", "Try a different search term")
                  : t("keyControl.noPropertiesDescription", "No active properties available")}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <PropertyKeyTableHeader />
                <TableBody>
                  {propertySummaries.map((property) => (
                    <PropertyKeyRow
                      key={property.property_id}
                      property={property}
                      isExpanded={expandedProperties.has(property.property_id)}
                      onToggleExpand={() => togglePropertyExpansion(property.property_id)}
                      onLendKey={handleLendKey}
                      onEditQuantity={handleEditQuantity}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <LendKeyDialog
        open={showLendDialog}
        onOpenChange={setShowLendDialog}
        propertyId={selectedPropertyId}
        propertyName={selectedPropertyName}
      />

      <ReturnKeyDialog
        open={showReturnDialog}
        onOpenChange={setShowReturnDialog}
        propertyId={selectedPropertyId}
      />

      <KeyHistoryDialog
        open={showHistoryDialog}
        onOpenChange={setShowHistoryDialog}
        propertyId={selectedPropertyId}
        propertyName={selectedPropertyName}
      />

      <EditQuantityDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        propertyId={selectedPropertyId}
        propertyName={selectedPropertyName}
        keyType={editKeyType}
        category={editCategory}
        currentQuantity={editCurrentQty}
        currentNotes={editCurrentNotes}
      />
    </div>
  );
}
