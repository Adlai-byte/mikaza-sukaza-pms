import { useState, useEffect } from "react";
import { Provider } from "@/lib/schemas";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, Trash2, Search, Download, Filter, Eye, MoreVertical, Phone, Mail, Globe, Zap } from "lucide-react";
import { LoadingOverlay } from "../PropertyManagement/PropertyTableSkeleton";
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
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UtilityProviderTableProps {
  providers: Provider[];
  onEditProvider?: (provider: Provider) => void;
  onDeleteProvider?: (providerId: string) => void;
  onViewDetails: (provider: Provider) => void;
  isLoading?: boolean;
  isFetching?: boolean;
}

export function UtilityProviderTable({
  providers,
  onEditProvider,
  onDeleteProvider,
  onViewDetails,
  isLoading = false,
  isFetching = false,
}: UtilityProviderTableProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, statusFilter]);

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'Electric': 'bg-yellow-100 text-yellow-800',
      'Internet': 'bg-blue-100 text-blue-800',
      'Gas': 'bg-orange-100 text-orange-800',
      'Water': 'bg-cyan-100 text-cyan-800',
      'Cable': 'bg-purple-100 text-purple-800',
      'Trash': 'bg-gray-100 text-gray-800',
      'Sewer': 'bg-teal-100 text-teal-800',
      'Phone': 'bg-green-100 text-green-800',
      'Security': 'bg-red-100 text-red-800',
      'HOA': 'bg-indigo-100 text-indigo-800',
      'Other': 'bg-neutral-100 text-neutral-800',
    };
    return colors[type] || colors['Other'];
  };

  // Show empty state if loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading utility providers...</p>
        </div>
      </div>
    );
  }

  // Show empty state if no providers
  if (!isLoading && providers.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">No utility providers found</p>
          <p className="text-sm text-muted-foreground">Create your first utility provider to get started</p>
        </div>
      </div>
    );
  }

  const filteredProviders = providers.filter(provider => {
    const matchesSearch =
      (provider.provider_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (provider.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (provider.provider_type || '').toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === "all" || provider.provider_type === typeFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && provider.is_active) ||
      (statusFilter === "inactive" && !provider.is_active);

    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredProviders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProviders = filteredProviders.slice(startIndex, endIndex);

  const exportToCSV = () => {
    const headers = [
      "Provider Name", "Type", "Email", "Phone", "Website",
      "Customer Service Hours", "Emergency Phone", "Status"
    ];
    const csvContent = [
      headers.join(","),
      ...filteredProviders.map(provider => [
        `"${provider.provider_name}"`,
        `"${provider.provider_type}"`,
        `"${provider.email || ''}"`,
        `"${provider.phone_primary || ''}"`,
        `"${provider.website || ''}"`,
        `"${provider.customer_service_hours || ''}"`,
        `"${provider.emergency_phone || ''}"`,
        `"${provider.is_active ? 'Active' : 'Inactive'}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `utility_providers_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getUtilityTypes = () => {
    const types = [
      "Electric", "Internet", "Gas", "Water", "Cable", "Trash",
      "Sewer", "Phone", "Security", "HOA", "Other"
    ];
    return types;
  };

  return (
    <div className="space-y-4 relative">
      {/* Loading overlay for background fetching */}
      <LoadingOverlay isVisible={isFetching && !isLoading} />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search providers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {getUtilityTypes().map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Service Hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProviders.map((provider) => (
              <TableRow key={provider.provider_id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="font-semibold">{provider.provider_name}</span>
                    {provider.website && (
                      <a
                        href={provider.website.startsWith('http') ? provider.website : `https://${provider.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center mt-1"
                      >
                        <Globe className="h-3 w-3 mr-1" />
                        Website
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getTypeBadge(provider.provider_type)}>
                    {provider.provider_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col space-y-1">
                    {provider.phone_primary && (
                      <div className="flex items-center text-sm">
                        <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                        {provider.phone_primary}
                      </div>
                    )}
                    {provider.emergency_phone && (
                      <div className="flex items-center text-xs text-red-600">
                        <Phone className="h-3 w-3 mr-1" />
                        Emergency: {provider.emergency_phone}
                      </div>
                    )}
                    {provider.email && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Mail className="h-3 w-3 mr-1" />
                        {provider.email}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{provider.customer_service_hours || 'N/A'}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={provider.is_active ? 'default' : 'destructive'}>
                    {provider.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      <DropdownMenuItem onClick={() => onViewDetails(provider)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>

                      {onEditProvider && (
                        <DropdownMenuItem onClick={() => onEditProvider(provider)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Provider
                        </DropdownMenuItem>
                      )}

                      {onDeleteProvider && (
                        <>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Provider
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Utility Provider</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {provider.provider_name}?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => provider.provider_id && onDeleteProvider(provider.provider_id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {paginatedProviders.map((provider) => (
          <Card key={provider.provider_id} className="w-full">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-base">{provider.provider_name}</h3>
                    <Badge className={`${getTypeBadge(provider.provider_type)} mt-1 w-fit`}>
                      {provider.provider_type}
                    </Badge>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-1">
                  {provider.phone_primary && (
                    <div className="flex items-center text-sm">
                      <Phone className="h-3 w-3 mr-2 text-muted-foreground" />
                      {provider.phone_primary}
                    </div>
                  )}
                  {provider.emergency_phone && (
                    <div className="flex items-center text-sm text-red-600">
                      <Phone className="h-3 w-3 mr-2" />
                      Emergency: {provider.emergency_phone}
                    </div>
                  )}
                  {provider.email && (
                    <div className="flex items-center text-sm">
                      <Mail className="h-3 w-3 mr-2 text-muted-foreground" />
                      {provider.email}
                    </div>
                  )}
                  {provider.website && (
                    <a
                      href={provider.website.startsWith('http') ? provider.website : `https://${provider.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-sm text-primary hover:underline"
                    >
                      <Globe className="h-3 w-3 mr-2" />
                      Website
                    </a>
                  )}
                </div>

                {/* Service Hours */}
                {provider.customer_service_hours && (
                  <div className="text-sm text-muted-foreground">
                    Hours: {provider.customer_service_hours}
                  </div>
                )}

                {/* Status */}
                <div className="flex items-center gap-2">
                  <Badge variant={provider.is_active ? 'default' : 'destructive'}>
                    {provider.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(provider)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>

                  <div className="flex gap-2">
                    {onEditProvider && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditProvider(provider)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}

                    {onDeleteProvider && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-sm mx-4">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Provider</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {provider.provider_name}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => provider.provider_id && onDeleteProvider(provider.provider_id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination Controls */}
      {filteredProviders.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Showing {startIndex + 1} to {Math.min(endIndex, filteredProviders.length)} of {filteredProviders.length} providers
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
