import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { providerSchema, Provider, ProviderInsert, PARTNER_TIER_CONFIG, PartnerTier } from "@/lib/schemas";
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

interface UtilityProviderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: Provider | null;
  onSubmit: (data: ProviderInsert) => Promise<void>;
}

const UTILITY_TYPES = [
  "Electric", "Internet", "Gas", "Water", "Cable",
  "Security", "Parking", "Maintenance", "Management", "Other"
] as const;

export function UtilityProviderForm({
  open,
  onOpenChange,
  provider,
  onSubmit
}: UtilityProviderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProviderInsert>({
    resolver: zodResolver(providerSchema.omit({ provider_id: true, created_at: true, updated_at: true, rating: true, total_reviews: true })),
    defaultValues: {
      provider_name: "",
      category: "utility" as const,
      provider_type: "Electric",
      partner_tier: "regular" as const,
      email: "",
      phone_primary: "",
      website: "",
      customer_service_hours: "",
      emergency_contact: "",
      emergency_phone: "",
      service_area: [],
      is_active: true,
      notes: "",
      address_street: "",
      address_city: "",
      address_state: "",
      address_zip: "",
    },
  });

  // Reset form when provider changes or dialog opens
  useEffect(() => {
    if (open) {
      const formData: ProviderInsert = {
        provider_name: provider?.provider_name || "",
        category: "utility" as const,
        provider_type: provider?.provider_type || "Electric",
        partner_tier: (provider?.partner_tier as PartnerTier) || "regular",
        email: provider?.email || "",
        phone_primary: provider?.phone_primary || "",
        website: provider?.website || "",
        customer_service_hours: provider?.customer_service_hours || "",
        emergency_contact: provider?.emergency_contact || "",
        emergency_phone: provider?.emergency_phone || "",
        service_area: provider?.service_area || [],
        is_active: provider?.is_active ?? true,
        notes: provider?.notes || "",
        address_street: provider?.address_street || "",
        address_city: provider?.address_city || "",
        address_state: provider?.address_state || "",
        address_zip: provider?.address_zip || "",
      };

      form.reset(formData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, open]);

  const handleSubmit = async (data: ProviderInsert) => {
    try {
      setIsSubmitting(true);
      // Ensure category is set to 'utility'
      const providerData = { ...data, category: "utility" as const };
      await onSubmit(providerData);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Utility provider form submission error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save utility provider. Please try again.",
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
            {provider ? "Edit Utility Provider" : "Add New Utility Provider"}
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
                      <Input {...field} placeholder="e.g., Florida Power & Light" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="provider_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Utility Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select utility type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {UTILITY_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} placeholder="support@example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone_primary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Service Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="(123) 456-7890" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Partner Tier */}
            <FormField
              control={form.control}
              name="partner_tier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Partner Tier</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'regular'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select partner tier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(PARTNER_TIER_CONFIG) as PartnerTier[]).map((tier) => (
                        <SelectItem key={tier} value={tier}>
                          <span
                            className="inline-flex items-center"
                            style={{ color: PARTNER_TIER_CONFIG[tier].color }}
                          >
                            {PARTNER_TIER_CONFIG[tier].label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Classification level for this utility provider
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Service Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Service Information</h3>

              <FormField
                control={form.control}
                name="customer_service_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Service Hours</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Mon-Fri 8AM-6PM, Sat 9AM-5PM" />
                    </FormControl>
                    <FormDescription>
                      When customers can contact support
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="emergency_contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Emergency department name" />
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
                      <FormDescription>
                        24/7 emergency contact number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Office Address (Optional) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Office Address (Optional)</h3>
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
                      placeholder="Additional notes or important information..."
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>Provider is currently active and available</FormDescription>
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
