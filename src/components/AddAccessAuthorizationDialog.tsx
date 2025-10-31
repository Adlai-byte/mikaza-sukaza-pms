import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAccessAuthorizations } from "@/hooks/useAccessAuthorizations";
import { useProviders } from "@/hooks/useProviders";
import { usePropertiesOptimized } from "@/hooks/usePropertiesOptimized";
import { type AccessAuthorization } from "@/lib/schemas";
import { Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { generateAccessAuthorizationPDF, type AccessAuthorizationData } from "@/lib/pdf-generator";

// Form schema for Access Authorization dialog
const accessAuthFormSchema = z.object({
  vendor_id: z.string().uuid('Vendor is required'),
  property_id: z.string().uuid('Property is required'),
  unit_id: z.string().uuid().optional().nullable(),
  job_id: z.string().uuid().optional().nullable(),
  coi_id: z.string().uuid().optional().nullable(),
  access_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  access_time_start: z.string().optional(),
  access_time_end: z.string().optional(),
  authorized_areas: z.string().optional(), // Will be converted to array on submit
  status: z.enum(['requested', 'approved', 'in_progress', 'completed', 'cancelled', 'expired']).default('requested'),
  access_code: z.string().optional(),
  key_pickup_location: z.string().optional(),
  vendor_contact_name: z.string().optional(),
  vendor_contact_phone: z.string().optional(),
  number_of_personnel: z.coerce.number().positive().default(1),
  vehicle_info: z.string().optional(),
  building_contact_name: z.string().optional(),
  special_instructions: z.string().optional(),
});

type AccessAuthFormData = z.infer<typeof accessAuthFormSchema>;

interface AddAccessAuthorizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editAuth?: AccessAuthorization | null;
}

