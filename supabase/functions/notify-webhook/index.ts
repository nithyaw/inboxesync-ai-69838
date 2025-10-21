import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SLACK_WEBHOOK = "https://hooks.slack.com/services/YOUR/WEBHOOK/URL";
const WEBHOOK_SITE = "https://webhook.site/unique-id";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emailId } = await req.json();
    console.log('Notifying webhook for email:', emailId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get email
    const { data: email, error: emailError } = await supabase
      .from('emails')
      .select('*')
      .eq('id', emailId)
      .single();

    if (emailError || !email) {
      throw new Error('Email not found');
    }

    console.log('Sending notifications for interested email:', email.subject);

    // Send to Slack
    const slackPayload = {
      text: `🎯 New Interested Email!`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🎯 New Interested Lead"
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*From:*\n${email.from_address}`
            },
            {
              type: "mrkdwn",
              text: `*Subject:*\n${email.subject}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Message:*\n${email.body.substring(0, 200)}...`
          }
        }
      ]
    };

    try {
      await fetch(SLACK_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackPayload),
      });
      console.log('Slack notification sent');
    } catch (error) {
      console.error('Slack notification failed:', error);
    }

    // Send to webhook.site
    const webhookPayload = {
      event: 'email.interested',
      timestamp: new Date().toISOString(),
      email: {
        id: email.id,
        from: email.from_address,
        subject: email.subject,
        body: email.body,
        category: email.category,
        received_at: email.received_at,
      }
    };

    let webhookResponse = null;
    try {
      const webhookResult = await fetch(WEBHOOK_SITE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });
      webhookResponse = await webhookResult.text();
      console.log('Webhook.site notification sent');
    } catch (error) {
      console.error('Webhook.site notification failed:', error);
    }

    // Log notification
    await supabase
      .from('webhook_notifications')
      .insert({
        email_id: email.id,
        webhook_url: WEBHOOK_SITE,
        status: 'sent',
        response: webhookResponse,
      });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook notification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});