import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Users, Building2, CreditCard } from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { UserForm } from "@/components/UserManagement/UserForm";
import { UserTable } from "@/components/UserManagement/UserTable";
import { User, UserInsert } from "@/lib/schemas";

export default function UserManagement() {
  const { users, loading, createUser, updateUser, deleteUser } = useUsers();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleCreateUser = async (userData: UserInsert) => {
    await createUser(userData);
  };

  const handleUpdateUser = async (userData: UserInsert) => {
    if (editingUser?.user_id) {
      await updateUser(editingUser.user_id, userData);
      setEditingUser(null);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    await deleteUser(userId);
  };

  const handleViewBankAccounts = (user: User) => {
    // TODO: Implement bank accounts view
    console.log("View bank accounts for user:", user.user_id);
  };

  const handleViewCreditCards = (user: User) => {
    // TODO: Implement credit cards view
    console.log("View credit cards for user:", user.user_id);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and permissions
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading users...</div>
            </div>
          ) : (
            <UserTable
              users={users}
              onEditUser={handleEditUser}
              onDeleteUser={handleDeleteUser}
              onViewBankAccounts={handleViewBankAccounts}
              onViewCreditCards={handleViewCreditCards}
            />
          )}
        </CardContent>
      </Card>

      {/* User Form Modal */}
      <UserForm
        open={isFormOpen}
        onOpenChange={handleFormClose}
        user={editingUser}
        onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
      />
    </div>
  );
}