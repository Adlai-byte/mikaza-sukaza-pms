import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Edit,
  Trash2,
  Phone,
  Mail,
  Calendar,
  User,
  UserPlus,
  Crown,
  MessageCircle,
  Flag,
  Contact,
  Search,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ListTabSkeleton, TabLoadingSpinner } from './PropertyEditSkeleton';

interface UnitOwner {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth?: string;
  cellphone_primary?: string;
  cellphone_usa?: string;
  whatsapp?: string;
  relationship_to_main_owner?: string;
  created_at?: string;
  is_primary?: boolean;
}

interface UnitOwnersTabOptimizedProps {
  propertyId: string;
}

// Query keys
const unitOwnersKeys = {
  all: (propertyId: string) => ['unitOwners', propertyId] as const,
};

// Fetch unit owners
const fetchUnitOwners = async (propertyId: string): Promise<UnitOwner[]> => {
  // Get the property to find the owner
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('owner_id')
    .eq('property_id', propertyId)
    .single();

  if (propertyError) throw propertyError;

  // Get the owner details
  if (property.owner_id) {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', property.owner_id);

    if (userError) throw userError;

    // Mark the main owner as primary
    return (userData || []).map(user => ({ ...user, is_primary: true }));
  }

  return [];
};

export function UnitOwnersTabOptimized({ propertyId }: UnitOwnersTabOptimizedProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddOwnerForm, setShowAddOwnerForm] = useState(false);
  const [editingOwner, setEditingOwner] = useState<UnitOwner | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const emptyOwner = {
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    date_of_birth: '',
    cellphone_primary: '',
    cellphone_usa: '',
    whatsapp: '',
    relationship_to_main_owner: 'None',
  };

  const [formData, setFormData] = useState(emptyOwner);

  // Fetch owners query
  const {
    data: owners = [],
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: unitOwnersKeys.all(propertyId),
    queryFn: () => fetchUnitOwners(propertyId),
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Filter owners based on search
  const filteredOwners = owners.filter(owner =>
    `${owner.first_name} ${owner.last_name} ${owner.email}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  // Add owner mutation
  const addOwnerMutation = useMutation({
    mutationFn: async (ownerData: typeof emptyOwner) => {
      // Generate a default password if not provided
      const dataToInsert = {
        ...ownerData,
        password: ownerData.password || `Owner${Date.now()}!`, // Default password
      };

      const { data, error } = await supabase
        .from('users')
        .insert([dataToInsert])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unitOwnersKeys.all(propertyId) });
      toast({
        title: 'Success',
        description: 'Owner added successfully',
      });
      handleCloseForm();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add owner',
        variant: 'destructive',
      });
    },
  });

  // Update owner mutation
  const updateOwnerMutation = useMutation({
    mutationFn: async ({ ownerId, updates }: { ownerId: string; updates: Partial<UnitOwner> }) => {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('user_id', ownerId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unitOwnersKeys.all(propertyId) });
      toast({
        title: 'Success',
        description: 'Owner updated successfully',
      });
      handleCloseForm();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update owner',
        variant: 'destructive',
      });
    },
  });

  // Delete owner mutation
  const deleteOwnerMutation = useMutation({
    mutationFn: async (ownerId: string) => {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('user_id', ownerId);

      if (error) throw error;
      return ownerId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: unitOwnersKeys.all(propertyId) });
      toast({
        title: 'Success',
        description: 'Owner removed successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove owner',
        variant: 'destructive',
      });
    },
  });

  // Show loading skeleton on initial load
  if (isLoading) {
    return <ListTabSkeleton title="Unit Owners" />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-destructive mb-4">
          <User className="h-12 w-12 mx-auto mb-2" />
          <p>Failed to load unit owners</p>
        </div>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: unitOwnersKeys.all(propertyId) })}>
          Try Again
        </Button>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingOwner) {
      updateOwnerMutation.mutate({
        ownerId: editingOwner.user_id,
        updates: formData,
      });
    } else {
      addOwnerMutation.mutate(formData);
    }
  };

  const handleEdit = (owner: UnitOwner) => {
    setEditingOwner(owner);
    setFormData({
      first_name: owner.first_name,
      last_name: owner.last_name,
      email: owner.email,
      password: '', // Don't show existing password
      date_of_birth: owner.date_of_birth || '',
      cellphone_primary: owner.cellphone_primary || '',
      cellphone_usa: owner.cellphone_usa || '',
      whatsapp: owner.whatsapp || '',
      relationship_to_main_owner: owner.relationship_to_main_owner || 'None',
    });
    setShowAddOwnerForm(true);
  };

  const handleCloseForm = () => {
    setShowAddOwnerForm(false);
    setEditingOwner(null);
    setFormData(emptyOwner);
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone || phone === 'N/A') return null;
    return phone;
  };

  return (
    <div className="space-y-6 relative">
      {/* Loading overlay for background fetching */}
      {isFetching && !isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-md">
          <TabLoadingSpinner message="Updating owners..." />
        </div>
      )}

      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Contact className="h-6 w-6" />
            Unit Owners
          </h2>
          <p className="text-muted-foreground">
            Manage property owners and their contact information
          </p>
        </div>
        <Dialog open={showAddOwnerForm} onOpenChange={setShowAddOwnerForm}>
          <DialogTrigger asChild>
            <Button
              className="bg-primary hover:bg-primary/90 shadow-lg"
              disabled={addOwnerMutation.isPending}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add Owner
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingOwner ? 'Edit Owner' : 'Add New Owner'}
                </DialogTitle>
                <DialogDescription>
                  {editingOwner
                    ? 'Update the owner information below.'
                    : 'Add a new owner to this property.'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="First name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="Last name"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    />
                  </div>
                </div>

                {!editingOwner && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password (Optional)</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Leave empty for auto-generated password"
                    />
                    <p className="text-xs text-muted-foreground">
                      If left empty, a secure password will be generated automatically.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="relationship_to_main_owner">Relationship to Main Property Owner</Label>
                    <Select
                      value={formData.relationship_to_main_owner}
                      onValueChange={(value) => setFormData({ ...formData, relationship_to_main_owner: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Spouse">Spouse</SelectItem>
                        <SelectItem value="Mother">Mother</SelectItem>
                        <SelectItem value="Father">Father</SelectItem>
                        <SelectItem value="Son">Son</SelectItem>
                        <SelectItem value="Daughter">Daughter</SelectItem>
                        <SelectItem value="Brother">Brother</SelectItem>
                        <SelectItem value="Sister">Sister</SelectItem>
                        <SelectItem value="Grandfather">Grandfather</SelectItem>
                        <SelectItem value="Grandmother">Grandmother</SelectItem>
                        <SelectItem value="Uncle">Uncle</SelectItem>
                        <SelectItem value="Aunt">Aunt</SelectItem>
                        <SelectItem value="Cousin">Cousin</SelectItem>
                        <SelectItem value="Friend">Friend</SelectItem>
                        <SelectItem value="Business Partner">Business Partner</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cellphone_primary">Primary Phone</Label>
                    <Input
                      id="cellphone_primary"
                      value={formData.cellphone_primary}
                      onChange={(e) => setFormData({ ...formData, cellphone_primary: e.target.value })}
                      placeholder="Primary phone number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cellphone_usa">USA Phone</Label>
                    <Input
                      id="cellphone_usa"
                      value={formData.cellphone_usa}
                      onChange={(e) => setFormData({ ...formData, cellphone_usa: e.target.value })}
                      placeholder="USA phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      placeholder="WhatsApp number"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseForm}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addOwnerMutation.isPending || updateOwnerMutation.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  {addOwnerMutation.isPending || updateOwnerMutation.isPending
                    ? 'Saving...'
                    : editingOwner
                    ? 'Update'
                    : 'Add Owner'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      {owners.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search owners by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Owners Table */}
      {filteredOwners.length === 0 ? (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {searchQuery ? 'No matching owners found' : 'No Owners Added'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery
              ? 'Try adjusting your search terms'
              : 'Add owners to keep track of property contacts and stakeholders. Use the "Add Owner" button above.'}
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Relationship</TableHead>
                <TableHead>Primary Phone</TableHead>
                <TableHead>USA Phone</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOwners.map((owner) => (
                <TableRow key={owner.user_id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {owner.first_name} {owner.last_name}
                      {owner.is_primary && (
                        <Badge className="bg-amber-500 hover:bg-amber-600">
                          <Crown className="h-3 w-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{owner.email}</TableCell>
                  <TableCell>
                    {owner.relationship_to_main_owner && owner.relationship_to_main_owner !== 'None' ? (
                      <Badge variant="secondary">{owner.relationship_to_main_owner}</Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{formatPhoneNumber(owner.cellphone_primary) || '-'}</TableCell>
                  <TableCell>{formatPhoneNumber(owner.cellphone_usa) || '-'}</TableCell>
                  <TableCell>{formatPhoneNumber(owner.whatsapp) || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(owner)}
                        disabled={updateOwnerMutation.isPending}
                        title="Edit Owner"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!owner.is_primary && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={deleteOwnerMutation.isPending}
                              title="Delete Owner"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Owner</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {owner.first_name} {owner.last_name}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteOwnerMutation.mutate(owner.user_id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}