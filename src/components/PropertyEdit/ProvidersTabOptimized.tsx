import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { usePropertyProviders } from '@/hooks/usePropertyEditTabs';
import { ProvidersTabSkeleton, TabLoadingSpinner } from './PropertyEditSkeleton';

interface Provider {
  provider_id: string;
  property_id: string;
  provider_name: string;
  provider_type: string;
  phone_number?: string;
  account_number?: string;
  billing_name?: string;
  website?: string;
  username?: string;
  password?: string;
  observations?: string;
  created_at?: string;
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
  const {
    providers,
    isLoading,
    isFetching,
    createProvider,
    updateProvider,
    deleteProvider,
    isCreating,
    isUpdating,
    isDeleting,
  } = usePropertyProviders(propertyId as string);

  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

  const emptyProvider: Omit<Provider, 'provider_id' | 'property_id' | 'created_at'> = {
    provider_name: '',
    provider_type: 'Other',
    phone_number: '',
    account_number: '',
    billing_name: '',
    website: '',
    username: '',
    password: '',
    observations: '',
  };

  const [formData, setFormData] = useState(emptyProvider);

  // Show loading skeleton on initial load
  if (isLoading) {
    return <ProvidersTabSkeleton />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.provider_name.trim()) {
      console.error('Provider name is required');
      return;
    }

    if (!formData.provider_type) {
      console.error('Provider type is required');
      return;
    }

    // Clean up the form data - convert empty strings to null for optional fields
    const cleanedData = {
      ...formData,
      phone_number: formData.phone_number?.trim() || null,
      account_number: formData.account_number?.trim() || null,
      billing_name: formData.billing_name?.trim() || null,
      website: formData.website?.trim() || null,
      username: formData.username?.trim() || null,
      password: formData.password?.trim() || null,
      observations: formData.observations?.trim() || null,
    };

    console.log('Submitting provider data:', cleanedData);

    if (editingProvider) {
      console.log('🛠️ [ProvidersTab] calling updateProvider.mutate');
      updateProvider({ providerId: editingProvider.provider_id, updates: cleanedData } as { providerId: string; updates: Partial<Provider> });
    } else {
      console.log('🛠️ [ProvidersTab] calling createProvider.mutate');
      createProvider(cleanedData as Omit<Provider, 'provider_id' | 'created_at'>);
    }
    // Form will close automatically on successful mutation via the hook's onSuccess callback
  };

  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider);
    setFormData({
      provider_name: provider.provider_name,
      provider_type: provider.provider_type,
      phone_number: provider.phone_number || '',
      account_number: provider.account_number || '',
      billing_name: provider.billing_name || '',
      website: provider.website || '',
      username: provider.username || '',
      password: provider.password || '',
      observations: provider.observations || '',
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingProvider(null);
    setFormData(emptyProvider);
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

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-medium mb-2">No Providers Added</h3>
      <p className="text-muted-foreground mb-6">
        Add service providers for this property to keep track of utilities, maintenance, and services.
      </p>
      <Button onClick={() => setShowForm(true)} className="bg-primary hover:bg-primary/90">
        <Plus className="mr-2 h-4 w-4" />
        Add First Provider
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 relative">
      {/* Loading overlay for background fetching */}
      {isFetching && !isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-md">
          <TabLoadingSpinner message="Updating providers..." />
        </div>
      )}

      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Service Providers</h2>
          <p className="text-muted-foreground">
            Manage utility companies, service providers, and maintenance contacts
          </p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button
              className="bg-primary hover:bg-primary/90 shadow-lg"
              disabled={isCreating}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingProvider ? 'Edit Provider' : 'Add New Provider'}
                </DialogTitle>
                <DialogDescription>
                  {editingProvider
                    ? 'Update the provider information below.'
                    : 'Add a new service provider for this property.'
                  }
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider_name">Provider Name *</Label>
                    <Input
                      id="provider_name"
                      value={formData.provider_name}
                      onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                      placeholder="e.g., FPL, Comcast"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provider_type">Service Type *</Label>
                    <select
                      id="provider_type"
                      value={formData.provider_type}
                      onChange={(e) => setFormData({ ...formData, provider_type: e.target.value })}
                      className="w-full h-10 px-3 py-2 text-sm border border-input bg-background rounded-md"
                      required
                    >
                      {providerTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input
                      id="phone_number"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_number">Account Number</Label>
                    <Input
                      id="account_number"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      placeholder="Account #"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="billing_name">Billing Name</Label>
                    <Input
                      id="billing_name"
                      value={formData.billing_name}
                      onChange={(e) => setFormData({ ...formData, billing_name: e.target.value })}
                      placeholder="Name on account"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Login username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Login password"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observations">Notes</Label>
                  <Textarea
                    id="observations"
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    placeholder="Additional notes or observations..."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseForm}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isCreating || isUpdating ? 'Saving...' : (editingProvider ? 'Update' : 'Create')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Conditional content based on providers */}
      {providers.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {/* Enhanced Provider Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((provider) => {
              const Icon = getProviderIcon(provider.provider_type);
              const colorClass = getProviderColor(provider.provider_type);

              return (
                <Card key={provider.provider_id} className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${colorClass} text-white`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{provider.provider_name}</CardTitle>
                          <Badge variant="secondary" className="mt-1">
                            {provider.provider_type}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(provider)}
                          disabled={isUpdating}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isDeleting}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Provider</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {provider.provider_name}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteProvider(provider.provider_id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {provider.phone_number && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{provider.phone_number}</span>
                      </div>
                    )}
                    {provider.account_number && (
                      <div className="flex items-center space-x-2 text-sm">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span>Account: {provider.account_number}</span>
                      </div>
                    )}
                    {provider.billing_name && (
                      <div className="flex items-center space-x-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{provider.billing_name}</span>
                      </div>
                    )}
                    {provider.website && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={provider.website.startsWith('http') ? provider.website : `https://${provider.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Visit Website
                        </a>
                      </div>
                    )}
                    {provider.observations && (
                      <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                        {provider.observations}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Summary Stats */}
          <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Providers</p>
                  <p className="text-2xl font-bold text-primary">{providers.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {providers.filter(p => p.provider_type === 'Electric').length > 0 && '⚡ '}
                    {providers.filter(p => p.provider_type === 'Internet').length > 0 && '📡 '}
                    {providers.filter(p => p.provider_type === 'Water').length > 0 && '💧 '}
                    {providers.filter(p => p.provider_type === 'Gas').length > 0 && '🔥 '}
                  </p>
                  <p className="text-sm font-medium">Services Configured</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}