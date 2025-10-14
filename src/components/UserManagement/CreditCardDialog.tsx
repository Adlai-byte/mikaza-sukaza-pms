import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { creditCardSchema, CreditCard, User } from "@/lib/schemas";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { CreditCard as CreditCardIcon, Plus, Loader2 } from "lucide-react";

interface CreditCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

export function CreditCardDialog({ open, onOpenChange, user }: CreditCardDialogProps) {
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [viewingCard, setViewingCard] = useState<CreditCard | null>(null);
  const { toast } = useToast();
  const { logActivity } = useActivityLogs();

  const form = useForm({
    resolver: zodResolver(creditCardSchema),
    defaultValues: {
      user_id: user.user_id || "",
      card_type: "visa" as const,
      cardholder_name: "",
      card_number: "",
      due_date: "",
      security_code: "",
    },
  });

  const fetchCreditCards = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', user.user_id);

      if (error) throw error;
      setCreditCards((data || []) as CreditCard[]);
    } catch (error) {
      console.error('Error fetching credit cards:', error);
      toast({
        title: "Error",
        description: "Failed to fetch credit cards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCreditCard = async (data: any) => {
    try {
      const { error } = await supabase
        .from('credit_cards')
        .insert([data]);

      if (error) throw error;

      await logActivity(
        'CREDIT_CARD_ADDED',
        { cardType: data.card_type, cardNumber: `****${data.card_number.slice(-4)}` },
        user.user_id,
        'Admin'
      );

      toast({
        title: "Success",
        description: "Credit card added successfully",
      });

      form.reset();
      setIsAdding(false);
      await fetchCreditCards();
    } catch (error) {
      console.error('Error adding credit card:', error);
      toast({
        title: "Error",
        description: "Failed to add credit card",
        variant: "destructive",
      });
    }
  };

  const handleEditCreditCard = async (data: any) => {
    try {
      if (!editingCard?.credit_card_id) return;

      const { error } = await supabase
        .from('credit_cards')
        .update(data)
        .eq('credit_card_id', editingCard.credit_card_id);

      if (error) throw error;

      await logActivity(
        'CREDIT_CARD_UPDATED',
        { cardType: data.card_type, cardNumber: `****${data.card_number.slice(-4)}` },
        user.user_id,
        'Admin'
      );

      toast({
        title: "Success",
        description: "Credit card updated successfully",
      });

      form.reset();
      setIsEditing(false);
      setEditingCard(null);
      await fetchCreditCards();
    } catch (error) {
      console.error('Error updating credit card:', error);
      toast({
        title: "Error",
        description: "Failed to update credit card",
        variant: "destructive",
      });
    }
  };

  const startEdit = (card: CreditCard) => {
    setEditingCard(card);
    setIsEditing(true);
    form.reset({
      user_id: card.user_id || "",
      card_type: card.card_type as any,
      cardholder_name: card.cardholder_name || "",
      card_number: card.card_number || "",
      due_date: card.due_date || "",
      security_code: card.security_code || "",
    });
  };

  const handleFormClose = () => {
    setIsAdding(false);
    setIsEditing(false);
    setEditingCard(null);
    form.reset();
  };

  const handleDeleteCreditCard = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from('credit_cards')
        .delete()
        .eq('credit_card_id', cardId);

      if (error) throw error;

      await logActivity(
        'CREDIT_CARD_DELETED',
        { cardId },
        user.user_id,
        'Admin'
      );

      toast({
        title: "Success",
        description: "Credit card deleted successfully",
      });

      await fetchCreditCards();
    } catch (error) {
      console.error('Error deleting credit card:', error);
      toast({
        title: "Error",
        description: "Failed to delete credit card",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (open && user.user_id) {
      // Only fetch if we don't already have cards or dialog just opened
      if (creditCards.length === 0) {
        fetchCreditCards();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user.user_id]); // fetchCreditCards intentionally excluded to prevent refetch on every render

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Credit Cards - {user.first_name} {user.last_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Existing Credit Cards</h3>
            <Button onClick={() => setIsAdding(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Card
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Loading credit cards...</span>
            </div>
          ) : creditCards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCardIcon className="h-12 w-12 mx-auto mb-2" />
              <p>No credit cards found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {creditCards.map((card) => (
                <div
                  key={card.credit_card_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{card.cardholder_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {card.card_type.toUpperCase()} ****{card.card_number.slice(-4)}
                    </p>
                    <p className="text-sm text-muted-foreground">Expires: {card.due_date}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingCard(card)}
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(card)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => card.credit_card_id && handleDeleteCreditCard(card.credit_card_id)}
                      disabled={!card.credit_card_id}
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
                {isEditing ? "Edit Credit Card" : "Add New Credit Card"}
              </h4>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(isEditing ? handleEditCreditCard : handleAddCreditCard)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="card_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="visa">Visa</SelectItem>
                              <SelectItem value="mastercard">Mastercard</SelectItem>
                              <SelectItem value="amex">American Express</SelectItem>
                              <SelectItem value="discover">Discover</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cardholder_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cardholder Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="card_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Number *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="1234567890123456" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="due_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiry Date *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="MM/YY" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="security_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CVV *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="123" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleFormClose}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {isEditing ? "Update Credit Card" : "Add Credit Card"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </div>

        {/* View Card Dialog */}
        {viewingCard && (
          <Dialog open={!!viewingCard} onOpenChange={() => setViewingCard(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Credit Card Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Card Type</label>
                  <p className="text-sm text-muted-foreground">{viewingCard.card_type.toUpperCase()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Cardholder Name</label>
                  <p className="text-sm text-muted-foreground">{viewingCard.cardholder_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Card Number</label>
                  <p className="text-sm text-muted-foreground">****{viewingCard.card_number.slice(-4)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Expiry Date</label>
                  <p className="text-sm text-muted-foreground">{viewingCard.due_date}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">CVV</label>
                  <p className="text-sm text-muted-foreground">***</p>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setViewingCard(null)}>Close</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}