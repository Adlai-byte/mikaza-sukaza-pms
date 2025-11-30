import React, { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
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
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Phone,
  Globe,
  User,
  Building,
  Zap,
  Wifi,
  Car,
  Shield,
  Home,
  Wrench,
  Search,
  Star,
  Mail,
  Check,
  Trash2,
} from 'lucide-react';
import { usePropertyProviders } from '@/hooks/usePropertyProviders';
import { ProvidersTabSkeleton } from './PropertyEditSkeleton';

interface ProvidersTabProps {
  propertyId: string;
}

const providerTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'Electric': Zap,
  'Internet': Wifi,
  'Gas': Home,
  'Water': Home,
  'Cable': Wifi,
  'Security': Shield,
  'Parking': Car,
  'Maintenance': Wrench,
  'Management': Building,
  'Other': User,
};

const providerTypeColors: Record<string, string> = {
  'Electric': 'bg-yellow-500',
  'Internet': 'bg-blue-500',
  'Gas': 'bg-orange-500',
  'Water': 'bg-cyan-500',
  'Cable': 'bg-purple-500',
  'Security': 'bg-red-500',
  'Parking': 'bg-gray-500',
  'Maintenance': 'bg-green-500',
  'Management': 'bg-indigo-500',
  'Other': 'bg-slate-500',
};

