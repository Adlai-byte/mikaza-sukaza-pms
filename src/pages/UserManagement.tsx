import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Users, Building2, CreditCard } from "lucide-react";
import { useUsersOptimized } from "@/hooks/useUsersOptimized";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { useToast } from "@/hooks/use-toast";
import { UserForm } from "@/components/UserManagement/UserForm";
import { UserTable } from "@/components/UserManagement/UserTable";
import { BankAccountDialog } from "@/components/UserManagement/BankAccountDialog";
import { CreditCardDialog } from "@/components/UserManagement/CreditCardDialog";
import { UserDetailsDialog } from "@/components/UserManagement/UserDetailsDialog";
import { ChangePasswordDialog } from "@/components/UserManagement/ChangePasswordDialog";
import { User, UserInsert } from "@/lib/schemas";

export default function UserManagement() {
  const { users, loading, isFetching, createUser, updateUser, deleteUser } = useUsersOptimized();
  const { logActivity } = useActivityLogs();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [bankAccountDialogUser, setBankAccountDialogUser] = useState<User | null>(null);
  const [creditCardDialogUser, setCreditCardDialogUser] = useState<User | null>(null);
  const [userDetailsUser, setUserDetailsUser] = useState<User | null>(null);
  const [changePasswordUser, setChangePasswordUser] = useState<User | null>(null);

  const handleCreateUser = async (userData: UserInsert) => {
    await createUser(userData);
    await logActivity('USER_CREATED', { 
      userEmail: userData.email, 
      userType: userData.user_type 
    }, undefined, 'Admin');
  };

  const handleUpdateUser = async (userData: UserInsert) => {
    if (editingUser?.user_id) {
      await updateUser(editingUser.user_id, userData);
      await logActivity('USER_UPDATED', { 
        userEmail: userData.email, 
        userType: userData.user_type 
      }, editingUser.user_id, 'Admin');
      setEditingUser(null);
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
      }, userId, 'Admin');
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

  const handlePasswordChange = async (userId: string, currentPassword: string, newPassword: string) => {
    // Find the user
    const user = users.find(u => u.user_id === userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password matches
    if (user.password !== currentPassword) {
      throw new Error("Current password is incorrect");
    }

    // Update user with new password
    await updateUser(userId, { ...user, password: newPassword });

    toast({
      title: "Password Updated",
      description: "The password has been changed successfully.",
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and permissions
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="self-start sm:self-auto">
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ops Team</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{opsUsers}</div>
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
    </div>
  );
}