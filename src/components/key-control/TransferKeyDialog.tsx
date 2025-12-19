import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Loader2 } from "lucide-react";
import { useTransferKeys } from "@/hooks/useKeyControl";
import {
  PropertyKeySummary,
  KeyCategory,
  KeyType,
  KEY_TYPE_LABELS,
  KEY_CATEGORY_LABELS,
} from "@/lib/schemas";

const CATEGORIES: KeyCategory[] = ["office", "operational", "housekeepers", "extras"];

const transferSchema = z.object({
  quantity: z.number().min(1, "Quantity must be at least 1"),
  toCategory: z.enum(["office", "operational", "housekeepers", "extras"]),
  notes: z.string().optional(),
});

type TransferFormData = z.infer<typeof transferSchema>;

interface TransferKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: PropertyKeySummary | null;
  fromCategory: KeyCategory | null;
  keyType: KeyType | null;
}

export function TransferKeyDialog({
  open,
  onOpenChange,
  property,
  fromCategory,
  keyType,
}: TransferKeyDialogProps) {
  const { t } = useTranslation();
  const transferKeys = useTransferKeys();

  const availableQuantity = property && fromCategory && keyType
    ? property.inventory[fromCategory][keyType]
    : 0;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      quantity: 1,
      toCategory: "office",
      notes: "",
    },
  });

  const selectedToCategory = watch("toCategory");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      // Set default to category to first available that's not the from category
      const defaultTo = CATEGORIES.find((c) => c !== fromCategory) || "office";
      reset({
        quantity: 1,
        toCategory: defaultTo,
        notes: "",
      });
    }
  }, [open, fromCategory, reset]);

  const onSubmit = async (data: TransferFormData) => {
    if (!property || !fromCategory || !keyType) return;

    await transferKeys.mutateAsync({
      propertyId: property.property_id,
      keyType,
      fromCategory,
      toCategory: data.toCategory,
      quantity: data.quantity,
      notes: data.notes,
    });

    onOpenChange(false);
  };

  if (!property || !fromCategory || !keyType) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {t("keyControl.transferDialog.title", "Transfer Keys")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "keyControl.transferDialog.description",
              "Transfer keys between categories for {{property}}",
              { property: property.property_name }
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("keyControl.keyType", "Key Type")}</Label>
            <div className="p-2 bg-muted rounded-md">
              {KEY_TYPE_LABELS[keyType]}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Label>{t("keyControl.from", "From")}</Label>
              <div className="p-2 bg-muted rounded-md">
                {KEY_CATEGORY_LABELS[fromCategory]}
                <span className="ml-2 text-muted-foreground">
                  ({availableQuantity} {t("keyControl.available", "available")})
                </span>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground mt-6" />
            <div className="flex-1 space-y-2">
              <Label>{t("keyControl.to", "To")}</Label>
              <Select
                value={selectedToCategory}
                onValueChange={(value) => setValue("toCategory", value as KeyCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c !== fromCategory).map((category) => (
                    <SelectItem key={category} value={category}>
                      {KEY_CATEGORY_LABELS[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">
              {t("keyControl.quantity", "Quantity")}
            </Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={availableQuantity}
              {...register("quantity", { valueAsNumber: true })}
            />
            {errors.quantity && (
              <p className="text-sm text-destructive">{errors.quantity.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">
              {t("keyControl.notes", "Notes")} ({t("common.optional", "optional")})
            </Label>
            <Textarea
              id="notes"
              placeholder={t("keyControl.notesPlaceholder", "Add any notes about this transfer...")}
              {...register("notes")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button type="submit" disabled={transferKeys.isPending}>
              {transferKeys.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("keyControl.transfer", "Transfer")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
