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
  const [selectedImage, setSelectedImage] = useState<{ url: string; title?: string } | null>(null);

  const filteredProperties = properties.filter(property => {
    const matchesSearch = 
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
    
    return matchesSearch && matchesType && matchesStatus;
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
        
        <div className="flex gap-2">
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

          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Photo</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Actions</TableHead>
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
                      <p className="font-medium">{property.property_type}</p>
                      <p className="text-sm text-muted-foreground">
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
      
      <ImageViewer
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
        imageUrl={selectedImage?.url || ""}
        title={selectedImage?.title}
      />
    </div>
  );
}