import { Provider } from "@/lib/schemas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  CreditCard,
  Star,
  Calendar,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface ServiceProviderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: Provider;
}

export function ServiceProviderDetailsDialog({
  open,
  onOpenChange,
  provider,
}: ServiceProviderDetailsDialogProps) {
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="space-y-2">
            <DialogTitle className="text-2xl">{provider.provider_name}</DialogTitle>
            <div className="flex items-center gap-2">
              <Badge
                variant={provider.is_active ? 'default' : 'destructive'}
                className="text-xs"
              >
                {provider.is_active ? 'Active' : 'Inactive'}
              </Badge>
              {provider.is_preferred && (
                <Badge className="text-xs bg-purple-100 text-purple-800">
                  <Star className="h-3 w-3 mr-1" />
                  Preferred Vendor
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {provider.provider_type}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Rating & Reviews */}
          {(provider.rating || provider.total_reviews) && (
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-500 mr-2" />
                <span className="text-2xl font-bold">
                  {provider.rating ? provider.rating.toFixed(2) : 'N/A'}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {provider.total_reviews || 0} {provider.total_reviews === 1 ? 'Review' : 'Reviews'}
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Contact Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {provider.contact_person && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Contact Person</p>
                  <p className="font-medium">{provider.contact_person}</p>
                </div>
              )}
              {provider.email && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </p>
                  <p className="font-medium">{provider.email}</p>
                </div>
              )}
              {provider.phone_primary && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Primary Phone
                  </p>
                  <p className="font-medium">{provider.phone_primary}</p>
                </div>
              )}
              {provider.phone_secondary && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Secondary Phone
                  </p>
                  <p className="font-medium">{provider.phone_secondary}</p>
                </div>
              )}
              {provider.website && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    Website
                  </p>
                  <a
                    href={provider.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    {provider.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Address */}
          {(provider.address_street || provider.address_city || provider.address_state) && (
            <>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address
                </h3>
                <div className="space-y-1">
                  {provider.address_street && <p>{provider.address_street}</p>}
                  <p>
                    {[provider.address_city, provider.address_state, provider.address_zip]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Service Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Service Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Service Type</p>
                <p className="font-medium">{provider.provider_type}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Business Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Business Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {provider.license_number && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">License Number</p>
                  <p className="font-medium">{provider.license_number}</p>
                </div>
              )}
              {provider.insurance_expiry && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Insurance Expiry
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{formatDate(provider.insurance_expiry)}</p>
                    {new Date(provider.insurance_expiry) < new Date() ? (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Expired
                      </Badge>
                    ) : (
                      <Badge variant="default" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Valid
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Emergency Contact */}
          {(provider.emergency_contact || provider.emergency_phone) && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Emergency Contact
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {provider.emergency_contact && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Contact Name</p>
                      <p className="font-medium">{provider.emergency_contact}</p>
                    </div>
                  )}
                  {provider.emergency_phone && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Emergency Phone</p>
                      <p className="font-medium">{provider.emergency_phone}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {provider.notes && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {provider.notes}
                </p>
              </div>
            </>
          )}

          {/* Metadata */}
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            {provider.created_at && (
              <div className="space-y-1">
                <p>Created</p>
                <p className="font-medium">{formatDate(provider.created_at)}</p>
              </div>
            )}
            {provider.updated_at && (
              <div className="space-y-1">
                <p>Last Updated</p>
                <p className="font-medium">{formatDate(provider.updated_at)}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
