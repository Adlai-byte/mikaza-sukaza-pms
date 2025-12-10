import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Key,
  Globe,
  Server,
  Building2,
  Loader2,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  type PasswordEntry,
  type DecryptedPasswordEntry,
  ENTRY_TYPE_LABELS,
  type PasswordEntryType,
} from "@/hooks/usePasswordVault";
import { format } from "date-fns";

interface ViewPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: PasswordEntry | null;
  decryptedEntry: DecryptedPasswordEntry | null;
  isDecrypting?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ViewPasswordDialog({
  open,
  onOpenChange,
  entry,
  decryptedEntry,
  isDecrypting = false,
  onEdit,
  onDelete,
}: ViewPasswordDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Reset show password when dialog closes
  useEffect(() => {
    if (!open) {
      setShowPassword(false);
      setCopiedField(null);
    }
  }, [open]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({
        title: t("common.copied", "Copied"),
        description: t("passwordVault.view.copiedToClipboard", "Copied to clipboard"),
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast({
        title: t("common.error", "Error"),
        description: t("passwordVault.view.copyFailed", "Failed to copy to clipboard"),
        variant: "destructive",
      });
    }
  };

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

  const getEntryTypeBadgeVariant = (type: PasswordEntryType) => {
    switch (type) {
      case "property_code":
        return "default";
      case "service_account":
        return "secondary";
      case "internal_system":
        return "outline";
    }
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getEntryTypeIcon(entry.entry_type)}
            {entry.name}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge variant={getEntryTypeBadgeVariant(entry.entry_type)}>
              {ENTRY_TYPE_LABELS[entry.entry_type]}
            </Badge>
            <Badge variant="outline">{entry.category}</Badge>
          </DialogDescription>
        </DialogHeader>

        {isDecrypting ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              {t("passwordVault.view.decrypting", "Decrypting...")}
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Property */}
            {entry.property && (
              <div className="space-y-1">
                <Label className="text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {t("passwordVault.fields.property", "Property")}
                </Label>
                <div className="text-sm">
                  {entry.property.property_type}
                </div>
              </div>
            )}

            {/* Username */}
            {decryptedEntry?.username && (
              <div className="space-y-1">
                <Label className="text-muted-foreground">
                  {t("passwordVault.fields.username", "Username / Email")}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={decryptedEntry.username}
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(decryptedEntry.username!, "username")}
                  >
                    {copiedField === "username" ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Password */}
            <div className="space-y-1">
              <Label className="text-muted-foreground">
                {t("passwordVault.fields.password", "Password / Code")}
              </Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    readOnly
                    type={showPassword ? "text" : "password"}
                    value={decryptedEntry?.password || "••••••••"}
                    className="font-mono pr-10"
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
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => decryptedEntry?.password && copyToClipboard(decryptedEntry.password, "password")}
                  disabled={!decryptedEntry?.password}
                >
                  {copiedField === "password" ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* URL */}
            {entry.url && (
              <div className="space-y-1">
                <Label className="text-muted-foreground">
                  {t("passwordVault.fields.url", "Website URL")}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={entry.url}
                    className="text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(entry.url!, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Notes */}
            {decryptedEntry?.notes && (
              <div className="space-y-1">
                <Label className="text-muted-foreground">
                  {t("passwordVault.fields.notes", "Notes")}
                </Label>
                <Textarea
                  readOnly
                  value={decryptedEntry.notes}
                  className="resize-none"
                  rows={3}
                />
              </div>
            )}

            {/* Metadata */}
            <div className="pt-2 border-t space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                {t("passwordVault.view.created", "Created")}: {format(new Date(entry.created_at), "PPp")}
              </div>
              {entry.last_rotated_at && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  {t("passwordVault.view.lastRotated", "Last rotated")}: {format(new Date(entry.last_rotated_at), "PPp")}
                </div>
              )}
              {entry.created_user && (
                <div>
                  {t("passwordVault.view.createdBy", "Created by")}: {entry.created_user.first_name} {entry.created_user.last_name}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              className="sm:mr-auto"
            >
              {t("common.delete", "Delete")}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("common.close", "Close")}
          </Button>
          {onEdit && (
            <Button type="button" onClick={onEdit}>
              {t("common.edit", "Edit")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
