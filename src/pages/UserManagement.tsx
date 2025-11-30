import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { UserPlus, Users, Building2, CreditCard, RefreshCw } from "lucide-react";
import { useUsersOptimized } from "@/hooks/useUsersOptimized";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { useToast } from "@/hooks/use-toast";
import { UserForm } from "@/components/UserManagement/UserForm";
import { UserTable } from "@/components/UserManagement/UserTable";
import { BankAccountDialog } from "@/components/UserManagement/BankAccountDialog";
import { CreditCardDialog } from "@/components/UserManagement/CreditCardDialog";
import { UserDetailsDialog } from "@/components/UserManagement/UserDetailsDialog";
import { ChangePasswordDialog } from "@/components/UserManagement/ChangePasswordDialog";
import { AdminPasswordResetDialog } from "@/components/UserManagement/AdminPasswordResetDialog";
import { SuspendUserDialog } from "@/components/UserManagement/SuspendUserDialog";
import { ArchiveUserDialog } from "@/components/UserManagement/ArchiveUserDialog";
import { ReactivateUserDialog } from "@/components/UserManagement/ReactivateUserDialog";
import { User, UserInsert } from "@/lib/schemas";

export default function UserManagement() {
  const { users, loading, isFetching, createUser, updateUser, deleteUser, refetch } = useUsersOptimized();
  const { logActivity } = useActivityLogs();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [bankAccountDialogUser, setBankAccountDialogUser] = useState<User | null>(null);
  const [creditCardDialogUser, setCreditCardDialogUser] = useState<User | null>(null);
  const [userDetailsUser, setUserDetailsUser] = useState<User | null>(null);
  const [changePasswordUser, setChangePasswordUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [suspendUser, setSuspendUser] = useState<User | null>(null);
  const [archiveUser, setArchiveUser] = useState<User | null>(null);
  const [reactivateUser, setReactivateUser] = useState<User | null>(null);

  const handleCreateUser = async (userData: UserInsert) => {
    try {
      await createUser(userData);
      await logActivity('USER_CREATED', {
        userEmail: userData.email,
        userType: userData.user_type
      });
      // Close form after successful creation
      setIsFormOpen(false);
    } catch (error) {
      // Error handling is done in the mutation
      console.error('Failed to create user:', error);
    }
  };

  const handleUpdateUser = async (userData: UserInsert) => {
    if (editingUser?.user_id) {
      try {
        await updateUser(editingUser.user_id, userData);
        await logActivity('USER_UPDATED', {
          userEmail: userData.email,
          userType: userData.user_type
        }, editingUser.user_id);
        // Close form after successful update
        setIsFormOpen(false);
        setEditingUser(null);
      } catch (error) {
        // Error handling is done in the mutation
        console.error('Failed to update user:', error);
      }
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users.find(u => u.user_id === userId);
    await deleteUser(userId);
    if (user) {
      await logActivity('USER_DELETED', {
        userEmail: user.email,
        userType: user.user_type
      }, userId);
    }
  };

  const handleViewBankAccounts = (user: User) => {
    setBankAccountDialogUser(user);
  };

  const handleViewCreditCards = (user: User) => {
    setCreditCardDialogUser(user);
  };

  const handleViewDetails = (user: User) => {
    setUserDetailsUser(user);
  };

  const handleChangePassword = (user: User) => {
    setChangePasswordUser(user);
  };

  const handleResetPassword = (user: User) => {
    setResetPasswordUser(user);
  };

  const handleSuspendUser = (user: User) => {
    setSuspendUser(user);
  };

  const handleArchiveUser = (user: User) => {
    setArchiveUser(user);
  };

  const handleReactivateUser = (user: User) => {
    setReactivateUser(user);
  };

  const handleLifecycleSuccess = () => {
    // Refresh the user list after lifecycle action
    refetch();
  };

  const handlePasswordChange = async (userId: string, currentPassword: string, newPassword: string) => {
    // For self-service password change, user must verify current password via Supabase Auth
    // We'll use Supabase Auth's re-authentication + password update
    // Note: This is a simplified version - in production, consider using updatePassword with session

    const user = users.find(u => u.user_id === userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Attempt to re-authenticate with current password to verify it
    const { supabase } = await import("@/integrations/supabase/client");
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      throw new Error("Current password is incorrect");
    }

    // Update password via Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      throw new Error(`Failed to update password: ${updateError.message}`);
    }

    // Optionally update the password field in database for compatibility
    // Note: In production, consider removing this field entirely
    await updateUser(userId, { password: newPassword });

    toast({
      title: "Password Updated",
      description: "The password has been changed successfully via Supabase Auth.",
    });
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingUser(null);
  };

  const activeUsers = users.filter(user => user.is_active).length;
  const adminUsers = users.filter(user => user.user_type === 'admin').length;
  const opsUsers = users.filter(user => user.user_type === 'ops').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Manage users, roles, and permissions"
        icon={Users}
        actions={
          <>
            <Button onClick={() => refetch()} variant="outline" disabled={isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setIsFormOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </>
        }
      />

      {/* Stats Cards - Matching Dashboard Design */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Users Card */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Users</p>
                <h3 className="text-3xl font-bold text-blue-900 mt-1">
                  {loading ? '...' : users.length}
                </h3>
                <p className="text-xs text-blue-600 mt-1">
                  All registered users
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Users Card */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Active Users</p>
                <h3 className="text-3xl font-bold text-green-900 mt-1">
                  {loading ? '...' : activeUsers}
                </h3>
                <p className="text-xs text-green-600 mt-1">
                  {users.length - activeUsers} inactive
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admins Card */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Admins</p>
                <h3 className="text-3xl font-bold text-purple-900 mt-1">
                  {loading ? '...' : adminUsers}
                </h3>
                <p className="text-xs text-purple-600 mt-1">
                  Full system access
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ops Team Card */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Ops Team</p>
                <h3 className="text-3xl font-bold text-orange-900 mt-1">
                  {loading ? '...' : opsUsers}
                </h3>
                <p className="text-xs text-orange-600 mt-1">
                  Operations staff
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <CreditCard className="h-6 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <UserTable
            users={users}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
            onViewBankAccounts={handleViewBankAccounts}
            onViewCreditCards={handleViewCreditCards}
            onViewDetails={handleViewDetails}
            onChangePassword={handleChangePassword}
            onResetPassword={handleResetPassword}
            onSuspendUser={handleSuspendUser}
            onArchiveUser={handleArchiveUser}
            onReactivateUser={handleReactivateUser}
            isLoading={loading}
            isFetching={isFetching}
          />
        </CardContent>
      </Card>

      {/* User Form Modal */}
      <UserForm
        open={isFormOpen}
        onOpenChange={handleFormClose}
        user={editingUser}
        onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
      />

      {/* Bank Account Dialog */}
      {bankAccountDialogUser && (
        <BankAccountDialog
          open={!!bankAccountDialogUser}
          onOpenChange={(open) => !open && setBankAccountDialogUser(null)}
          user={bankAccountDialogUser}
        />
      )}

      {/* Credit Card Dialog */}
      {creditCardDialogUser && (
        <CreditCardDialog
          open={!!creditCardDialogUser}
          onOpenChange={(open) => !open && setCreditCardDialogUser(null)}
          user={creditCardDialogUser}
        />
      )}

      {/* User Details Dialog */}
      {userDetailsUser && (
        <UserDetailsDialog
          open={!!userDetailsUser}
          onOpenChange={(open) => !open && setUserDetailsUser(null)}
          user={userDetailsUser}
        />
      )}

      {/* Change Password Dialog */}
      {changePasswordUser && (
        <ChangePasswordDialog
          open={!!changePasswordUser}
          onOpenChange={(open) => !open && setChangePasswordUser(null)}
          user={changePasswordUser}
          onPasswordChange={handlePasswordChange}
        />
      )}

      {/* Admin Password Reset Dialog */}
      {resetPasswordUser && (
        <AdminPasswordResetDialog
          open={!!resetPasswordUser}
          onOpenChange={(open) => !open && setResetPasswordUser(null)}
          user={resetPasswordUser}
        />
      )}

      {/* Suspend User Dialog */}
      {suspendUser && (
        <SuspendUserDialog
          open={!!suspendUser}
          onOpenChange={(open) => !open && setSuspendUser(null)}
          user={suspendUser}
          onSuccess={handleLifecycleSuccess}
        />
      )}

      {/* Archive User Dialog */}
      {archiveUser && (
        <ArchiveUserDialog
          open={!!archiveUser}
          onOpenChange={(open) => !open && setArchiveUser(null)}
          user={archiveUser}
          onSuccess={handleLifecycleSuccess}
        />
      )}

      {/* Reactivate User Dialog */}
      {reactivateUser && (
        <ReactivateUserDialog
          open={!!reactivateUser}
          onOpenChange={(open) => !open && setReactivateUser(null)}
          user={reactivateUser}
          onSuccess={handleLifecycleSuccess}
        />
      )}
    </div>
  );
}