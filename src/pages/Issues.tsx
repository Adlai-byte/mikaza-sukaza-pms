import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  XCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';
import {
  useIssues,
  useCreateIssue,
  useUpdateIssue,
  useDeleteIssue,
  useUploadPhoto,
  useDeletePhoto,
  IssueFilters,
} from '@/hooks/useIssues';
import { IssueDialog } from '@/components/issues/IssueDialog';
import { IssuesTable } from '@/components/issues/IssuesTable';
import { PhotoGallery } from '@/components/issues/PhotoGallery';
import { Issue, IssueInsert } from '@/lib/schemas';
import { usePropertiesOptimized } from '@/hooks/usePropertiesOptimized';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatUserDisplay } from '@/lib/user-display';

export default function Issues() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [viewingIssue, setViewingIssue] = useState<Issue | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [propertyFilter, setPropertyFilter] = useState<string>('');
  const [assignedFilter, setAssignedFilter] = useState<string>('');

  // Build filters object
  const filters: IssueFilters = useMemo(() => {
    const baseFilters: IssueFilters = {
      status: statusFilter.length > 0 ? statusFilter : undefined,
      priority: priorityFilter.length > 0 ? priorityFilter : undefined,
      category: categoryFilter.length > 0 ? categoryFilter : undefined,
      property_id: propertyFilter || undefined,
      search: searchQuery || undefined,
    };

    // If user explicitly selects an assignee filter, use that
    if (assignedFilter) {
      baseFilters.assigned_to = assignedFilter;
    } else if (user?.id) {
      // Otherwise, automatically filter to show:
      // 1. Issues assigned to current user (assigned_to)
      // 2. Issues reported by current user (reported_by)
      // This is handled by passing current_user_id to the hook
      baseFilters.current_user_id = user.id;
      console.log('🔍 [Issues] Filtering issues for user:', {
        userId: user.id,
        filters: baseFilters,
      });
    }

    return baseFilters;
  }, [statusFilter, priorityFilter, categoryFilter, propertyFilter, assignedFilter, searchQuery, user?.id]);

  const { issues, loading, isFetching, refetch } = useIssues(filters);
  const createIssue = useCreateIssue();
  const updateIssue = useUpdateIssue();
  const deleteIssue = useDeleteIssue();
  const uploadPhoto = useUploadPhoto();
  const deletePhoto = useDeletePhoto();
  const { properties } = usePropertiesOptimized();

  // Fetch users for filter
  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('user_id, first_name, last_name')
        .eq('is_active', true)
        .order('first_name', { ascending: true});

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const total = issues.length;
    const open = issues.filter(i => i.status === 'open').length;
    const resolved = issues.filter(i => i.status === 'resolved' || i.status === 'closed').length;
    const totalCost = issues
      .filter(i => i.actual_cost !== null)
      .reduce((sum, i) => sum + (i.actual_cost || 0), 0);

    return { total, open, resolved, totalCost };
  }, [issues]);

  // Keep viewingIssue in sync with the latest data from the issues list
  // This ensures photos are visible after upload without manually refreshing
  useEffect(() => {
    if (viewingIssue && issues.length > 0) {
      const updatedIssue = issues.find(i => i.issue_id === viewingIssue.issue_id);
      if (updatedIssue && JSON.stringify(updatedIssue) !== JSON.stringify(viewingIssue)) {
        setViewingIssue(updatedIssue);
      }
    }
  }, [issues, viewingIssue]);

  const handleCreateIssue = () => {
    setEditingIssue(null);
    setShowIssueDialog(true);
  };

  const handleEditIssue = (issue: Issue) => {
    setEditingIssue(issue);
    setShowIssueDialog(true);
  };

  const handleIssueSubmit = async (issueData: IssueInsert, photos: File[]) => {
    try {
      if (editingIssue) {
        await updateIssue.mutateAsync({
          issueId: editingIssue.issue_id!,
          updates: issueData,
        });
      } else {
        const newIssue = await createIssue.mutateAsync(issueData);

        // Upload photos if any
        if (photos.length > 0 && newIssue.issue_id) {
          for (const photo of photos) {
            await uploadPhoto.mutateAsync({
              issueId: newIssue.issue_id,
              file: photo,
              photoType: 'before',
            });
          }
        }
      }
      setShowIssueDialog(false);
      setEditingIssue(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteIssue = async (issueId: string) => {
    await deleteIssue.mutateAsync(issueId);
  };

  const handleStatusChange = async (issueId: string, status: string) => {
    await updateIssue.mutateAsync({
      issueId,
      updates: { status: status as any },
    });
  };

  const handleViewPhotos = (issue: Issue) => {
    setViewingIssue(issue);
  };

  const handleUploadPhoto = async (file: File, photoType: 'before' | 'after' | 'progress' | 'other') => {
    if (viewingIssue?.issue_id) {
      await uploadPhoto.mutateAsync({
        issueId: viewingIssue.issue_id,
        file,
        photoType,
      });
    }
  };

  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    if (viewingIssue?.issue_id) {
      await deletePhoto.mutateAsync({
        photoId,
        photoUrl,
        issueId: viewingIssue.issue_id,
      });
    }
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const togglePriorityFilter = (priority: string) => {
    setPriorityFilter(prev =>
      prev.includes(priority) ? prev.filter(p => p !== priority) : [...prev, priority]
    );
  };

  const clearFilters = () => {
    setStatusFilter([]);
    setPriorityFilter([]);
    setCategoryFilter([]);
    setPropertyFilter('');
    setAssignedFilter('');
    setSearchQuery('');
  };

  const hasActiveFilters = statusFilter.length > 0 ||
    priorityFilter.length > 0 ||
    categoryFilter.length > 0 ||
    propertyFilter ||
    assignedFilter ||
    searchQuery;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('issues.title')}
        subtitle={t('issues.subtitle')}
        icon={AlertTriangle}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
            <Button onClick={handleCreateIssue} className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              {t('issues.reportIssue')}
            </Button>
          </>
        }
      />

        {/* Statistics Dashboard */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">{t('issues.stats.totalIssues')}</p>
                  <h3 className="text-3xl font-bold text-blue-900 mt-1">{stats.total}</h3>
                  <p className="text-xs text-blue-600 mt-1">{t('issues.stats.totalIssuesDesc')}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-red-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">{t('issues.stats.openIssues')}</p>
                  <h3 className="text-3xl font-bold text-red-900 mt-1">{stats.open}</h3>
                  <p className="text-xs text-red-600 mt-1">{t('issues.stats.openIssuesDesc')}</p>
                </div>
                <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">{t('issues.stats.resolved')}</p>
                  <h3 className="text-3xl font-bold text-green-900 mt-1">{stats.resolved}</h3>
                  <p className="text-xs text-green-600 mt-1">{t('issues.stats.resolvedDesc')}</p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">{t('issues.stats.totalCost')}</p>
                  <h3 className="text-3xl font-bold text-purple-900 mt-1">${stats.totalCost.toFixed(2)}</h3>
                  <p className="text-xs text-purple-600 mt-1">{t('issues.stats.totalCostDesc')}</p>
                </div>
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search */}
        <Card className="shadow-card border-0 bg-card/60 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('issues.filters.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="search">{t('issues.filters.searchIssues')}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder={t('issues.filters.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Property Filter */}
              <div className="space-y-2">
                <Label htmlFor="property">{t('issues.filters.property')}</Label>
                <Select value={propertyFilter || undefined} onValueChange={(value) => setPropertyFilter(value || '')}>
                  <SelectTrigger id="property">
                    <SelectValue placeholder={t('issues.filters.allProperties')} />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(property => (
                      <SelectItem key={property.property_id} value={property.property_id!}>
                        {property.property_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee Filter */}
              <div className="space-y-2">
                <Label htmlFor="assignee">{t('issues.filters.assignedTo')}</Label>
                <Select value={assignedFilter || "default"} onValueChange={(value) => setAssignedFilter(value === "default" ? '' : value)}>
                  <SelectTrigger id="assignee">
                    <SelectValue placeholder={t('issues.filters.myIssues')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">{t('issues.filters.myIssues')}</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {formatUserDisplay(u)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Badges */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {/* Status Filters */}
              <Badge
                variant={statusFilter.includes('open') ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleStatusFilter('open')}
              >
                {t('issues.status.open')}
              </Badge>
              <Badge
                variant={statusFilter.includes('in_progress') ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleStatusFilter('in_progress')}
              >
                {t('issues.status.inProgress')}
              </Badge>
              <Badge
                variant={statusFilter.includes('resolved') ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleStatusFilter('resolved')}
              >
                {t('issues.status.resolved')}
              </Badge>

              {/* Priority Filters */}
              <Badge
                variant={priorityFilter.includes('urgent') ? 'destructive' : 'outline'}
                className="cursor-pointer"
                onClick={() => togglePriorityFilter('urgent')}
              >
                {t('issues.priority.urgent')}
              </Badge>
              <Badge
                variant={priorityFilter.includes('high') ? 'default' : 'outline'}
                className="cursor-pointer bg-orange-500 hover:bg-orange-600"
                onClick={() => togglePriorityFilter('high')}
              >
                {t('issues.priority.highPriority')}
              </Badge>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-7"
                >
                  <XCircle className="mr-1 h-3 w-3" />
                  {t('issues.filters.clearAll')}
                </Button>
              )}

              {/* Results Count */}
              <Badge variant="secondary" className="ml-auto">
                {issues.length} {issues.length !== 1 ? t('issues.resultsPlural') : t('issues.results')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Issues Table */}
        <IssuesTable
          issues={issues}
          onEdit={handleEditIssue}
          onDelete={handleDeleteIssue}
          onStatusChange={handleStatusChange}
          onViewPhotos={handleViewPhotos}
          emptyMessage={t('issues.noIssuesFound')}
          isDeleting={deleteIssue.isPending}
        />

        {/* Issue Dialog */}
        <IssueDialog
          open={showIssueDialog}
          onOpenChange={setShowIssueDialog}
          onSubmit={handleIssueSubmit}
          isSubmitting={createIssue.isPending || updateIssue.isPending}
          issue={editingIssue}
        />

        {/* Photo Gallery */}
        <PhotoGallery
          open={!!viewingIssue}
          onOpenChange={(open) => !open && setViewingIssue(null)}
          issue={viewingIssue}
          onDeletePhoto={handleDeletePhoto}
          onUploadPhoto={handleUploadPhoto}
          isDeleting={deletePhoto.isPending}
          isUploading={uploadPhoto.isPending}
        />
    </div>
  );
}
