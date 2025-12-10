import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Plus, Pencil, Trash2, Loader2, History } from "lucide-react";
import { format } from "date-fns";
import { usePasswordAccessLogs, type PasswordAccessLog } from "@/hooks/usePasswordVault";

interface AccessLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  passwordId?: string;
  entryName?: string;
}

const actionIcons = {
  viewed: Eye,
  created: Plus,
  updated: Pencil,
  deleted: Trash2,
};

const actionColors = {
  viewed: "bg-blue-100 text-blue-800",
  created: "bg-green-100 text-green-800",
  updated: "bg-yellow-100 text-yellow-800",
  deleted: "bg-red-100 text-red-800",
};

export function AccessLogsDialog({
  open,
  onOpenChange,
  passwordId,
  entryName,
}: AccessLogsDialogProps) {
  const { t } = useTranslation();
  const { data: logs = [], isLoading } = usePasswordAccessLogs(passwordId);

  const getActionIcon = (action: PasswordAccessLog["action"]) => {
    const Icon = actionIcons[action];
    return <Icon className="h-3 w-3" />;
  };

  const getActionLabel = (action: PasswordAccessLog["action"]) => {
    const labels = {
      viewed: t("passwordVault.logs.viewed", "Viewed"),
      created: t("passwordVault.logs.created", "Created"),
      updated: t("passwordVault.logs.updated", "Updated"),
      deleted: t("passwordVault.logs.deleted", "Deleted"),
    };
    return labels[action];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t("passwordVault.logs.title", "Access Logs")}
          </DialogTitle>
          <DialogDescription>
            {entryName
              ? t("passwordVault.logs.descriptionEntry", "Access history for \"{{name}}\"", { name: entryName })
              : t("passwordVault.logs.descriptionAll", "Complete audit trail of password vault access")}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mb-2 opacity-50" />
            <p>{t("passwordVault.logs.noLogs", "No access logs found")}</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("passwordVault.logs.action", "Action")}</TableHead>
                  <TableHead>{t("passwordVault.logs.user", "User")}</TableHead>
                  <TableHead>{t("passwordVault.logs.entry", "Entry")}</TableHead>
                  <TableHead>{t("passwordVault.logs.timestamp", "Timestamp")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.log_id}>
                    <TableCell>
                      <Badge className={`${actionColors[log.action]} flex items-center gap-1 w-fit`}>
                        {getActionIcon(log.action)}
                        {getActionLabel(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.user
                        ? `${log.user.first_name} ${log.user.last_name}`
                        : t("common.unknown", "Unknown")}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {log.entry_name || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(log.created_at), "PPp")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close", "Close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
