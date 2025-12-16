import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { propertySchema, Property, PropertyInsert, User, Amenity, Rule } from "@/lib/schemas";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { useUsers } from "@/hooks/useUsers";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
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
import { Upload, X, Loader2, Plus, Trash2, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { LocationMap } from "@/components/ui/location-map-new";

interface PropertyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: Property | null;
  onSubmit: (data: PropertyInsert & any) => Promise<void>;
  amenities: Amenity[];
  rules: Rule[];
}

export function PropertyForm({ open, onOpenChange, property, onSubmit, amenities, rules }: PropertyFormProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<{ url: string; title?: string; is_primary?: boolean; file?: File }[]>([]);
  const [units, setUnits] = useState<{ property_name?: string; license_number?: string; folio?: string; owner_id?: string | null; num_bedrooms?: number | null; num_bathrooms?: number | null }[]>([]);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const { users } = useUsers();
  const { logActivity } = useActivityLogs();
  const { toast } = useToast();

  // Debug log to check if amenities and rules are being passed
  React.useEffect(() => {
    console.log('🔍 [PropertyForm] Props received:', {
      amenitiesCount: amenities?.length || 0,
      rulesCount: rules?.length || 0,
      amenitiesSample: amenities?.slice(0, 3),
      rulesSample: rules?.slice(0, 3)
    });
  }, [amenities, rules]);

  const PROPERTY_TYPES = [
    { value: "apartment", label: t('propertyForm.propertyTypes.apartment') },
    { value: "house", label: t('propertyForm.propertyTypes.house') },
    { value: "condo", label: t('propertyForm.propertyTypes.condo') },
    { value: "townhouse", label: t('propertyForm.propertyTypes.townhouse') },
    { value: "studio", label: t('propertyForm.propertyTypes.studio') },
    { value: "loft", label: t('propertyForm.propertyTypes.loft') },
    { value: "villa", label: t('propertyForm.propertyTypes.villa') },
    { value: "duplex", label: t('propertyForm.propertyTypes.duplex') },
    { value: "penthouse", label: t('propertyForm.propertyTypes.penthouse') },
    { value: "cabin", label: t('propertyForm.propertyTypes.cabin') },
    { value: "cottage", label: t('propertyForm.propertyTypes.cottage') },
    { value: "farmhouse", label: t('propertyForm.propertyTypes.farmhouse') },
    { value: "mansion", label: t('propertyForm.propertyTypes.mansion') },
    { value: "mobile_home", label: t('propertyForm.propertyTypes.mobileHome') },
    { value: "tiny_house", label: t('propertyForm.propertyTypes.tinyHouse') },
  ];
  
const form = useForm<PropertyInsert>({
  resolver: zodResolver(propertySchema),
  defaultValues: {
    owner_id: "",
    property_name: "",
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
        console.log('📝 [PropertyForm] Edit mode - populating form with property:', property.property_id);
        // Edit mode - populate with existing data
form.reset({
  owner_id: property.owner_id,
  property_name: property.property_name || "",
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
        console.log('🆕 [PropertyForm] Create mode - resetting form to defaults');
        // Create mode - reset to defaults with explicit values
        form.reset({
          owner_id: "",
          property_name: "",
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
        });
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
        console.log('✅ [PropertyForm] Form reset complete');
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
      console.log('🎯 [PropertyForm] handleSubmit called with data:', data);
      setIsSubmitting(true);

      // Upload images to Supabase storage
      console.log('📸 [PropertyForm] Processing images, count:', images.length);
      const uploadedImages = await Promise.all(
        images.map(async (img) => {
          if (img.file) {
            // New image file needs to be uploaded
            console.log('⬆️ [PropertyForm] Uploading new image file');
            const uploadedUrl = await uploadImageToStorage(img.file);
            return { url: uploadedUrl, title: img.title, is_primary: img.is_primary };
          }
          // Existing image, keep the URL
          console.log('♻️ [PropertyForm] Keeping existing image URL');
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

      console.log('📦 [PropertyForm] Submitting data:', submissionData);
      await onSubmit(submissionData);

      console.log('✅ [PropertyForm] Property submission successful, closing form');
      onOpenChange(false);
    } catch (error) {
      console.error('❌ [PropertyForm] Error submitting form:', error);
      toast({
        title: t('propertyForm.error'),
        description: error instanceof Error ? error.message : t('propertyForm.errorUploadImages'),
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
        // Replace existing image with new one (only one profile image allowed)
        setImages([{ 
          url: result, 
          is_primary: true, // Always primary since it's the only image
          file: file // Store the file for later upload
        }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateImageTitle = (title: string) => {
    setImages(prev => prev.map(img => ({ ...img, title })));
  };

  const addUnit = () => {
    setUnits(prev => [...prev, { property_name: "", license_number: "", folio: "", owner_id: null, num_bedrooms: null, num_bathrooms: null }]);
  };

  const removeUnit = (index: number) => {
    setUnits(prev => prev.filter((_, i) => i !== index));
  };

  const updateUnit = (index: number, field: string, value: string | number | null) => {
    setUnits(prev => prev.map((unit, i) => i === index ? { ...unit, [field]: value } : unit));
  };

  const handleLocationSelect = (
    lat: number,
    lng: number,
    address?: string,
    city?: string,
    state?: string,
    postal_code?: string,
    country?: string
  ) => {
    setLocationData({
      address: address || "",
      city: city || "",
      state: state || "",
      postal_code: postal_code || "",
      latitude: lat,
      longitude: lng,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="animate-fade-in">
            {property ? t('propertyForm.editProperty') : t('propertyForm.newProperty')}
          </DialogTitle>
        </DialogHeader>

        <div className="animate-fade-in">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="basic">{t('propertyForm.basicInfo')}</TabsTrigger>
                  <TabsTrigger value="location">{t('propertyForm.location')}</TabsTrigger>
                  <TabsTrigger value="details">{t('propertyForm.details')}</TabsTrigger>
                  <TabsTrigger value="communication">{t('propertyForm.communication')}</TabsTrigger>
                  <TabsTrigger value="access">{t('propertyForm.access')}</TabsTrigger>
                  <TabsTrigger value="features">{t('propertyForm.features')}</TabsTrigger>
                  <TabsTrigger value="images">{t('propertyForm.images')}</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{t('propertyForm.basicInformation')}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{t('propertyForm.basicInformationDesc')}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="owner_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('propertyForm.propertyOwnerRequired')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('propertyForm.selectOwner')} />
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
                          <FormLabel>{t('propertyForm.propertyTypeRequired')}</FormLabel>
                          <FormControl>
                            <Combobox
                              options={PROPERTY_TYPES}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder={t('propertyForm.selectPropertyType')}
                              searchPlaceholder={t('propertyForm.searchPropertyTypes')}
                              emptyText={t('propertyForm.noPropertyTypeFound')}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="property_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('propertyForm.propertyNameRequired')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('propertyForm.propertyNamePlaceholder')} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">{t('propertyForm.activeProperty')}</FormLabel>
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
                            <FormLabel className="text-base">{t('propertyForm.bookingAvailable')}</FormLabel>
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
                            <FormLabel className="text-base">{t('propertyForm.petsAllowed')}</FormLabel>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="location" className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{t('propertyForm.locationDetails')}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{t('propertyForm.locationDetailsDesc')}</p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => setIsMapOpen(true)}
                      variant="outline"
                      className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-300 hover:from-purple-100 hover:to-purple-200 text-purple-700 hover:text-purple-800"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      {t('propertyForm.selectOnMap')}
                    </Button>
                  </div>

                  {/* Address Information Card */}
                  <div className="rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50/50 to-white p-4 space-y-4">
                    <div className="flex items-center gap-2 text-purple-700 font-medium mb-2">
                      <MapPin className="h-4 w-4" />
                      <span>{t('propertyForm.addressInformation')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-gray-700">{t('propertyForm.streetAddress')}</label>
                        <Input
                          value={locationData.address}
                          onChange={(e) => setLocationData(prev => ({ ...prev, address: e.target.value }))}
                          placeholder={t('propertyForm.streetAddressPlaceholder')}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">{t('propertyForm.city')}</label>
                        <Input
                          value={locationData.city}
                          onChange={(e) => setLocationData(prev => ({ ...prev, city: e.target.value }))}
                          placeholder={t('propertyForm.cityPlaceholder')}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">{t('propertyForm.state')}</label>
                        <Input
                          value={locationData.state}
                          onChange={(e) => setLocationData(prev => ({ ...prev, state: e.target.value }))}
                          placeholder={t('propertyForm.statePlaceholder')}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">{t('propertyForm.postalCode')}</label>
                        <Input
                          value={locationData.postal_code}
                          onChange={(e) => setLocationData(prev => ({ ...prev, postal_code: e.target.value }))}
                          placeholder={t('propertyForm.postalCodePlaceholder')}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Coordinates Card */}
                  <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50/50 to-white p-4 space-y-4">
                    <div className="flex items-center gap-2 text-blue-700 font-medium mb-2">
                      <MapPin className="h-4 w-4" />
                      <span>{t('propertyForm.geographicCoordinates')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">{t('propertyForm.latitude')}</label>
                        <Input
                          type="number"
                          value={locationData.latitude || ""}
                          onChange={(e) => setLocationData(prev => ({
                            ...prev,
                            latitude: e.target.value ? parseFloat(e.target.value) : undefined
                          }))}
                          placeholder={t('propertyForm.latitudePlaceholder')}
                          step="any"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">{t('propertyForm.longitude')}</label>
                        <Input
                          type="number"
                          value={locationData.longitude || ""}
                          onChange={(e) => setLocationData(prev => ({
                            ...prev,
                            longitude: e.target.value ? parseFloat(e.target.value) : undefined
                          }))}
                          placeholder={t('propertyForm.longitudePlaceholder')}
                          step="any"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    {locationData.latitude && locationData.longitude && (
                      <div className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded p-2 mt-2">
                        📍 {t('propertyForm.coordinatesDisplay', { lat: locationData.latitude.toFixed(6), lng: locationData.longitude.toFixed(6) })}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{t('propertyForm.propertyDetails')}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{t('propertyForm.propertyDetailsDesc')}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="size_sqf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('propertyForm.sizeSqft')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('propertyForm.capacity')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="max_capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('propertyForm.maxCapacity')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="num_bedrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('propertyForm.bedrooms')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="num_bathrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('propertyForm.bathrooms')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="num_half_bath"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('propertyForm.halfBaths')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                     <FormField
                       control={form.control}
                       name="num_wcs"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>{t('propertyForm.wcs')}</FormLabel>
                           <FormControl>
                             <Input
                               type="number"
                               value={field.value ?? ""}
                               onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                             />
                           </FormControl>
                         </FormItem>
                       )}
                     />

                     <FormField
                       control={form.control}
                       name="num_kitchens"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('propertyForm.kitchens')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="num_living_rooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('propertyForm.livingRooms')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Units Section */}
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <h4 className="text-md font-semibold mb-2">{t('propertyForm.propertyUnits')}</h4>
                      <p className="text-sm text-muted-foreground mb-4">{t('propertyForm.propertyUnitsDesc')}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium">{t('propertyForm.unitsConfigured', { count: units.length })}</p>
                      <Button type="button" onClick={addUnit} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        {t('propertyForm.addUnit')}
                      </Button>
                    </div>

                    {units.map((unit, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-3 bg-purple-50/30">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-purple-700">Unit {index + 1}</span>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeUnit(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="col-span-2">
                            <Label className="text-xs text-muted-foreground">{t('propertyForm.unitName', 'Unit Name')}</Label>
                            <Input
                              placeholder={t('propertyForm.propertyNamePlaceholderUnit')}
                              value={unit.property_name || ""}
                              onChange={(e) => updateUnit(index, "property_name", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">{t('propertyForm.bedrooms', 'Bedrooms')}</Label>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={unit.num_bedrooms ?? ""}
                              onChange={(e) => updateUnit(index, "num_bedrooms", e.target.value ? parseInt(e.target.value) : null)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">{t('propertyForm.bathrooms', 'Bathrooms')}</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              placeholder="0"
                              value={unit.num_bathrooms ?? ""}
                              onChange={(e) => updateUnit(index, "num_bathrooms", e.target.value ? parseFloat(e.target.value) : null)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">{t('propertyForm.licenseNumber', 'License Number')}</Label>
                            <Input
                              placeholder={t('propertyForm.licenseNumberPlaceholder')}
                              value={unit.license_number || ""}
                              onChange={(e) => updateUnit(index, "license_number", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">{t('propertyForm.folio', 'Folio')}</Label>
                            <Input
                              placeholder={t('propertyForm.folioPlaceholder')}
                              value={unit.folio || ""}
                              onChange={(e) => updateUnit(index, "folio", e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">{t('propertyForm.unitOwner', 'Unit Owner')}</Label>
                            <Select
                              value={unit.owner_id || "inherit"}
                              onValueChange={(value) => updateUnit(index, "owner_id", value === "inherit" ? null : value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('propertyForm.unitOwnerPlaceholder', { defaultValue: 'Unit Owner' })} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="inherit">{t('propertyForm.inheritPropertyOwner', { defaultValue: '(Property Owner)' })}</SelectItem>
                                {users.map((user) => (
                                  <SelectItem key={user.user_id} value={user.user_id!}>
                                    {user.first_name} {user.last_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                 </TabsContent>

                 <TabsContent value="communication" className="space-y-6">
                   <div>
                     <h3 className="text-lg font-semibold mb-2">{t('propertyForm.communicationDetails')}</h3>
                     <p className="text-sm text-muted-foreground mb-4">{t('propertyForm.communicationDetailsDesc')}</p>
                   </div>

                   {/* Communication Card */}
                   <div className="rounded-lg border border-green-200 bg-gradient-to-br from-green-50/50 to-white p-4 space-y-4">
                     <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                       <span>{t('propertyForm.contactInformation')}</span>
                     </div>
                     <div>
                       <label className="text-sm font-medium text-gray-700">{t('propertyForm.phoneNumber')}</label>
                       <Input
                         value={communicationData.phone_number}
                         onChange={(e) => setCommunicationData(prev => ({ ...prev, phone_number: e.target.value }))}
                         placeholder={t('propertyForm.phoneNumberPlaceholder')}
                         className="mt-1"
                       />
                     </div>
                     <div>
                       <label className="text-sm font-medium text-gray-700">{t('propertyForm.wifiNetworkName')}</label>
                       <Input
                         value={communicationData.wifi_name}
                         onChange={(e) => setCommunicationData(prev => ({ ...prev, wifi_name: e.target.value }))}
                         placeholder={t('propertyForm.wifiNamePlaceholder')}
                         className="mt-1"
                       />
                     </div>
                     <div>
                       <label className="text-sm font-medium text-gray-700">{t('propertyForm.wifiPassword')}</label>
                       <Input
                         type="password"
                         value={communicationData.wifi_password}
                         onChange={(e) => setCommunicationData(prev => ({ ...prev, wifi_password: e.target.value }))}
                         placeholder={t('propertyForm.wifiPasswordPlaceholder')}
                         className="mt-1"
                       />
                     </div>
                   </div>
                 </TabsContent>

                 <TabsContent value="access" className="space-y-6">
                   <div>
                     <h3 className="text-lg font-semibold mb-2">{t('propertyForm.accessInformation')}</h3>
                     <p className="text-sm text-muted-foreground mb-4">{t('propertyForm.accessInformationDesc')}</p>
                   </div>

                   {/* Security Access Card */}
                   <div className="rounded-lg border border-red-200 bg-gradient-to-br from-red-50/50 to-white p-4 space-y-4">
                     <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                       <span>{t('propertyForm.securityAccess')}</span>
                     </div>
                     <div>
                       <label className="text-sm font-medium text-gray-700">{t('propertyForm.gateCode')}</label>
                       <Input
                         value={accessData.gate_code}
                         onChange={(e) => setAccessData(prev => ({ ...prev, gate_code: e.target.value }))}
                         placeholder={t('propertyForm.gateCodePlaceholder')}
                         className="mt-1"
                       />
                     </div>
                     <div>
                       <label className="text-sm font-medium text-gray-700">{t('propertyForm.doorLockPassword')}</label>
                       <Input
                         value={accessData.door_lock_password}
                         onChange={(e) => setAccessData(prev => ({ ...prev, door_lock_password: e.target.value }))}
                         placeholder={t('propertyForm.doorLockPasswordPlaceholder')}
                         className="mt-1"
                       />
                     </div>
                     <div>
                       <label className="text-sm font-medium text-gray-700">{t('propertyForm.alarmPasscode')}</label>
                       <Input
                         value={accessData.alarm_passcode}
                         onChange={(e) => setAccessData(prev => ({ ...prev, alarm_passcode: e.target.value }))}
                         placeholder={t('propertyForm.alarmPasscodePlaceholder')}
                         className="mt-1"
                       />
                     </div>
                   </div>

                   {/* Additional Features Card */}
                   <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50/50 to-white p-4 space-y-4">
                     <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                       <span>{t('propertyForm.additionalPropertyFeatures')}</span>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="text-sm font-medium text-gray-700">{t('propertyForm.storageNumber')}</label>
                         <Input
                           value={extrasData.storage_number}
                           onChange={(e) => setExtrasData(prev => ({ ...prev, storage_number: e.target.value }))}
                           placeholder={t('propertyForm.storageNumberPlaceholder')}
                           className="mt-1"
                         />
                       </div>
                       <div>
                         <label className="text-sm font-medium text-gray-700">{t('propertyForm.storageCode')}</label>
                         <Input
                           value={extrasData.storage_code}
                           onChange={(e) => setExtrasData(prev => ({ ...prev, storage_code: e.target.value }))}
                           placeholder={t('propertyForm.storageCodePlaceholder')}
                           className="mt-1"
                         />
                       </div>
                       <div>
                         <label className="text-sm font-medium text-gray-700">{t('propertyForm.garageNumber')}</label>
                         <Input
                           value={extrasData.garage_number}
                           onChange={(e) => setExtrasData(prev => ({ ...prev, garage_number: e.target.value }))}
                           placeholder={t('propertyForm.garageNumberPlaceholder')}
                           className="mt-1"
                         />
                       </div>
                       <div>
                         <label className="text-sm font-medium text-gray-700">{t('propertyForm.frontDesk')}</label>
                         <Input
                           value={extrasData.front_desk}
                           onChange={(e) => setExtrasData(prev => ({ ...prev, front_desk: e.target.value }))}
                           placeholder={t('propertyForm.frontDeskPlaceholder')}
                           className="mt-1"
                         />
                       </div>
                       <div>
                         <label className="text-sm font-medium text-gray-700">{t('propertyForm.mailingBox')}</label>
                         <Input
                           value={extrasData.mailing_box}
                           onChange={(e) => setExtrasData(prev => ({ ...prev, mailing_box: e.target.value }))}
                           placeholder={t('propertyForm.mailingBoxPlaceholder')}
                           className="mt-1"
                         />
                       </div>
                       <div>
                         <label className="text-sm font-medium text-gray-700">{t('propertyForm.poolAccessCode')}</label>
                         <Input
                           value={extrasData.pool_access_code}
                           onChange={(e) => setExtrasData(prev => ({ ...prev, pool_access_code: e.target.value }))}
                           placeholder={t('propertyForm.poolAccessCodePlaceholder')}
                           className="mt-1"
                         />
                       </div>
                     </div>
                   </div>
                 </TabsContent>

                <TabsContent value="features" className="space-y-6">
                  {/* Amenities */}
                  <div>
                    <h4 className="text-lg font-semibold mb-2">{t('propertyForm.amenities')}</h4>
                    <p className="text-sm text-muted-foreground mb-4">{t('propertyForm.amenitiesDesc')}</p>
                    {amenities && amenities.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                            <label htmlFor={`amenity-${amenity.amenity_id}`} className="text-sm cursor-pointer">
                              {amenity.amenity_name}
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                        <p className="mb-2">No amenities available</p>
                        <p className="text-xs">Please add amenities in the system settings first</p>
                      </div>
                    )}
                  </div>

                  {/* Rules */}
                  <div>
                    <h4 className="text-lg font-semibold mb-2">{t('propertyForm.rules')}</h4>
                    <p className="text-sm text-muted-foreground mb-4">{t('propertyForm.rulesDesc')}</p>
                    {rules && rules.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <label htmlFor={`rule-${rule.rule_id}`} className="text-sm cursor-pointer">
                              {rule.rule_name}
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                        <p className="mb-2">No rules available</p>
                        <p className="text-xs">Please add rules in the system settings first</p>
                      </div>
                    )}
                  </div>

                  {/* Selected Summary */}
                  {(selectedAmenities.length > 0 || selectedRules.length > 0) && (
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Selected Features Summary:</h4>
                      {selectedAmenities.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          <strong>{selectedAmenities.length}</strong> amenities selected
                        </p>
                      )}
                      {selectedRules.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          <strong>{selectedRules.length}</strong> rules selected
                        </p>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="images" className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{t('propertyForm.propertyProfileImage')}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{t('propertyForm.propertyProfileImageDesc')}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                      <label className="text-sm font-medium">{t('propertyForm.uploadProfileImage')}</label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </div>

                    {images.length > 0 && (
                      <div className="relative group max-w-sm">
                        <img
                          src={images[0].url}
                          alt={images[0].title || t('propertyForm.propertyProfileImage')}
                          className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setImages([])}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('propertyForm.remove')}
                          </Button>
                        </div>
                        <div className="mt-2">
                          <label className="text-sm font-medium mb-1 block">{t('propertyForm.imageTitleOptional')}</label>
                          <Input
                            placeholder={t('propertyForm.imageTitlePlaceholder')}
                            value={images[0].title || ""}
                            onChange={(e) => updateImageTitle(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
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
                  {t('propertyForm.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting} className="hover-scale">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {property ? t('propertyForm.updating') : t('propertyForm.creating')}
                    </>
                  ) : (
                    property ? t('propertyForm.updateProperty') : t('propertyForm.createProperty')
                  )}
                </Button>
              </div>
             </form>
          </Form>
        </div>
      </DialogContent>

      {/* Location Map Dialog */}
      <LocationMap
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onLocationSelect={handleLocationSelect}
        initialLat={locationData.latitude}
        initialLng={locationData.longitude}
        initialAddress={locationData.address}
      />
    </Dialog>
  );
}
