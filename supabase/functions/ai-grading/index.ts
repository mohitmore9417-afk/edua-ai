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
    const { submissionId, content, assignmentTitle } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Call Lovable AI for grading
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an intelligent grading assistant for teachers. Analyze student submissions and provide:
1. A grade out of 100
2. Detailed, constructive feedback highlighting strengths and areas for improvement
3. Specific suggestions for enhancement

Be fair, encouraging, and educational in your assessment.`
          },
          {
            role: "user",
            content: `Assignment: ${assignmentTitle}

Student Submission:
${content}

Please provide a grade (0-100) and detailed feedback.`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Parse grade from response (looking for numbers 0-100)
    const gradeMatch = aiResponse.match(/\b(\d{1,3})\b/);
    const suggestedGrade = gradeMatch ? Math.min(parseInt(gradeMatch[1]), 100) : 75;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update submission with AI feedback
    const { error: updateError } = await supabase
      .from("assignment_submissions")
      .update({
        ai_feedback: aiResponse,
        grade: suggestedGrade,
      })
      .eq("id", submissionId);

    if (updateError) {
      console.error("Error updating submission:", updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        grade: suggestedGrade,
        feedback: aiResponse,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-grading function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});