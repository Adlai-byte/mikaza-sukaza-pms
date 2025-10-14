import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export default function Issues() {
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
  const filters: IssueFilters = useMemo(() => ({
    status: statusFilter.length > 0 ? statusFilter : undefined,
    priority: priorityFilter.length > 0 ? priorityFilter : undefined,
    category: categoryFilter.length > 0 ? categoryFilter : undefined,
    property_id: propertyFilter || undefined,
    assigned_to: assignedFilter || undefined,
    search: searchQuery || undefined,
  }), [statusFilter, priorityFilter, categoryFilter, propertyFilter, assignedFilter, searchQuery]);

  const { issues, loading } = useIssues(filters);
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
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto p-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-primary" />
              Issues & Photos
            </h1>
            <p className="text-muted-foreground mt-2">
              Track property issues, maintenance, and document with photos
            </p>
          </div>
          <Button onClick={handleCreateIssue} className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Report Issue
          </Button>
        </div>

        {/* Statistics Dashboard */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="shadow-card border-0 bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                All reported issues
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0 bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.open}</div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0 bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
              <p className="text-xs text-muted-foreground">
                Completed issues
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-0 bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalCost.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Actual costs
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search */}
        <Card className="shadow-card border-0 bg-card/60 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="search">Search Issues</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by title, description, location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Property Filter */}
              <div className="space-y-2">
                <Label htmlFor="property">Property</Label>
                <Select value={propertyFilter || undefined} onValueChange={(value) => setPropertyFilter(value || '')}>
                  <SelectTrigger id="property">
                    <SelectValue placeholder="All properties" />
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
                <Label htmlFor="assignee">Assigned To</Label>
                <Select value={assignedFilter || undefined} onValueChange={(value) => setAssignedFilter(value || '')}>
                  <SelectTrigger id="assignee">
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    {user?.user_id && (
                      <SelectItem value={user.user_id}>My Issues</SelectItem>
                    )}
                    {users.map(u => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.first_name} {u.last_name}
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
                Open
              </Badge>
              <Badge
                variant={statusFilter.includes('in_progress') ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleStatusFilter('in_progress')}
              >
                In Progress
              </Badge>
              <Badge
                variant={statusFilter.includes('resolved') ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleStatusFilter('resolved')}
              >
                Resolved
              </Badge>

              {/* Priority Filters */}
              <Badge
                variant={priorityFilter.includes('urgent') ? 'destructive' : 'outline'}
                className="cursor-pointer"
                onClick={() => togglePriorityFilter('urgent')}
              >
                Urgent
              </Badge>
              <Badge
                variant={priorityFilter.includes('high') ? 'default' : 'outline'}
                className="cursor-pointer bg-orange-500 hover:bg-orange-600"
                onClick={() => togglePriorityFilter('high')}
              >
                High Priority
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
                  Clear All
                </Button>
              )}

              {/* Results Count */}
              <Badge variant="secondary" className="ml-auto">
                {issues.length} result{issues.length !== 1 ? 's' : ''}
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
          emptyMessage="No issues found. Report your first issue to get started."
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
    </div>
  );
}
