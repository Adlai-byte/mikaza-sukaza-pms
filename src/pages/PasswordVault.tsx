import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  KeyRound,
  Plus,
  RefreshCw,
  Lock,
  Unlock,
  Key,
  Globe,
  Server,
  Search,
  Eye,
  Pencil,
  Trash2,
  History,
  ShieldCheck,
  Building2,
  AlertTriangle,
  ShieldOff,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import {
  usePasswordVault,
  usePasswordVaultStats,
  useMasterPassword,
  useDecryptPasswordEntry,
  PASSWORD_CATEGORIES,
  ENTRY_TYPE_LABELS,
  type PasswordEntry,
  type DecryptedPasswordEntry,
  type PasswordEntryType,
} from "@/hooks/usePasswordVault";
import { isVaultUnlocked } from "@/lib/password-vault-crypto";
import {
  MasterPasswordDialog,
  AddPasswordDialog,
  ViewPasswordDialog,
  AccessLogsDialog,
} from "@/components/password-vault";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function PasswordVault() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();

  // Check if user has access to password vault (admin only)
  const canViewPasswords = hasPermission(PERMISSIONS.PASSWORDS_VIEW);

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<PasswordEntryType | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Dialog states
  const [masterPasswordDialogOpen, setMasterPasswordDialogOpen] = useState(false);
  const [masterPasswordMode, setMasterPasswordMode] = useState<"unlock" | "setup">("unlock");
  const [userDismissedDialog, setUserDismissedDialog] = useState(false); // Track if user manually closed the dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Selected entry states
  const [selectedEntry, setSelectedEntry] = useState<PasswordEntry | null>(null);
  const [decryptedEntry, setDecryptedEntry] = useState<DecryptedPasswordEntry | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<PasswordEntry | null>(null);

  // Hooks
  const { entries, isLoading, refetch } = usePasswordVault();
  const { data: stats, isLoading: statsLoading } = usePasswordVaultStats();
  const {
    hasMasterPassword,
    isLoading: masterLoading,
    isError: masterError,
    isUnlocked,
    setupMasterPassword,
    unlock,
    lock,
    isSettingUp,
    refetch: refetchMaster,
  } = useMasterPassword();
  const { decryptEntry } = useDecryptPasswordEntry();
  const { deleteEntry, isDeleting } = usePasswordVault();

  // Check vault status on mount - only auto-open dialog once
  useEffect(() => {
    // Only proceed if not loading, no error, dialog is not already open, and user hasn't dismissed it
    // This prevents race conditions from re-opening the dialog
    if (!masterLoading && !masterError && !masterPasswordDialogOpen && !userDismissedDialog) {
      if (!hasMasterPassword) {
        setMasterPasswordMode("setup");
        setMasterPasswordDialogOpen(true);
      } else if (!isVaultUnlocked()) {
        setMasterPasswordMode("unlock");
        setMasterPasswordDialogOpen(true);
      }
    }
  }, [masterLoading, masterError, hasMasterPassword, masterPasswordDialogOpen, userDismissedDialog]);

  // Handler for master password dialog close
  const handleMasterPasswordDialogChange = (open: boolean) => {
    setMasterPasswordDialogOpen(open);
    // If user is closing the dialog (not opening it), mark as dismissed
    if (!open) {
      setUserDismissedDialog(true);
    }
  };

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || entry.entry_type === selectedType;
    const matchesCategory = selectedCategory === "all" || entry.category === selectedCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  // Get unique categories from entries
  const availableCategories = [...new Set(entries.map((e) => e.category))].sort();

  // Handlers
  const handleUnlockVault = () => {
    // Check if master password exists before deciding mode
    if (!hasMasterPassword) {
      setMasterPasswordMode("setup");
    } else {
      setMasterPasswordMode("unlock");
    }
    // Reset the dismissed flag since user is explicitly requesting to unlock
    setUserDismissedDialog(false);
    setMasterPasswordDialogOpen(true);
  };

  const handleLockVault = () => {
    lock();
    setDecryptedEntry(null);
    setSelectedEntry(null);
  };

  const handleViewEntry = async (entry: PasswordEntry) => {
    if (!isVaultUnlocked()) {
      handleUnlockVault();
      return;
    }

    setSelectedEntry(entry);
    setDecryptedEntry(null);
    setViewDialogOpen(true);
    setIsDecrypting(true);

    try {
      const decrypted = await decryptEntry(entry);
      setDecryptedEntry(decrypted);
    } catch (error) {
      console.error("Failed to decrypt entry:", error);
      toast({
        title: t("passwordVault.errors.decryptFailed", "Decryption Failed"),
        description: t("passwordVault.errors.decryptFailedDescription", "Unable to decrypt this entry. The vault may need to be re-unlocked."),
        variant: "destructive",
      });
      // Close dialog and prompt re-unlock
      setViewDialogOpen(false);
      lock();
      handleUnlockVault();
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleEditEntry = async () => {
    setViewDialogOpen(false);
    setAddDialogOpen(true);
  };

  const handleDeleteEntry = (entry: PasswordEntry) => {
    setEntryToDelete(entry);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (entryToDelete) {
      await deleteEntry({
        password_id: entryToDelete.password_id,
        entry_name: entryToDelete.name,
      });
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
      setViewDialogOpen(false);
    }
  };

  const handleAddNew = () => {
    if (!isVaultUnlocked()) {
      handleUnlockVault();
      return;
    }
    setSelectedEntry(null);
    setDecryptedEntry(null);
    setAddDialogOpen(true);
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

  const vaultIsUnlocked = isVaultUnlocked();

  // Show loading state while checking permissions
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show access denied for non-admin users
  if (!canViewPasswords) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("passwordVault.title", "Password Vault")}
          subtitle={t("passwordVault.subtitle", "Securely store and manage passwords and access codes")}
          icon={KeyRound}
        />
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <ShieldOff className="h-8 w-8 text-red-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-800">
                {t("passwordVault.accessDenied", "Access Denied")}
              </h3>
              <p className="text-sm text-red-600 mt-1 max-w-md">
                {t("passwordVault.accessDeniedDescription", "The Password Vault is restricted to administrators only. Contact your system administrator if you need access to passwords or access codes.")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("passwordVault.title", "Password Vault")}
        subtitle={t("passwordVault.subtitle", "Securely store and manage passwords and access codes")}
        icon={KeyRound}
        actions={
          <>
            <Button onClick={() => refetch()} variant="outline" disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              {t("common.refresh", "Refresh")}
            </Button>
            <Button onClick={() => setLogsDialogOpen(true)} variant="outline">
              <History className="mr-2 h-4 w-4" />
              {t("passwordVault.accessLogs", "Access Logs")}
            </Button>
            {vaultIsUnlocked ? (
              <Button onClick={handleLockVault} variant="outline">
                <Lock className="mr-2 h-4 w-4" />
                {t("passwordVault.lockVault", "Lock Vault")}
              </Button>
            ) : (
              <Button onClick={handleUnlockVault} variant="outline">
                <Unlock className="mr-2 h-4 w-4" />
                {t("passwordVault.unlockVault", "Unlock Vault")}
              </Button>
            )}
            <Button onClick={handleAddNew} disabled={!vaultIsUnlocked}>
              <Plus className="mr-2 h-4 w-4" />
              {t("passwordVault.addPassword", "Add Password")}
            </Button>
          </>
        }
      />

      {/* Vault Status Banner */}
      {!vaultIsUnlocked && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-3 py-4">
            <Lock className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">
                {t("passwordVault.vaultLocked", "Vault is Locked")}
              </p>
              <p className="text-sm text-yellow-600">
                {t("passwordVault.vaultLockedDescription", "Unlock the vault with your master password to view or manage passwords.")}
              </p>
            </div>
            <Button onClick={handleUnlockVault} className="ml-auto" size="sm">
              <Unlock className="mr-2 h-4 w-4" />
              {t("passwordVault.unlockVault", "Unlock")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error Banner - Show when there's an error loading master password data */}
      {masterError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800">
                {t("passwordVault.error.loadFailed", "Failed to load vault data")}
              </p>
              <p className="text-sm text-red-600">
                {t("passwordVault.error.loadFailedDescription", "There was an error loading your master password data. Please try again.")}
              </p>
            </div>
            <Button onClick={() => refetchMaster()} className="ml-auto" size="sm" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("common.retry", "Retry")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">
                  {t("passwordVault.stats.total", "Total Entries")}
                </p>
                <h3 className="text-2xl font-semibold">
                  {statsLoading ? "..." : stats?.total_entries || 0}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <Key className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">
                  {t("passwordVault.stats.propertyCodes", "Property Codes")}
                </p>
                <h3 className="text-2xl font-semibold">
                  {statsLoading ? "..." : stats?.property_codes || 0}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <Globe className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">
                  {t("passwordVault.stats.serviceAccounts", "Service Accounts")}
                </p>
                <h3 className="text-2xl font-semibold">
                  {statsLoading ? "..." : stats?.service_accounts || 0}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:bg-accent/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                <Server className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">
                  {t("passwordVault.stats.internalSystems", "Internal Systems")}
                </p>
                <h3 className="text-2xl font-semibold">
                  {statsLoading ? "..." : stats?.internal_systems || 0}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("passwordVault.searchPlaceholder", "Search passwords...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedType} onValueChange={(v) => setSelectedType(v as PasswordEntryType | "all")}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all", "All Types")}</SelectItem>
                <SelectItem value="property_code">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    {ENTRY_TYPE_LABELS.property_code}
                  </div>
                </SelectItem>
                <SelectItem value="service_account">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {ENTRY_TYPE_LABELS.service_account}
                  </div>
                </SelectItem>
                <SelectItem value="internal_system">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    {ENTRY_TYPE_LABELS.internal_system}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.allCategories", "All Categories")}</SelectItem>
                {availableCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Password Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            {t("passwordVault.entries", "Password Entries")}
            <Badge variant="secondary" className="ml-2">
              {filteredEntries.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <KeyRound className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">
                {t("passwordVault.noEntries", "No password entries found")}
              </p>
              <p className="text-sm">
                {entries.length === 0
                  ? t("passwordVault.addFirst", "Add your first password entry to get started")
                  : t("passwordVault.adjustFilters", "Try adjusting your search or filters")}
              </p>
              {entries.length === 0 && vaultIsUnlocked && (
                <Button onClick={handleAddNew} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("passwordVault.addPassword", "Add Password")}
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("passwordVault.table.name", "Name")}</TableHead>
                  <TableHead>{t("passwordVault.table.type", "Type")}</TableHead>
                  <TableHead>{t("passwordVault.table.category", "Category")}</TableHead>
                  <TableHead>{t("passwordVault.table.property", "Property")}</TableHead>
                  <TableHead>{t("passwordVault.table.lastUpdated", "Last Updated")}</TableHead>
                  <TableHead className="text-right">{t("common.actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.password_id}>
                    <TableCell className="font-medium">{entry.name}</TableCell>
                    <TableCell>
                      <Badge variant={getEntryTypeBadgeVariant(entry.entry_type)} className="flex items-center gap-1 w-fit">
                        {getEntryTypeIcon(entry.entry_type)}
                        {ENTRY_TYPE_LABELS[entry.entry_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {entry.property ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Building2 className="h-3 w-3" />
                          {entry.property.property_type}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(entry.updated_at), "PP")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewEntry(entry)}
                          title={t("common.view", "View")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedEntry(entry);
                            handleViewEntry(entry);
                          }}
                          title={t("common.edit", "Edit")}
                          disabled={!vaultIsUnlocked}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteEntry(entry)}
                          title={t("common.delete", "Delete")}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <MasterPasswordDialog
        open={masterPasswordDialogOpen}
        onOpenChange={handleMasterPasswordDialogChange}
        mode={masterPasswordMode}
        onUnlock={unlock}
        onSetup={setupMasterPassword}
        isLoading={isSettingUp}
      />

      <AddPasswordDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        editEntry={selectedEntry}
        decryptedPassword={decryptedEntry?.password}
        decryptedUsername={decryptedEntry?.username || undefined}
        decryptedNotes={decryptedEntry?.notes || undefined}
      />

      <ViewPasswordDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        entry={selectedEntry}
        decryptedEntry={decryptedEntry}
        isDecrypting={isDecrypting}
        onEdit={handleEditEntry}
        onDelete={() => selectedEntry && handleDeleteEntry(selectedEntry)}
      />

      <AccessLogsDialog
        open={logsDialogOpen}
        onOpenChange={setLogsDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t("passwordVault.delete.title", "Delete Password Entry")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("passwordVault.delete.description", "Are you sure you want to delete \"{{name}}\"? This action cannot be undone.", { name: entryToDelete?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {t("common.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
