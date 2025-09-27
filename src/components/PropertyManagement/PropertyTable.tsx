import { useState } from "react";
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
import { Edit, Trash2, Search, Eye, Download, Filter, Home, Images, Camera } from "lucide-react";
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

interface PropertyTableProps {
  properties: Property[];
  onEditProperty: (property: Property) => void;
  onDeleteProperty: (propertyId: string) => void;
  onViewDetails: (property: Property) => void;
  onViewImages: (property: Property) => void;
}

export function PropertyTable({
  properties,
  onEditProperty,
  onDeleteProperty,
  onViewDetails,
  onViewImages,
}: PropertyTableProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [bedroomsFilter, setBedroomsFilter] = useState<string>("all");
  const [selectedImage, setSelectedImage] = useState<{ url: string; title?: string } | null>(null);

  const filteredProperties = properties.filter(property => {
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

  const exportToCSV = () => {
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
  };

  const uniquePropertyTypes = Array.from(new Set(properties.map(p => p.property_type)));
  const uniqueCities = Array.from(new Set(properties.map(p => p.location?.city).filter(Boolean)));

  return (
    <div className="space-y-4">
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

      {/* Desktop Table View */}
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
            {filteredProperties.map((property) => {
              const primaryImage = property.images?.find(img => img.is_primary) || property.images?.[0];
              
              return (
              <TableRow key={property.property_id}>
                <TableCell>
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                    {primaryImage ? (
                      <img
                        src={primaryImage.image_url}
                        alt={property.property_type}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedImage({ url: primaryImage.image_url, title: property.property_type })}
                      />
                    ) : (
                      <Camera className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center space-x-3">
                    <Home className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{property.property_name || property.property_type}</p>
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
                      onClick={() => onEditProperty(property)}
                      title="Edit Property"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
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
                  </div>
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {filteredProperties.map((property) => {
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
                        onClick={() => setSelectedImage({ url: primaryImage.image_url, title: property.property_type })}
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
                          onClick={() => onEditProperty(property)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                      
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