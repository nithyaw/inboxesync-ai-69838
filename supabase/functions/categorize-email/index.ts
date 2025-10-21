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
    const { emailId } = await req.json();
    console.log('Categorizing email:', emailId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get email
    const { data: email, error: emailError } = await supabase
      .from('emails')
      .select('*')
      .eq('message_id', emailId)
      .single();

    if (emailError || !email) {
      throw new Error('Email not found');
    }

    console.log('Email found:', email.subject);

    // Call Lovable AI for categorization
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an email categorization AI. Categorize emails into EXACTLY ONE of these categories:
- interested: Email shows interest or asks questions about the product/service
- meeting_booked: Email confirms a meeting or asks to schedule one
- not_interested: Email declines or shows no interest
- spam: Promotional, scam, or unsolicited emails
- out_of_office: Auto-reply messages indicating absence
- uncategorized: Doesn't fit other categories

Respond with ONLY the category name in lowercase.`
          },
          {
            role: 'user',
            content: `Subject: ${email.subject}\n\nBody: ${email.body}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('AI categorization failed');
    }

    const aiData = await aiResponse.json();
    const category = aiData.choices[0].message.content.trim().toLowerCase();
    console.log('AI categorized as:', category);

    // Update email with category
    const { error: updateError } = await supabase
      .from('emails')
      .update({ category })
      .eq('id', email.id);

    if (updateError) throw updateError;

    // If interested, trigger webhook
    if (category === 'interested') {
      console.log('Email is interested, triggering webhook...');
      await supabase.functions.invoke('notify-webhook', {
        body: { emailId: email.id }
      });
    }

    return new Response(
      JSON.stringify({ success: true, category }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Categorization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});