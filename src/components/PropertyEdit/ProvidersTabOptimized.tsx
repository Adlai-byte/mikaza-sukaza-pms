import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Edit,
  Trash2,
  Phone,
  Globe,
  CreditCard,
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
  Link as LinkIcon,
} from 'lucide-react';
import { usePropertyProviders } from '@/hooks/usePropertyProviders';
import { ProvidersTabSkeleton, TabLoadingSpinner } from './PropertyEditSkeleton';

interface UtilityAssignmentFormData {
  providerId: string;
  accountNumber: string;
  billingName: string;
  username: string;
  password: string;
  observations: string;
}

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
    isFetching: isFetchingUtilities,
    availableProviders: availableUtilities,
    isLoadingAvailable: isLoadingAvailableUtilities,
    refetchAvailable: refetchAvailableUtilities,
    assignProvider: assignUtilityProvider,
    updateAssignment: updateUtilityAssignment,
    unassignProvider: unassignUtilityProvider,
    isAssigning: isAssigningUtility,
    isUpdatingAssignment: isUpdatingUtility,
    isUnassigning: isUnassigningUtility,
  } = usePropertyProviders(propertyId, 'utility');

  // Service providers hook - unified system with category filter
  const {
    assignedProviders,
    isLoading: isLoadingServiceProviders,
    isFetching: isFetchingServiceProviders,
    availableProviders,
    isLoadingAvailable,
    refetchAvailable: refetchAvailableService,
    assignProvider,
    updateAssignment,
    unassignProvider,
    isAssigning,
    isUnassigning,
  } = usePropertyProviders(propertyId, 'service');

  const [activeTab, setActiveTab] = useState('utilities');
  const [showUtilityAssignDialog, setShowUtilityAssignDialog] = useState(false);
  const [showUtilityEditDialog, setShowUtilityEditDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showServiceEditDialog, setShowServiceEditDialog] = useState(false);
  const [editingUtilityAssignment, setEditingUtilityAssignment] = useState<any | null>(null);
  const [editingServiceAssignment, setEditingServiceAssignment] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');

  // Utility assignment form state
  const [utilityFormData, setUtilityFormData] = useState<UtilityAssignmentFormData>({
    providerId: '',
    accountNumber: '',
    billingName: '',
    username: '',
    password: '',
    observations: '',
  });

  // Service contractor assignment form state
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [isPreferredForProperty, setIsPreferredForProperty] = useState(false);

  // Show loading skeleton on initial load
  if (isLoadingUtilities && isLoadingServiceProviders) {
    return <ProvidersTabSkeleton />;
  }

  const handleAssignUtility = () => {
    if (!utilityFormData.providerId) {
      toast({
        title: "Error",
        description: "Please select a utility provider",
        variant: "destructive",
      });
      return;
    }

    assignUtilityProvider({
      providerId: utilityFormData.providerId,
      accountNumber: utilityFormData.accountNumber,
      billingName: utilityFormData.billingName,
      username: utilityFormData.username,
      password: utilityFormData.password,
      observations: utilityFormData.observations,
    });

    setShowUtilityAssignDialog(false);
    setUtilityFormData({
      providerId: '',
      accountNumber: '',
      billingName: '',
      username: '',
      password: '',
      observations: '',
    });
  };

  const handleUpdateUtilityAssignment = () => {
    if (!editingUtilityAssignment) return;

    updateUtilityAssignment({
      assignmentId: editingUtilityAssignment.id,
      accountNumber: utilityFormData.accountNumber,
      billingName: utilityFormData.billingName,
      username: utilityFormData.username,
      password: utilityFormData.password,
      observations: utilityFormData.observations,
    });

    setShowUtilityEditDialog(false);
    setEditingUtilityAssignment(null);
    setUtilityFormData({
      providerId: '',
      accountNumber: '',
      billingName: '',
      username: '',
      password: '',
      observations: '',
    });
  };

  const handleAssignProvider = () => {
    if (!selectedProviderId) {
      toast({
        title: "Error",
        description: "Please select a service provider",
        variant: "destructive",
      });
      return;
    }

    assignProvider({
      providerId: selectedProviderId,
      isPreferredForProperty: isPreferredForProperty,
      assignmentNotes: assignmentNotes,
    });

    setShowAssignDialog(false);
    setSelectedProviderId('');
    setAssignmentNotes('');
    setIsPreferredForProperty(false);
  };

  const handleEditUtilityAssignment = (assignment: any) => {
    setEditingUtilityAssignment(assignment);
    setUtilityFormData({
      providerId: assignment.provider_id,
      accountNumber: assignment.account_number || '',
      billingName: assignment.billing_name || '',
      username: assignment.username || '',
      password: assignment.password || '',
      observations: assignment.observations || '',
    });
    setShowUtilityEditDialog(true);
  };

  const handleEditServiceAssignment = (assignment: any) => {
    setEditingServiceAssignment(assignment);
    setAssignmentNotes(assignment.assignment_notes || '');
    setIsPreferredForProperty(assignment.is_preferred_for_property || false);
    setShowServiceEditDialog(true);
  };

  const handleUpdateServiceAssignment = () => {
    if (!editingServiceAssignment) return;

    updateAssignment({
      assignmentId: editingServiceAssignment.id,
      isPreferredForProperty: isPreferredForProperty,
      assignmentNotes: assignmentNotes,
    });

    setShowServiceEditDialog(false);
    setEditingServiceAssignment(null);
    setAssignmentNotes('');
    setIsPreferredForProperty(false);
  };

  const getProviderIcon = (type: string) => {
    const Icon = providerTypeIcons[type] || User;
    return Icon;
  };

  const getProviderColor = (type: string) => {
    return providerTypeColors[type] || 'bg-slate-500';
  };

  const providerTypes = [
    'Electric', 'Internet', 'Gas', 'Water', 'Cable', 'Security',
    'Parking', 'Maintenance', 'Management', 'Other'
  ];

  // Get already assigned utility provider IDs
  const assignedUtilityIds = new Set(assignedUtilities.map(a => a.provider_id));
  const unassignedUtilities = availableUtilities.filter(p => !assignedUtilityIds.has(p.provider_id));

  // Get already assigned service provider IDs
  const assignedProviderIds = new Set(assignedProviders.map(a => a.provider_id));
  const unassignedProviders = availableProviders.filter(p => !assignedProviderIds.has(p.provider_id));

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
            <Dialog open={showUtilityAssignDialog} onOpenChange={setShowUtilityAssignDialog}>
              <DialogTrigger asChild>
                <Button disabled={isAssigningUtility}>
                  <Plus className="mr-2 h-4 w-4" />
                  Assign Utility
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Assign Utility Provider</DialogTitle>
                  <DialogDescription>
                    Select a utility provider and enter property-specific account details
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Utility Provider *</Label>
                    <Select value={utilityFormData.providerId} onValueChange={(value) => setUtilityFormData({ ...utilityFormData, providerId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedUtilities.map((provider) => (
                          <SelectItem key={provider.provider_id} value={provider.provider_id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{provider.provider_name}</span>
                              <Badge variant="outline" className="ml-2">
                                {provider.provider_type}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Account Number</Label>
                      <Input
                        value={utilityFormData.accountNumber}
                        onChange={(e) => setUtilityFormData({ ...utilityFormData, accountNumber: e.target.value })}
                        placeholder="Account #"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Billing Name</Label>
                      <Input
                        value={utilityFormData.billingName}
                        onChange={(e) => setUtilityFormData({ ...utilityFormData, billingName: e.target.value })}
                        placeholder="Name on account"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input
                        value={utilityFormData.username}
                        onChange={(e) => setUtilityFormData({ ...utilityFormData, username: e.target.value })}
                        placeholder="Login username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input
                        type="password"
                        value={utilityFormData.password}
                        onChange={(e) => setUtilityFormData({ ...utilityFormData, password: e.target.value })}
                        placeholder="Login password"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={utilityFormData.observations}
                      onChange={(e) => setUtilityFormData({ ...utilityFormData, observations: e.target.value })}
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowUtilityAssignDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAssignUtility} disabled={isAssigningUtility}>
                    {isAssigningUtility ? 'Assigning...' : 'Assign Provider'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Edit Assignment Dialog */}
          <Dialog open={showUtilityEditDialog} onOpenChange={setShowUtilityEditDialog}>
            <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Account Details</DialogTitle>
                <DialogDescription>
                  Update property-specific account information for {editingUtilityAssignment?.provider?.provider_name}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input
                      value={utilityFormData.accountNumber}
                      onChange={(e) => setUtilityFormData({ ...utilityFormData, accountNumber: e.target.value })}
                      placeholder="Account #"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Billing Name</Label>
                    <Input
                      value={utilityFormData.billingName}
                      onChange={(e) => setUtilityFormData({ ...utilityFormData, billingName: e.target.value })}
                      placeholder="Name on account"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      value={utilityFormData.username}
                      onChange={(e) => setUtilityFormData({ ...utilityFormData, username: e.target.value })}
                      placeholder="Login username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={utilityFormData.password}
                      onChange={(e) => setUtilityFormData({ ...utilityFormData, password: e.target.value })}
                      placeholder="Login password"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={utilityFormData.observations}
                    onChange={(e) => setUtilityFormData({ ...utilityFormData, observations: e.target.value })}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUtilityEditDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateUtilityAssignment} disabled={isUpdatingUtility}>
                  {isUpdatingUtility ? 'Updating...' : 'Update Details'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
                      <TableHead className="w-24">Actions</TableHead>
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
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditUtilityAssignment(assignment)}
                                  disabled={isUpdatingUtility}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" disabled={isUnassigningUtility}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Unassign Utility Provider</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Remove {assignment.provider.provider_name} from this property?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => unassignUtilityProvider(assignment.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Unassign
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
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
            <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
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

                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Service Provider *</Label>
                    <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedProviders.map((provider) => (
                          <SelectItem key={provider.provider_id} value={provider.provider_id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{provider.provider_name}</span>
                              <Badge variant="outline" className="ml-2">
                                {provider.provider_type}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="preferred"
                      checked={isPreferredForProperty}
                      onCheckedChange={(checked) => setIsPreferredForProperty(checked as boolean)}
                    />
                    <Label htmlFor="preferred" className="cursor-pointer">
                      Mark as preferred for this property
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={assignmentNotes}
                      onChange={(e) => setAssignmentNotes(e.target.value)}
                      placeholder="Add notes about this assignment..."
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAssignDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAssignProvider} disabled={isAssigning}>
                    {isAssigning ? 'Assigning...' : 'Assign Provider'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Edit Service Assignment Dialog */}
          <Dialog open={showServiceEditDialog} onOpenChange={setShowServiceEditDialog}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Service Assignment</DialogTitle>
                <DialogDescription>
                  Update assignment details for {editingServiceAssignment?.provider?.provider_name}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-preferred"
                    checked={isPreferredForProperty}
                    onCheckedChange={(checked) => setIsPreferredForProperty(checked as boolean)}
                  />
                  <Label htmlFor="edit-preferred" className="cursor-pointer">
                    Mark as preferred for this property
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={assignmentNotes}
                    onChange={(e) => setAssignmentNotes(e.target.value)}
                    placeholder="Add notes about this assignment..."
                    rows={4}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowServiceEditDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateServiceAssignment}>
                  Update Assignment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
                      <TableHead className="w-24">Actions</TableHead>
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
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditServiceAssignment(assignment)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" disabled={isUnassigning}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Unassign Contractor</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Remove {assignment.provider.provider_name} from this property?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => unassignProvider(assignment.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Unassign
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
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
    </div>
  );
}
