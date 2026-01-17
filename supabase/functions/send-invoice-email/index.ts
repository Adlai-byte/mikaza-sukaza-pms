import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface InvoiceEmailRequest {
  invoiceId: string;
  recipientEmail: string;
  subject?: string;
  message?: string;
  ccEmails?: string[];
  pdfAttachment?: string; // Base64 encoded PDF
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    })
  }

  try {
    // Get invoice data and email details from request
    const requestBody = await req.json();
    console.log('Request body:', JSON.stringify(requestBody));

    const { invoiceId, recipientEmail, subject, message, ccEmails, pdfAttachment }: InvoiceEmailRequest = requestBody;

    // Validate inputs
    if (!invoiceId || !recipientEmail) {
      console.error('Missing required fields:', { invoiceId, recipientEmail });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: invoiceId and recipientEmail' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing email for invoice:', invoiceId, 'to:', recipientEmail);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    console.log('Supabase config:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlPrefix: supabaseUrl.substring(0, 30)
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('Fetching invoice with ID:', invoiceId);
    console.log('Invoice ID type:', typeof invoiceId);
    console.log('Invoice ID length:', invoiceId?.length);

    // First, verify we can access the invoices table at all
    const { count, error: countError } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })

    console.log('Total invoices in table:', count);
    if (countError) {
      console.error('Error accessing invoices table:', countError);
    }

    // Try to fetch the invoice without joins - select specific columns only
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select(`
        invoice_id,
        invoice_number,
        property_id,
        guest_name,
        guest_email,
        issue_date,
        due_date,
        total_amount,
        balance_due,
        status
      `)
      .eq('invoice_id', invoiceId)
      .single()

    console.log('Invoice query result:', {
      found: !!invoice,
      error: fetchError,
      invoiceData: invoice ? {
        id: invoice.invoice_id,
        number: invoice.invoice_number,
        guest: invoice.guest_name
      } : null
    });

    if (fetchError || !invoice) {
      console.error('Error fetching invoice:', {
        error: fetchError,
        code: fetchError?.code,
        message: fetchError?.message,
        details: fetchError?.details,
        hint: fetchError?.hint,
        invoiceId: invoiceId,
        invoiceIdType: typeof invoiceId
      })

      return new Response(
        JSON.stringify({
          error: 'Invoice not found',
          details: fetchError?.message || 'No invoice with this ID',
          invoiceId: invoiceId,
          errorCode: fetchError?.code,
          hint: fetchError?.hint,
          totalInvoicesInDB: count,
          debug: {
            message: 'Make sure the invoice has been saved to the database and the invoice_id is correct'
          }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Invoice fetched successfully:', invoice.invoice_number);

    // Fetch property separately
    let propertyName = 'our property';
    if (invoice.property_id) {
      const { data: property } = await supabase
        .from('properties')
        .select('property_name')
        .eq('property_id', invoice.property_id)
        .single();

      if (property) {
        propertyName = property.property_name;
      }
    }

    // Get Resend API key from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev'
    const fromName = Deno.env.get('FROM_NAME') || 'Casa & Concierge'

    console.log('Environment check:', {
      hasResendKey: !!resendApiKey,
      fromEmail,
      fromName,
    });

    if (!resendApiKey) {
      console.error('Resend API key not configured')
      return new Response(
        JSON.stringify({ error: 'Email service not configured. Please contact administrator.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create email subject
    const emailSubject = subject || `Invoice #${invoice.invoice_number} from Casa & Concierge`

    // Create HTML email body
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Casa & Concierge</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Property Management Services</p>
        </div>

        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151; margin-top: 0;">Dear ${invoice.guest_name},</p>

          <p style="font-size: 14px; color: #6b7280;">
            Please find your invoice details below for your recent stay at <strong>${propertyName}</strong>.
          </p>

          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Invoice Number:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right; font-size: 14px;">${invoice.invoice_number}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Issue Date:</td>
                <td style="padding: 8px 0; color: #111827; text-align: right; font-size: 14px;">${new Date(invoice.issue_date).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Due Date:</td>
                <td style="padding: 8px 0; color: #111827; text-align: right; font-size: 14px;">${new Date(invoice.due_date).toLocaleDateString()}</td>
              </tr>
              <tr style="border-top: 1px solid #e5e7eb;">
                <td style="padding: 12px 0 8px 0; color: #111827; font-weight: 600; font-size: 16px;">Total Amount:</td>
                <td style="padding: 12px 0 8px 0; color: #059669; font-weight: 700; text-align: right; font-size: 18px;">$${invoice.total_amount?.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 14px;">Balance Due:</td>
                <td style="padding: 8px 0; color: #dc2626; font-weight: 600; text-align: right; font-size: 16px;">$${invoice.balance_due?.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          ${message ? `
          <div style="background: #eff6ff; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #1e40af; font-size: 14px; white-space: pre-wrap;">${message}</p>
          </div>
          ` : ''}

          <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">
            If you have any questions about this invoice, please don't hesitate to contact us.
          </p>

          <p style="font-size: 14px; color: #374151; margin-top: 20px;">
            Best regards,<br>
            <strong>Casa & Concierge Property Management</strong>
          </p>
        </div>

        <div style="background: #1f2937; padding: 20px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            This is an automated email. Please do not reply directly to this message.
          </p>
        </div>
      </div>
    `

    // Send email using Resend API directly
    const emailPayload = {
      from: `${fromName} <${fromEmail}>`,
      to: [recipientEmail],
      subject: emailSubject,
      html: htmlBody,
      ...(ccEmails && ccEmails.length > 0 ? { cc: ccEmails } : {}),
      ...(pdfAttachment ? {
        attachments: [{
          filename: `Invoice-${invoice.invoice_number}.pdf`,
          content: pdfAttachment,
        }]
      } : {}),
    };

    console.log('Sending email via Resend API...');

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', {
        status: resendResponse.status,
        statusText: resendResponse.statusText,
        responseData: resendData,
        recipientEmail,
        invoiceNumber: invoice.invoice_number,
        fromEmail: fromEmail,
      });

      // Provide user-friendly error messages based on status code
      let userMessage = 'Failed to send email';
      let troubleshooting = '';

      if (resendResponse.status === 403) {
        userMessage = 'Email service permission denied';
        troubleshooting = 'The FROM_EMAIL domain may not be verified in Resend. Please verify the domain at https://resend.com/domains or use onboarding@resend.dev for testing.';
      } else if (resendResponse.status === 401) {
        userMessage = 'Email service authentication failed';
        troubleshooting = 'The RESEND_API_KEY may be invalid or expired. Please check your API key at https://resend.com/api-keys';
      } else if (resendResponse.status === 422) {
        userMessage = 'Invalid email data';
        troubleshooting = 'Please check the recipient email address and email content.';
      } else if (resendResponse.status === 429) {
        userMessage = 'Too many email requests';
        troubleshooting = 'Rate limit exceeded. Please wait a moment and try again.';
      }

      return new Response(
        JSON.stringify({
          error: userMessage,
          details: resendData.message || resendData.error || resendData.name || 'Error from Resend API',
          troubleshooting: troubleshooting,
          resendStatusCode: resendResponse.status,
          resendError: resendData,
          fromEmail: fromEmail,
          recipientEmail: recipientEmail
        }),
        { status: resendResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Email sent successfully via Resend:', resendData);

    // Update invoice status to 'sent' and record sent date
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'sent',
        sent_date: new Date().toISOString()
      })
      .eq('invoice_id', invoiceId)

    if (updateError) {
      console.error('Error updating invoice status:', updateError)
      // Don't fail the request if status update fails - email was sent successfully
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invoice email sent successfully',
        sentTo: recipientEmail,
        emailId: resendData?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending invoice email:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
