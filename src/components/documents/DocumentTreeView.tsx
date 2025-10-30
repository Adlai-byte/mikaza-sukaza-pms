import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, File, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentSummary } from "@/lib/schemas";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface TreeFolder {
  id: string;
  name: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  metadata?: Record<string, any>;
}

export interface DocumentTreeViewProps {
  documents: DocumentSummary[];
  folders: TreeFolder[];
  groupDocuments: (document: DocumentSummary, folder: TreeFolder) => boolean;
  onDownloadDocument: (document: DocumentSummary) => void;
  onDeleteDocument?: (documentId: string) => void;
  canDelete?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
}

interface FolderNode {
  id: string;
  name: string;
  type: 'folder' | 'document';
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  folder?: TreeFolder;
  document?: DocumentSummary;
  children?: FolderNode[];
  expanded?: boolean;
}

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function DocumentTreeView({
  documents,
  folders,
  groupDocuments,
  onDownloadDocument,
  onDeleteDocument,
  canDelete = false,
  emptyMessage = "No documents found",
  emptyIcon,
}: DocumentTreeViewProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Build tree structure
  const tree = useMemo(() => {
    const nodes: FolderNode[] = [];
    const assignedDocs = new Set<string>();

    // Create a folder node for each folder
    folders.forEach(folder => {
      // Find documents for this folder
      const folderDocs = documents.filter(doc => {
        if (assignedDocs.has(doc.document_id)) return false;
        const matches = groupDocuments(doc, folder);
        if (matches) {
          assignedDocs.add(doc.document_id);
        }
        return matches;
      });

      if (folderDocs.length > 0) {
        nodes.push({
          id: folder.id,
          name: folder.name,
          type: 'folder',
          icon: folder.icon,
          badge: folder.badge,
          folder: folder,
          children: folderDocs.map(doc => ({
            id: doc.document_id,
            name: doc.document_name,
            type: 'document',
            document: doc,
          })),
          expanded: expandedFolders.has(folder.id),
        });
      }
    });

    // Add unassigned documents
    const unassignedDocs = documents.filter(doc => !assignedDocs.has(doc.document_id));

    if (unassignedDocs.length > 0) {
      nodes.push({
        id: 'unassigned',
        name: 'Unassigned Documents',
        type: 'folder',
        children: unassignedDocs.map(doc => ({
          id: doc.document_id,
          name: doc.document_name,
          type: 'document',
          document: doc,
        })),
        expanded: expandedFolders.has('unassigned'),
      });
    }

    return nodes;
  }, [documents, folders, groupDocuments, expandedFolders]);

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

  const renderNode = (node: FolderNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    if (node.type === 'folder') {
      return (
        <div key={node.id} className="select-none">
          {/* Folder Header */}
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

            {node.icon || (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-blue-500 flex-shrink-0" />
              ) : (
                <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
              )
            )}

            <span className="flex-1 truncate">{node.name}</span>

            {node.badge || (
              <Badge variant="outline" className="text-xs">
                {node.children?.length || 0}
              </Badge>
            )}
          </div>

          {/* Folder Children */}
          {isExpanded && hasChildren && (
            <div className="mt-1">
              {node.children!.map(child => renderNode(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    // Document node
    const doc = node.document!;
    return (
      <div
        key={node.id}
        className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/30 transition-colors group"
        style={{ paddingLeft: `${level * 20 + 12}px` }}
      >
        <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm">{node.name}</span>
            {doc.expiring_soon && (
              <Badge variant="destructive" className="text-xs">
                Expiring Soon
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>{formatFileSize(doc.file_size)}</span>
            <span>•</span>
            <span>
              {doc.created_at ? format(new Date(doc.created_at), "MMM d, yyyy") : "—"}
            </span>
            {doc.uploaded_by_name && (
              <>
                <span>•</span>
                <span>by {doc.uploaded_by_name}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onDownloadDocument(doc)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download</p>
              </TooltipContent>
            </Tooltip>

            {canDelete && onDeleteDocument && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => onDeleteDocument(doc.document_id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete</p>
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </div>
    );
  };

  if (tree.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {emptyIcon || <Folder className="h-12 w-12 mx-auto mb-4 opacity-20" />}
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tree Controls */}
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="text-sm text-muted-foreground">
          {tree.length} {tree.length === 1 ? 'folder' : 'folders'} • {documents.length} {documents.length === 1 ? 'document' : 'documents'}
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
