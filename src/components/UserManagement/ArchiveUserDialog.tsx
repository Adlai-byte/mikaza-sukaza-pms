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
import { Archive, Loader2, AlertTriangle } from "lucide-react";
import { User } from "@/lib/schemas";

interface ArchiveUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onSuccess?: () => void;
}

export function ArchiveUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: ArchiveUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  const handleArchive = async () => {
    try {
      setIsSubmitting(true);

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
            account_status: 'archived',
            archived_at: now,
            archived_by: currentUser.id,
            is_active: false,
          })
          .eq('user_id', user.user_id),
        supabase
          .from('profiles')
          .update({
            account_status: 'archived',
          })
          .eq('id', user.user_id)
      ]);

      if (usersResult.error) {
        throw new Error(`Failed to archive user: ${usersResult.error.message}`);
      }

      if (profilesResult.error) {
        console.warn('Failed to update profile status:', profilesResult.error);
      }

      // Log the activity
      await logActivity(
        'USER_ARCHIVED',
        {
          userEmail: user.email,
          userId: user.user_id,
          archivedBy: currentUser.id,
        },
        user.user_id,
        'Admin'
      );

      toast({
        title: "User Archived",
        description: `${user.first_name} ${user.last_name} has been archived. Their account is now hidden from the active user list.`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Failed to Archive User",
        description: error.message || "An error occurred while archiving the user.",
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
          <DialogTitle>Archive User Account</DialogTitle>
          <DialogDescription>
            Permanently deactivate this user account (soft delete).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Archiving is a permanent deactivation.
              The user will be hidden from the active user list and cannot log in.
              Use "Suspend" for temporary blocks instead.
            </AlertDescription>
          </Alert>

          <div className="bg-muted p-4 rounded-md space-y-2">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">User Details:</span>
            </div>
            <div className="text-sm space-y-1 pl-6">
              <p><span className="font-medium">Name:</span> {user.first_name} {user.last_name}</p>
              <p><span className="font-medium">Email:</span> {user.email}</p>
              <p><span className="font-medium">Role:</span> {user.user_type}</p>
              <p><span className="font-medium">Status:</span> {user.account_status || 'active'}</p>
            </div>
          </div>

          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-sm">
              <strong>What happens when you archive:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>User account is marked as "archived"</li>
                <li>User cannot log in</li>
                <li>Hidden from active user lists</li>
                <li>All user data is preserved</li>
                <li>Can be restored by database admin if needed</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert variant="default" className="bg-yellow-50 border-yellow-200">
            <AlertDescription className="text-sm">
              <strong>Consider suspending instead if:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>The block is temporary (e.g., pending review)</li>
                <li>You may need to reactivate this account</li>
                <li>You want to maintain visibility in reports</li>
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
            onClick={handleArchive}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Archiving...
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-2" />
                Archive User
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
