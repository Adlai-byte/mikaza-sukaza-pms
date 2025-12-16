import { useState, useMemo, useCallback, useEffect } from "react";
import { Property } from "@/lib/schemas";
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
import { Edit, Trash2, Search, Eye, Download, Filter, Home, Images, Camera, ChevronLeft, ChevronRight, QrCode, ChevronDown, ChevronUp, Layers } from "lucide-react";
import { PropertyTableLoadingState, LoadingOverlay, InlineLoadingSpinner } from "./PropertyTableSkeleton";
import { useNavigate } from "react-router-dom";
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
import { ImageViewer } from "@/components/ui/image-viewer";
import { CanAccess } from "@/components/rbac/CanAccess";
import { PERMISSIONS } from "@/lib/rbac/permissions";

interface PropertyTableOptimizedProps {
  properties: Property[];
  onEditProperty: (property: Property) => void;
  onDeleteProperty: (propertyId: string) => void;
  onViewDetails: (property: Property) => void;
  onViewImages: (property: Property) => void;
  onViewQRCodes: (property: Property) => void;
  isLoading?: boolean;
  isFetching?: boolean;
}

// Pagination constants
const ITEMS_PER_PAGE = 50;

// Memoized table row component for performance
const PropertyTableRow = ({
  property,
  onEditProperty,
  onDeleteProperty,
  onViewDetails,
  onViewImages,
  onViewQRCodes,
  onImageClick,
  isExpanded,
  onToggleExpand
}: {
  property: Property;
  onEditProperty: (property: Property) => void;
  onDeleteProperty: (propertyId: string) => void;
  onViewDetails: (property: Property) => void;
  onViewImages: (property: Property) => void;
  onViewQRCodes: (property: Property) => void;
  onImageClick: (image: { url: string; title?: string }) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) => {
  const navigate = useNavigate();
  const primaryImage = property.images?.find(img => img.is_primary) || property.images?.[0];
  const hasUnits = property.units && property.units.length > 0;

  return (
    <>
      <TableRow className={`h-20 ${hasUnits ? 'cursor-pointer hover:bg-muted/50' : ''} ${isExpanded ? 'bg-purple-50' : ''}`}>
        <TableCell>
          <div className="flex items-center gap-2">
            {hasUnits && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
                aria-label={isExpanded ? 'Collapse units' : 'Expand units'}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-purple-600" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-600" />
                )}
              </button>
            )}
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              {primaryImage ? (
                <img
                  src={primaryImage.image_url}
                  alt={property.property_type}
                  className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageClick({ url: primaryImage.image_url, title: property.property_type });
                  }}
                  loading="lazy"
                />
              ) : (
                <Camera className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="font-medium">
          <div className="flex items-center space-x-3">
            <Home className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{property.property_name || property.property_type}</p>
                {hasUnits && (
                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                    <Layers className="h-3 w-3 mr-1" />
                    {property.units!.length} units
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{property.property_type}</p>
              <p className="text-xs text-muted-foreground">
                {property.num_bedrooms || 0} bed, {property.num_bathrooms || 0} bath
              </p>
            </div>
          </div>
        </TableCell>
      <TableCell>
        <div>
          <p className="font-medium">
            {property.owner?.first_name} {property.owner?.last_name}
          </p>
          <p className="text-sm text-muted-foreground">{property.owner?.email}</p>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium">{property.location?.city || 'N/A'}</p>
          <p className="text-sm text-muted-foreground">
            {property.location?.address || 'No address'}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <Badge variant={property.is_active ? 'default' : 'destructive'}>
            {property.is_active ? 'Active' : 'Inactive'}
          </Badge>
          {property.is_booking && (
            <Badge variant="secondary">Booking Available</Badge>
          )}
          {property.is_pets_allowed && (
            <Badge variant="outline">Pet Friendly</Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          <p>Capacity: {property.capacity || 0}/{property.max_capacity || 0}</p>
          <p>Size: {property.size_sqf || 0} sqf</p>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetails(property)}
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewImages(property)}
            title="View Images"
          >
            <Images className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewQRCodes(property)}
            title="View QR Codes"
          >
            <QrCode className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/properties/${property.property_id}/view`)}
            title="View/Edit Property"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <CanAccess permission={PERMISSIONS.PROPERTIES_DELETE}>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" title="Delete Property">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Property</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this {property.property_type} property?
                    This action cannot be undone and will also delete all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDeleteProperty(property.property_id!)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CanAccess>
        </div>
      </TableCell>
    </TableRow>

      {/* Unit Rows */}
      {isExpanded && hasUnits && property.units!.map((unit, index) => (
        <TableRow
          key={unit.unit_id || index}
          className={`h-14 bg-gradient-to-r from-purple-50 to-white ${index === property.units!.length - 1 ? 'border-b-2 border-b-purple-200' : ''}`}
        >
          <TableCell>
            <div className="flex items-center gap-2 pl-8">
              <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center">
                <Layers className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </TableCell>
          <TableCell>
            <div className="pl-8">
              <p className="font-medium text-purple-800">{unit.property_name || `Unit ${index + 1}`}</p>
              <p className="text-xs text-purple-600">
                {(unit.num_bedrooms !== null && unit.num_bedrooms !== undefined) && `${unit.num_bedrooms} bed`}
                {(unit.num_bathrooms !== null && unit.num_bathrooms !== undefined) && `, ${unit.num_bathrooms} bath`}
                {unit.license_number && ` • License: ${unit.license_number}`}
                {unit.folio && ` • Folio: ${unit.folio}`}
              </p>
            </div>
          </TableCell>
          <TableCell>
            <div className="text-sm">
              {unit.owner ? (
                <>
                  <p className="font-medium text-purple-700">{unit.owner.first_name} {unit.owner.last_name}</p>
                  <p className="text-xs text-purple-500">{unit.owner.email}</p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground italic">Inherits from property</p>
              )}
            </div>
          </TableCell>
          <TableCell colSpan={4}>
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
              Unit of {property.property_name || property.property_type}
            </Badge>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};

export function PropertyTableOptimized({
  properties,
  onEditProperty,
  onDeleteProperty,
  onViewDetails,
  onViewImages,
  onViewQRCodes,
  isLoading = false,
  isFetching = false,
}: PropertyTableOptimizedProps) {
  const navigate = useNavigate();
  console.log('🏠 PropertyTableOptimized render - properties:', properties.length);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [bedroomsFilter, setBedroomsFilter] = useState<string>("all");
  const [selectedImage, setSelectedImage] = useState<{ url: string; title?: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());

  const togglePropertyExpansion = useCallback((propertyId: string) => {
    setExpandedProperties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(propertyId)) {
        newSet.delete(propertyId);
      } else {
        newSet.add(propertyId);
      }
      return newSet;
    });
  }, []);

  // Memoize filtered properties to avoid unnecessary recalculations
  const filteredProperties = useMemo(() => {
    return properties.filter(property => {
      const matchesSearch =
        property.property_name?.toLowerCase().includes(search.toLowerCase()) ||
        property.property_type.toLowerCase().includes(search.toLowerCase()) ||
        property.owner?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        property.owner?.last_name?.toLowerCase().includes(search.toLowerCase()) ||
        property.location?.city?.toLowerCase().includes(search.toLowerCase()) ||
        property.location?.address?.toLowerCase().includes(search.toLowerCase());

      const matchesType = typeFilter === "all" || property.property_type === typeFilter;
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" && property.is_active) ||
        (statusFilter === "inactive" && !property.is_active) ||
        (statusFilter === "booking" && property.is_booking);

      const matchesCity = cityFilter === "all" || property.location?.city === cityFilter;
      const matchesBedrooms = bedroomsFilter === "all" ||
        (bedroomsFilter === "studio" && (property.num_bedrooms === 0 || !property.num_bedrooms)) ||
        (bedroomsFilter === "1" && property.num_bedrooms === 1) ||
        (bedroomsFilter === "2" && property.num_bedrooms === 2) ||
        (bedroomsFilter === "3" && property.num_bedrooms === 3) ||
        (bedroomsFilter === "4+" && property.num_bedrooms && property.num_bedrooms >= 4);

      return matchesSearch && matchesType && matchesStatus && matchesCity && matchesBedrooms;
    });
  }, [properties, search, typeFilter, statusFilter, cityFilter, bedroomsFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredProperties.length / ITEMS_PER_PAGE);
  const paginatedProperties = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProperties.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProperties, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, statusFilter, cityFilter, bedroomsFilter]);

  // Memoize unique values for filters
  const { uniquePropertyTypes, uniqueCities } = useMemo(() => ({
    uniquePropertyTypes: Array.from(new Set(properties.map(p => p.property_type))),
    uniqueCities: Array.from(new Set(properties.map(p => p.location?.city).filter(Boolean))),
  }), [properties]);

  const exportToCSV = useCallback(() => {
    const headers = ["Property Type", "Owner", "Location", "Status", "Bedrooms", "Bathrooms", "Capacity", "Size (sqf)"];
    const csvContent = [
      headers.join(","),
      ...filteredProperties.map(property => [
        `"${property.property_type}"`,
        `"${property.owner?.first_name} ${property.owner?.last_name}"`,
        `"${property.location?.address || ''}, ${property.location?.city || ''}"`,
        `"${property.is_active ? 'Active' : 'Inactive'}"`,
        `"${property.num_bedrooms || 0}"`,
        `"${property.num_bathrooms || 0}"`,
        `"${property.capacity || 0}"`,
        `"${property.size_sqf || 0}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `properties_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredProperties]);

  const handleImageClick = useCallback((image: { url: string; title?: string }) => {
    setSelectedImage(image);
  }, []);

  // Show full loading skeleton on initial load
  if (isLoading) {
    return <PropertyTableLoadingState />;
  }

  // Show empty state if no properties
  if (!isLoading && properties.length === 0) {
    return <InlineLoadingSpinner message="No properties found" />;
  }

  return (
    <div className="space-y-4 relative">
      {/* Loading overlay for background fetching */}
      <LoadingOverlay isVisible={isFetching && !isLoading} />
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Property Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniquePropertyTypes.map(type => (
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
              <SelectItem value="booking">Booking</SelectItem>
            </SelectContent>
          </Select>

          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {uniqueCities.map(city => (
                <SelectItem key={city} value={city!}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={bedroomsFilter} onValueChange={setBedroomsFilter}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Bedrooms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Beds</SelectItem>
              <SelectItem value="studio">Studio</SelectItem>
              <SelectItem value="1">1 Bed</SelectItem>
              <SelectItem value="2">2 Beds</SelectItem>
              <SelectItem value="3">3 Beds</SelectItem>
              <SelectItem value="4+">4+ Beds</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Results info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredProperties.length)} of {filteredProperties.length} properties
        </span>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <span className="px-2">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Desktop Table View with Pagination */}
      <div className="hidden lg:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Photo</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProperties.map((property) => (
              <PropertyTableRow
                key={property.property_id}
                property={property}
                onEditProperty={onEditProperty}
                onDeleteProperty={onDeleteProperty}
                onViewDetails={onViewDetails}
                onViewImages={onViewImages}
                onViewQRCodes={onViewQRCodes}
                onImageClick={handleImageClick}
                isExpanded={expandedProperties.has(property.property_id!)}
                onToggleExpand={() => togglePropertyExpansion(property.property_id!)}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View with Pagination */}
      <div className="lg:hidden space-y-4">
        {paginatedProperties.map((property) => {
          const primaryImage = property.images?.find(img => img.is_primary) || property.images?.[0];

          return (
            <Card key={property.property_id} className="w-full">
              <CardContent className="p-4">
                <div className="flex space-x-4">
                  {/* Property Image */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                    {primaryImage ? (
                      <img
                        src={primaryImage.image_url}
                        alt={property.property_type}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleImageClick({ url: primaryImage.image_url, title: property.property_type })}
                        loading="lazy"
                      />
                    ) : (
                      <Camera className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  {/* Property Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">
                          {property.property_name || property.property_type}
                        </h3>
                        <p className="text-sm text-muted-foreground">{property.property_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {property.num_bedrooms || 0} bed, {property.num_bathrooms || 0} bath
                        </p>
                      </div>

                      {/* Status Badges */}
                      <div className="flex flex-col space-y-1 items-end">
                        <Badge variant={property.is_active ? 'default' : 'destructive'} className="text-xs">
                          {property.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {property.is_booking && (
                          <Badge variant="secondary" className="text-xs">Booking</Badge>
                        )}
                      </div>
                    </div>

                    {/* Owner & Location */}
                    <div className="mt-3 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">Owner:</span> {property.owner?.first_name} {property.owner?.last_name}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Location:</span> {property.location?.city || 'N/A'}
                        {property.location?.address && (
                          <span className="text-muted-foreground block text-xs truncate">
                            {property.location.address}
                          </span>
                        )}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Capacity:</span> {property.capacity || 0}/{property.max_capacity || 0} •
                        <span className="font-medium"> Size:</span> {property.size_sqf || 0} sqf
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDetails(property)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewImages(property)}
                          className="h-8 w-8 p-0"
                        >
                          <Images className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewQRCodes(property)}
                          className="h-8 w-8 p-0"
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/properties/${property.property_id}/view`)}
                          className="h-8 w-8 p-0"
                          title="View/Edit Property"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>

                      <CanAccess permission={PERMISSIONS.PROPERTIES_DELETE}>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-sm mx-4">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Property</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this {property.property_type} property?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDeleteProperty(property.property_id!)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </CanAccess>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ImageViewer
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
        imageUrl={selectedImage?.url || ""}
        title={selectedImage?.title}
      />
    </div>
  );
}