import { useEffect } from "react";
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
import { Loader2 } from "lucide-react";
import { useUpdateKeyInventory } from "@/hooks/useKeyControl";
import {
  KeyCategory,
  KeyType,
  KEY_TYPE_LABELS,
  KEY_CATEGORY_LABELS,
} from "@/lib/schemas";

const editSchema = z.object({
  quantity: z.number().min(0, "Quantity cannot be negative"),
  notes: z.string().optional(),
});

type EditFormData = z.infer<typeof editSchema>;

interface EditQuantityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string | null;
  propertyName: string;
  category: KeyCategory;
  keyType: KeyType;
  currentQuantity: number;
  currentNotes?: string | null;
}

export function EditQuantityDialog({
  open,
  onOpenChange,
  propertyId,
  propertyName,
  category,
  keyType,
  currentQuantity,
  currentNotes,
}: EditQuantityDialogProps) {
  const { t } = useTranslation();
  const updateInventory = useUpdateKeyInventory();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      quantity: currentQuantity,
      notes: "",
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        quantity: currentQuantity,
        notes: currentNotes || "",
      });
    }
  }, [open, currentQuantity, currentNotes, reset]);

  const onSubmit = async (data: EditFormData) => {
    if (!propertyId) return;

    await updateInventory.mutateAsync({
      propertyId,
      category,
      keyType,
      quantity: data.quantity,
      notes: data.notes,
    });

    onOpenChange(false);
  };

  if (!propertyId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {t("keyControl.editDialog.title", "Edit Key Quantity")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "keyControl.editDialog.description",
              "Update the quantity for {{keyType}} in {{storageLocation}} for {{property}}",
              {
                keyType: KEY_TYPE_LABELS[keyType],
                storageLocation: KEY_CATEGORY_LABELS[category],
                property: propertyName,
              }
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("keyControl.keyType", "Key Type")}</Label>
              <div className="p-2 bg-muted rounded-md text-sm">
                {KEY_TYPE_LABELS[keyType]}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("keyControl.storageLocation", "Storage Location")}</Label>
              <div className="p-2 bg-muted rounded-md text-sm">
                {KEY_CATEGORY_LABELS[category]}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">
              {t("keyControl.quantity", "Quantity")}
            </Label>
            <Input
              id="quantity"
              type="number"
              min={0}
              {...register("quantity", { valueAsNumber: true })}
            />
            {errors.quantity && (
              <p className="text-sm text-destructive">{errors.quantity.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {t("keyControl.currentQuantity", "Current: {{quantity}}", {
                quantity: currentQuantity,
              })}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">
              {t("keyControl.notes", "Notes")} ({t("common.optional", "optional")})
            </Label>
            <Textarea
              id="notes"
              placeholder={t("keyControl.notesPlaceholder", "Add any notes about this change...")}
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
            <Button type="submit" disabled={updateInventory.isPending}>
              {updateInventory.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("common.save", "Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
