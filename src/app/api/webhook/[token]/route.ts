import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Global bot instance - survives across requests on the same Vercel instance
let bot: any = null;
let initialized = false;

async function getOrCreateBot() {
  if (bot && initialized) return bot;

  const TelegramBot = (await import("node-telegram-bot-api")).default;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("No bot token");

  // Create bot in webhook-only mode (no polling)
  bot = new TelegramBot(token, { webHook: true });

  // Setup tables if needed
  if (!initialized) {
    const { ensureTablesExist } = await import("@/bot/setup");
    await ensureTablesExist();

    const { initializeDefaultPlans } = await import("@/bot/db");
    await initializeDefaultPlans();

    const { registerAllHandlers } = await import("@/bot/index");
    registerAllHandlers(bot);

    initialized = true;
    console.log("✅ Bot initialized for webhook mode");
  }

  return bot;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Verify token
  if (token !== process.env.TELEGRAM_BOT_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const b = await getOrCreateBot();
    const update = await request.json();
    b.processUpdate(update);
  } catch (error) {
    console.error("Webhook error:", error);
    // Reset so it re-creates next request
    bot = null;
    initialized = false;
  }

  // ALWAYS return 200 to Telegram (prevents webhook removal)
  return new Response("OK", { status: 200 });
}

export async function GET() {
  return Response.json({ ok: true, message: "Webhook endpoint active" });
}
