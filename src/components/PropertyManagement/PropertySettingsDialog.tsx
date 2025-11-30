import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Plus, Edit, Trash2, Sparkles, FileText, Loader2 } from 'lucide-react';
import {
  useAmenities,
  useCreateAmenity,
  useUpdateAmenity,
  useDeleteAmenity,
  useRules,
  useCreateRule,
  useUpdateRule,
  useDeleteRule,
} from '@/hooks/useAmenitiesAndRules';
import { Amenity, Rule } from '@/lib/schemas';

interface PropertySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PropertySettingsDialog({ open, onOpenChange }: PropertySettingsDialogProps) {
  const [amenityDialogOpen, setAmenityDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [amenityName, setAmenityName] = useState('');
  const [ruleName, setRuleName] = useState('');
  const [deleteAmenityDialog, setDeleteAmenityDialog] = useState<Amenity | null>(null);
  const [deleteRuleDialog, setDeleteRuleDialog] = useState<Rule | null>(null);

  // Hooks
  const { data: amenities = [], isLoading: amenitiesLoading } = useAmenities();
  const { data: rules = [], isLoading: rulesLoading } = useRules();
  const createAmenity = useCreateAmenity();
  const updateAmenity = useUpdateAmenity();
  const deleteAmenity = useDeleteAmenity();
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();

  // Amenity Handlers
  const handleAddAmenity = () => {
    setEditingAmenity(null);
    setAmenityName('');
    setAmenityDialogOpen(true);
  };

  const handleEditAmenity = (amenity: Amenity) => {
    setEditingAmenity(amenity);
    setAmenityName(amenity.amenity_name);
    setAmenityDialogOpen(true);
  };

  const handleSaveAmenity = async () => {
    if (!amenityName.trim()) return;

    if (editingAmenity) {
      await updateAmenity.mutateAsync({
        amenityId: editingAmenity.amenity_id!,
        amenityName: amenityName.trim(),
      });
    } else {
      await createAmenity.mutateAsync(amenityName.trim());
    }

    setAmenityDialogOpen(false);
    setEditingAmenity(null);
    setAmenityName('');
  };

  const handleDeleteAmenity = async () => {
    if (!deleteAmenityDialog) return;
    await deleteAmenity.mutateAsync(deleteAmenityDialog.amenity_id!);
    setDeleteAmenityDialog(null);
  };

  // Rule Handlers
  const handleAddRule = () => {
    setEditingRule(null);
    setRuleName('');
    setRuleDialogOpen(true);
  };

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule);
    setRuleName(rule.rule_name);
    setRuleDialogOpen(true);
  };

  const handleSaveRule = async () => {
    if (!ruleName.trim()) return;

    if (editingRule) {
      await updateRule.mutateAsync({
        ruleId: editingRule.rule_id!,
        ruleName: ruleName.trim(),
      });
    } else {
      await createRule.mutateAsync(ruleName.trim());
    }

    setRuleDialogOpen(false);
    setEditingRule(null);
    setRuleName('');
  };

  const handleDeleteRule = async () => {
    if (!deleteRuleDialog) return;
    await deleteRule.mutateAsync(deleteRuleDialog.rule_id!);
    setDeleteRuleDialog(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl">Property Settings</DialogTitle>
            <DialogDescription>
              Manage amenities and rules that can be assigned to properties
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="amenities" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="amenities">
              <Sparkles className="h-4 w-4 mr-2" />
              Amenities
            </TabsTrigger>
            <TabsTrigger value="rules">
              <FileText className="h-4 w-4 mr-2" />
              Rules
            </TabsTrigger>
          </TabsList>

          {/* Amenities Tab */}
          <TabsContent value="amenities">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Amenities</CardTitle>
                  <CardDescription>
                    Manage property amenities that guests can filter by
                  </CardDescription>
                </div>
                <Button onClick={handleAddAmenity}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Amenity
                </Button>
              </CardHeader>
              <CardContent>
                {amenitiesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : amenities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No amenities yet</p>
                    <Button onClick={handleAddAmenity} variant="outline" className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Amenity
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {amenities.map((amenity) => (
                      <div
                        key={amenity.amenity_id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-medium">{amenity.amenity_name}</span>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditAmenity(amenity)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteAmenityDialog(amenity)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Total: <strong>{amenities.length}</strong> amenities
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Property Rules</CardTitle>
                  <CardDescription>
                    Manage property rules and policies for guests
                  </CardDescription>
                </div>
                <Button onClick={handleAddRule}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </CardHeader>
              <CardContent>
                {rulesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : rules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No rules yet</p>
                    <Button onClick={handleAddRule} variant="outline" className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Rule
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rules.map((rule) => (
                      <div
                        key={rule.rule_id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-medium">{rule.rule_name}</span>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRule(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteRuleDialog(rule)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Total: <strong>{rules.length}</strong> rules
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

        {/* Amenity Dialog */}
        <Dialog open={amenityDialogOpen} onOpenChange={setAmenityDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAmenity ? 'Edit Amenity' : 'Add New Amenity'}
              </DialogTitle>
              <DialogDescription>
                {editingAmenity
                  ? 'Update the amenity name below'
                  : 'Add a new amenity that can be assigned to properties'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amenity-name">Amenity Name</Label>
                <Input
                  id="amenity-name"
                  value={amenityName}
                  onChange={(e) => setAmenityName(e.target.value)}
                  placeholder="e.g., Wi-Fi, Pool, Gym"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveAmenity();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAmenityDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveAmenity}
                disabled={!amenityName.trim() || createAmenity.isPending || updateAmenity.isPending}
              >
                {(createAmenity.isPending || updateAmenity.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingAmenity ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rule Dialog */}
        <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Edit Rule' : 'Add New Rule'}
              </DialogTitle>
              <DialogDescription>
                {editingRule
                  ? 'Update the rule description below'
                  : 'Add a new rule that can be assigned to properties'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rule-name">Rule Description</Label>
                <Input
                  id="rule-name"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="e.g., No Smoking, Check-in: 3:00 PM"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveRule();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveRule}
                disabled={!ruleName.trim() || createRule.isPending || updateRule.isPending}
              >
                {(createRule.isPending || updateRule.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingRule ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Amenity Dialog */}
        <AlertDialog
          open={!!deleteAmenityDialog}
          onOpenChange={(open) => !open && setDeleteAmenityDialog(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Amenity</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteAmenityDialog?.amenity_name}"? This will
                remove it from all properties that have it assigned.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAmenity}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteAmenity.isPending}
              >
                {deleteAmenity.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Rule Dialog */}
        <AlertDialog
          open={!!deleteRuleDialog}
          onOpenChange={(open) => !open && setDeleteRuleDialog(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Rule</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deleteRuleDialog?.rule_name}"? This will remove
                it from all properties that have it assigned.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteRule}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteRule.isPending}
              >
                {deleteRule.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
