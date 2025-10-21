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
    console.log('Suggesting reply for email:', emailId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
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

    console.log('Generating reply for:', email.subject);

    // Call Lovable AI for reply suggestion using RAG-like context
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
            content: `You are an AI email assistant. Generate professional, contextual email replies.

Product Information:
- We build email management software called Onebox
- Features: AI categorization, smart search, multi-account support
- Meeting booking link: https://cal.com/onebox-demo

Guidelines:
- Keep replies professional and concise
- If they show interest, offer to schedule a demo
- If they ask about features, highlight AI capabilities
- Always be helpful and friendly
- Sign off as "Onebox Team"`
          },
          {
            role: 'user',
            content: `Generate a reply to this email:

Subject: ${email.subject}

Body:
${email.body}

Category: ${email.category}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('AI reply generation failed');
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices[0].message.content;
    console.log('Generated reply');

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Reply suggestion error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});