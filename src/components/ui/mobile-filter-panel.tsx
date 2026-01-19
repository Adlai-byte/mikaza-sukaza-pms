import * as React from "react";
import { Filter, ChevronDown, ChevronUp, X } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MobileFilterPanelProps {
  children: React.ReactNode;
  activeFilterCount?: number;
  className?: string;
  /** Optional label for the filter button */
  label?: string;
  /** Called when filters are cleared */
  onClearFilters?: () => void;
  /** Show clear button when filters are active */
  showClearButton?: boolean;
}

/**
 * A collapsible filter panel that shows on mobile devices only.
 * On desktop (md and above), the children are rendered directly without the collapsible wrapper.
 *
 * Usage:
 * ```tsx
 * <MobileFilterPanel activeFilterCount={2} onClearFilters={handleClear}>
 *   <Select>...</Select>
 *   <Select>...</Select>
 * </MobileFilterPanel>
 * ```
 */
export function MobileFilterPanel({
  children,
  activeFilterCount = 0,
  className,
  label = "Filters",
  onClearFilters,
  showClearButton = true,
}: MobileFilterPanelProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      {/* Mobile: Collapsible filter panel */}
      <div className={cn("md:hidden", className)}>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 justify-between h-10"
              >
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  {label}
                  {activeFilterCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 h-5 px-1.5 text-xs bg-primary text-primary-foreground"
                    >
                      {activeFilterCount}
                    </Badge>
                  )}
                </span>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            {showClearButton && activeFilterCount > 0 && onClearFilters && (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearFilters();
                }}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear filters</span>
              </Button>
            )}
          </div>
          <CollapsibleContent className="pt-4 space-y-3">
            {children}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Desktop: Render children directly (hidden on mobile) */}
      <div className="hidden md:contents">
        {children}
      </div>
    </>
  );
}

/**
 * Wrapper for desktop-only filter content.
 * Use this when you need different layouts for mobile vs desktop filters.
 *
 * Usage:
 * ```tsx
 * <MobileFilterPanel activeFilterCount={2}>
 *   {mobileFilters}
 * </MobileFilterPanel>
 * <DesktopFilters>
 *   {desktopFilters}
 * </DesktopFilters>
 * ```
 */
export function DesktopFilters({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("hidden md:flex md:items-center md:gap-2", className)}>
      {children}
    </div>
  );
}

/**
 * Wrapper for mobile-only filter content.
 */
export function MobileFilters({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("md:hidden space-y-3", className)}>
      {children}
    </div>
  );
}
