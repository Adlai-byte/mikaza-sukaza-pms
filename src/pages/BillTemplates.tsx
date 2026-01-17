// Bill Templates Page - Standard Layout
import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  DollarSign,
  Copy,
  Building2,
  Search,
  Globe,
  Home,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  useBillTemplates,
  useDeleteBillTemplate,
  useToggleTemplateActive,
  useDuplicateBillTemplate,
  useAssignTemplateToProperties,
  useUnassignTemplateFromProperty,
} from '@/hooks/useBillTemplates';
import { BillTemplateWithItems } from '@/lib/schemas';
import BillTemplateDialog from '@/components/BillTemplateDialog';
import { usePropertiesOptimized } from '@/hooks/usePropertiesOptimized';
import { cn } from '@/lib/utils';
import {
  Checkbox,
} from '@/components/ui/checkbox';
import { PageHeader } from '@/components/ui/page-header';

type FilterOption = 'all' | 'global' | 'property';

export default function BillTemplates() {
  // Templates state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BillTemplateWithItems | null>(null);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [templateFilter, setTemplateFilter] = useState<FilterOption>('all');
  const [templatePage, setTemplatePage] = useState(1);
  const [templatesPerPage, setTemplatesPerPage] = useState(10);
  const [viewingTemplate, setViewingTemplate] = useState<BillTemplateWithItems | null>(null);

  // Duplicate dialog state
  const [duplicateDialog, setDuplicateDialog] = useState<{
    open: boolean;
    template: BillTemplateWithItems | null;
    newName: string;
  }>({
    open: false,
    template: null,
    newName: '',
  });

  // Assignment dialog state
  const [assignmentDialog, setAssignmentDialog] = useState<{
    open: boolean;
    template: BillTemplateWithItems | null;
    selectedPropertyIds: string[];
  }>({
    open: false,
    template: null,
    selectedPropertyIds: [],
  });

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Fetch templates without property filter to get all templates
  const { data: allTemplates, isLoading, isFetching, refetch } = useBillTemplates();
  const { properties } = usePropertiesOptimized();
  const deleteTemplate = useDeleteBillTemplate();
  const toggleActive = useToggleTemplateActive();
  const duplicateTemplate = useDuplicateBillTemplate();
  const assignToProperties = useAssignTemplateToProperties();
  const unassignFromProperty = useUnassignTemplateFromProperty();
  const { toast } = useToast();

  // Reset template page when search/filter/page size changes
  useEffect(() => {
    setTemplatePage(1);
  }, [templateSearchQuery, templateFilter, templatesPerPage]);

  // =============================================
  // COMPUTED DATA - TEMPLATES
  // =============================================

  const filteredTemplates = useMemo(() => {
    if (!allTemplates) return [];

    let filtered = [...allTemplates];

    // Filter by search query
    if (templateSearchQuery) {
      const query = templateSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          (t.template_name || '').toLowerCase().includes(query) ||
          (t.description || '').toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (templateFilter === 'global') {
      filtered = filtered.filter((t) => t.is_global);
    } else if (templateFilter === 'property') {
      filtered = filtered.filter((t) => !t.is_global);
    }

    // Sort by name
    filtered.sort((a, b) =>
      (a.template_name || '').localeCompare(b.template_name || '')
    );

    return filtered;
  }, [allTemplates, templateSearchQuery, templateFilter]);

  // Paginated templates
  const paginatedTemplates = useMemo(() => {
    // If "All" is selected (templatesPerPage >= total), show all
    if (templatesPerPage >= filteredTemplates.length) {
      return filteredTemplates;
    }
    const startIndex = (templatePage - 1) * templatesPerPage;
    const endIndex = startIndex + templatesPerPage;
    return filteredTemplates.slice(startIndex, endIndex);
  }, [filteredTemplates, templatePage, templatesPerPage]);

  const totalTemplatePages = Math.ceil(filteredTemplates.length / templatesPerPage);

  // Statistics
  const stats = useMemo(() => {
    if (!allTemplates) return { total: 0, global: 0, property: 0, active: 0 };
    return {
      total: allTemplates.length,
      global: allTemplates.filter((t) => t.is_global).length,
      property: allTemplates.filter((t) => !t.is_global).length,
      active: allTemplates.filter((t) => t.is_active).length,
    };
  }, [allTemplates]);

  // =============================================
  // EVENT HANDLERS - TEMPLATES
  // =============================================

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setDialogOpen(true);
  };

  const handleEdit = (template: BillTemplateWithItems) => {
    setEditingTemplate(template);
    setDialogOpen(true);
  };

  const handleDuplicate = (template: BillTemplateWithItems) => {
    setDuplicateDialog({
      open: true,
      template,
      newName: `${template.template_name} (Copy)`,
    });
  };

  const handleConfirmDuplicate = () => {
    if (!duplicateDialog.template) return;

    const trimmedName = duplicateDialog.newName.trim();

    // Validation
    if (!trimmedName) {
      toast({
        title: 'Name Required',
        description: 'Please enter a name for the duplicated template.',
        variant: 'destructive',
      });
      return;
    }

    if (trimmedName === duplicateDialog.template.template_name) {
      toast({
        title: 'Name Must Be Different',
        description: 'The new template name must be different from the original.',
        variant: 'destructive',
      });
      return;
    }

    // Check if name already exists
    const nameExists = allTemplates?.some(
      (t) => t.template_name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (nameExists) {
      toast({
        title: 'Name Already Exists',
        description: 'A template with this name already exists. Please choose a different name.',
        variant: 'destructive',
      });
      return;
    }

    // Proceed with duplication
    duplicateTemplate.mutate(
      { templateId: duplicateDialog.template.template_id!, newName: trimmedName },
      {
        onSuccess: () => {
          setDuplicateDialog({ open: false, template: null, newName: '' });
        },
      }
    );
  };

  const handleDelete = (templateId: string, templateName: string) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Template',
      description: `Are you sure you want to delete "${templateName}"? This will permanently remove the template and all its line items.`,
      onConfirm: () => {
        deleteTemplate.mutate(templateId);
        setConfirmDialog({ ...confirmDialog, open: false });
      },
    });
  };

  const handleToggleActive = (templateId: string, currentStatus: boolean) => {
    toggleActive.mutate({
      templateId,
      isActive: !currentStatus,
    });
  };

  const handleOpenAssignment = (template: BillTemplateWithItems) => {
    // Get currently assigned property IDs
    const currentlyAssigned = template.assigned_properties?.map(p => p.property_id) || [];
    setAssignmentDialog({
      open: true,
      template,
      selectedPropertyIds: currentlyAssigned,
    });
  };

  const handleTogglePropertyAssignment = (propertyId: string) => {
    setAssignmentDialog(prev => {
      const isCurrentlySelected = prev.selectedPropertyIds.includes(propertyId);
      return {
        ...prev,
        selectedPropertyIds: isCurrentlySelected
          ? prev.selectedPropertyIds.filter(id => id !== propertyId)
          : [...prev.selectedPropertyIds, propertyId],
      };
    });
  };

  const handleSaveAssignments = () => {
    if (!assignmentDialog.template) return;

    const currentlyAssigned = assignmentDialog.template.assigned_properties?.map(p => p.property_id) || [];
    const toAssign = assignmentDialog.selectedPropertyIds.filter(id => !currentlyAssigned.includes(id));
    const toUnassign = currentlyAssigned.filter(id => !assignmentDialog.selectedPropertyIds.includes(id));

    // Perform assignments
    if (toAssign.length > 0) {
      assignToProperties.mutate({
        templateId: assignmentDialog.template.template_id!,
        propertyIds: toAssign,
      });
    }

    // Perform unassignments
    toUnassign.forEach(propertyId => {
      unassignFromProperty.mutate({
        templateId: assignmentDialog.template.template_id!,
        propertyId,
      });
    });

    // Close dialog
    setAssignmentDialog({ open: false, template: null, selectedPropertyIds: [] });
  };

  const getItemTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      accommodation: '🏠',
      cleaning: '🧹',
      extras: '✨',
      tax: '📊',
      commission: '💼',
      other: '📝',
    };
    return icons[type] || '📝';
  };

  // =============================================
  // MAIN RENDER
  // =============================================

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <PageHeader
        icon={FileText}
        title="Bill Templates"
        subtitle="Create and manage reusable invoice templates for faster billing"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleCreateNew} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </>
        }
      />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Total Templates</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">{stats.total}</h3>
                  <span className="text-xs text-muted-foreground">All templates</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <Eye className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Active</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">{stats.active}</h3>
                  <span className="text-xs text-muted-foreground">Ready to use</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <Globe className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Global</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">{stats.global}</h3>
                  <span className="text-xs text-muted-foreground">All properties</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <Home className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Property-Specific</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-semibold">{stats.property}</h3>
                  <span className="text-xs text-muted-foreground">Assigned templates</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6 shadow-md border-0">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates by name or description..."
                value={templateSearchQuery}
                onChange={(e) => setTemplateSearchQuery(e.target.value)}
                className="pl-10"
              />
              {templateSearchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setTemplateSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Filter */}
            <Select value={templateFilter} onValueChange={(v) => setTemplateFilter(v as FilterOption)}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Templates</SelectItem>
                <SelectItem value="global">Global Templates</SelectItem>
                <SelectItem value="property">Property-Specific</SelectItem>
              </SelectContent>
            </Select>

            {/* Page Size */}
            <Select
              value={templatesPerPage.toString()}
              onValueChange={(v) => setTemplatesPerPage(parseInt(v))}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
                <SelectItem value="9999">Show All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      <Card className="flex-1 flex flex-col min-h-0 shadow-md border-0">
        <CardContent className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mb-4"></div>
              <span className="text-muted-foreground">Loading templates...</span>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-green-100 p-6 rounded-full mb-6">
                <FileText className="h-16 w-16 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                {templateSearchQuery || templateFilter !== 'all'
                  ? 'No Templates Found'
                  : 'No Templates Yet'}
              </h2>
              <p className="text-muted-foreground max-w-md mb-6">
                {templateSearchQuery || templateFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Create your first bill template to speed up invoice creation'}
              </p>
              {!templateSearchQuery && templateFilter === 'all' && (
                <Button onClick={handleCreateNew} size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Create First Template
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Templates Table */}
              <div className="rounded-md border mb-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Type</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTemplates.map((template) => (
                      <TableRow key={template.template_id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            {template.template_name}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="truncate text-muted-foreground text-sm">
                            {template.description || <span className="italic">No description</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {template.is_global ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <Globe className="h-3 w-3 mr-1" />
                              Global
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              <Home className="h-3 w-3 mr-1" />
                              Property
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{template.items?.length || 0}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${template.total_amount.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          {template.is_active ? (
                            <Badge variant="default" className="bg-green-600">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingTemplate(template)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(template)}
                              title="Edit Template"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicate(template)}
                              title="Duplicate Template"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(template.template_id!, template.is_active)}
                              title={template.is_active ? "Deactivate" : "Activate"}
                            >
                              {template.is_active ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(template.template_id!, template.template_name)}
                              title="Delete Template"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {filteredTemplates.length > templatesPerPage && templatesPerPage < 9999 && (
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((templatePage - 1) * templatesPerPage) + 1} to {Math.min(templatePage * templatesPerPage, filteredTemplates.length)} of {filteredTemplates.length} templates
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTemplatePage(templatePage - 1)}
                      disabled={templatePage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                    <div className="text-sm font-medium px-4">
                      Page {templatePage} of {totalTemplatePages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTemplatePage(templatePage + 1)}
                      disabled={templatePage === totalTemplatePages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Template Dialog */}
      <BillTemplateDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingTemplate(null);
        }}
        template={editingTemplate}
        defaultPropertyId={undefined}
      />

      {/* View Template Details Dialog */}
      {viewingTemplate && (
        <Dialog open={!!viewingTemplate} onOpenChange={(open) => !open && setViewingTemplate(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <DialogTitle className="text-2xl flex items-center gap-2 flex-wrap mb-2">
                    {viewingTemplate.template_name}
                    {viewingTemplate.is_active ? (
                      <Badge variant="default" className="bg-green-600">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                    {viewingTemplate.is_global ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <Globe className="h-3 w-3 mr-1" />
                        Global
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        <Home className="h-3 w-3 mr-1" />
                        Property-Specific
                      </Badge>
                    )}
                  </DialogTitle>
                  {viewingTemplate.description && (
                    <DialogDescription className="text-base">
                      {viewingTemplate.description}
                    </DialogDescription>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Template Info */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {viewingTemplate.items?.length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Line Items</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        ${viewingTemplate.total_amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">
                        {viewingTemplate.assigned_properties?.length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Assigned Properties</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Line Items Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Line Items</CardTitle>
                </CardHeader>
                <CardContent>
                  {viewingTemplate.items && viewingTemplate.items.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Tax %</TableHead>
                          <TableHead className="text-right">Tax Amount</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingTemplate.items.map((item, idx) => {
                          const lineTotal = item.quantity * item.unit_price;
                          const taxAmount = item.tax_amount || lineTotal * (item.tax_rate / 100);
                          const itemTotal = lineTotal + taxAmount;

                          return (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{item.line_number}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span>{getItemTypeIcon(item.item_type)}</span>
                                  <span>{item.description}</span>
                                </div>
                              </TableCell>
                              <TableCell className="capitalize">{item.item_type}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">${item.unit_price.toFixed(2)}</TableCell>
                              <TableCell className="text-right">{item.tax_rate}%</TableCell>
                              <TableCell className="text-right">${taxAmount.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-bold">${itemTotal.toFixed(2)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No line items</p>
                  )}

                  {viewingTemplate.items && viewingTemplate.items.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div className="flex justify-end">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground mb-1">Template Total</p>
                          <p className="text-3xl font-bold text-green-600">
                            ${viewingTemplate.total_amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Assigned Properties */}
              {viewingTemplate.is_global && viewingTemplate.assigned_properties && viewingTemplate.assigned_properties.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Assigned Properties ({viewingTemplate.assigned_properties.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {viewingTemplate.assigned_properties.map((prop) => (
                        <div key={prop.property_id} className="flex items-center gap-2 p-2 border rounded">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{prop.property_name}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setViewingTemplate(null)}
              >
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  handleEdit(viewingTemplate);
                  setViewingTemplate(null);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  handleDuplicate(viewingTemplate);
                  setViewingTemplate(null);
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
              {viewingTemplate.is_global && (
                <Button
                  variant="outline"
                  onClick={() => {
                    handleOpenAssignment(viewingTemplate);
                    setViewingTemplate(null);
                  }}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Assign to Properties
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  handleToggleActive(viewingTemplate.template_id!, viewingTemplate.is_active);
                  setViewingTemplate(null);
                }}
              >
                {viewingTemplate.is_active ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Activate
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  handleDelete(viewingTemplate.template_id!, viewingTemplate.template_name);
                  setViewingTemplate(null);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Duplicate Template Name Dialog */}
      <Dialog open={duplicateDialog.open} onOpenChange={(open) => !open && setDuplicateDialog({ open: false, template: null, newName: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Template</DialogTitle>
            <DialogDescription>
              Enter a new name for the duplicated template. The copy will be created as a global template.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="original-name">Original Name</Label>
              <Input
                id="original-name"
                value={duplicateDialog.template?.template_name || ''}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-name">
                New Template Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new-name"
                value={duplicateDialog.newName}
                onChange={(e) => setDuplicateDialog({ ...duplicateDialog, newName: e.target.value })}
                placeholder="Enter new template name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmDuplicate();
                  }
                }}
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                The name must be different from the original template.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDuplicateDialog({ open: false, template: null, newName: '' })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDuplicate}
              disabled={duplicateTemplate.isPending}
            >
              {duplicateTemplate.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Duplicating...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate Template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Property Assignment Dialog */}
      <Dialog
        open={assignmentDialog.open}
        onOpenChange={(open) => !open && setAssignmentDialog({ open: false, template: null, selectedPropertyIds: [] })}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Template to Properties</DialogTitle>
            <DialogDescription>
              Select which properties should have access to "{assignmentDialog.template?.template_name}".
              {assignmentDialog.template?.is_global
                ? ' This template is global and can be assigned to multiple properties.'
                : ' This template is property-specific.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {assignmentDialog.template?.is_global ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <Label>Available Properties</Label>
                  <Badge variant="outline">
                    {assignmentDialog.selectedPropertyIds.length} of {properties.length} selected
                  </Badge>
                </div>
                <Separator />
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {properties.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No properties available
                    </p>
                  ) : (
                    properties.map((property) => {
                      const isSelected = assignmentDialog.selectedPropertyIds.includes(property.property_id!);
                      return (
                        <div
                          key={property.property_id}
                          className={cn(
                            'flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors',
                            isSelected
                              ? 'bg-green-50 border-green-200 hover:bg-green-100'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          )}
                          onClick={() => handleTogglePropertyAssignment(property.property_id!)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleTogglePropertyAssignment(property.property_id!)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{property.property_name}</span>
                            </div>
                            {property.property_location?.address && (
                              <p className="text-sm text-muted-foreground ml-6">
                                {property.property_location.address}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  This template is property-specific and is assigned to:
                </p>
                <p className="font-semibold mt-2">
                  {assignmentDialog.template?.property_name || 'Unknown Property'}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignmentDialog({ open: false, template: null, selectedPropertyIds: [] })}
            >
              Cancel
            </Button>
            {assignmentDialog.template?.is_global && (
              <Button
                onClick={handleSaveAssignments}
                disabled={assignToProperties.isPending || unassignFromProperty.isPending}
              >
                {assignToProperties.isPending || unassignFromProperty.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Building2 className="h-4 w-4 mr-2" />
                    Save Assignments
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDialog.onConfirm}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
