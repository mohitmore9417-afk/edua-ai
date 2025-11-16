import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  to: string;
  studentName: string;
  title: string;
  message: string;
  type: "resource" | "grade" | "assignment";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, studentName, title, message, type }: NotificationEmailRequest = await req.json();

    // For now, just log the email that would be sent
    // Users will need to set up Resend to actually send emails
    console.log("Email notification:", {
      to,
      studentName,
      title,
      message,
      type,
    });

    const emailIcon = type === "resource" ? "📚" : type === "grade" ? "📝" : "📋";

    // This is a placeholder response
    // To enable actual email sending, users need to:
    // 1. Sign up at https://resend.com
    // 2. Verify their domain at https://resend.com/domains
    // 3. Get API key from https://resend.com/api-keys
    // 4. Add RESEND_API_KEY secret to their project

    // Uncomment and configure when Resend is set up:
    /*
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "School App <onboarding@resend.dev>",
        to: [to],
        subject: title,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">${emailIcon} ${title}</h1>
            <p style="color: #666; font-size: 16px;">Hi ${studentName},</p>
            <p style="color: #666; font-size: 16px;">${message}</p>
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
              Log in to your account to view more details.
            </p>
          </div>
        `,
      }),
    });

    const data = await res.json();
    */

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification logged (email sending requires Resend setup)" 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-notification-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
