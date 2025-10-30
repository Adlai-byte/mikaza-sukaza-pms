import { useState } from "react";
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
import { useVendorCOIs } from "@/hooks/useVendorCOIs";
import { useProviders } from "@/hooks/useProviders";
import { usePropertiesOptimized } from "@/hooks/usePropertiesOptimized";
import { COI_COVERAGE_TYPES, type VendorCOI } from "@/lib/schemas";
import { Upload, FileText, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Form schema for COI dialog
const coiFormSchema = z.object({
  vendor_id: z.string().uuid('Vendor is required'),
  property_id: z.string().uuid().optional().nullable(),
  insurance_company: z.string().optional(),
  policy_number: z.string().optional(),
  coverage_type: z.enum([
    'general_liability',
    'workers_compensation',
    'auto_liability',
    'professional_liability',
    'umbrella',
  ]).default('general_liability'),
  coverage_amount: z.number().min(0, 'Coverage amount must be positive'),
  valid_from: z.string().min(1, 'Valid from date is required'),
  valid_through: z.string().min(1, 'Valid through date is required'),
  file_url: z.string().optional(),
  file_name: z.string().optional(),
  status: z.enum(['active', 'expiring_soon', 'expired', 'renewed', 'cancelled']).default('active'),
  notes: z.string().optional(),
}).refine((data) => {
  const from = new Date(data.valid_from);
  const through = new Date(data.valid_through);
  return through > from;
}, {
  message: 'Valid through date must be after valid from date',
  path: ['valid_through'],
});

type COIFormData = z.infer<typeof coiFormSchema>;

interface AddCOIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCOI?: VendorCOI | null;
}

export function AddCOIDialog({ open, onOpenChange, editCOI }: AddCOIDialogProps) {
  const { toast } = useToast();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { providers: vendors } = useProviders('service');
  const { properties } = usePropertiesOptimized();
  const { createCOI, updateCOI, uploadCOIFile, isCreating, isUpdating } = useVendorCOIs();

  const form = useForm<COIFormData>({
    resolver: zodResolver(coiFormSchema),
    defaultValues: editCOI ? {
      vendor_id: editCOI.vendor_id,
      property_id: editCOI.property_id || undefined,
      coverage_type: editCOI.coverage_type,
      coverage_amount: editCOI.coverage_amount,
      valid_from: editCOI.valid_from,
      valid_through: editCOI.valid_through,
      insurance_company: editCOI.insurance_company || "",
      policy_number: editCOI.policy_number || "",
      file_url: editCOI.file_url,
      file_name: editCOI.file_name,
      status: editCOI.status,
      notes: editCOI.notes || "",
    } : {
      vendor_id: "",
      property_id: undefined,
      coverage_type: "general_liability",
      coverage_amount: 0,
      valid_from: "",
      valid_through: "",
      insurance_company: "",
      policy_number: "",
      file_url: "",
      file_name: "",
      status: "active",
      notes: "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.includes('pdf') && !file.type.includes('image')) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or image file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "File size must be less than 10MB",
          variant: "destructive",
        });
        return;
      }

      setUploadedFile(file);
      form.setValue('file_name', file.name);
    }
  };

  const onSubmit = async (data: COIFormData) => {
    try {
      setIsUploading(true);

      // Upload file if new file selected
      let fileUrl = data.file_url;
      let fileName = data.file_name;

      if (uploadedFile && data.vendor_id) {
        const uploadResult = await uploadCOIFile(uploadedFile, data.vendor_id);
        fileUrl = uploadResult.file_url;
        fileName = uploadResult.file_name;
      }

      // Validate file URL exists
      if (!fileUrl) {
        toast({
          title: "File required",
          description: "Please upload a COI document",
          variant: "destructive",
        });
        return;
      }

      const coiData = {
        ...data,
        file_url: fileUrl,
        file_name: fileName,
      };

      if (editCOI) {
        await updateCOI({
          coi_id: editCOI.coi_id,
          ...coiData,
        });

        toast({
          title: "Success",
          description: "COI updated successfully",
        });
      } else {
        await createCOI(coiData);

        toast({
          title: "Success",
          description: "COI created successfully",
        });
      }

      // Reset form and close dialog
      form.reset();
      setUploadedFile(null);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save COI",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const isSubmitting = isCreating || isUpdating || isUploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editCOI ? 'Edit' : 'Add'} Certificate of Insurance</DialogTitle>
          <DialogDescription>
            {editCOI ? 'Update' : 'Upload'} vendor insurance certificate and coverage details
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Vendor Selection */}
            <FormField
              control={form.control}
              name="vendor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor" />
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
                  <FormDescription>
                    Select the service provider for this certificate
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Property Selection (Optional) */}
            <FormField
              control={form.control}
              name="property_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property (Optional)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                    value={field.value || "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select property (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No specific property</SelectItem>
                      {properties.map((property) => (
                        <SelectItem key={property.property_id} value={property.property_id}>
                          {property.property_name || property.property_type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Link to a specific property if applicable
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Upload */}
            <FormField
              control={form.control}
              name="file_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>COI Document *</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={handleFileChange}
                          className="cursor-pointer"
                        />
                        {uploadedFile && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUploadedFile(null);
                              form.setValue('file_name', '');
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {uploadedFile ? (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <FileText className="h-4 w-4" />
                          <span>{uploadedFile.name}</span>
                        </div>
                      ) : field.value ? (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <FileText className="h-4 w-4" />
                          <span>{field.value}</span>
                        </div>
                      ) : null}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Upload PDF or image file (max 10MB)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Coverage Type */}
            <FormField
              control={form.control}
              name="coverage_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coverage Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select coverage type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(COI_COVERAGE_TYPES).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Coverage Amount */}
            <FormField
              control={form.control}
              name="coverage_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coverage Amount *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="1000000"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Coverage amount in dollars
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Insurance Company */}
            <FormField
              control={form.control}
              name="insurance_company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Insurance Company</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., State Farm, Allstate" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Policy Number */}
            <FormField
              control={form.control}
              name="policy_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Policy Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., POL-123456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valid_from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid From *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valid_through"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid Through *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                      placeholder="Additional notes about this certificate..."
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
                {editCOI ? 'Update' : 'Create'} COI
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
