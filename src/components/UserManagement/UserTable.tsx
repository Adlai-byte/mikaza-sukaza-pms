import { useState } from "react";
import { User } from "@/lib/schemas";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, Trash2, Search, CreditCard, Building2, Eye, Download, Filter, Key } from "lucide-react";
import { UserTableLoadingState, UserLoadingSpinner } from "./UserTableSkeleton";
import { LoadingOverlay } from "../PropertyManagement/PropertyTableSkeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserTableProps {
  users: User[];
  onEditUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  onViewBankAccounts: (user: User) => void;
  onViewCreditCards: (user: User) => void;
  onViewDetails: (user: User) => void;
  onChangePassword: (user: User) => void;
  isLoading?: boolean;
  isFetching?: boolean;
}

export function UserTable({
  users,
  onEditUser,
  onDeleteUser,
  onViewBankAccounts,
  onViewCreditCards,
  onViewDetails,
  onChangePassword,
  isLoading = false,
  isFetching = false,
}: UserTableProps) {
  console.log('👥 UserTable render - users:', users);
  console.log('👥 UserTable render - users.length:', users.length);
  
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Show full loading skeleton on initial load
  if (isLoading) {
    return <UserTableLoadingState />;
  }

  // Show empty state if no users
  if (!isLoading && users.length === 0) {
    return <UserLoadingSpinner message="No users found" />;
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.first_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (user.last_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (user.user_type || '').toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === "all" || user.user_type === typeFilter;
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "active" && user.is_active) ||
      (statusFilter === "inactive" && !user.is_active);

    return matchesSearch && matchesType && matchesStatus;
  });

  const exportToCSV = () => {
    const headers = ["Name", "Email", "Type", "Status", "Company", "Phone", "Address", "City", "State", "ZIP", "Country"];
    const csvContent = [
      headers.join(","),
      ...filteredUsers.map(user => [
        `"${user.first_name} ${user.last_name}"`,
        `"${user.email}"`,
        `"${user.user_type}"`,
        `"${user.is_active ? 'Active' : 'Inactive'}"`,
        `"${user.company || ''}"`,
        `"${user.cellphone_primary || ''}"`,
        `"${user.address || ''}"`,
        `"${user.city || ''}"`,
        `"${user.state || ''}"`,
        `"${user.zip || ''}"`,
        `"${user.country || ''}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 relative">
      {/* Loading overlay for background fetching */}
      <LoadingOverlay isVisible={isFetching && !isLoading} />
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="ops">Ops</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="w-40">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.user_id}>
                <TableCell className="font-medium">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photo_url} />
                      <AvatarFallback className="text-xs">
                        {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{user.first_name} {user.last_name}</span>
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.user_type === 'admin' ? 'default' : 'secondary'}>
                    {user.user_type === 'admin' ? 'Admin' : 'Ops'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.is_active ? 'default' : 'destructive'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>{user.company || '-'}</TableCell>
                <TableCell>{user.cellphone_primary || '-'}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(user)}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditUser(user)}
                      title="Edit User"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onChangePassword(user)}
                      title="Change Password"
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewBankAccounts(user)}
                      title="Bank Accounts"
                    >
                      <Building2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewCreditCards(user)}
                      title="Credit Cards"
                    >
                      <CreditCard className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete User</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {user.first_name} {user.last_name}?
                            This action cannot be undone and will also delete all associated bank accounts and credit cards.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => user.user_id && onDeleteUser(user.user_id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {filteredUsers.map((user) => (
          <Card key={user.user_id} className="w-full">
            <CardContent className="p-4">
              <div className="flex space-x-4">
                {/* User Avatar */}
                <div className="flex-shrink-0">
                  <Avatar className="h-12 w-12 sm:h-16 sm:w-16">
                    <AvatarImage src={user.photo_url} />
                    <AvatarFallback className="text-sm">
                      {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                {/* User Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">
                        {user.first_name} {user.last_name}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      {user.company && (
                        <p className="text-sm text-muted-foreground">{user.company}</p>
                      )}
                      {user.cellphone_primary && (
                        <p className="text-sm text-muted-foreground">{user.cellphone_primary}</p>
                      )}
                    </div>
                    
                    {/* Status Badges */}
                    <div className="flex flex-col space-y-1 items-end">
                      <Badge variant={user.user_type === 'admin' ? 'default' : 'secondary'} className="text-xs">
                        {user.user_type === 'admin' ? 'Admin' : 'Ops'}
                      </Badge>
                      <Badge variant={user.is_active ? 'default' : 'destructive'} className="text-xs">
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(user)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditUser(user)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onChangePassword(user)}
                        className="h-8 w-8 p-0"
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewBankAccounts(user)}
                        className="h-8 w-8 p-0"
                      >
                        <Building2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewCreditCards(user)}
                        className="h-8 w-8 p-0"
                      >
                        <CreditCard className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-sm mx-4">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete User</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {user.first_name} {user.last_name}? 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => user.user_id && onDeleteUser(user.user_id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}