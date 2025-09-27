import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { propertySchema, Property, PropertyInsert, User, Amenity, Rule } from "@/lib/schemas";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { useUsers } from "@/hooks/useUsers";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Combobox } from "@/components/ui/combobox";
import { Upload, X, Loader2, Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface PropertyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: Property | null;
  onSubmit: (data: PropertyInsert & any) => Promise<void>;
  amenities: Amenity[];
  rules: Rule[];
}

const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "condo", label: "Condominium" },
  { value: "townhouse", label: "Townhouse" },
  { value: "studio", label: "Studio" },
  { value: "loft", label: "Loft" },
  { value: "villa", label: "Villa" },
  { value: "duplex", label: "Duplex" },
  { value: "penthouse", label: "Penthouse" },
  { value: "cabin", label: "Cabin" },
  { value: "cottage", label: "Cottage" },
  { value: "farmhouse", label: "Farmhouse" },
  { value: "mansion", label: "Mansion" },
  { value: "mobile_home", label: "Mobile Home" },
  { value: "tiny_house", label: "Tiny House" },
];

export function PropertyForm({ open, onOpenChange, property, onSubmit, amenities, rules }: PropertyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<{ url: string; title?: string; is_primary?: boolean; file?: File }[]>([]);
  const [units, setUnits] = useState<{ property_name?: string; license_number?: string; folio?: string }[]>([]);
  const { users } = useUsers();
  const { logActivity } = useActivityLogs();
  const { toast } = useToast();
  
  const form = useForm<PropertyInsert>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      owner_id: "",
      is_active: true,
      is_booking: false,
      is_pets_allowed: false,
      property_type: "",
      size_sqf: undefined,
      capacity: undefined,
      max_capacity: undefined,
      num_bedrooms: undefined,
      num_bathrooms: undefined,
      num_half_bath: undefined,
      num_wcs: undefined,
      num_kitchens: undefined,
      num_living_rooms: undefined,
    },
  });

  // Additional form states for related data
  const [locationData, setLocationData] = useState({
    address: "",
    city: "",
    state: "",
    postal_code: "",
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  });

  const [communicationData, setCommunicationData] = useState({
    phone_number: "",
    wifi_name: "",
    wifi_password: "",
  });

  const [accessData, setAccessData] = useState({
    gate_code: "",
    door_lock_password: "",
    alarm_passcode: "",
  });

  const [extrasData, setExtrasData] = useState({
    storage_number: "",
    storage_code: "",
    front_desk: "",
    garage_number: "",
    mailing_box: "",
    pool_access_code: "",
  });

  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedRules, setSelectedRules] = useState<string[]>([]);

  // Reset form when property changes or dialog opens
  useEffect(() => {
    if (open) {
      if (property) {
        // Edit mode - populate with existing data
        form.reset({
          owner_id: property.owner_id,
          is_active: property.is_active,
          is_booking: property.is_booking,
          is_pets_allowed: property.is_pets_allowed,
          property_type: property.property_type,
          size_sqf: property.size_sqf || undefined,
          capacity: property.capacity || undefined,
          max_capacity: property.max_capacity || undefined,
          num_bedrooms: property.num_bedrooms || undefined,
          num_bathrooms: property.num_bathrooms || undefined,
          num_half_bath: property.num_half_bath || undefined,
          num_wcs: property.num_wcs || undefined,
          num_kitchens: property.num_kitchens || undefined,
          num_living_rooms: property.num_living_rooms || undefined,
        });

        // Populate related data
        if (property.location) {
          setLocationData({
            address: property.location.address || "",
            city: property.location.city || "",
            state: property.location.state || "",
            postal_code: property.location.postal_code || "",
            latitude: property.location.latitude,
            longitude: property.location.longitude,
          });
        }

        if (property.communication) {
          setCommunicationData({
            phone_number: property.communication.phone_number || "",
            wifi_name: property.communication.wifi_name || "",
            wifi_password: property.communication.wifi_password || "",
          });
        }

        if (property.access) {
          setAccessData({
            gate_code: property.access.gate_code || "",
            door_lock_password: property.access.door_lock_password || "",
            alarm_passcode: property.access.alarm_passcode || "",
          });
        }

        if (property.extras) {
          setExtrasData({
            storage_number: property.extras.storage_number || "",
            storage_code: property.extras.storage_code || "",
            front_desk: property.extras.front_desk || "",
            garage_number: property.extras.garage_number || "",
            mailing_box: property.extras.mailing_box || "",
            pool_access_code: property.extras.pool_access_code || "",
          });
        }

        setUnits(property.units || []);
        setImages(property.images?.map(img => ({ 
          url: img.image_url, 
          title: img.image_title, 
          is_primary: img.is_primary,
          file: undefined // Existing images don't have files
        })) || []);
        setSelectedAmenities(property.amenities?.map(a => a.amenity_id!) || []);
        setSelectedRules(property.rules?.map(r => r.rule_id!) || []);
      } else {
        // Create mode - reset to defaults
        form.reset();
        setLocationData({
          address: "",
          city: "",
          state: "",
          postal_code: "",
          latitude: undefined,
          longitude: undefined,
        });
        setCommunicationData({
          phone_number: "",
          wifi_name: "",
          wifi_password: "",
        });
        setAccessData({
          gate_code: "",
          door_lock_password: "",
          alarm_passcode: "",
        });
        setExtrasData({
          storage_number: "",
          storage_code: "",
          front_desk: "",
          garage_number: "",
          mailing_box: "",
          pool_access_code: "",
        });
        setUnits([]);
        setImages([]);
        setSelectedAmenities([]);
        setSelectedRules([]);
      }
    }
  }, [property, open, form]);

  const uploadImageToStorage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from('property-images')
      .upload(filePath, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('property-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (data: PropertyInsert) => {
    try {
      setIsSubmitting(true);
      
      // Upload images to Supabase storage
      const uploadedImages = await Promise.all(
        images.map(async (img) => {
          if (img.file) {
            // New image file needs to be uploaded
            const uploadedUrl = await uploadImageToStorage(img.file);
            return { url: uploadedUrl, title: img.title, is_primary: img.is_primary };
          }
          // Existing image, keep the URL
          return { url: img.url, title: img.title, is_primary: img.is_primary };
        })
      );
      
      const submissionData = {
        ...data,
        location: Object.keys(locationData).some(key => locationData[key as keyof typeof locationData]) ? locationData : undefined,
        communication: Object.keys(communicationData).some(key => communicationData[key as keyof typeof communicationData]) ? communicationData : undefined,
        access: Object.keys(accessData).some(key => accessData[key as keyof typeof accessData]) ? accessData : undefined,
        extras: Object.keys(extrasData).some(key => extrasData[key as keyof typeof extrasData]) ? extrasData : undefined,
        units: units.length > 0 ? units : undefined,
        amenity_ids: selectedAmenities.length > 0 ? selectedAmenities : undefined,
        rule_ids: selectedRules.length > 0 ? selectedRules : undefined,
        images: uploadedImages.length > 0 ? uploadedImages : undefined,
      };
      
      await onSubmit(submissionData);
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: "Failed to upload images or submit form",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImages(prev => [...prev, { 
          url: result, 
          is_primary: prev.length === 0,
          file: file // Store the file for later upload
        }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const setPrimaryImage = (index: number) => {
    setImages(prev => prev.map((img, i) => ({ ...img, is_primary: i === index })));
  };

  const addUnit = () => {
    setUnits(prev => [...prev, { property_name: "", license_number: "", folio: "" }]);
  };

  const removeUnit = (index: number) => {
    setUnits(prev => prev.filter((_, i) => i !== index));
  };

  const updateUnit = (index: number, field: string, value: string) => {
    setUnits(prev => prev.map((unit, i) => i === index ? { ...unit, [field]: value } : unit));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="animate-fade-in">
            {property ? "Edit Property" : "Add New Property"}
          </DialogTitle>
        </DialogHeader>

        <div className="animate-fade-in">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="location">Location</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="communication">Communication</TabsTrigger>
                  <TabsTrigger value="access">Access</TabsTrigger>
                  <TabsTrigger value="features">Features</TabsTrigger>
                  <TabsTrigger value="images">Images</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="owner_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Owner *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select owner" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users.map((user) => (
                                <SelectItem key={user.user_id} value={user.user_id!}>
                                  {user.first_name} {user.last_name} ({user.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="property_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Type *</FormLabel>
                          <FormControl>
                            <Combobox
                              options={PROPERTY_TYPES}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Select property type..."
                              searchPlaceholder="Search property types..."
                              emptyText="No property type found."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active Property</FormLabel>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_booking"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Booking Available</FormLabel>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_pets_allowed"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Pets Allowed</FormLabel>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="location" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Address</label>
                      <Input
                        value={locationData.address}
                        onChange={(e) => setLocationData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Property address"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">City</label>
                      <Input
                        value={locationData.city}
                        onChange={(e) => setLocationData(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="City"
                      />
                    </div>
                  </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-sm font-medium">State</label>
                       <Input
                         value={locationData.state}
                         onChange={(e) => setLocationData(prev => ({ ...prev, state: e.target.value }))}
                         placeholder="State"
                       />
                     </div>
                     <div>
                       <label className="text-sm font-medium">Postal Code</label>
                       <Input
                         value={locationData.postal_code}
                         onChange={(e) => setLocationData(prev => ({ ...prev, postal_code: e.target.value }))}
                         placeholder="Postal code"
                       />
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-sm font-medium">Latitude</label>
                       <Input
                         type="number"
                         value={locationData.latitude || ""}
                         onChange={(e) => setLocationData(prev => ({ 
                           ...prev, 
                           latitude: e.target.value ? parseFloat(e.target.value) : undefined 
                         }))}
                         placeholder="Latitude coordinates"
                         step="any"
                       />
                     </div>
                     <div>
                       <label className="text-sm font-medium">Longitude</label>
                       <Input
                         type="number"
                         value={locationData.longitude || ""}
                         onChange={(e) => setLocationData(prev => ({ 
                           ...prev, 
                           longitude: e.target.value ? parseFloat(e.target.value) : undefined 
                         }))}
                         placeholder="Longitude coordinates"
                         step="any"
                       />
                     </div>
                   </div>
                 </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="size_sqf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Size (sq ft)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Capacity</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="max_capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Capacity</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-5 gap-4">
                    <FormField
                      control={form.control}
                      name="num_bedrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bedrooms</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="num_bathrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bathrooms</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="num_half_bath"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Half Baths</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                     <FormField
                       control={form.control}
                       name="num_wcs"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>WCs</FormLabel>
                           <FormControl>
                             <Input {...field} type="number" onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} />
                           </FormControl>
                         </FormItem>
                       )}
                     />

                     <FormField
                       control={form.control}
                       name="num_kitchens"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kitchens</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="num_living_rooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Living Rooms</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Units Section */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Units</h4>
                      <Button type="button" onClick={addUnit} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Unit
                      </Button>
                    </div>
                    
                    {units.map((unit, index) => (
                      <div key={index} className="grid grid-cols-4 gap-4 p-4 border rounded-lg">
                        <Input
                          placeholder="Property name"
                          value={unit.property_name || ""}
                          onChange={(e) => updateUnit(index, "property_name", e.target.value)}
                        />
                        <Input
                          placeholder="License number"
                          value={unit.license_number || ""}
                          onChange={(e) => updateUnit(index, "license_number", e.target.value)}
                        />
                        <Input
                          placeholder="Folio"
                          value={unit.folio || ""}
                          onChange={(e) => updateUnit(index, "folio", e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeUnit(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                 </TabsContent>

                 <TabsContent value="communication" className="space-y-4">
                   <h3 className="text-lg font-medium mb-4">Communication Details</h3>
                   <div className="grid grid-cols-1 gap-4">
                     <div>
                       <label className="text-sm font-medium">Phone Number</label>
                       <Input
                         value={communicationData.phone_number}
                         onChange={(e) => setCommunicationData(prev => ({ ...prev, phone_number: e.target.value }))}
                         placeholder="Contact phone number"
                       />
                     </div>
                     <div>
                       <label className="text-sm font-medium">WiFi Network Name</label>
                       <Input
                         value={communicationData.wifi_name}
                         onChange={(e) => setCommunicationData(prev => ({ ...prev, wifi_name: e.target.value }))}
                         placeholder="WiFi network name/SSID"
                       />
                     </div>
                     <div>
                       <label className="text-sm font-medium">WiFi Password</label>
                       <Input
                         type="password"
                         value={communicationData.wifi_password}
                         onChange={(e) => setCommunicationData(prev => ({ ...prev, wifi_password: e.target.value }))}
                         placeholder="WiFi network password"
                       />
                     </div>
                   </div>
                 </TabsContent>

                 <TabsContent value="access" className="space-y-4">
                   <h3 className="text-lg font-medium mb-4">Access Information</h3>
                   <div className="grid grid-cols-1 gap-4">
                     <div>
                       <label className="text-sm font-medium">Gate Code</label>
                       <Input
                         value={accessData.gate_code}
                         onChange={(e) => setAccessData(prev => ({ ...prev, gate_code: e.target.value }))}
                         placeholder="Gate access code"
                       />
                     </div>
                     <div>
                       <label className="text-sm font-medium">Door Lock Password</label>
                       <Input
                         value={accessData.door_lock_password}
                         onChange={(e) => setAccessData(prev => ({ ...prev, door_lock_password: e.target.value }))}
                         placeholder="Door lock password/code"
                       />
                     </div>
                     <div>
                       <label className="text-sm font-medium">Alarm Passcode</label>
                       <Input
                         value={accessData.alarm_passcode}
                         onChange={(e) => setAccessData(prev => ({ ...prev, alarm_passcode: e.target.value }))}
                         placeholder="Security alarm passcode"
                       />
                     </div>
                   </div>

                   <h4 className="text-md font-medium mt-6 mb-4">Additional Property Features</h4>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-sm font-medium">Storage Number</label>
                       <Input
                         value={extrasData.storage_number}
                         onChange={(e) => setExtrasData(prev => ({ ...prev, storage_number: e.target.value }))}
                         placeholder="Storage unit number"
                       />
                     </div>
                     <div>
                       <label className="text-sm font-medium">Storage Code</label>
                       <Input
                         value={extrasData.storage_code}
                         onChange={(e) => setExtrasData(prev => ({ ...prev, storage_code: e.target.value }))}
                         placeholder="Storage access code"
                       />
                     </div>
                     <div>
                       <label className="text-sm font-medium">Garage Number</label>
                       <Input
                         value={extrasData.garage_number}
                         onChange={(e) => setExtrasData(prev => ({ ...prev, garage_number: e.target.value }))}
                         placeholder="Garage/parking number"
                       />
                     </div>
                     <div>
                       <label className="text-sm font-medium">Front Desk</label>
                       <Input
                         value={extrasData.front_desk}
                         onChange={(e) => setExtrasData(prev => ({ ...prev, front_desk: e.target.value }))}
                         placeholder="Front desk information"
                       />
                     </div>
                     <div>
                       <label className="text-sm font-medium">Mailing Box</label>
                       <Input
                         value={extrasData.mailing_box}
                         onChange={(e) => setExtrasData(prev => ({ ...prev, mailing_box: e.target.value }))}
                         placeholder="Mail box number/address"
                       />
                     </div>
                     <div>
                       <label className="text-sm font-medium">Pool Access Code</label>
                       <Input
                         value={extrasData.pool_access_code}
                         onChange={(e) => setExtrasData(prev => ({ ...prev, pool_access_code: e.target.value }))}
                         placeholder="Pool/amenities access code"
                       />
                     </div>
                   </div>
                 </TabsContent>

                <TabsContent value="features" className="space-y-4">
                  {/* Amenities */}
                  <div>
                    <h4 className="font-medium mb-4">Amenities</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {amenities.map((amenity) => (
                        <div key={amenity.amenity_id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`amenity-${amenity.amenity_id}`}
                            checked={selectedAmenities.includes(amenity.amenity_id!)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedAmenities(prev => [...prev, amenity.amenity_id!]);
                              } else {
                                setSelectedAmenities(prev => prev.filter(id => id !== amenity.amenity_id));
                              }
                            }}
                          />
                          <label htmlFor={`amenity-${amenity.amenity_id}`} className="text-sm">
                            {amenity.amenity_name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rules */}
                  <div>
                    <h4 className="font-medium mb-4">Rules</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {rules.map((rule) => (
                        <div key={rule.rule_id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`rule-${rule.rule_id}`}
                            checked={selectedRules.includes(rule.rule_id!)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRules(prev => [...prev, rule.rule_id!]);
                              } else {
                                setSelectedRules(prev => prev.filter(id => id !== rule.rule_id));
                              }
                            }}
                          />
                          <label htmlFor={`rule-${rule.rule_id}`} className="text-sm">
                            {rule.rule_name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="images" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Property Images</h4>
                      <label className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Image
                          </span>
                        </Button>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      {images.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={image.url}
                            alt={`Property ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          {image.is_primary && (
                            <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                              Primary
                            </div>
                          )}
                          <div className="absolute top-2 right-2 flex space-x-1">
                            {!image.is_primary && (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => setPrimaryImage(index)}
                              >
                                Set Primary
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => removeImage(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="hover-scale">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {property ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    property ? "Update Property" : "Create Property"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
