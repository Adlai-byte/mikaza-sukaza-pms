import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Loader2, AlertTriangle } from "lucide-react";
import { User } from "@/lib/schemas";

interface AdminPasswordResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

export function AdminPasswordResetDialog({
  open,
  onOpenChange,
  user,
}: AdminPasswordResetDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  const handleSendResetEmail = async () => {
    try {
      setIsSubmitting(true);

      // Send password reset email via Supabase Auth
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        throw new Error(`Failed to send reset email: ${error.message}`);
      }

      // Log the activity
      await logActivity(
        'PASSWORD_RESET_REQUESTED',
        {
          userEmail: user.email,
          userId: user.user_id,
          requestedBy: 'Admin',
        },
        user.user_id,
        'Admin'
      );

      toast({
        title: "Password Reset Email Sent",
        description: `A password reset link has been sent to ${user.email}. The user can use this link to set a new password.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Failed to Send Reset Email",
        description: error.message || "An error occurred while sending the password reset email.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Password Reset Email</DialogTitle>
          <DialogDescription>
            This will send a password reset link to the user's email address.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              The user will receive an email with a secure link to reset their password.
              The link will expire after 1 hour for security reasons.
            </AlertDescription>
          </Alert>

          <div className="bg-muted p-4 rounded-md space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">User Details:</span>
            </div>
            <div className="text-sm space-y-1 pl-6">
              <p><span className="font-medium">Name:</span> {user.first_name} {user.last_name}</p>
              <p><span className="font-medium">Email:</span> {user.email}</p>
              <p><span className="font-medium">Role:</span> {user.user_type}</p>
            </div>
          </div>

          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-sm">
              <strong>What happens next:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>User receives an email with a password reset link</li>
                <li>User clicks the link and enters a new password</li>
                <li>User can immediately log in with the new password</li>
              </ol>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSendResetEmail}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Reset Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
