import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userSchema, User, UserInsert } from "@/lib/schemas";
import { useActivityLogs } from "@/hooks/useActivityLogs";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, X, Loader2, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  onSubmit: (data: UserInsert) => Promise<void>;
}

export function UserForm({ open, onOpenChange, user, onSubmit }: UserFormProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.photo_url || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { logActivity } = useActivityLogs();
  const { toast } = useToast();
  
  const form = useForm<UserInsert>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      user_type: "ops",
      is_active: true,
      first_name: "",
      last_name: "",
      date_of_birth: "",
      company: "",
      cellphone_primary: "",
      cellphone_usa: "",
      whatsapp: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      country: "USA",
      photo_url: "",
    },
  });

  // Reset form when user changes or dialog opens
  useEffect(() => {
    if (open) {
      const formData = {
        email: user?.email || "",
        password: user?.password || "", // Show existing password
        confirmPassword: user?.password || "", // Match existing password
        user_type: user?.user_type || "ops",
        is_active: user?.is_active ?? true,
        first_name: user?.first_name || "",
        last_name: user?.last_name || "",
        date_of_birth: user?.date_of_birth || "",
        company: user?.company || "",
        cellphone_primary: user?.cellphone_primary || "",
        cellphone_usa: user?.cellphone_usa || "",
        whatsapp: user?.whatsapp || "",
        address: user?.address || "",
        city: user?.city || "",
        state: user?.state || "",
        zip: user?.zip || "",
        country: user?.country || "USA",
        photo_url: user?.photo_url || "",
      };

      form.reset(formData);
      setPhotoPreview(user?.photo_url || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, open]); // form.reset is stable and doesn't need to be in deps

  const handleSubmit = async (data: UserInsert) => {
    try {
      setIsSubmitting(true);

      console.log('📝 Form submission data:', {
        ...data,
        password: data.password ? '***HIDDEN***' : 'EMPTY',
        confirmPassword: data.confirmPassword ? '***HIDDEN***' : 'EMPTY'
      });

      // Remove confirmPassword from submission data and include photo URL
      const { confirmPassword, ...submissionData } = data;
      submissionData.photo_url = photoPreview || undefined;

      console.log('🚀 Submitting user data to backend...');
      await onSubmit(submissionData);

      // Log the activity
      const actionType = user ? 'USER_UPDATED' : 'USER_CREATED';
      const actionDetails = {
        userEmail: data.email,
        userType: data.user_type,
        isActive: data.is_active,
      };

      await logActivity(
        actionType,
        actionDetails,
        user?.user_id,
        'Admin'
      );

      console.log('✅ User created/updated successfully');
      form.reset();
      setPhotoPreview(null);
      setShowPassword(false);
      setShowConfirmPassword(false);
      onOpenChange(false);
    } catch (error) {
      console.error('❌ User form submission error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a valid image file (JPEG, PNG, GIF, or WebP)",
        variant: "destructive",
      });
      event.target.value = ''; // Reset input
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      event.target.value = ''; // Reset input
      return;
    }

    // Read and preview the file
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPhotoPreview(result);
      form.setValue('photo_url', result);
    };
    reader.onerror = () => {
      toast({
        title: "Upload Failed",
        description: "Failed to read the image file. Please try again.",
        variant: "destructive",
      });
      event.target.value = ''; // Reset input
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    form.setValue('photo_url', '');
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="animate-fade-in">
            {user ? "Edit User" : "Add New User"}
          </DialogTitle>
        </DialogHeader>

        <div className="animate-fade-in">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Photo Upload Section */}
              <div className="flex flex-col items-center space-y-4 animate-scale-in">
                <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={photoPreview || undefined} />
                  <AvatarFallback className="text-lg">
                    {form.watch('first_name') && form.watch('last_name')
                      ? getInitials(form.watch('first_name'), form.watch('last_name'))
                      : 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex flex-col space-y-2">
                  <label className="cursor-pointer">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Photo
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  
                  {photoPreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removePhoto}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

              <div className="grid grid-cols-2 gap-4 animate-fade-in">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="animate-fade-in">
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        {...field}
                        placeholder="Enter password"
                        className="pr-10"
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

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        {...field}
                        placeholder="Confirm password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
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

            {/* Password Requirements */}
            <div className="text-sm text-muted-foreground space-y-1 bg-muted/50 p-3 rounded-md">
              <p className="font-medium text-foreground">Password must contain:</p>
              <ul className="space-y-1">
                <li className={form.watch('password')?.length >= 8 ? "text-green-600" : ""}>
                  • At least 8 characters
                </li>
                <li className={/[A-Z]/.test(form.watch('password') || '') ? "text-green-600" : ""}>
                  • At least one uppercase letter
                </li>
                <li className={/[a-z]/.test(form.watch('password') || '') ? "text-green-600" : ""}>
                  • At least one lowercase letter
                </li>
                <li className={/[0-9]/.test(form.watch('password') || '') ? "text-green-600" : ""}>
                  • At least one number
                </li>
                <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.watch('password') || '') ? "text-green-600" : ""}>
                  • At least one special character (!@#$%...)
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4 animate-fade-in">
              <FormField
                control={form.control}
                name="user_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="ops">Ops (Internal Team)</SelectItem>
                        <SelectItem value="provider">Provider (Service Vendor)</SelectItem>
                        <SelectItem value="customer">Customer (Property Owner/Guest)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Active User
                      </FormLabel>
                      <FormMessage />
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cellphone_primary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cellphone_usa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>USA Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="city"
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
                name="state"
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
                name="zip"
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

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                      {user ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    user ? "Update User" : "Create User"
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