import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    console.log('Syncing emails for:', email);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get account details
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('email', email)
      .single();

    if (accountError) throw accountError;
    if (!account) throw new Error('Account not found');

    console.log('Account found:', account.email);

    // Simulate IMAP connection and email fetching
    // In production, this would use a real IMAP library
    const mockEmails = generateMockEmails(account);

    // Insert emails
    for (const emailData of mockEmails) {
      const { error: insertError } = await supabase
        .from('emails')
        .upsert({
          ...emailData,
          account_id: account.id,
          user_id: account.user_id,
        }, {
          onConflict: 'account_id,message_id'
        });

      if (insertError) {
        console.error('Error inserting email:', insertError);
      } else {
        console.log('Inserted email:', emailData.subject);
        
        // Categorize email with AI
        await supabase.functions.invoke('categorize-email', {
          body: { emailId: emailData.message_id }
        });
      }
    }

    // Update last sync time
    await supabase
      .from('email_accounts')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', account.id);

    return new Response(
      JSON.stringify({ success: true, count: mockEmails.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateMockEmails(account: any) {
  const subjects = [
    "Re: Job Application - Software Engineer Position",
    "Great to connect! Let's schedule a call",
    "Not interested at this time",
    "Out of Office: Vacation until next week",
    "Special offer just for you!",
    "Your application has been reviewed",
  ];

  const bodies = [
    "Thank you for applying. We'd love to discuss the position further.",
    "Hi! I'm interested in learning more about your product. When can we meet?",
    "Thank you for reaching out, but we're not looking for this right now.",
    "I'm currently out of the office and will respond when I return.",
    "Click here for an exclusive deal! Limited time only!!!",
    "We've reviewed your profile and would like to move forward with an interview.",
  ];

  const now = new Date();
  return subjects.map((subject, i) => ({
    message_id: `msg-${account.id}-${Date.now()}-${i}`,
    from_address: `sender${i}@example.com`,
    to_address: account.email,
    subject,
    body: bodies[i],
    folder: 'INBOX',
    received_at: new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString(),
  }));
}