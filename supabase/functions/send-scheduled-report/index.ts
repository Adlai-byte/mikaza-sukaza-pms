import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ScheduledReportRequest {
  scheduleId: string;
  isManualTrigger?: boolean;
}

interface ReportRow {
  clientProperty: string;
  positive: number;
  negative: number;
  currentBalance: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    })
  }

  const startTime = Date.now();
  let historyId: string | null = null;
  let scheduleId: string | null = null;

  try {
    const requestBody = await req.json();
    console.log('Request body:', JSON.stringify(requestBody));

    const { scheduleId: reqScheduleId, isManualTrigger }: ScheduledReportRequest = requestBody;
    scheduleId = reqScheduleId;

    if (!scheduleId) {
      console.error('Missing required field: scheduleId');
      return new Response(
        JSON.stringify({ error: 'Missing required field: scheduleId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing scheduled report:', scheduleId, 'Manual trigger:', isManualTrigger);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

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

    // Fetch schedule configuration
    console.log('Fetching schedule configuration...');
    const { data: schedule, error: scheduleError } = await supabase
      .from('report_email_schedules')
      .select('*')
      .eq('schedule_id', scheduleId)
      .single()

    if (scheduleError || !schedule) {
      console.error('Schedule not found:', scheduleError);
      return new Response(
        JSON.stringify({ error: 'Schedule not found', details: scheduleError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Schedule found:', schedule.schedule_name);

    // Check if schedule is enabled (skip check for manual triggers)
    if (!isManualTrigger && !schedule.is_enabled) {
      console.log('Schedule is disabled, skipping...');
      return new Response(
        JSON.stringify({ message: 'Schedule is disabled', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create history record with 'sending' status
    const { data: historyData, error: historyCreateError } = await supabase
      .from('report_email_history')
      .insert({
        schedule_id: scheduleId,
        status: 'sending',
        recipient_emails: schedule.recipient_emails,
      })
      .select('history_id')
      .single()

    if (historyCreateError) {
      console.error('Failed to create history record:', historyCreateError);
    } else {
      historyId = historyData.history_id;
      console.log('Created history record:', historyId);
    }

    // Generate report data based on report type
    console.log('Generating report data for type:', schedule.report_type);
    let reportData: ReportRow[] = [];
    let reportTitle = '';

    switch (schedule.report_type) {
      case 'current_balance':
        reportTitle = 'Current Balance Report';
        reportData = await generateCurrentBalanceReport(supabase, schedule.report_filters);
        break;
      case 'financial_entries':
        reportTitle = 'Financial Entries Report';
        reportData = await generateFinancialEntriesReport(supabase, schedule.report_filters);
        break;
      default:
        reportTitle = 'Current Balance Report';
        reportData = await generateCurrentBalanceReport(supabase, schedule.report_filters);
    }

    console.log('Report generated with', reportData.length, 'rows');

    // Generate Excel file
    const excelBase64 = generateExcelReport(reportData, reportTitle, schedule.schedule_name);
    console.log('Excel file generated');

    // Get Resend API key and email configuration
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev'
    const fromName = Deno.env.get('FROM_NAME') || 'Casa & Concierge'
    const defaultRecipient = Deno.env.get('DEFAULT_REPORT_RECIPIENT') // Optional fallback recipient
    const alwaysCcRecipient = Deno.env.get('REPORT_CC_RECIPIENT') // Optional CC for all reports

    if (!resendApiKey) {
      throw new Error('Resend API key not configured');
    }

    // Determine recipients - use schedule recipients, or fall back to default
    let recipients = schedule.recipient_emails || [];
    if (recipients.length === 0 && defaultRecipient) {
      recipients = [defaultRecipient];
    }
    if (recipients.length === 0) {
      throw new Error('No recipient emails configured for this schedule');
    }

    // Create email HTML body
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Casa & Concierge</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Property Management Services</p>
        </div>

        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #374151; margin-top: 0;">${reportTitle}</h2>

          <p style="font-size: 14px; color: #6b7280;">
            This is your scheduled report for <strong>${formattedDate}</strong>.
          </p>

          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Schedule Name:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right; font-size: 14px;">${schedule.schedule_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Report Type:</td>
                <td style="padding: 8px 0; color: #111827; text-align: right; font-size: 14px;">${reportTitle}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Total Records:</td>
                <td style="padding: 8px 0; color: #111827; text-align: right; font-size: 14px;">${reportData.length}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 14px; color: #6b7280;">
            Please find the detailed report attached as an Excel file (.xlsx).
          </p>

          <p style="font-size: 14px; color: #374151; margin-top: 20px;">
            Best regards,<br>
            <strong>Casa & Concierge Property Management</strong>
          </p>
        </div>

        <div style="background: #1f2937; padding: 20px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            This is an automated report email. Please do not reply directly to this message.
          </p>
        </div>
      </div>
    `;

    // Send email to all recipients
    const fileName = `${schedule.schedule_name.replace(/[^a-zA-Z0-9]/g, '_')}_${now.toISOString().split('T')[0]}.xlsx`;

    const emailPayload: Record<string, unknown> = {
      from: `${fromName} <${fromEmail}>`,
      to: recipients,
      subject: `[Report] ${schedule.schedule_name} - ${formattedDate}`,
      html: htmlBody,
      attachments: [{
        filename: fileName,
        content: excelBase64,
      }]
    };

    // Add CC recipient if configured
    if (alwaysCcRecipient) {
      emailPayload.cc = [alwaysCcRecipient];
    }

    console.log('Sending email via Resend API to:', recipients, alwaysCcRecipient ? `CC: ${alwaysCcRecipient}` : '');

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
      console.error('Resend API error:', resendData);
      throw new Error(resendData.message || 'Failed to send email');
    }

    console.log('Email sent successfully:', resendData);

    const duration = Date.now() - startTime;

    // Update history record with success status
    if (historyId) {
      await supabase
        .from('report_email_history')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          row_count: reportData.length,
          duration_ms: duration,
        })
        .eq('history_id', historyId);
    }

    // Update schedule's last_sent_at
    await supabase
      .from('report_email_schedules')
      .update({
        last_sent_at: new Date().toISOString(),
      })
      .eq('schedule_id', scheduleId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Report sent successfully',
        sentTo: recipients,
        cc: alwaysCcRecipient || null,
        rowCount: reportData.length,
        duration: duration,
        emailId: resendData?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending scheduled report:', error);

    const duration = Date.now() - startTime;

    // Update history record with failed status
    if (historyId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        });

        await supabase
          .from('report_email_history')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            duration_ms: duration,
          })
          .eq('history_id', historyId);
      }
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to send report',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Generate Current Balance Report - aggregates financial entries by property
async function generateCurrentBalanceReport(
  supabase: ReturnType<typeof createClient>,
  filters: Record<string, unknown> = {}
): Promise<ReportRow[]> {
  // Fetch all properties with their owner (user)
  const { data: properties, error: propsError } = await supabase
    .from('properties')
    .select(`
      property_id,
      property_name,
      owner:users!properties_owner_id_fkey(first_name, last_name)
    `)
    .order('property_name');

  if (propsError) {
    console.error('Error fetching properties:', propsError);
    throw new Error('Failed to fetch properties');
  }

  // Fetch financial entries
  const { data: entries, error: entriesError } = await supabase
    .from('property_financial_entries')
    .select('property_id, credit, debit, balance');

  if (entriesError) {
    console.error('Error fetching financial entries:', entriesError);
    throw new Error('Failed to fetch financial entries');
  }

  // Aggregate by property
  const propertyBalances = new Map<string, { positive: number; negative: number; balance: number }>();

  for (const entry of entries || []) {
    const existing = propertyBalances.get(entry.property_id) || { positive: 0, negative: 0, balance: 0 };
    existing.positive += Number(entry.credit) || 0;
    existing.negative += Number(entry.debit) || 0;
    propertyBalances.set(entry.property_id, existing);
  }

  // Build report rows
  const reportData: ReportRow[] = [];

  for (const property of properties || []) {
    const balanceData = propertyBalances.get(property.property_id) || { positive: 0, negative: 0, balance: 0 };
    const currentBalance = balanceData.positive - balanceData.negative;

    // Get owner name from joined data
    let ownerName = 'N/A';
    if (Array.isArray(property.owner) && property.owner.length > 0) {
      const owner = property.owner[0];
      ownerName = `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || 'N/A';
    } else if (property.owner && typeof property.owner === 'object') {
      const owner = property.owner as { first_name?: string; last_name?: string };
      ownerName = `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || 'N/A';
    }

    reportData.push({
      clientProperty: `${property.property_name || 'Unknown Property'} - ${ownerName}`,
      positive: balanceData.positive,
      negative: balanceData.negative,
      currentBalance: currentBalance,
    });
  }

  // Sort by current balance descending
  reportData.sort((a, b) => b.currentBalance - a.currentBalance);

  return reportData;
}

// Generate Financial Entries Report
async function generateFinancialEntriesReport(
  supabase: ReturnType<typeof createClient>,
  filters: Record<string, unknown> = {}
): Promise<ReportRow[]> {
  // Same as current balance for now, can be extended with date filters
  return generateCurrentBalanceReport(supabase, filters);
}

// Generate Excel file and return base64
function generateExcelReport(data: ReportRow[], title: string, scheduleName: string): string {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Create header rows - explicitly type as array of mixed types
  const wsData: (string | number)[][] = [
    ['Casa & Concierge Property Management'],
    [title],
    [`Generated: ${new Date().toLocaleString()}`],
    [`Schedule: ${scheduleName}`],
    [], // Empty row
    ['Client / Property', 'Positive', 'Negative', 'Current Balance'],
  ];

  // Add data rows
  for (const row of data) {
    wsData.push([
      row.clientProperty,
      row.positive,
      row.negative,
      row.currentBalance,
    ]);
  }

  // Add totals row
  const totals = data.reduce(
    (acc, row) => ({
      positive: acc.positive + row.positive,
      negative: acc.negative + row.negative,
      balance: acc.balance + row.currentBalance,
    }),
    { positive: 0, negative: 0, balance: 0 }
  );

  wsData.push([]); // Empty row
  wsData.push(['TOTALS', totals.positive, totals.negative, totals.balance]);

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 40 }, // Client/Property
    { wch: 15 }, // Positive
    { wch: 15 }, // Negative
    { wch: 18 }, // Current Balance
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Report');

  // Generate Excel file as base64
  const excelBuffer = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

  return excelBuffer;
}
