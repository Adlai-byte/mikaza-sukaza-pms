import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  MoreHorizontal,
  Download,
  Eye,
  Trash2,
  Share2,
  Clock,
  AlertTriangle,
  FileCheck,
  Archive,
} from "lucide-react";
import { DocumentSummary, CONTRACT_TYPES } from "@/lib/schemas";
import { useDocumentDownload } from "@/hooks/useDocuments";
import { DocumentViewer } from "./DocumentViewer";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DocumentsTableProps {
  documents: DocumentSummary[];
  isLoading?: boolean;
  onViewDetails?: (document: DocumentSummary) => void;
  onDelete?: (documentId: string) => void;
  onShare?: (document: DocumentSummary) => void;
  canDelete?: boolean;
  canShare?: boolean;
  showContractType?: boolean;
}

// Status badge styling
const getStatusBadge = (status: string) => {
  const variants: Record<string, { variant: any; icon: any; label: string }> = {
    active: { variant: "default", icon: FileCheck, label: "Active" },
    draft: { variant: "secondary", icon: Clock, label: "Draft" },
    expired: { variant: "destructive", icon: AlertTriangle, label: "Expired" },
    archived: { variant: "outline", icon: Archive, label: "Archived" },
  };

  const config = variants[status] || variants.active;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function DocumentsTable({
  documents,
  isLoading,
  onViewDetails,
  onDelete,
  onShare,
  canDelete = false,
  canShare = false,
  showContractType = false,
}: DocumentsTableProps) {
  const { downloadDocument } = useDocumentDownload();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentSummary | null>(null);

  const handleViewDocument = (document: DocumentSummary) => {
    setSelectedDocument(document);
    setViewerOpen(true);
  };

  // Filter documents by search
  const filteredDocuments = documents.filter((doc) =>
    doc.document_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Upload your first document to get started. Documents will be securely stored and organized here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery("")}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Results count */}
      {searchQuery && (
        <p className="text-sm text-muted-foreground">
          Found {filteredDocuments.length} of {documents.length} documents
        </p>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              {showContractType && <TableHead>Contract Type</TableHead>}
              <TableHead>Property</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocuments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showContractType ? 8 : 7} className="text-center py-8 text-muted-foreground">
                  No documents match your search
                </TableCell>
              </TableRow>
            ) : (
              filteredDocuments.map((document) => (
                <TableRow key={document.document_id}>
                  {/* Document name and description */}
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{document.document_name}</span>
                        {document.expiring_soon && (
                          <Badge variant="destructive" className="text-xs">
                            Expiring Soon
                          </Badge>
                        )}
                      </div>
                      {document.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {document.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {document.file_name}
                      </p>
                    </div>
                  </TableCell>

                  {/* Contract Type */}
                  {showContractType && (
                    <TableCell>
                      {document.contract_type ? (
                        <Badge variant="outline" className="text-xs">
                          {CONTRACT_TYPES[document.contract_type as keyof typeof CONTRACT_TYPES]}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}

                  {/* Property */}
                  <TableCell>
                    {document.property_name ? (
                      <span className="text-sm">{document.property_name}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Version */}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-sm">v{document.version_number}</span>
                      {document.is_current_version && (
                        <Badge variant="outline" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    {getStatusBadge(document.status)}
                  </TableCell>

                  {/* File size */}
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatFileSize(document.file_size)}
                    </span>
                  </TableCell>

                  {/* Upload date */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">
                        {document.created_at
                          ? format(new Date(document.created_at), "MMM d, yyyy")
                          : "—"}
                      </span>
                      {document.uploaded_by_name && (
                        <span className="text-xs text-muted-foreground">
                          by {document.uploaded_by_name}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={() => handleViewDocument(document)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Document
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => downloadDocument(document)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>

                        {canShare && onShare && (
                          <DropdownMenuItem onClick={() => onShare(document)}>
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                          </DropdownMenuItem>
                        )}

                        {canDelete && onDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDelete(document.document_id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer info */}
      {filteredDocuments.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <p>
            Showing {filteredDocuments.length} of {documents.length} documents
          </p>
          {canShare && (
            <p>
              {documents.filter(d => d.share_count && d.share_count > 0).length} documents shared
            </p>
          )}
        </div>
      )}

      {/* Document Viewer */}
      <DocumentViewer
        document={selectedDocument}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </div>
  );
}
