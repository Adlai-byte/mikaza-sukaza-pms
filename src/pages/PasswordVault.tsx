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
} from "lucide-react";
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

export default function PasswordVault() {
  const { t } = useTranslation();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<PasswordEntryType | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Dialog states
  const [masterPasswordDialogOpen, setMasterPasswordDialogOpen] = useState(false);
  const [masterPasswordMode, setMasterPasswordMode] = useState<"unlock" | "setup">("unlock");
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
    isUnlocked,
    setupMasterPassword,
    unlock,
    lock,
    isSettingUp,
  } = useMasterPassword();
  const { decryptEntry } = useDecryptPasswordEntry();
  const { deleteEntry, isDeleting } = usePasswordVault();

  // Check vault status on mount
  useEffect(() => {
    if (!masterLoading) {
      if (!hasMasterPassword) {
        setMasterPasswordMode("setup");
        setMasterPasswordDialogOpen(true);
      } else if (!isVaultUnlocked()) {
        setMasterPasswordMode("unlock");
        setMasterPasswordDialogOpen(true);
      }
    }
  }, [masterLoading, hasMasterPassword]);

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
    setMasterPasswordMode("unlock");
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">
                  {t("passwordVault.stats.total", "Total Entries")}
                </p>
                <h3 className="text-3xl font-bold text-blue-900 mt-1">
                  {statsLoading ? "..." : stats?.total_entries || 0}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-200 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">
                  {t("passwordVault.stats.propertyCodes", "Property Codes")}
                </p>
                <h3 className="text-3xl font-bold text-green-900 mt-1">
                  {statsLoading ? "..." : stats?.property_codes || 0}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-200 flex items-center justify-center">
                <Key className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">
                  {t("passwordVault.stats.serviceAccounts", "Service Accounts")}
                </p>
                <h3 className="text-3xl font-bold text-purple-900 mt-1">
                  {statsLoading ? "..." : stats?.service_accounts || 0}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-200 flex items-center justify-center">
                <Globe className="h-6 w-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">
                  {t("passwordVault.stats.internalSystems", "Internal Systems")}
                </p>
                <h3 className="text-3xl font-bold text-orange-900 mt-1">
                  {statsLoading ? "..." : stats?.internal_systems || 0}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-200 flex items-center justify-center">
                <Server className="h-6 w-6 text-orange-700" />
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
        onOpenChange={setMasterPasswordDialogOpen}
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
