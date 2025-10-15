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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Ban, Loader2, AlertTriangle } from "lucide-react";
import { User } from "@/lib/schemas";

interface SuspendUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onSuccess?: () => void;
}

export function SuspendUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: SuspendUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  const handleSuspend = async () => {
    try {
      setIsSubmitting(true);

      if (!reason.trim()) {
        toast({
          title: "Reason Required",
          description: "Please provide a reason for suspending this user.",
          variant: "destructive",
        });
        return;
      }

      // Get current admin user ID
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error("No authenticated user found");
      }

      const now = new Date().toISOString();

      // Update user status in both users and profiles tables
      const [usersResult, profilesResult] = await Promise.all([
        supabase
          .from('users')
          .update({
            account_status: 'suspended',
            suspended_at: now,
            suspended_by: currentUser.id,
            suspension_reason: reason,
          })
          .eq('user_id', user.user_id),
        supabase
          .from('profiles')
          .update({
            account_status: 'suspended',
          })
          .eq('id', user.user_id)
      ]);

      if (usersResult.error) {
        throw new Error(`Failed to suspend user: ${usersResult.error.message}`);
      }

      if (profilesResult.error) {
        console.warn('Failed to update profile status:', profilesResult.error);
      }

      // Log the activity
      await logActivity(
        'USER_SUSPENDED',
        {
          userEmail: user.email,
          userId: user.user_id,
          reason: reason,
          suspendedBy: currentUser.id,
        },
        user.user_id,
        'Admin'
      );

      toast({
        title: "User Suspended",
        description: `${user.first_name} ${user.last_name} has been suspended. They will not be able to log in until their account is reactivated.`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Failed to Suspend User",
        description: error.message || "An error occurred while suspending the user.",
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
          <DialogTitle>Suspend User Account</DialogTitle>
          <DialogDescription>
            Temporarily disable this user's access to the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Suspended users cannot log in but their data remains intact.
              You can reactivate their account at any time.
            </AlertDescription>
          </Alert>

          <div className="bg-muted p-4 rounded-md space-y-2">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">User Details:</span>
            </div>
            <div className="text-sm space-y-1 pl-6">
              <p><span className="font-medium">Name:</span> {user.first_name} {user.last_name}</p>
              <p><span className="font-medium">Email:</span> {user.email}</p>
              <p><span className="font-medium">Role:</span> {user.user_type}</p>
              <p><span className="font-medium">Status:</span> {user.account_status || 'active'}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Suspension Reason *</Label>
            <Textarea
              id="reason"
              placeholder="Enter the reason for suspending this account (e.g., policy violation, inactive, pending review)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-sm">
              <strong>What happens next:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>User will be immediately logged out</li>
                <li>Future login attempts will be blocked</li>
                <li>User data remains in the system</li>
                <li>Account can be reactivated by an admin</li>
              </ul>
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
            variant="destructive"
            onClick={handleSuspend}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Suspending...
              </>
            ) : (
              <>
                <Ban className="h-4 w-4 mr-2" />
                Suspend User
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