export function ProvidersTabOptimized({ propertyId }: ProvidersTabProps) {
  const { toast } = useToast();

  // Utility providers hook - unified system with category filter
  const {
    assignedProviders: assignedUtilities,
    isLoading: isLoadingUtilities,
    availableProviders: availableUtilities,
    assignProvider: assignUtilityProvider,
    isAssigning: isAssigningUtility,
    unassignProvider: unassignUtilityProvider,
    isUnassigning: isUnassigningUtility,
    refetch: refetchUtilities,
  } = usePropertyProviders(propertyId, 'utility');

  // Service providers hook - unified system with category filter
  const {
    assignedProviders,
    isLoading: isLoadingServiceProviders,
    availableProviders,
    assignProvider,
    isAssigning,
    unassignProvider,
    isUnassigning,
    refetch: refetchServices,
  } = usePropertyProviders(propertyId, 'service');

  const [activeTab, setActiveTab] = useState('utilities');
  const [showUtilityAssignDialog, setShowUtilityAssignDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');

  // Dialog search states
  const [utilityDialogSearch, setUtilityDialogSearch] = useState('');
  const [serviceDialogSearch, setServiceDialogSearch] = useState('');

  // Utility assignment form state
  const [selectedUtilityProviderId, setSelectedUtilityProviderId] = useState('');

  // Service contractor assignment form state
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [isPreferredForProperty, setIsPreferredForProperty] = useState(false);

  // Unassign confirmation state
  const [providerToUnassign, setProviderToUnassign] = useState<{
    id: string;
    name: string;
    type: 'utility' | 'service';
  } | null>(null);

  // Get already assigned utility provider IDs (must be before early return due to hooks rule)
  const assignedUtilityIds = new Set(assignedUtilities.map(a => a.provider_id));
  const unassignedUtilities = availableUtilities.filter(p => !assignedUtilityIds.has(p.provider_id));

  // Get already assigned service provider IDs
  const assignedProviderIds = new Set(assignedProviders.map(a => a.provider_id));
  const unassignedProviders = availableProviders.filter(p => !assignedProviderIds.has(p.provider_id));

  // Filtered providers for dialogs (must be before early return due to hooks rule)
  const filteredDialogUtilities = useMemo(() => {
    if (!utilityDialogSearch) return unassignedUtilities;
    const search = utilityDialogSearch.toLowerCase();
    return unassignedUtilities.filter(p =>
      p.provider_name.toLowerCase().includes(search) ||
      p.provider_type.toLowerCase().includes(search)
    );
  }, [unassignedUtilities, utilityDialogSearch]);

  const filteredDialogServices = useMemo(() => {
    if (!serviceDialogSearch) return unassignedProviders;
    const search = serviceDialogSearch.toLowerCase();
    return unassignedProviders.filter(p =>
      p.provider_name.toLowerCase().includes(search) ||
      p.provider_type.toLowerCase().includes(search)
    );
  }, [unassignedProviders, serviceDialogSearch]);

  // Show loading skeleton on initial load
  if (isLoadingUtilities && isLoadingServiceProviders) {
    return <ProvidersTabSkeleton />;
  }

  const handleAssignUtility = async () => {
    if (!selectedUtilityProviderId) {
      toast({
        title: "Error",
        description: "Please select a utility provider",
        variant: "destructive",
      });
      return;
    }

    try {
      await assignUtilityProvider({
        providerId: selectedUtilityProviderId,
      });

      // Force refetch both tables to ensure UI updates
      await Promise.all([refetchUtilities(), refetchServices()]);
    } catch (error) {
      console.error('Error assigning utility provider:', error);
    }

    setShowUtilityAssignDialog(false);
    setSelectedUtilityProviderId('');
    setUtilityDialogSearch('');
  };

  const handleAssignProvider = async () => {
    if (!selectedProviderId) {
      toast({
        title: "Error",
        description: "Please select a service provider",
        variant: "destructive",
      });
      return;
    }

    try {
      await assignProvider({
        providerId: selectedProviderId,
        isPreferredForProperty: isPreferredForProperty,
      });

      // Force refetch both tables to ensure UI updates
      await Promise.all([refetchUtilities(), refetchServices()]);
    } catch (error) {
      console.error('Error assigning service provider:', error);
    }

    setShowAssignDialog(false);
    setSelectedProviderId('');
    setIsPreferredForProperty(false);
    setServiceDialogSearch('');
  };

  const handleCloseUtilityDialog = (open: boolean) => {
    setShowUtilityAssignDialog(open);
    if (!open) {
      setSelectedUtilityProviderId('');
      setUtilityDialogSearch('');
    }
  };

  const handleCloseServiceDialog = (open: boolean) => {
    setShowAssignDialog(open);
    if (!open) {
      setSelectedProviderId('');
      setIsPreferredForProperty(false);
      setServiceDialogSearch('');
    }
  };

  const handleConfirmUnassign = async () => {
    if (!providerToUnassign) return;

    try {
      if (providerToUnassign.type === 'utility') {
        await unassignUtilityProvider(providerToUnassign.id);
      } else {
        await unassignProvider(providerToUnassign.id);
      }

      // Force refetch both tables to ensure UI updates
      await Promise.all([refetchUtilities(), refetchServices()]);
    } catch (error) {
      console.error('Error unassigning provider:', error);
    }

    setProviderToUnassign(null);
  };

  const getProviderIcon = (type: string) => {
    const Icon = providerTypeIcons[type] || User;
    return Icon;
  };

  const getProviderColor = (type: string) => {
    return providerTypeColors[type] || 'bg-slate-500';
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="utilities" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Utility Providers
          </TabsTrigger>
          <TabsTrigger value="contractors" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Service Contractors
          </TabsTrigger>
        </TabsList>

        {/* UTILITY PROVIDERS TAB */}
        <TabsContent value="utilities" className="space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold">Utility Providers</h3>
              <p className="text-sm text-muted-foreground">
                Assign utility providers from the global directory to this property
              </p>
            </div>
            <Dialog open={showUtilityAssignDialog} onOpenChange={handleCloseUtilityDialog}>
              <DialogTrigger asChild>
                <Button disabled={isAssigningUtility}>
                  <Plus className="mr-2 h-4 w-4" />
                  Assign Utility
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Assign Utility Provider</DialogTitle>
                  <DialogDescription>
                    Select a utility provider to assign to this property
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search providers..."
                      value={utilityDialogSearch}
                      onChange={(e) => setUtilityDialogSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Provider Cards */}
                  <ScrollArea className="h-[300px] pr-4">
                    {filteredDialogUtilities.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No providers found</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredDialogUtilities.map((provider) => {
                          const Icon = getProviderIcon(provider.provider_type);
                          const colorClass = getProviderColor(provider.provider_type);
                          const isSelected = selectedUtilityProviderId === provider.provider_id;

                          return (
                            <div
                              key={provider.provider_id}
                              onClick={() => setSelectedUtilityProviderId(provider.provider_id)}
                              className={`
                                relative p-3 rounded-lg border-2 cursor-pointer transition-all
                                ${isSelected
                                  ? 'border-primary bg-primary/5'
                                  : 'border-transparent bg-gray-50 hover:bg-gray-100 hover:border-gray-200'
                                }
                              `}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${colorClass} text-white`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium truncate">{provider.provider_name}</span>
                                    <Badge variant="secondary" className="text-xs">
                                      {provider.provider_type}
                                    </Badge>
                                  </div>
                                  {provider.phone_primary && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                      <Phone className="h-3 w-3" />
                                      {provider.phone_primary}
                                    </div>
                                  )}
                                </div>
                                {isSelected && (
                                  <div className="flex-shrink-0 text-primary">
                                    <Check className="h-5 w-5" />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCloseUtilityDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAssignUtility} disabled={isAssigningUtility || !selectedUtilityProviderId}>
                    {isAssigningUtility ? 'Assigning...' : 'Assign Provider'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {assignedUtilities.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-medium mb-2">No Utility Providers Assigned</h4>
              <p className="text-muted-foreground mb-6">
                Assign utility providers to this property to track account information
              </p>
              <Button onClick={() => setShowUtilityAssignDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Assign First Utility
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search utilities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Billing Name</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedUtilities
                      .filter(assignment =>
                        assignment.provider.provider_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        assignment.provider.provider_type.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((assignment) => {
                        const Icon = getProviderIcon(assignment.provider.provider_type);
                        const colorClass = getProviderColor(assignment.provider.provider_type);

                        return (
                          <TableRow key={assignment.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${colorClass} text-white`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <span>{assignment.provider.provider_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{assignment.provider.provider_type}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 text-sm">
                                {assignment.provider.phone_primary && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {assignment.provider.phone_primary}
                                  </div>
                                )}
                                {assignment.provider.website && (
                                  <a
                                    href={assignment.provider.website.startsWith('http') ? assignment.provider.website : `https://${assignment.provider.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline flex items-center gap-1"
                                  >
                                    <Globe className="h-3 w-3" />
                                    Website
                                  </a>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{assignment.account_number || '-'}</TableCell>
                            <TableCell>{assignment.billing_name || '-'}</TableCell>
                            <TableCell>{assignment.username || '-'}</TableCell>
                            <TableCell className="max-w-[200px] truncate" title={assignment.observations || ''}>
                              {assignment.observations || '-'}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setProviderToUnassign({
                                  id: assignment.id,
                                  name: assignment.provider.provider_name,
                                  type: 'utility',
                                })}
                                disabled={isUnassigningUtility}
                                title="Remove provider"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>

        {/* SERVICE CONTRACTORS TAB */}
        <TabsContent value="contractors" className="space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold">Service Contractors</h3>
              <p className="text-sm text-muted-foreground">
                Assign service providers from the global directory to this property
              </p>
            </div>
            <Dialog open={showAssignDialog} onOpenChange={handleCloseServiceDialog}>
              <DialogTrigger asChild>
                <Button disabled={isAssigning}>
                  <Plus className="mr-2 h-4 w-4" />
                  Assign Contractor
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Assign Service Contractor</DialogTitle>
                  <DialogDescription>
                    Select a service provider to assign to this property
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search providers..."
                      value={serviceDialogSearch}
                      onChange={(e) => setServiceDialogSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Provider Cards */}
                  <ScrollArea className="h-[280px] pr-4">
                    {filteredDialogServices.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No providers found</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredDialogServices.map((provider) => {
                          const isSelected = selectedProviderId === provider.provider_id;

                          return (
                            <div
                              key={provider.provider_id}
                              onClick={() => setSelectedProviderId(provider.provider_id)}
                              className={`
                                relative p-3 rounded-lg border-2 cursor-pointer transition-all
                                ${isSelected
                                  ? 'border-primary bg-primary/5'
                                  : 'border-transparent bg-gray-50 hover:bg-gray-100 hover:border-gray-200'
                                }
                              `}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500 text-white">
                                  <Wrench className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium truncate">{provider.provider_name}</span>
                                    <Badge variant="secondary" className="text-xs">
                                      {provider.provider_type}
                                    </Badge>
                                    {provider.is_preferred && (
                                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                    {provider.phone_primary && (
                                      <div className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {provider.phone_primary}
                                      </div>
                                    )}
                                    {provider.rating && (
                                      <div className="flex items-center gap-1">
                                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                        {provider.rating.toFixed(1)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="flex-shrink-0 text-primary">
                                    <Check className="h-5 w-5" />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>

                  {/* Preferred Checkbox */}
                  <div className="flex items-center space-x-2 pt-2 border-t">
                    <Checkbox
                      id="preferred"
                      checked={isPreferredForProperty}
                      onCheckedChange={(checked) => setIsPreferredForProperty(checked as boolean)}
                    />
                    <Label htmlFor="preferred" className="cursor-pointer">
                      Mark as preferred for this property
                    </Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCloseServiceDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAssignProvider} disabled={isAssigning || !selectedProviderId}>
                    {isAssigning ? 'Assigning...' : 'Assign Provider'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {assignedProviders.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-medium mb-2">No Service Contractors Assigned</h4>
              <p className="text-muted-foreground mb-6">
                Assign service providers to this property for easy access
              </p>
              <Button onClick={() => setShowAssignDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Assign First Contractor
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search contractors..."
                  value={serviceSearchQuery}
                  onChange={(e) => setServiceSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedProviders
                      .filter(assignment =>
                        assignment.provider.provider_name.toLowerCase().includes(serviceSearchQuery.toLowerCase()) ||
                        assignment.provider.provider_type.toLowerCase().includes(serviceSearchQuery.toLowerCase())
                      )
                      .map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {assignment.provider.provider_name}
                              {assignment.is_preferred_for_property && (
                                <Badge className="bg-purple-100 text-purple-800">
                                  <Star className="h-3 w-3 mr-1" />
                                  Preferred
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{assignment.provider.provider_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              {assignment.provider.phone_primary && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {assignment.provider.phone_primary}
                                </div>
                              )}
                              {assignment.provider.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {assignment.provider.email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {assignment.provider.rating ? (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                <span className="font-medium">{assignment.provider.rating.toFixed(1)}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({assignment.provider.total_reviews})
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">No reviews</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={assignment.provider.is_active ? 'default' : 'secondary'}>
                              {assignment.provider.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={assignment.assignment_notes || ''}>
                            {assignment.assignment_notes || '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setProviderToUnassign({
                                id: assignment.id,
                                name: assignment.provider.provider_name,
                                type: 'service',
                              })}
                              disabled={isUnassigning}
                              title="Remove provider"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Unassign Confirmation Dialog */}
      <AlertDialog open={!!providerToUnassign} onOpenChange={(open) => !open && setProviderToUnassign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-semibold">{providerToUnassign?.name}</span> from this property? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUnassign}
              className="bg-red-600 hover:bg-red-700"
            >
              {(isUnassigningUtility || isUnassigning) ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
