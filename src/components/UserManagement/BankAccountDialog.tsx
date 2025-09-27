import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bankAccountSchema, BankAccount, User } from "@/lib/schemas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { Building2, Plus, Loader2 } from "lucide-react";

interface BankAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

export function BankAccountDialog({ open, onOpenChange, user }: BankAccountDialogProps) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [viewingAccount, setViewingAccount] = useState<BankAccount | null>(null);
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  const form = useForm({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      user_id: user.user_id || "",
      account_holder: "",
      bank_name: "",
      routing_number: "",
      account_number: "",
      ein: "",
      observations: "",
    },
  });

  const fetchBankAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user.user_id);

      if (error) throw error;
      setBankAccounts((data || []) as BankAccount[]);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bank accounts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBankAccount = async (data: any) => {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .insert([data]);

      if (error) throw error;

      await logActivity(
        'BANK_ACCOUNT_ADDED',
        { bankName: data.bank_name, accountNumber: `****${data.account_number.slice(-4)}` },
        user.user_id,
        'Admin'
      );

      toast({
        title: "Success",
        description: "Bank account added successfully",
      });

      form.reset();
      setIsAdding(false);
      await fetchBankAccounts();
    } catch (error) {
      console.error('Error adding bank account:', error);
      toast({
        title: "Error",
        description: "Failed to add bank account",
        variant: "destructive",
      });
    }
  };

  const handleEditBankAccount = async (data: any) => {
    try {
      if (!editingAccount?.bank_account_id) return;

      const { error } = await supabase
        .from('bank_accounts')
        .update(data)
        .eq('bank_account_id', editingAccount.bank_account_id);

      if (error) throw error;

      await logActivity(
        'BANK_ACCOUNT_UPDATED',
        { bankName: data.bank_name, accountNumber: `****${data.account_number.slice(-4)}` },
        user.user_id,
        'Admin'
      );

      toast({
        title: "Success",
        description: "Bank account updated successfully",
      });

      form.reset();
      setIsEditing(false);
      setEditingAccount(null);
      await fetchBankAccounts();
    } catch (error) {
      console.error('Error updating bank account:', error);
      toast({
        title: "Error",
        description: "Failed to update bank account",
        variant: "destructive",
      });
    }
  };

  const startEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setIsEditing(true);
    form.reset({
      user_id: account.user_id || "",
      account_holder: account.account_holder || "",
      bank_name: account.bank_name || "",
      routing_number: account.routing_number || "",
      account_number: account.account_number || "",
      ein: account.ein || "",
      observations: account.observations || "",
    });
  };

  const handleFormClose = () => {
    setIsAdding(false);
    setIsEditing(false);
    setEditingAccount(null);
    form.reset();
  };

  const handleDeleteBankAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('bank_account_id', accountId);

      if (error) throw error;

      await logActivity(
        'BANK_ACCOUNT_DELETED',
        { accountId },
        user.user_id,
        'Admin'
      );

      toast({
        title: "Success",
        description: "Bank account deleted successfully",
      });

      await fetchBankAccounts();
    } catch (error) {
      console.error('Error deleting bank account:', error);
      toast({
        title: "Error",
        description: "Failed to delete bank account",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (open && user.user_id) {
      fetchBankAccounts();
    }
  }, [open, user.user_id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Bank Accounts - {user.first_name} {user.last_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Existing Bank Accounts</h3>
            <Button onClick={() => setIsAdding(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Loading bank accounts...</span>
            </div>
          ) : bankAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-2" />
              <p>No bank accounts found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bankAccounts.map((account) => (
                <div
                  key={account.bank_account_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{account.bank_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Account Holder: {account.account_holder}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Account: ****{account.account_number.slice(-4)} | 
                      Routing: {account.routing_number}
                    </p>
                    {account.ein && (
                      <p className="text-sm text-muted-foreground">EIN: {account.ein}</p>
                    )}
                    {account.observations && (
                      <p className="text-sm text-muted-foreground">Notes: {account.observations}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingAccount(account)}
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(account)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteBankAccount(account.bank_account_id!)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(isAdding || isEditing) && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">
                {isEditing ? "Edit Bank Account" : "Add New Bank Account"}
              </h4>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(isEditing ? handleEditBankAccount : handleAddBankAccount)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="account_holder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Holder *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bank_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="routing_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Routing Number *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="9 digits" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="account_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="ein"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>EIN (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="observations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observations</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleFormClose}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {isEditing ? "Update Bank Account" : "Add Bank Account"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </div>

        {/* View Account Dialog */}
        {viewingAccount && (
          <Dialog open={!!viewingAccount} onOpenChange={() => setViewingAccount(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Bank Account Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Bank Name</label>
                  <p className="text-sm text-muted-foreground">{viewingAccount.bank_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Account Holder</label>
                  <p className="text-sm text-muted-foreground">{viewingAccount.account_holder}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Account Number</label>
                  <p className="text-sm text-muted-foreground">****{viewingAccount.account_number.slice(-4)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Routing Number</label>
                  <p className="text-sm text-muted-foreground">{viewingAccount.routing_number}</p>
                </div>
                {viewingAccount.ein && (
                  <div>
                    <label className="text-sm font-medium">EIN</label>
                    <p className="text-sm text-muted-foreground">{viewingAccount.ein}</p>
                  </div>
                )}
                {viewingAccount.observations && (
                  <div>
                    <label className="text-sm font-medium">Observations</label>
                    <p className="text-sm text-muted-foreground">{viewingAccount.observations}</p>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button onClick={() => setViewingAccount(null)}>Close</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}