import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff, Lock, KeyRound, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Schema for unlocking vault
const unlockSchema = z.object({
  masterPassword: z.string().min(1, "Master password is required"),
});

// Schema for setting up master password
const setupSchema = z.object({
  masterPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.masterPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type UnlockFormData = z.infer<typeof unlockSchema>;
type SetupFormData = z.infer<typeof setupSchema>;

interface MasterPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "unlock" | "setup";
  onUnlock: (password: string) => Promise<boolean>;
  onSetup: (password: string) => Promise<void>;
  isLoading?: boolean;
}

export function MasterPasswordDialog({
  open,
  onOpenChange,
  mode,
  onUnlock,
  onSetup,
  isLoading = false,
}: MasterPasswordDialogProps) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlockForm = useForm<UnlockFormData>({
    resolver: zodResolver(unlockSchema),
    defaultValues: {
      masterPassword: "",
    },
  });

  const setupForm = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      masterPassword: "",
      confirmPassword: "",
    },
  });

  const handleUnlock = async (data: UnlockFormData) => {
    setError(null);
    const success = await onUnlock(data.masterPassword);
    if (success) {
      unlockForm.reset();
      onOpenChange(false);
    } else {
      setError("Invalid master password. Please try again.");
    }
  };

  const handleSetup = async (data: SetupFormData) => {
    setError(null);
    try {
      await onSetup(data.masterPassword);
      setupForm.reset();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to set up master password");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      unlockForm.reset();
      setupForm.reset();
      setError(null);
    }
    onOpenChange(newOpen);
  };

  if (mode === "setup") {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {t("passwordVault.masterPassword.setupTitle", "Set Up Master Password")}
            </DialogTitle>
            <DialogDescription>
              {t("passwordVault.masterPassword.setupDescription", "Create a strong master password to encrypt your password vault. This password will be required to view or manage any stored passwords.")}
            </DialogDescription>
          </DialogHeader>

          <Form {...setupForm}>
            <form onSubmit={setupForm.handleSubmit(handleSetup)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <FormField
                control={setupForm.control}
                name="masterPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("passwordVault.masterPassword.password", "Master Password")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter master password"
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
                    <FormDescription>
                      {t("passwordVault.masterPassword.requirements", "Must be at least 8 characters with uppercase, lowercase, number, and special character.")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={setupForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("passwordVault.masterPassword.confirmPassword", "Confirm Password")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm master password"
                          {...field}
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

              <Alert>
                <KeyRound className="h-4 w-4" />
                <AlertDescription>
                  {t("passwordVault.masterPassword.warning", "Important: Your master password cannot be recovered if forgotten. Make sure to remember it or store it securely.")}
                </AlertDescription>
              </Alert>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isLoading}
                >
                  {t("common.cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("passwordVault.masterPassword.setupButton", "Set Up Vault")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  }

  // Unlock mode
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            {t("passwordVault.masterPassword.unlockTitle", "Unlock Password Vault")}
          </DialogTitle>
          <DialogDescription>
            {t("passwordVault.masterPassword.unlockDescription", "Enter your master password to access the password vault.")}
          </DialogDescription>
        </DialogHeader>

        <Form {...unlockForm}>
          <form onSubmit={unlockForm.handleSubmit(handleUnlock)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={unlockForm.control}
              name="masterPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("passwordVault.masterPassword.password", "Master Password")}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter master password"
                        autoFocus
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("passwordVault.masterPassword.unlockButton", "Unlock")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
