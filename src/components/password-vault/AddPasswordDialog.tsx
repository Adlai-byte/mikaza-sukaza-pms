import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Loader2, Eye, EyeOff, Key, Building2, Globe, Server } from "lucide-react";
import { useState } from "react";
import { usePropertiesOptimized } from "@/hooks/usePropertiesOptimized";
import {
  usePasswordVault,
  PASSWORD_CATEGORIES,
  ENTRY_TYPE_LABELS,
  type PasswordEntryType,
  type PasswordEntry,
  type CreatePasswordEntryInput,
} from "@/hooks/usePasswordVault";

const passwordEntrySchema = z.object({
  entry_type: z.enum(["property_code", "service_account", "internal_system"]),
  property_id: z.string().optional().nullable(),
  category: z.string().min(1, "Category is required"),
  name: z.string().min(1, "Name is required"),
  username: z.string().optional().nullable(),
  password: z.string().min(1, "Password is required"),
  url: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")),
  notes: z.string().optional().nullable(),
});

type PasswordEntryFormData = z.infer<typeof passwordEntrySchema>;

interface AddPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editEntry?: PasswordEntry | null;
  decryptedPassword?: string;
  decryptedUsername?: string;
  decryptedNotes?: string;
}

export function AddPasswordDialog({
  open,
  onOpenChange,
  editEntry,
  decryptedPassword,
  decryptedUsername,
  decryptedNotes,
}: AddPasswordDialogProps) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const { properties } = usePropertiesOptimized();
  const { createEntry, updateEntry, isCreating, isUpdating } = usePasswordVault();

  const form = useForm<PasswordEntryFormData>({
    resolver: zodResolver(passwordEntrySchema),
    defaultValues: {
      entry_type: "property_code",
      property_id: undefined,
      category: "",
      name: "",
      username: "",
      password: "",
      url: "",
      notes: "",
    },
  });

  const selectedEntryType = form.watch("entry_type") as PasswordEntryType;
  const categories = PASSWORD_CATEGORIES[selectedEntryType] || [];

  // Reset form when dialog opens or editEntry changes
  useEffect(() => {
    if (open) {
      if (editEntry) {
        form.reset({
          entry_type: editEntry.entry_type,
          property_id: editEntry.property_id || undefined,
          category: editEntry.category,
          name: editEntry.name,
          username: decryptedUsername || "",
          password: decryptedPassword || "",
          url: editEntry.url || "",
          notes: decryptedNotes || "",
        });
      } else {
        form.reset({
          entry_type: "property_code",
          property_id: undefined,
          category: "",
          name: "",
          username: "",
          password: "",
          url: "",
          notes: "",
        });
      }
      setShowPassword(false);
    }
  }, [open, editEntry, decryptedPassword, decryptedUsername, decryptedNotes, form]);

  // Reset category when entry type changes
  useEffect(() => {
    if (!editEntry) {
      form.setValue("category", "");
    }
  }, [selectedEntryType, editEntry, form]);

  const onSubmit = async (data: PasswordEntryFormData) => {
    try {
      const entryData: CreatePasswordEntryInput = {
        entry_type: data.entry_type,
        property_id: data.property_id || null,
        category: data.category,
        name: data.name,
        username: data.username || null,
        password: data.password,
        url: data.url || null,
        notes: data.notes || null,
      };

      if (editEntry) {
        await updateEntry({
          password_id: editEntry.password_id,
          ...entryData,
        });
      } else {
        await createEntry(entryData);
      }

      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hook
      console.error("Error saving password entry:", error);
    }
  };

  const isSubmitting = isCreating || isUpdating;

  const getEntryTypeIcon = (type: PasswordEntryType) => {
    switch (type) {
      case "property_code":
        return <Key className="h-4 w-4" />;
      case "service_account":
        return <Globe className="h-4 w-4" />;
      case "internal_system":
        return <Server className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editEntry
              ? t("passwordVault.dialog.editTitle", "Edit Password Entry")
              : t("passwordVault.dialog.addTitle", "Add Password Entry")}
          </DialogTitle>
          <DialogDescription>
            {editEntry
              ? t("passwordVault.dialog.editDescription", "Update the password entry details.")
              : t("passwordVault.dialog.addDescription", "Add a new password entry to the secure vault.")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Entry Type */}
            <FormField
              control={form.control}
              name="entry_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("passwordVault.fields.entryType", "Entry Type")} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select entry type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(ENTRY_TYPE_LABELS) as PasswordEntryType[]).map((type) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            {getEntryTypeIcon(type)}
                            {ENTRY_TYPE_LABELS[type]}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Property (shown for property_code type) */}
            {selectedEntryType === "property_code" && (
              <FormField
                control={form.control}
                name="property_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("passwordVault.fields.property", "Property")}</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select property (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            No specific property
                          </div>
                        </SelectItem>
                        {properties.map((property) => (
                          <SelectItem key={property.property_id} value={property.property_id}>
                            {property.property_name || property.property_type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t("passwordVault.fields.propertyDescription", "Associate this password with a specific property.")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("passwordVault.fields.category", "Category")} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
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

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("passwordVault.fields.name", "Name / Label")} *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Front Door Code, Airbnb Login" {...field} />
                  </FormControl>
                  <FormDescription>
                    {t("passwordVault.fields.nameDescription", "A descriptive name to identify this password.")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Username */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("passwordVault.fields.username", "Username / Email")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="username@example.com"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("passwordVault.fields.password", "Password / Code")} *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password or code"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* URL */}
            {selectedEntryType !== "property_code" && (
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("passwordVault.fields.url", "Website URL")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("passwordVault.fields.notes", "Notes")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes or instructions..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      value={field.value || ""}
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
                {t("common.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editEntry
                  ? t("passwordVault.dialog.updateButton", "Update Password")
                  : t("passwordVault.dialog.addButton", "Add Password")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
