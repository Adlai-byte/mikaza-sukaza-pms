import React, { useState, useEffect } from 'react';
import { Send, Mail, X, FileDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSendInvoiceEmail } from '@/hooks/useInvoices';
import { Invoice } from '@/lib/schemas';
import { generateInvoicePDF, downloadInvoicePDF } from '@/lib/invoicePDF';

interface SendInvoiceEmailDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendInvoiceEmailDialog({ invoice, open, onOpenChange }: SendInvoiceEmailDialogProps) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [ccEmails, setCcEmails] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const sendEmail = useSendInvoiceEmail();

  // Pre-fill form when invoice changes
  useEffect(() => {
    if (invoice) {
      setRecipientEmail(invoice.guest_email || '');
      setSubject(`Invoice #${invoice.invoice_number} from Casa & Concierge`);
      setMessage(
        `Thank you for choosing ${invoice.property?.property_name || 'our property'}. ` +
        `Please find your invoice details below.\n\n` +
        `Payment is due by ${new Date(invoice.due_date).toLocaleDateString()}.\n\n` +
        `If you have any questions, feel free to reach out to us.`
      );
    }
  }, [invoice]);

  const handleSend = () => {
    if (!invoice || !recipientEmail) return;

    // Verify invoice has an ID (has been saved to database)
    if (!invoice.invoice_id) {
      console.error('Invoice has no ID - it may not be saved yet');
      return;
    }

    console.log('Sending email for invoice:', invoice.invoice_id);

    // Generate PDF
    const pdfBase64 = generateInvoicePDF(invoice);

    const ccEmailsList = ccEmails
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);

    sendEmail.mutate(
      {
        invoiceId: invoice.invoice_id,
        recipientEmail,
        subject,
        message,
        ccEmails: ccEmailsList.length > 0 ? ccEmailsList : undefined,
        pdfAttachment: pdfBase64,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Invoice via Email
          </DialogTitle>
          <DialogDescription>
            Send invoice #{invoice.invoice_number} to the guest via email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Invoice Summary */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-sm font-semibold">Invoice Summary</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadInvoicePDF(invoice)}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Invoice:</span>
                <span className="ml-2 font-medium">{invoice.invoice_number}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Guest:</span>
                <span className="ml-2 font-medium">{invoice.guest_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span>
                <span className="ml-2 font-semibold text-green-600">
                  ${invoice.total_amount?.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Balance Due:</span>
                <span className="ml-2 font-semibold text-orange-600">
                  ${invoice.balance_due?.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Recipient Email */}
          <div className="space-y-2">
            <Label htmlFor="recipientEmail">
              To <span className="text-red-500">*</span>
            </Label>
            <Input
              id="recipientEmail"
              type="email"
              placeholder="guest@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              required
            />
            {!invoice.guest_email && (
              <p className="text-sm text-amber-600">
                Warning: No email address on file for this guest
              </p>
            )}
          </div>

          {/* CC Emails */}
          <div className="space-y-2">
            <Label htmlFor="ccEmails">CC (Optional)</Label>
            <Input
              id="ccEmails"
              type="text"
              placeholder="email1@example.com, email2@example.com"
              value={ccEmails}
              onChange={(e) => setCcEmails(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple emails with commas
            </p>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">
              Subject <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subject"
              type="text"
              placeholder="Invoice subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to the guest..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This message will be included in the email body along with invoice details
            </p>
          </div>

          {/* Email Preview Note */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> The email will be professionally formatted with invoice details,
              property information, and your custom message. A PDF version of the invoice will be
              automatically attached. The invoice status will be automatically updated to "Sent"
              after successful delivery.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sendEmail.isPending}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!recipientEmail || !subject || sendEmail.isPending}
          >
            {sendEmail.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Email & Mark as Sent
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
