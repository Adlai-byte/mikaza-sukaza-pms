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
import { Edit, Trash2, Search, Download, Filter, Eye, MoreVertical, Star, Phone, Mail } from "lucide-react";
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

interface ServiceProviderTableProps {
  providers: Provider[];
  onEditProvider?: (provider: Provider) => void;
  onDeleteProvider?: (providerId: string) => void;
  onViewDetails: (provider: Provider) => void;
  isLoading?: boolean;
  isFetching?: boolean;
}

export function ServiceProviderTable({
  providers,
  onEditProvider,
  onDeleteProvider,
  onViewDetails,
  isLoading = false,
  isFetching = false,
}: ServiceProviderTableProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, statusFilter]);

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      'Cleaning': 'bg-blue-100 text-blue-800',
      'Plumbing': 'bg-cyan-100 text-cyan-800',
      'Electrical': 'bg-yellow-100 text-yellow-800',
      'HVAC': 'bg-orange-100 text-orange-800',
      'Landscaping': 'bg-green-100 text-green-800',
      'Pool Service': 'bg-teal-100 text-teal-800',
      'Pest Control': 'bg-red-100 text-red-800',
      'Handyman': 'bg-purple-100 text-purple-800',
      'Painting': 'bg-pink-100 text-pink-800',
      'Roofing': 'bg-gray-100 text-gray-800',
      'Carpentry': 'bg-amber-100 text-amber-800',
      'Appliance Repair': 'bg-indigo-100 text-indigo-800',
      'Locksmith': 'bg-slate-100 text-slate-800',
      'Security': 'bg-zinc-100 text-zinc-800',
      'Moving': 'bg-lime-100 text-lime-800',
      'Other': 'bg-neutral-100 text-neutral-800',
    };
    return colors[category] || colors['Other'];
  };

  // Show empty state if loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading service providers...</p>
        </div>
      </div>
    );
  }

  // Show empty state if no providers
  if (!isLoading && providers.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground">No service providers found</p>
        </div>
      </div>
    );
  }

  const filteredProviders = providers.filter(provider => {
    const matchesSearch =
      (provider.provider_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (provider.contact_person || '').toLowerCase().includes(search.toLowerCase()) ||
      (provider.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (provider.provider_type || '').toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === "all" || provider.provider_type === categoryFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && provider.is_active) ||
      (statusFilter === "inactive" && !provider.is_active) ||
      (statusFilter === "preferred" && provider.is_preferred);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredProviders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProviders = filteredProviders.slice(startIndex, endIndex);

  const exportToCSV = () => {
    const headers = [
      "Provider Name", "Contact Person", "Email", "Phone", "Category",
      "Rating", "Reviews", "Status", "Preferred", "City", "State"
    ];
    const csvContent = [
      headers.join(","),
      ...filteredProviders.map(provider => [
        `"${provider.provider_name}"`,
        `"${provider.contact_person || ''}"`,
        `"${provider.email || ''}"`,
        `"${provider.phone_primary || ''}"`,
        `"${provider.provider_type}"`,
        `"${provider.rating || 0}"`,
        `"${provider.total_reviews || 0}"`,
        `"${provider.is_active ? 'Active' : 'Inactive'}"`,
        `"${provider.is_preferred ? 'Yes' : 'No'}"`,
        `"${provider.address_city || ''}"`,
        `"${provider.address_state || ''}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `service_providers_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getServiceCategories = () => {
    const categories = [
      "Cleaning", "Plumbing", "Electrical", "HVAC", "Landscaping",
      "Pool Service", "Pest Control", "Handyman", "Painting", "Roofing",
      "Carpentry", "Appliance Repair", "Locksmith", "Security", "Moving", "Other"
    ];
    return categories;
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
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {getServiceCategories().map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
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
              <SelectItem value="preferred">Preferred</SelectItem>
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
              <TableHead>Contact</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProviders.map((provider) => (
              <TableRow key={provider.provider_id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="font-semibold">{provider.provider_name}</span>
                    {provider.is_preferred && (
                      <Badge className="w-fit mt-1 bg-purple-100 text-purple-800">
                        <Star className="h-3 w-3 mr-1" />
                        Preferred
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col space-y-1">
                    {provider.contact_person && (
                      <span className="text-sm">{provider.contact_person}</span>
                    )}
                    {provider.phone_primary && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Phone className="h-3 w-3 mr-1" />
                        {provider.phone_primary}
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
                  <Badge className={getCategoryBadge(provider.provider_type)}>
                    {provider.provider_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-500 mr-1" />
                    <span className="font-medium">
                      {provider.rating ? provider.rating.toFixed(2) : 'N/A'}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({provider.total_reviews || 0})
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={provider.is_active ? 'default' : 'destructive'}>
                    {provider.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {provider.address_city && provider.address_state
                    ? `${provider.address_city}, ${provider.address_state}`
                    : provider.address_city || provider.address_state || 'N/A'}
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
                                <AlertDialogTitle>Delete Service Provider</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {provider.provider_name}?
                                  This action cannot be undone and will also delete all associated documents and reviews.
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
                    {provider.contact_person && (
                      <p className="text-sm text-muted-foreground">{provider.contact_person}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {provider.is_preferred && (
                      <Badge className="bg-purple-100 text-purple-800">
                        <Star className="h-3 w-3" />
                      </Badge>
                    )}
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
                  {provider.email && (
                    <div className="flex items-center text-sm">
                      <Mail className="h-3 w-3 mr-2 text-muted-foreground" />
                      {provider.email}
                    </div>
                  )}
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={getCategoryBadge(provider.provider_type)}>
                    {provider.provider_type}
                  </Badge>
                  <Badge variant={provider.is_active ? 'default' : 'destructive'}>
                    {provider.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <div className="flex items-center">
                    <Star className="h-3 w-3 text-yellow-500 mr-1" />
                    <span className="text-sm font-medium">
                      {provider.rating ? provider.rating.toFixed(2) : 'N/A'}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({provider.total_reviews || 0})
                    </span>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {provider.address_city && provider.address_state
                      ? `${provider.address_city}, ${provider.address_state}`
                      : provider.address_city || provider.address_state || 'Location: N/A'}
                  </span>
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
