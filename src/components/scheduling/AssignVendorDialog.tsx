import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateScheduledService } from '@/hooks/useServiceScheduling';
import { ScheduledService } from '@/lib/schemas';
import { Loader2, UserCheck, Wrench, Zap } from 'lucide-react';

interface Provider {
  provider_id: string;
  provider_name: string;
  email?: string;
  phone_primary?: string;
  vendor_type?: 'service' | 'utility';
}

interface AssignVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ScheduledService | null;
  vendors: Provider[];
  onAssign?: (vendorId: string) => void;
}

export function AssignVendorDialog({
  open,
  onOpenChange,
  service,
  vendors,
  onAssign,
}: AssignVendorDialogProps) {
  const { t } = useTranslation();
  const [selectedVendorId, setSelectedVendorId] = useState<string>(
    service?.vendor_id || ''
  );
  const [notes, setNotes] = useState('');
  const updateService = useUpdateScheduledService();

  // Group vendors by type
  const { serviceVendors, utilityVendors } = useMemo(() => {
    const serviceVendors = vendors.filter(v => v.vendor_type === 'service' || !v.vendor_type);
    const utilityVendors = vendors.filter(v => v.vendor_type === 'utility');
    return { serviceVendors, utilityVendors };
  }, [vendors]);

  const handleAssign = async () => {
    if (!service || !selectedVendorId) return;

    await updateService.mutateAsync({
      scheduleId: service.schedule_id,
      updates: {
        vendor_id: selectedVendorId,
        allocation_status: 'assigned',
        assigned_at: new Date().toISOString(),
        notes: notes ? `${service.notes || ''}\n[Assignment Note]: ${notes}`.trim() : service.notes,
      },
    });

    setSelectedVendorId('');
    setNotes('');
    onOpenChange(false);
    onAssign?.(selectedVendorId);
  };

  const selectedVendor = vendors.find((v) => v.provider_id === selectedVendorId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            {t('serviceScheduling.assignVendor', 'Assign Vendor')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'serviceScheduling.assignVendorDescription',
              'Select a vendor to assign to this service request.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Service Info */}
          {service && (
            <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
              <p className="text-sm font-medium">
                {service.service_type?.replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(service.scheduled_date).toLocaleDateString()}{' '}
                {service.scheduled_time && `at ${service.scheduled_time}`}
              </p>
            </div>
          )}

          {/* Vendor Selection */}
          <div className="space-y-2">
            <Label htmlFor="vendor">
              {t('serviceScheduling.selectVendor', 'Select Vendor')}
            </Label>
            <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
              <SelectTrigger id="vendor">
                <SelectValue
                  placeholder={t(
                    'serviceScheduling.selectVendorPlaceholder',
                    'Choose a vendor...'
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                {serviceVendors.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      {t('providers.serviceProviders', 'Service Providers')}
                    </SelectLabel>
                    {serviceVendors.map((vendor) => (
                      <SelectItem key={vendor.provider_id} value={vendor.provider_id}>
                        {vendor.provider_name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {utilityVendors.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      {t('providers.utilityProviders', 'Utility Providers')}
                    </SelectLabel>
                    {utilityVendors.map((vendor) => (
                      <SelectItem key={vendor.provider_id} value={vendor.provider_id}>
                        {vendor.provider_name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Vendor Details */}
          {selectedVendor && (
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{selectedVendor.provider_name}</p>
                <Badge variant="outline" className="gap-1">
                  {selectedVendor.vendor_type === 'utility' ? (
                    <>
                      <Zap className="h-3 w-3" />
                      {t('providers.utility', 'Utility')}
                    </>
                  ) : (
                    <>
                      <Wrench className="h-3 w-3" />
                      {t('providers.service', 'Service')}
                    </>
                  )}
                </Badge>
              </div>
              {selectedVendor.email && (
                <p className="text-xs text-muted-foreground">
                  {selectedVendor.email}
                </p>
              )}
              {selectedVendor.phone_primary && (
                <p className="text-xs text-muted-foreground">
                  {selectedVendor.phone_primary}
                </p>
              )}
            </div>
          )}

          {/* Assignment Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              {t('serviceScheduling.assignmentNotes', 'Assignment Notes')} (
              {t('common.optional', 'Optional')})
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t(
                'serviceScheduling.assignmentNotesPlaceholder',
                'Add any special instructions for this assignment...'
              )}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedVendorId || updateService.isPending}
          >
            {updateService.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.assigning', 'Assigning...')}
              </>
            ) : (
              t('serviceScheduling.assignVendor', 'Assign Vendor')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
