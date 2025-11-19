import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Plus,
  FileText,
  DollarSign,
  Eye,
  LayoutGrid,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBillTemplates } from "@/hooks/useBillTemplates";
import { BillTemplateWithItems } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface BillTemplateSelectorProps {
  propertyId: string;
  onTemplatesSelected: (templates: BillTemplateWithItems[]) => void;
}

export default function BillTemplateSelector({
  propertyId,
  onTemplatesSelected,
}: BillTemplateSelectorProps) {
  const navigate = useNavigate();
  const { data: propertyTemplates, isLoading: isLoadingProperty } =
    useBillTemplates(propertyId);
  const { data: allTemplates, isLoading: isLoadingAll } = useBillTemplates(); // Fetch all templates
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(
    new Set(),
  );
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("table"); // Default to table

  const activePropertyTemplates =
    propertyTemplates?.filter((t) => t.is_active) || [];
  const activeAllTemplates = allTemplates?.filter((t) => t.is_active) || [];

  const activeTemplates = showAllTemplates
    ? activeAllTemplates
    : activePropertyTemplates;
  const isLoading = showAllTemplates ? isLoadingAll : isLoadingProperty;

  const handleToggleTemplate = (templateId: string) => {
    const newSelected = new Set(selectedTemplateIds);
    if (newSelected.has(templateId)) {
      newSelected.delete(templateId);
    } else {
      newSelected.add(templateId);
    }
    setSelectedTemplateIds(newSelected);
  };

  const handleAddSelected = () => {
    const selected = activeTemplates.filter((t) =>
      selectedTemplateIds.has(t.template_id!),
    );
    onTemplatesSelected(selected);
    setSelectedTemplateIds(new Set()); // Clear selection after adding
  };

  const getItemTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      accommodation: "🏠",
      cleaning: "🧹",
      extras: "✨",
      tax: "📊",
      commission: "💼",
      other: "📝",
    };
    return icons[type] || "📝";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">
              Loading templates...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activeTemplates || activeTemplates.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
            <p className="text-lg font-medium text-muted-foreground">
              {showAllTemplates
                ? "No Templates Available"
                : "No Templates for This Property"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {showAllTemplates
                ? "Create bill templates in Settings to speed up invoice creation"
                : "View all templates or create new ones in Settings"}
            </p>
            <div className="flex gap-2 mt-4">
              {!showAllTemplates && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowAllTemplates(true)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View All Templates
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/bill-templates")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Go to Template Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Quick Add from Templates
            </CardTitle>
            <CardDescription className="mt-1">
              {showAllTemplates
                ? "Viewing all available templates across all properties"
                : "Viewing templates for this property"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="rounded-r-none"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("cards")}
                className="rounded-l-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant={showAllTemplates ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setShowAllTemplates(!showAllTemplates);
                setSelectedTemplateIds(new Set());
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showAllTemplates ? "Property Only" : "All Templates"}
            </Button>
            {selectedTemplateIds.size > 0 && (
              <Button
                onClick={handleAddSelected}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Check className="h-4 w-4 mr-2" />
                Add Selected ({selectedTemplateIds.size})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Table View */}
        {viewMode === "table" ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-center w-32">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeTemplates.map((template) => {
                  const isSelected = selectedTemplateIds.has(
                    template.template_id!,
                  );
                  const itemCount = template.items?.length || 0;

                  return (
                    <TableRow
                      key={template.template_id}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isSelected ? "bg-blue-50" : "hover:bg-gray-50",
                      )}
                      onClick={() =>
                        handleToggleTemplate(template.template_id!)
                      }
                    >
                      <TableCell>
                        <div
                          className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center",
                            isSelected
                              ? "border-blue-500 bg-blue-500"
                              : "border-gray-300 bg-white",
                          )}
                        >
                          {isSelected && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {template.template_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-md truncate">
                        {template.description || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-xs">
                          {itemCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${template.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isSelected) {
                              onTemplatesSelected([template]);
                              setSelectedTemplateIds(new Set());
                            } else {
                              handleToggleTemplate(template.template_id!);
                            }
                          }}
                        >
                          {isSelected ? "Add" : "Select"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          /* Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTemplates.map((template) => {
              const isSelected = selectedTemplateIds.has(template.template_id!);
              const itemCount = template.items?.length || 0;

              return (
                <div
                  key={template.template_id}
                  onClick={() => handleToggleTemplate(template.template_id!)}
                  className={cn(
                    "relative cursor-pointer rounded-lg border-2 transition-all duration-200",
                    "hover:shadow-md hover:scale-[1.02]",
                    isSelected
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-blue-300",
                  )}
                >
                  {/* Selection Checkbox */}
                  <div
                    className={cn(
                      "absolute top-3 right-3 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                      isSelected
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-300 bg-white",
                    )}
                  >
                    {isSelected && <Check className="h-4 w-4 text-white" />}
                  </div>

                  <div className="p-4">
                    {/* Template Name */}
                    <h3
                      className={cn(
                        "font-semibold text-base mb-1 pr-8",
                        isSelected ? "text-blue-900" : "text-gray-900",
                      )}
                    >
                      {template.template_name}
                    </h3>

                    {/* Description */}
                    {template.description && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {template.description}
                      </p>
                    )}

                    {/* Item Count Badge */}
                    <Badge variant="secondary" className="mb-3 text-xs">
                      {itemCount} {itemCount === 1 ? "item" : "items"}
                    </Badge>

                    <Separator className="mb-3" />

                    {/* Line Items Preview */}
                    <div className="space-y-1.5 mb-3">
                      {template.items?.slice(0, 3).map((item, idx) => {
                        const lineTotal = item.quantity * item.unit_price;
                        const taxAmount =
                          item.tax_amount || lineTotal * (item.tax_rate / 100);
                        const totalWithTax = lineTotal + taxAmount;

                        return (
                          <div
                            key={idx}
                            className="flex items-start justify-between text-xs"
                          >
                            <div className="flex-1 pr-2">
                              <span className="mr-1">
                                {getItemTypeIcon(item.item_type)}
                              </span>
                              <span
                                className={cn(
                                  "font-medium",
                                  isSelected
                                    ? "text-blue-800"
                                    : "text-gray-700",
                                )}
                              >
                                {item.description}
                              </span>
                              <span className="text-muted-foreground ml-1">
                                ({item.quantity} × ${item.unit_price.toFixed(2)}
                                )
                              </span>
                            </div>
                            <span
                              className={cn(
                                "font-medium whitespace-nowrap",
                                isSelected ? "text-blue-900" : "text-gray-900",
                              )}
                            >
                              ${totalWithTax.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}

                      {itemCount > 3 && (
                        <p className="text-xs text-muted-foreground italic">
                          +{itemCount - 3} more{" "}
                          {itemCount - 3 === 1 ? "item" : "items"}
                        </p>
                      )}
                    </div>

                    <Separator className="mb-3" />

                    {/* Total */}
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          isSelected ? "text-blue-900" : "text-gray-900",
                        )}
                      >
                        Total
                      </span>
                      <span
                        className={cn(
                          "text-lg font-bold flex items-center",
                          isSelected ? "text-blue-600" : "text-green-600",
                        )}
                      >
                        <DollarSign className="h-4 w-4" />
                        {template.total_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Button at Bottom (if templates selected) - Only for card view */}
        {viewMode === "cards" && selectedTemplateIds.size > 0 && (
          <div className="mt-6 flex items-center justify-center">
            <Button
              onClick={handleAddSelected}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Add {selectedTemplateIds.size} Selected{" "}
              {selectedTemplateIds.size === 1 ? "Template" : "Templates"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
