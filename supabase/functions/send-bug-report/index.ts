import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface BugReportRequest {
  title: string;
  description: string;
  stepsToReproduce?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  reporterEmail: string;
  reporterName: string;
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
    // Get bug report data from request
    const requestBody = await req.json();
    console.log('Bug report request:', JSON.stringify(requestBody));

    const {
      title,
      description,
      stepsToReproduce,
      priority,
      reporterEmail,
      reporterName
    }: BugReportRequest = requestBody;

    // Validate inputs
    if (!title || !description || !priority) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, description, and priority' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing bug report:', title);

    // Get Resend API key from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev'
    const fromName = Deno.env.get('FROM_NAME') || 'Casa & Concierge Bug Reports'
    const bugReportEmail = 'vinzlloydalferez@gmail.com';

    console.log('Environment check:', {
      hasResendKey: !!resendApiKey,
      fromEmail,
      fromName,
      bugReportEmail,
    });

    if (!resendApiKey) {
      console.error('Resend API key not configured')
      return new Response(
        JSON.stringify({ error: 'Email service not configured. Please contact administrator.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Priority badge colors
    const priorityColors: Record<string, string> = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#dc2626',
    };

    const priorityColor = priorityColors[priority] || '#6b7280';

    // Create HTML email body
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🐛 Bug Report</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Casa & Concierge PMS</p>
        </div>

        <div style="padding: 30px; background: #f9fafb;">
          <div style="background: white; border-radius: 8px; padding: 25px; margin-bottom: 20px; border-left: 4px solid ${priorityColor};">
            <div style="margin-bottom: 15px;">
              <span style="background: ${priorityColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                ${priority} Priority
              </span>
            </div>
            <h2 style="margin: 0 0 10px 0; color: #111827; font-size: 22px;">${title}</h2>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              Reported by: <strong>${reporterName}</strong> (${reporterEmail})<br>
              Date: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' })}
            </p>
          </div>

          <div style="background: white; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
              📝 Description
            </h3>
            <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${description}</p>
          </div>

          ${stepsToReproduce ? `
          <div style="background: white; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
              🔄 Steps to Reproduce
            </h3>
            <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${stepsToReproduce}</p>
          </div>
          ` : ''}

          <div style="background: #eff6ff; border-radius: 8px; padding: 20px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #1e40af; font-size: 13px;">
              <strong>💡 Next Steps:</strong> Please investigate this bug report and respond to the reporter at <a href="mailto:${reporterEmail}" style="color: #2563eb;">${reporterEmail}</a> with updates or if you need more information.
            </p>
          </div>
        </div>

        <div style="background: #1f2937; padding: 20px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            This bug report was automatically generated by Casa & Concierge PMS<br>
            <a href="https://casaandconcierge.com" style="color: #60a5fa; text-decoration: none;">casaandconcierge.com</a>
          </p>
        </div>
      </div>
    `

    // Create plain text version
    const textBody = `
BUG REPORT - ${priority.toUpperCase()} PRIORITY

Title: ${title}

Reported by: ${reporterName} (${reporterEmail})
Date: ${new Date().toLocaleString()}

DESCRIPTION:
${description}

${stepsToReproduce ? `
STEPS TO REPRODUCE:
${stepsToReproduce}
` : ''}

---
This bug report was automatically generated by Casa & Concierge PMS
Please respond to the reporter at ${reporterEmail}
    `.trim()

    // Create email subject
    const emailSubject = `[${priority.toUpperCase()}] Bug Report: ${title}`

    // Send email using Resend API
    const emailPayload = {
      from: `${fromName} <${fromEmail}>`,
      to: [bugReportEmail],
      reply_to: reporterEmail,
      subject: emailSubject,
      html: htmlBody,
      text: textBody,
    };

    console.log('Sending bug report email via Resend API...');

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
      return new Response(
        JSON.stringify({
          error: 'Failed to send bug report email',
          details: resendData.message || 'Error from Resend API'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Bug report email sent successfully via Resend:', resendData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Bug report sent successfully',
        sentTo: bugReportEmail,
        emailId: resendData?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending bug report email:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to send bug report',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
