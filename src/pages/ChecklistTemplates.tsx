import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChecklistTemplateDialog } from '@/components/checkinout/ChecklistTemplateDialog';
import { useChecklistTemplates, useDeleteChecklistTemplate } from '@/hooks/useChecklistTemplates';
import { useProperties } from '@/hooks/useProperties';
import { ChecklistTemplate } from '@/lib/schemas';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  FileText,
  CheckSquare,
  LogIn,
  LogOut,
  ClipboardList,
  ListChecks,
} from 'lucide-react';
import { format } from 'date-fns';
import { StatusBadge } from '@/components/StatusBadge';
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

export default function ChecklistTemplates() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const { properties = [] } = useProperties();

  const filters = useMemo(() => ({
    property_id: propertyFilter !== 'all' ? propertyFilter : undefined,
    template_type: (typeFilter !== 'all' ? typeFilter : undefined) as 'check_in' | 'check_out' | 'inspection' | undefined,
    is_active: activeFilter !== 'all' ? activeFilter === 'active' : undefined,
  }), [propertyFilter, typeFilter, activeFilter]);

  const { data: templates = [], isLoading } = useChecklistTemplates(filters);
  const deleteMutation = useDeleteChecklistTemplate();

  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates;

    const query = searchQuery.toLowerCase();
    return templates.filter(template =>
      template.template_name?.toLowerCase().includes(query) ||
      template.description?.toLowerCase().includes(query) ||
      template.property?.property_name?.toLowerCase().includes(query)
    );
  }, [templates, searchQuery]);

  const handleCreate = () => {
    setSelectedTemplate(null);
    setDialogOpen(true);
  };

  const handleEdit = (template: ChecklistTemplate) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  const handleDelete = (templateId: string) => {
    setTemplateToDelete(templateId);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete, {
        onSuccess: () => {
          setTemplateToDelete(null);
        },
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'check_in':
        return <LogIn className="h-4 w-4" />;
      case 'check_out':
        return <LogOut className="h-4 w-4" />;
      case 'inspection':
        return <ClipboardList className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const config = {
      check_in: { label: t('checklistTemplates.types.checkIn'), className: 'bg-green-500' },
      check_out: { label: t('checklistTemplates.types.checkOut'), className: 'bg-blue-500' },
      inspection: { label: t('checklistTemplates.types.inspection'), className: 'bg-purple-500' },
    };

    const item = config[type as keyof typeof config] || { label: type, className: 'bg-gray-500' };

    return (
      <Badge variant="default" className={item.className}>
        {getTypeIcon(type)}
        <span className="ml-1">{item.label}</span>
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <PageHeader
        icon={ListChecks}
        title={t('checklistTemplates.title')}
        subtitle={t('checklistTemplates.subtitle')}
        action={
          <Button
            onClick={handleCreate}
            className="bg-gradient-primary hover:bg-gradient-secondary w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('checklistTemplates.newTemplate')}
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-indigo-50 to-indigo-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-700">{t('checklistTemplates.statsCards.totalTemplates')}</p>
                <h3 className="text-3xl font-bold text-indigo-900 mt-1">
                  {templates.length}
                </h3>
                <p className="text-xs text-indigo-600 mt-1">
                  {t('checklistTemplates.reusableChecklists')}
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">{t('checklistTemplates.statsCards.checkInTemplates')}</p>
                <h3 className="text-3xl font-bold text-green-900 mt-1">
                  {templates.filter(t => t.template_type === 'check_in').length}
                </h3>
                <p className="text-xs text-green-600 mt-1">
                  {templates.filter(t => t.template_type === 'check_in' && t.is_active).length} {t('checklistTemplates.active')}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <LogIn className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">{t('checklistTemplates.statsCards.checkOutTemplates')}</p>
                <h3 className="text-3xl font-bold text-blue-900 mt-1">
                  {templates.filter(t => t.template_type === 'check_out').length}
                </h3>
                <p className="text-xs text-blue-600 mt-1">
                  {templates.filter(t => t.template_type === 'check_out' && t.is_active).length} {t('checklistTemplates.active')}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <LogOut className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-teal-50 to-teal-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-teal-700">{t('checklistTemplates.statsCards.activeTemplates')}</p>
                <h3 className="text-3xl font-bold text-teal-900 mt-1">
                  {templates.filter(t => t.is_active).length}
                </h3>
                <p className="text-xs text-teal-600 mt-1">
                  {templates.filter(t => !t.is_active).length} {t('checklistTemplates.inactive')}
                </p>
              </div>
              <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center">
                <CheckSquare className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {t('checklistTemplates.filters.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('checklistTemplates.filters.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('checklistTemplates.filters.allProperties')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('checklistTemplates.filters.allProperties')}</SelectItem>
                {properties.map((property) => (
                  <SelectItem key={property.property_id} value={property.property_id}>
                    {property.property_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('checklistTemplates.filters.allTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('checklistTemplates.filters.allTypes')}</SelectItem>
                <SelectItem value="check_in">{t('checklistTemplates.types.checkIn')}</SelectItem>
                <SelectItem value="check_out">{t('checklistTemplates.types.checkOut')}</SelectItem>
                <SelectItem value="inspection">{t('checklistTemplates.types.inspection')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('checklistTemplates.filters.allStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('checklistTemplates.filters.allStatus')}</SelectItem>
                <SelectItem value="active">{t('checklistTemplates.filters.activeOnly')}</SelectItem>
                <SelectItem value="inactive">{t('checklistTemplates.filters.inactiveOnly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('checklistTemplates.table.templateName')}</TableHead>
                <TableHead>{t('checklistTemplates.table.type')}</TableHead>
                <TableHead>{t('checklistTemplates.table.property')}</TableHead>
                <TableHead>{t('checklistTemplates.table.items')}</TableHead>
                <TableHead>{t('checklistTemplates.table.status')}</TableHead>
                <TableHead>{t('checklistTemplates.table.created')}</TableHead>
                <TableHead className="text-right">{t('checklistTemplates.table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    {t('checklistTemplates.messages.loadingTemplates')}
                  </TableCell>
                </TableRow>
              ) : filteredTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    {t('checklistTemplates.messages.noTemplatesFound')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTemplates.map((template) => (
                  <TableRow key={template.template_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{template.template_name}</div>
                        {template.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {template.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(template.template_type)}</TableCell>
                    <TableCell>
                      {template.property ? (
                        <div className="text-sm">{template.property.property_name}</div>
                      ) : (
                        <span className="text-muted-foreground text-sm">{t('checklistTemplates.allProperties')}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-muted-foreground" />
                        <span>{(template.checklist_items as any[])?.length || 0} {t('checklistTemplates.items')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {template.is_active ? (
                        <StatusBadge status={t('checklistTemplates.status.active')} variant="default" />
                      ) : (
                        <StatusBadge status={t('checklistTemplates.status.inactive')} variant="secondary" />
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(template.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(template.template_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog */}
      <ChecklistTemplateDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('checklistTemplates.messages.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('checklistTemplates.messages.deleteConfirmMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
