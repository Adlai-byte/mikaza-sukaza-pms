import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import {
  Zap,
  Wifi,
  Droplet,
  Flame,
  Tv,
  Shield,
  Car,
  Wrench,
  Building,
  Phone,
  Mail,
  Globe,
  Clock,
  AlertTriangle,
  MapPin,
  FileText,
} from "lucide-react";
import { UtilityProvider } from "@/lib/schemas";

interface UtilityProviderDetailsDialogProps {
  provider: UtilityProvider | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getProviderTypeIcon = (type: string) => {
  const icons: Record<string, React.ReactNode> = {
    Electric: <Zap className="h-5 w-5" />,
    Internet: <Wifi className="h-5 w-5" />,
    Water: <Droplet className="h-5 w-5" />,
    Gas: <Flame className="h-5 w-5" />,
    Cable: <Tv className="h-5 w-5" />,
    Security: <Shield className="h-5 w-5" />,
    Parking: <Car className="h-5 w-5" />,
    Maintenance: <Wrench className="h-5 w-5" />,
    Management: <Building className="h-5 w-5" />,
    Other: <FileText className="h-5 w-5" />,
  };
  return icons[type] || <Zap className="h-5 w-5" />;
};

const getProviderTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    Electric: "bg-yellow-100 text-yellow-800 border-yellow-300",
    Internet: "bg-blue-100 text-blue-800 border-blue-300",
    Water: "bg-cyan-100 text-cyan-800 border-cyan-300",
    Gas: "bg-orange-100 text-orange-800 border-orange-300",
    Cable: "bg-purple-100 text-purple-800 border-purple-300",
    Security: "bg-red-100 text-red-800 border-red-300",
    Parking: "bg-gray-100 text-gray-800 border-gray-300",
    Maintenance: "bg-green-100 text-green-800 border-green-300",
    Management: "bg-indigo-100 text-indigo-800 border-indigo-300",
    Other: "bg-slate-100 text-slate-800 border-slate-300",
  };
  return colors[type] || "bg-gray-100 text-gray-800 border-gray-300";
};

export function UtilityProviderDetailsDialog({
  provider,
  open,
  onOpenChange,
}: UtilityProviderDetailsDialogProps) {
  const { t } = useTranslation();

  if (!provider) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getProviderTypeColor(provider.provider_type)}`}>
              {getProviderTypeIcon(provider.provider_type)}
            </div>
            <div>
              <DialogTitle className="text-xl">{provider.provider_name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge variant={provider.is_active ? "default" : "secondary"}>
                  {provider.is_active ? t("common.active") : t("common.inactive")}
                </Badge>
                <Badge variant="outline" className={getProviderTypeColor(provider.provider_type)}>
                  {provider.provider_type}
                </Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Contact Information */}
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">
                {t("common.contactInformation")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {provider.phone_number && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t("common.phone")}</p>
                      <a
                        href={`tel:${provider.phone_number}`}
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        {provider.phone_number}
                      </a>
                    </div>
                  </div>
                )}
                {provider.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t("common.email")}</p>
                      <a
                        href={`mailto:${provider.email}`}
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        {provider.email}
                      </a>
                    </div>
                  </div>
                )}
                {provider.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t("common.website")}</p>
                      <a
                        href={provider.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        {provider.website}
                      </a>
                    </div>
                  </div>
                )}
                {provider.customer_service_hours && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t("utilityProviders.customerServiceHours")}</p>
                      <p className="text-sm font-medium">{provider.customer_service_hours}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          {(provider.emergency_contact || provider.emergency_phone) && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <h3 className="font-semibold text-sm text-red-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {t("utilityProviders.emergencyContact")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {provider.emergency_contact && (
                    <div>
                      <p className="text-xs text-red-600">{t("common.contactName")}</p>
                      <p className="text-sm font-medium text-red-900">{provider.emergency_contact}</p>
                    </div>
                  )}
                  {provider.emergency_phone && (
                    <div>
                      <p className="text-xs text-red-600">{t("common.phone")}</p>
                      <a
                        href={`tel:${provider.emergency_phone}`}
                        className="text-sm font-medium text-red-700 hover:underline"
                      >
                        {provider.emergency_phone}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Service Area */}
          {provider.service_area && provider.service_area.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t("utilityProviders.serviceArea")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {provider.service_area.map((area, index) => (
                    <Badge key={index} variant="outline">
                      {area}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {provider.notes && (
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">
                  {t("common.notes")}
                </h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{provider.notes}</p>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-1">
            {provider.created_at && (
              <p>
                {t("common.createdAt")}: {new Date(provider.created_at).toLocaleString()}
              </p>
            )}
            {provider.updated_at && (
              <p>
                {t("common.updatedAt")}: {new Date(provider.updated_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