export function AddAccessAuthorizationDialog({
  open,
  onOpenChange,
  editAuth
}: AddAccessAuthorizationDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const { providers: vendors } = useProviders('service');
  const { properties } = usePropertiesOptimized();
  const { createAuthorization, updateAuthorization, isCreating, isUpdating } = useAccessAuthorizations();

  const form = useForm<AccessAuthFormData>({
    resolver: zodResolver(accessAuthFormSchema),
    defaultValues: editAuth ? {
      vendor_id: editAuth.vendor_id,
      property_id: editAuth.property_id,
      unit_id: editAuth.unit_id || undefined,
      job_id: editAuth.job_id || undefined,
      coi_id: editAuth.coi_id || undefined,
      access_date: editAuth.access_date,
      access_time_start: editAuth.access_time_start || "",
      access_time_end: editAuth.access_time_end || "",
      authorized_areas: editAuth.authorized_areas?.join(', ') || "",
      status: editAuth.status,
      access_code: editAuth.access_code || "",
      key_pickup_location: editAuth.key_pickup_location || "",
      vendor_contact_name: editAuth.vendor_contact_name || "",
      vendor_contact_phone: editAuth.vendor_contact_phone || "",
      number_of_personnel: editAuth.number_of_personnel || 1,
      vehicle_info: editAuth.vehicle_info || "",
      building_contact_name: editAuth.building_contact_name || "",
      special_instructions: editAuth.special_instructions || "",
    } : {
      vendor_id: "",
      property_id: "",
      unit_id: undefined,
      job_id: undefined,
      coi_id: undefined,
      access_date: "",
      access_time_start: "",
      access_time_end: "",
      authorized_areas: "",
      status: "requested",
      access_code: "",
      key_pickup_location: "",
      vendor_contact_name: "",
      vendor_contact_phone: "",
      number_of_personnel: 1,
      vehicle_info: "",
      building_contact_name: "",
      special_instructions: "",
    },
  });

  const onSubmit = async (data: AccessAuthFormData) => {
    try {
      // Convert authorized_areas string to array
      const authData = {
        ...data,
        authorized_areas: data.authorized_areas
          ? data.authorized_areas.split(',').map(area => area.trim()).filter(Boolean)
          : [],
        access_time_start: data.access_time_start || null,
        access_time_end: data.access_time_end || null,
        unit_id: data.unit_id || null,
        job_id: data.job_id || null,
        coi_id: data.coi_id || null,
      };

      if (editAuth) {
        await updateAuthorization({
          access_auth_id: editAuth.access_auth_id!,
          ...authData,
        });

        toast({
          title: t('common.success'),
          description: t('dialogs.accessAuthorization.toasts.updateSuccess'),
        });
      } else {
        await createAuthorization(authData);

        toast({
          title: t('common.success'),
          description: t('dialogs.accessAuthorization.toasts.createSuccess'),
        });
      }

      // Reset form and close dialog
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: t('common.error'),
          description: error.message || t('dialogs.accessAuthorization.toasts.error'),
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async () => {
    if (!editAuth) return;

    try {
      const authData: AccessAuthorizationData = {
        ...editAuth,
        vendor: editAuth.vendor ? {
          provider_id: editAuth.vendor.provider_id,
          provider_name: editAuth.vendor.provider_name,
          contact_person: editAuth.vendor.contact_person,
          phone_primary: editAuth.vendor.phone_primary,
          email: editAuth.vendor.email,
        } : undefined,
        property: editAuth.property ? {
          property_id: editAuth.property.property_id,
          property_name: editAuth.property.property_name,
          property_type: editAuth.property.property_type,
        } : undefined,
        unit: editAuth.unit ? {
          unit_id: editAuth.unit.unit_id,
          property_name: editAuth.unit.property_name,
        } : undefined,
      };

      await generateAccessAuthorizationPDF(authData);

      toast({
        title: t('dialogs.accessAuthorization.toasts.pdfGenerated'),
        description: t('dialogs.accessAuthorization.toasts.pdfDescription'),
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: t('common.error'),
        description: t('dialogs.accessAuthorization.toasts.pdfError'),
        variant: "destructive",
      });
    }
  };

  const isSubmitting = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editAuth ? t('dialogs.accessAuthorization.titleEdit') : t('dialogs.accessAuthorization.titleRequest')}</DialogTitle>
          <DialogDescription>
            {editAuth ? t('dialogs.accessAuthorization.descriptionUpdate') : t('dialogs.accessAuthorization.descriptionCreate')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Vendor Selection */}
              <FormField
                control={form.control}
                name="vendor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialogs.accessAuthorization.fields.vendor')} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('dialogs.accessAuthorization.fields.selectVendor')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.provider_id} value={vendor.provider_id}>
                            {vendor.provider_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Property Selection */}
              <FormField
                control={form.control}
                name="property_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialogs.accessAuthorization.fields.property')} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('dialogs.accessAuthorization.fields.selectProperty')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {properties.map((property) => (
                          <SelectItem key={property.property_id} value={property.property_id}>
                            {property.property_name || property.property_type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Access Date */}
            <FormField
              control={form.control}
              name="access_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialogs.accessAuthorization.fields.accessDate')} *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="access_time_start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialogs.accessAuthorization.fields.startTime')}</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="access_time_end"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialogs.accessAuthorization.fields.endTime')}</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vendor_contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialogs.accessAuthorization.fields.contactName')}</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendor_contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialogs.accessAuthorization.fields.contactPhone')}</FormLabel>
                    <FormControl>
                      <Input placeholder="555-1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Personnel and Vehicle */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="number_of_personnel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialogs.accessAuthorization.fields.numberOfPersonnel')}</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vehicle_info"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialogs.accessAuthorization.fields.vehicleInfo')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('dialogs.accessAuthorization.fields.vehiclePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Access Details */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="access_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialogs.accessAuthorization.fields.accessCode')}</FormLabel>
                    <FormControl>
                      <Input placeholder="1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="key_pickup_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialogs.accessAuthorization.fields.keyPickupLocation')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('dialogs.accessAuthorization.fields.keyPickupPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Authorized Areas */}
            <FormField
              control={form.control}
              name="authorized_areas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialogs.accessAuthorization.fields.authorizedAreas')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('dialogs.accessAuthorization.fields.authorizedAreasPlaceholder')} {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('dialogs.accessAuthorization.fields.authorizedAreasDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Special Instructions */}
            <FormField
              control={form.control}
              name="special_instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialogs.accessAuthorization.fields.specialInstructions')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('dialogs.accessAuthorization.fields.specialInstructionsPlaceholder')}
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <div className="flex items-center justify-between w-full">
                <div>
                  {editAuth && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDownloadPDF}
                      disabled={isSubmitting}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {t('dialogs.accessAuthorization.buttons.downloadPass')}
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editAuth ? t('dialogs.accessAuthorization.buttons.update') : t('dialogs.accessAuthorization.buttons.create')}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
