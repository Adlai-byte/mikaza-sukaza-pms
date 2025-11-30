import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, KeyRound, Building2, CheckCircle2, Clock, XCircle, PlayCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccessAuthorization } from "@/lib/schemas";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AccessAuthorizationTreeViewProps {
  authorizations: AccessAuthorization[];
  onEditAuth?: (auth: AccessAuthorization) => void;
  canEdit?: boolean;
}

interface TreeNode {
  id: string;
  name: string;
  type: 'property' | 'authorization';
  property?: {
    property_id: string;
    property_name?: string;
    property_type?: string;
  };
  authorization?: AccessAuthorization;
  children?: TreeNode[];
  expanded?: boolean;
}

const STATUS_CONFIG = {
  requested: { label: 'Requested', icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  approved: { label: 'Approved', icon: CheckCircle2, color: 'bg-green-100 text-green-800 border-green-200' },
  in_progress: { label: 'In Progress', icon: PlayCircle, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'bg-gray-100 text-gray-800 border-gray-200' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-red-100 text-red-800 border-red-200' },
  expired: { label: 'Expired', icon: XCircle, color: 'bg-orange-100 text-orange-800 border-orange-200' },
};

export function AccessAuthorizationTreeView({
  authorizations,
  onEditAuth,
  canEdit = false,
}: AccessAuthorizationTreeViewProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Build tree structure grouped by property
  const tree = useMemo(() => {
    const propertyMap = new Map<string, TreeNode>();

    authorizations.forEach(auth => {
      if (!auth.property) return;

      const propertyId = auth.property.property_id;
      const propertyName = auth.property.property_name || auth.property.property_type || 'Unknown Property';

      if (!propertyMap.has(propertyId)) {
        propertyMap.set(propertyId, {
          id: propertyId,
          name: propertyName,
          type: 'property',
          property: auth.property,
          children: [],
          expanded: expandedFolders.has(propertyId),
        });
      }

      const propertyNode = propertyMap.get(propertyId)!;
      propertyNode.children!.push({
        id: auth.access_auth_id,
        name: auth.vendor?.provider_name || 'Unknown Vendor',
        type: 'authorization',
        authorization: auth,
      });
    });

    return Array.from(propertyMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [authorizations, expandedFolders]);

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
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.requested;
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={cn("text-xs", config.color)}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const renderNode = (node: TreeNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    if (node.type === 'property') {
      return (
        <div key={node.id} className="select-none">
          {/* Property Header */}
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
              {node.children?.length || 0} {node.children?.length === 1 ? 'authorization' : 'authorizations'}
            </Badge>
          </div>

          {/* Property Children */}
          {isExpanded && hasChildren && (
            <div className="mt-1">
              {node.children!.map(child => renderNode(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    // Authorization node
    const auth = node.authorization!;
    const accessDate = parseISO(auth.access_date);
    const isToday = format(accessDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

    return (
      <div
        key={node.id}
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/30 transition-colors group",
          isToday && "bg-blue-50"
        )}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
      >
        <KeyRound className="h-4 w-4 text-muted-foreground flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="truncate text-sm font-medium">
              {node.name}
            </span>
            {getStatusBadge(auth.status)}
            {isToday && (
              <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                Today
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
            <span>{format(accessDate, "MMM d, yyyy")}</span>
            {auth.access_time_start && auth.access_time_end && (
              <>
                <span>•</span>
                <span>{auth.access_time_start} - {auth.access_time_end}</span>
              </>
            )}
            {auth.vendor_contact_name && (
              <>
                <span>•</span>
                <span>{auth.vendor_contact_name}</span>
              </>
            )}
            <span>•</span>
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {auth.number_of_personnel}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canEdit && onEditAuth && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => onEditAuth(auth)}
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View/Edit Authorization</p>
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
        <p>No access authorizations found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tree Controls */}
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="text-sm text-muted-foreground">
          {tree.length} {tree.length === 1 ? 'property' : 'properties'} • {authorizations.length} {authorizations.length === 1 ? 'authorization' : 'authorizations'}
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
