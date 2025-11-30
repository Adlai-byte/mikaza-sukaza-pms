import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Shield, Building2, CheckCircle2, Clock, XCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VendorCOI } from "@/lib/schemas";
import { format, parseISO, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface COITreeViewProps {
  cois: VendorCOI[];
  onViewCOI?: (coi: VendorCOI) => void;
  onEditCOI?: (coi: VendorCOI) => void;
  onDeleteCOI?: (coiId: string) => void;
  onDownloadCOI?: (coi: VendorCOI) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

interface TreeNode {
  id: string;
  name: string;
  type: 'vendor' | 'coi';
  vendor?: {
    provider_id: string;
    provider_name: string;
  };
  coi?: VendorCOI;
  children?: TreeNode[];
  expanded?: boolean;
}

export function COITreeView({
  cois,
  onEditCOI,
  onDeleteCOI,
  onDownloadCOI,
  canEdit = false,
  canDelete = false,
}: COITreeViewProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Build tree structure
  const tree = useMemo(() => {
    const vendorMap = new Map<string, TreeNode>();

    cois.forEach(coi => {
      if (!coi.vendor) return;

      const vendorId = coi.vendor.provider_id;
      const vendorName = coi.vendor.provider_name;

      if (!vendorMap.has(vendorId)) {
        vendorMap.set(vendorId, {
          id: vendorId,
          name: vendorName,
          type: 'vendor',
          vendor: coi.vendor,
          children: [],
          expanded: expandedFolders.has(vendorId),
        });
      }

      const vendorNode = vendorMap.get(vendorId)!;
      vendorNode.children!.push({
        id: coi.coi_id,
        name: coi.policy_number || 'Unknown Policy',
        type: 'coi',
        coi: coi,
      });
    });

    return Array.from(vendorMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [cois, expandedFolders]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allFolderIds = tree.map(node => node.id);
    setExpandedFolders(new Set(allFolderIds));
  };

  const collapseAll = () => {
    setExpandedFolders(new Set());
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800 border-green-200',
      expiring_soon: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      expired: 'bg-red-100 text-red-800 border-red-200',
      renewed: 'bg-blue-100 text-blue-800 border-blue-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    const icons = {
      active: CheckCircle2,
      expiring_soon: Clock,
      expired: XCircle,
      renewed: CheckCircle2,
      cancelled: XCircle,
    };

    const Icon = icons[status as keyof typeof icons] || Shield;

    return (
      <Badge variant="outline" className={cn("text-xs", styles[status as keyof typeof styles] || '')}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getDaysUntilExpiry = (validThrough: string) => {
    return differenceInDays(parseISO(validThrough), new Date());
  };

  const renderNode = (node: TreeNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    if (node.type === 'vendor') {
      return (
        <div key={node.id} className="select-none">
          {/* Vendor Header */}
          <div
            className={cn(
              "flex items-center gap-2 py-2 px-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
              level === 0 && "font-medium"
            )}
            style={{ paddingLeft: `${level * 20 + 12}px` }}
            onClick={() => hasChildren && toggleFolder(node.id)}
          >
            {hasChildren && (
              <span className="flex-shrink-0">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </span>
            )}
            {!hasChildren && <span className="w-4" />}

            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-500 flex-shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
            )}

            <Building2 className="h-3 w-3 text-muted-foreground" />

            <span className="flex-1 truncate">{node.name}</span>

            <Badge variant="outline" className="text-xs">
              {node.children?.length || 0} {node.children?.length === 1 ? 'COI' : 'COIs'}
            </Badge>
          </div>

          {/* Vendor Children */}
          {isExpanded && hasChildren && (
            <div className="mt-1">
              {node.children!.map(child => renderNode(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    // COI node
    const coi = node.coi!;
    const daysUntilExpiry = getDaysUntilExpiry(coi.valid_through);
    const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
    const isExpired = daysUntilExpiry < 0;

    return (
      <div
        key={node.id}
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/30 transition-colors group",
          isExpired && "bg-red-50",
          isExpiringSoon && !isExpired && "bg-yellow-50"
        )}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
      >
        <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="truncate text-sm font-medium">
              {coi.policy_number}
            </span>
            {getStatusBadge(coi.status)}
            {coi.verified_at && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Verified {format(parseISO(coi.verified_at), 'MMM dd, yyyy')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
            <span>{coi.insurance_company}</span>
            <span>•</span>
            <span>${coi.coverage_amount.toLocaleString()}</span>
            <span>•</span>
            <span>Exp: {format(parseISO(coi.valid_through), "MMM d, yyyy")}</span>
            {isExpiringSoon && !isExpired && (
              <>
                <span>•</span>
                <span className="text-yellow-600 font-medium">
                  {daysUntilExpiry} days left
                </span>
              </>
            )}
            {isExpired && (
              <>
                <span>•</span>
                <span className="text-red-600 font-medium">
                  Expired {Math.abs(daysUntilExpiry)} days ago
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onDownloadCOI && coi.file_url && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => onDownloadCOI(coi)}
                  >
                    <Download className="h-4 w-4 text-blue-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Download COI</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {canEdit && onEditCOI && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => onEditCOI(coi)}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View/Edit COI</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    );
  };

  if (tree.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Folder className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p>No COIs found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tree Controls */}
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="text-sm text-muted-foreground">
          {tree.length} {tree.length === 1 ? 'vendor' : 'vendors'} • {cois.length} {cois.length === 1 ? 'COI' : 'COIs'}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={expandAll}
            className="h-8 text-xs"
          >
            Expand All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={collapseAll}
            className="h-8 text-xs"
          >
            Collapse All
          </Button>
        </div>
      </div>

      {/* Tree */}
      <div className="space-y-1">
        {tree.map(node => renderNode(node))}
      </div>
    </div>
  );
}
