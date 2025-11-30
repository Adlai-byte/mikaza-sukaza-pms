import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { providerSchema, Provider, ProviderInsert } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
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
  FormDescription,
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
import { Loader2, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { LocationMap } from "@/components/ui/location-map-new";

interface ServiceProviderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: Provider | null;
  onSubmit: (data: ProviderInsert) => Promise<void>;
}

const SERVICE_CATEGORIES = [
  "Cleaning", "Plumbing", "Electrical", "HVAC", "Landscaping",
  "Pool Service", "Pest Control", "Handyman", "Painting", "Roofing",
  "Carpentry", "Appliance Repair", "Locksmith", "Security", "Moving", "Other"
];

export function ServiceProviderForm({
  open,
  onOpenChange,
  provider,
  onSubmit
}: ServiceProviderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProviderInsert>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
      provider_name: "",
      category: "service" as const,
      provider_type: "Other",
      contact_person: "",
      email: "",
      phone_primary: "",
      phone_secondary: "",
      address_street: "",
      address_city: "",
      address_state: "",
      address_zip: "",
      website: "",
      license_number: "",
      insurance_expiry: "",
      is_active: true,
      is_preferred: false,
      notes: "",
      emergency_contact: "",
      emergency_phone: "",
      customer_service_hours: "",
      service_area: [],
    },
  });

  // Reset form when provider changes or dialog opens
  useEffect(() => {
    if (open) {
      const formData: ProviderInsert = {
        provider_name: provider?.provider_name || "",
        category: "service" as const,
        provider_type: provider?.provider_type || "Other",
        contact_person: provider?.contact_person || "",
        email: provider?.email || "",
        phone_primary: provider?.phone_primary || "",
        phone_secondary: provider?.phone_secondary || "",
        address_street: provider?.address_street || "",
        address_city: provider?.address_city || "",
        address_state: provider?.address_state || "",
        address_zip: provider?.address_zip || "",
        website: provider?.website || "",
        license_number: provider?.license_number || "",
        insurance_expiry: provider?.insurance_expiry || "",
        is_active: provider?.is_active ?? true,
        is_preferred: provider?.is_preferred ?? false,
        notes: provider?.notes || "",
        emergency_contact: provider?.emergency_contact || "",
        emergency_phone: provider?.emergency_phone || "",
        customer_service_hours: provider?.customer_service_hours || "",
        service_area: provider?.service_area || [],
      };

      form.reset(formData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, open]);

  const handleSubmit = async (data: ProviderInsert) => {
    try {
      setIsSubmitting(true);
      // Ensure category is set to 'service'
      const providerData = { ...data, category: "service" as const };
      await onSubmit(providerData);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Service provider form submission error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save service provider. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocationSelect = (
    lat: number,
    lng: number,
    address?: string,
    city?: string,
    state?: string,
    postal_code?: string
  ) => {
    if (address) form.setValue("address_street", address);
    if (city) form.setValue("address_city", city);
    if (state) form.setValue("address_state", state);
    if (postal_code) form.setValue("address_zip", postal_code);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {provider ? "Edit Service Provider" : "Add New Service Provider"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>

              <FormField
                control={form.control}
                name="provider_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter provider name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contact_person"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter contact name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="provider_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SERVICE_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} placeholder="email@example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone_primary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="(123) 456-7890" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone_secondary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secondary Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="(123) 456-7890" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

            </div>

            {/* Address */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Address</h3>
                <Button
                  type="button"
                  onClick={() => setIsMapOpen(true)}
                  variant="outline"
                  size="sm"
                  className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-300 hover:from-purple-100 hover:to-purple-200 text-purple-700 hover:text-purple-800"
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Select on Map
                </Button>
              </div>

              <FormField
                control={form.control}
                name="address_street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123 Main St" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="address_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address_state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address_zip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Business Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Business Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="license_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="License number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="insurance_expiry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Insurance Expiry</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Emergency Contact</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="emergency_contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Contact name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergency_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="(123) 456-7890" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Additional notes or comments..."
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status Switches */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>Provider is currently active</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_preferred"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Preferred</FormLabel>
                      <FormDescription>Mark as preferred vendor</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {provider ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  provider ? "Update Provider" : "Create Provider"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      {/* Location Map Dialog */}
      <LocationMap
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onLocationSelect={handleLocationSelect}
        initialAddress={form.getValues("address_street")}
      />
    </Dialog>
  );
}
