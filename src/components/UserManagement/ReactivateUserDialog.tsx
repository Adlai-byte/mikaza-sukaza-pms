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
import { CheckCircle, Loader2, Info } from "lucide-react";
import { User } from "@/lib/schemas";

interface ReactivateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onSuccess?: () => void;
}

export function ReactivateUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: ReactivateUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  const handleReactivate = async () => {
    try {
      setIsSubmitting(true);

      // Get current admin user ID
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error("No authenticated user found");
      }

      // Update user status in both users and profiles tables
      const [usersResult, profilesResult] = await Promise.all([
        supabase
          .from('users')
          .update({
            account_status: 'active',
            suspended_at: null,
            suspended_by: null,
            suspension_reason: null,
            archived_at: null,
            archived_by: null,
            is_active: true,
          })
          .eq('user_id', user.user_id),
        supabase
          .from('profiles')
          .update({
            account_status: 'active',
          })
          .eq('id', user.user_id)
      ]);

      if (usersResult.error) {
        throw new Error(`Failed to reactivate user: ${usersResult.error.message}`);
      }

      if (profilesResult.error) {
        console.warn('Failed to update profile status:', profilesResult.error);
      }

      // Log the activity
      await logActivity(
        'USER_REACTIVATED',
        {
          userEmail: user.email,
          userId: user.user_id,
          previousStatus: user.account_status,
          reactivatedBy: currentUser.id,
        },
        user.user_id,
        'Admin'
      );

      toast({
        title: "User Reactivated",
        description: `${user.first_name} ${user.last_name} has been reactivated and can now log in.`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Failed to Reactivate User",
        description: error.message || "An error occurred while reactivating the user.",
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
          <DialogTitle>Reactivate User Account</DialogTitle>
          <DialogDescription>
            Restore full access to this user account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This will restore the user's account to active status and allow them to log in.
            </AlertDescription>
          </Alert>

          <div className="bg-muted p-4 rounded-md space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">User Details:</span>
            </div>
            <div className="text-sm space-y-1 pl-6">
              <p><span className="font-medium">Name:</span> {user.first_name} {user.last_name}</p>
              <p><span className="font-medium">Email:</span> {user.email}</p>
              <p><span className="font-medium">Role:</span> {user.user_type}</p>
              <p><span className="font-medium">Current Status:</span> {user.account_status || 'active'}</p>
            </div>
          </div>

          {user.suspended_at && user.suspension_reason && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md space-y-2">
              <div className="text-sm font-medium">Previous Suspension Info:</div>
              <div className="text-sm space-y-1 pl-2">
                <p><span className="font-medium">Suspended on:</span> {new Date(user.suspended_at).toLocaleString()}</p>
                <p><span className="font-medium">Reason:</span> {user.suspension_reason}</p>
              </div>
            </div>
          )}

          {user.archived_at && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md space-y-2">
              <div className="text-sm font-medium">Previous Archive Info:</div>
              <div className="text-sm space-y-1 pl-2">
                <p><span className="font-medium">Archived on:</span> {new Date(user.archived_at).toLocaleString()}</p>
              </div>
            </div>
          )}

          <Alert variant="default" className="bg-green-50 border-green-200">
            <AlertDescription className="text-sm">
              <strong>What happens next:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Account status set to "active"</li>
                <li>User can log in immediately</li>
                <li>Full access to authorized features restored</li>
                <li>User appears in active user lists</li>
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
            onClick={handleReactivate}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reactivating...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Reactivate User
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
