import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * WhatsApp/SMS Notification Sender
 *
 * Sends notifications via Twilio WhatsApp Business API or SMS
 *
 * Environment variables required:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_WHATSAPP_NUMBER (format: whatsapp:+1234567890)
 * - TWILIO_SMS_NUMBER (format: +1234567890)
 */

interface SendNotificationRequest {
  channel: 'whatsapp' | 'sms';
  recipient: string; // Phone number in E.164 format (+1234567890)
  message: string;
  templateId?: string;
  bookingId?: string;
  propertyId?: string;
  invoiceId?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    // Parse request body
    const requestBody: SendNotificationRequest = await req.json();
    console.log('📱 Notification request:', {
      channel: requestBody.channel,
      recipient: requestBody.recipient?.substring(0, 7) + '***',
      messageLength: requestBody.message?.length,
    });

    // Validate inputs
    if (!requestBody.channel || !requestBody.recipient || !requestBody.message) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          required: ['channel', 'recipient', 'message']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate phone number format (E.164)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(requestBody.recipient)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid phone number format',
          expected: 'E.164 format (+1234567890)'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Twilio credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioWhatsAppNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER') || 'whatsapp:+14155238886' // Twilio sandbox
    const twilioSmsNumber = Deno.env.get('TWILIO_SMS_NUMBER')

    if (!twilioAccountSid || !twilioAuthToken) {
      console.error('❌ Twilio credentials not configured');
      return new Response(
        JSON.stringify({
          error: 'Notification service not configured',
          message: 'Please contact administrator to set up Twilio credentials'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (requestBody.channel === 'sms' && !twilioSmsNumber) {
      return new Response(
        JSON.stringify({
          error: 'SMS service not configured',
          message: 'Twilio SMS number not set'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine sender number based on channel
    const from = requestBody.channel === 'whatsapp'
      ? twilioWhatsAppNumber
      : twilioSmsNumber;

    // Format recipient for WhatsApp
    const to = requestBody.channel === 'whatsapp'
      ? `whatsapp:${requestBody.recipient}`
      : requestBody.recipient;

    console.log('📤 Sending via Twilio:', {
      from,
      to: to.substring(0, 15) + '***',
      channel: requestBody.channel
    });

    // Send via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const formData = new URLSearchParams();
    formData.append('From', from);
    formData.append('To', to);
    formData.append('Body', requestBody.message);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('❌ Twilio API error:', twilioData);
      throw new Error(twilioData.message || 'Failed to send notification via Twilio');
    }

    console.log('✅ Twilio message sent:', {
      sid: twilioData.sid,
      status: twilioData.status,
      price: twilioData.price,
    });

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('⚠️ Supabase credentials missing, skipping log save');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Notification sent successfully',
          messageId: twilioData.sid,
          status: twilioData.status,
          warning: 'Notification not logged to database'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Log notification to database
    const logData = {
      channel: requestBody.channel,
      recipient_phone: requestBody.recipient,
      template_id: requestBody.templateId || null,
      message_body: requestBody.message,
      booking_id: requestBody.bookingId || null,
      property_id: requestBody.propertyId || null,
      invoice_id: requestBody.invoiceId || null,
      status: twilioData.status === 'queued' || twilioData.status === 'sent' ? 'sent' : twilioData.status,
      provider_message_id: twilioData.sid,
      cost_amount: twilioData.price ? Math.abs(parseFloat(twilioData.price)) : null,
      cost_currency: twilioData.price_unit || 'USD',
      sent_at: new Date().toISOString(),
    }

    const { error: logError } = await supabase
      .from('notification_logs')
      .insert([logData])

    if (logError) {
      console.error('⚠️ Error logging notification:', logError);
      // Don't fail the request if logging fails
    } else {
      console.log('✅ Notification logged to database');
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification sent successfully',
        messageId: twilioData.sid,
        status: twilioData.status,
        cost: twilioData.price,
        currency: twilioData.price_unit,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error sending notification:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to send notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
});
