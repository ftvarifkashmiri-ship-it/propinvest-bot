import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return Response.json({ ok: false, error: "TELEGRAM_BOT_TOKEN not set" }, { status: 500 });
    }

    // Setup database tables
    const { ensureTablesExist } = await import("@/bot/setup");
    await ensureTablesExist();

    // Insert default plans
    const { initializeDefaultPlans } = await import("@/bot/db");
    await initializeDefaultPlans();

    // Set webhook URL
    const webhookHost = request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const webhookUrl = process.env.WEBHOOK_URL || `${protocol}://${webhookHost}`;
    const fullWebhookUrl = `${webhookUrl}/api/webhook/${token}`;

    // Set the webhook with Telegram
    const response = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(fullWebhookUrl)}`
    );
    const result = await response.json();

    if (result.ok) {
      return Response.json({
        ok: true,
        message: "Database ready + Webhook set successfully",
        webhookUrl: fullWebhookUrl,
      });
    } else {
      return Response.json({ ok: false, error: result.description }, { status: 500 });
    }
  } catch (error) {
    console.error("Bot setup error:", error);
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
