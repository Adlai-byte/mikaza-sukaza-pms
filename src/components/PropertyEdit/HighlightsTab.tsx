import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Edit,
  Trash2,
  Sparkles,
  Star,
  Eye,
  EyeOff,
} from 'lucide-react';
import { HighlightDialog } from '@/components/highlights/HighlightDialog';
import { usePropertyHighlights, useDeletePropertyHighlight, useUpdatePropertyHighlight } from '@/hooks/useHighlights';
import type { PropertyHighlight } from '@/lib/schemas';
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
import { toast } from 'sonner';

interface HighlightsTabProps {
  propertyId: string;
}

export function HighlightsTab({ propertyId }: HighlightsTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<PropertyHighlight | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [highlightToDelete, setHighlightToDelete] = useState<PropertyHighlight | null>(null);

  const { highlights = [], isLoading } = usePropertyHighlights({ property_id: propertyId });
  const deleteMutation = useDeletePropertyHighlight();
  const updateMutation = useUpdatePropertyHighlight();

  const handleAdd = () => {
    setSelectedHighlight(null);
    setDialogOpen(true);
  };

  const handleEdit = (highlight: PropertyHighlight) => {
    setSelectedHighlight(highlight);
    setDialogOpen(true);
  };

  const handleDeleteClick = (highlight: PropertyHighlight) => {
    setHighlightToDelete(highlight);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!highlightToDelete) return;

    try {
      await deleteMutation.mutateAsync(highlightToDelete.highlight_id);
      toast.success('Highlight deleted successfully');
      setDeleteDialogOpen(false);
      setHighlightToDelete(null);
    } catch (error) {
      console.error('Error deleting highlight:', error);
      toast.error('Failed to delete highlight');
    }
  };

  const handleToggleActive = async (highlight: PropertyHighlight) => {
    try {
      await updateMutation.mutateAsync({
        highlightId: highlight.highlight_id,
        updates: {
          is_active: !highlight.is_active,
        },
      });
      toast.success(highlight.is_active ? 'Highlight deactivated' : 'Highlight activated');
    } catch (error) {
      console.error('Error toggling highlight:', error);
      toast.error('Failed to update highlight');
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      feature: 'bg-blue-100 text-blue-800',
      amenity: 'bg-green-100 text-green-800',
      location: 'bg-purple-100 text-purple-800',
      access: 'bg-orange-100 text-orange-800',
      view: 'bg-pink-100 text-pink-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || colors.other;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-yellow-500" />
            Property Highlights
          </h2>
          <p className="text-muted-foreground mt-1">
            Showcase key features and amenities of this property
          </p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Highlight
        </Button>
      </div>

      {/* Highlights List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading highlights...</p>
          </CardContent>
        </Card>
      ) : highlights.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No highlights yet</h3>
            <p className="text-muted-foreground mb-4">
              Add highlights to showcase what makes this property special
            </p>
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Highlight
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {highlights
            .sort((a, b) => a.display_order - b.display_order)
            .map((highlight) => (
              <Card
                key={highlight.highlight_id}
                className={highlight.is_active ? '' : 'opacity-60 border-dashed'}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Star className="h-5 w-5 text-yellow-500" />
                          {highlight.title}
                        </CardTitle>
                        <Badge className={getTypeColor(highlight.highlight_type)}>
                          {highlight.highlight_type}
                        </Badge>
                        {!highlight.is_active && (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </div>
                      {highlight.description && (
                        <CardDescription>{highlight.description}</CardDescription>
                      )}
                      {highlight.icon_name && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Icon: {highlight.icon_name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Display order: {highlight.display_order}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(highlight)}
                        title={highlight.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {highlight.is_active ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(highlight)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(highlight)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <HighlightDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        highlight={selectedHighlight}
        propertyId={propertyId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Highlight?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{highlightToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
