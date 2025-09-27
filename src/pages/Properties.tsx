import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Plus, 
  MapPin, 
  Home, 
  Eye, 
  Edit, 
  Calendar,
  DollarSign,
  Users
} from "lucide-react";

const properties = [
  {
    id: "10334",
    name: "Jade Signature 901",
    address: "16901 Collins Avenue, Sunny Isles Beach, Florida - 33160",
    owner: "Adriana de Bortoli",
    company: "Casa & Concierge",
    status: "Active",
    units: 1,
    occupancy: "Occupied",
    revenue: "$4,500/mo",
    image: null,
  },
  {
    id: "10329",
    name: "Aria unit 311",
    address: "488 Northeast 18th Street unit 311, Miami, Florida - 33132",
    owner: "Alessandro Marques da Silva",
    company: "Casa & Concierge",
    status: "Active",
    units: 1,
    occupancy: "Vacant",
    revenue: "$3,200/mo",
    image: null,
  },
  {
    id: "5",
    name: "RTL - Trump Tower III #2602",
    address: "15811 Collins Avenue #2602, Sunny Isles Beach, Florida - 33160",
    owner: "Alexandre Melhado",
    company: "Casa & Concierge",
    status: "Active",
    units: 1,
    occupancy: "Occupied",
    revenue: "$5,800/mo",
    image: "/api/placeholder/200/150",
  },
  {
    id: "10322",
    name: "Marina Palms #1001",
    address: "17111 Biscayne Boulevard Unit 1001, North Miami Beach, Florida - 33160",
    owner: "Ana Maria /Eliezer Schnitman",
    company: "Casa & Concierge",
    status: "Active",
    units: 1,
    occupancy: "Check-out Pending",
    revenue: "$4,100/mo",
    image: null,
  },
];

export default function Properties() {
  const [searchTerm, setSearchTerm] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");

  const filteredProperties = properties.filter(
    (property) =>
      property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.owner.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getOccupancyBadge = (occupancy: string) => {
    switch (occupancy) {
      case "Occupied":
        return <Badge className="bg-accent text-accent-foreground">Occupied</Badge>;
      case "Vacant":
        return <Badge variant="outline" className="border-orange-500 text-orange-500">Vacant</Badge>;
      case "Check-out Pending":
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Check-out Pending</Badge>;
      default:
        return <Badge variant="secondary">{occupancy}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Properties</h1>
          <p className="text-muted-foreground">
            Manage your property portfolio and units
          </p>
        </div>
        <Button className="bg-gradient-primary hover:bg-gradient-secondary">
          <Plus className="h-4 w-4 mr-2" />
          Register New Property
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Find a Property</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Property Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter property name or address"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Property Owner</label>
              <Input
                placeholder="Enter the owner's name"
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
              />
            </div>
            <div className="flex items-end space-x-2">
              <Button className="bg-primary hover:bg-primary-hover">Search</Button>
              <Button className="bg-accent hover:bg-accent-hover">Register New Unit</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Properties List */}
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Showing records 1 to {filteredProperties.length} of {properties.length}
        </div>

        {filteredProperties.map((property) => (
          <Card key={property.id} className="hover:shadow-card transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                {/* Property Image */}
                <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                  {property.image ? (
                    <img 
                      src={property.image} 
                      alt={property.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-center">
                      <Home className="h-6 w-6 text-muted-foreground mx-auto" />
                      <span className="text-xs text-muted-foreground block mt-1">
                        No picture found for this property
                      </span>
                    </div>
                  )}
                </div>

                {/* Property Details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {property.owner}
                      </h3>
                      <p className="text-sm text-primary font-medium mb-1">
                        Property {property.id} - {property.name}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        Address: {property.address}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {getOccupancyBadge(property.occupancy)}
                      <Badge variant="outline">{property.status}</Badge>
                    </div>
                  </div>

                  {/* Property Stats */}
                  <div className="flex items-center space-x-6 mt-3 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Home className="h-4 w-4 mr-1" />
                      {property.units} Unit{property.units !== 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      {property.revenue}
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {property.company}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 mt-4">
                    <Button size="sm" className="bg-blue-500 hover:bg-blue-600">
                      Booking
                    </Button>
                    <Button size="sm" variant="secondary">
                      Check Lists
                    </Button>
                    <Button size="sm" variant="secondary">
                      Property Info
                    </Button>
                    <Button size="sm" variant="secondary">
                      Financial Entries
                    </Button>
                    <Button size="sm" variant="destructive">
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}