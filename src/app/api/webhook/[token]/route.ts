import { initBot, getBot } from "@/bot/index";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

let botInitialized = false;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Verify the token matches our bot token
  if (token !== process.env.TELEGRAM_BOT_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Ensure bot is initialized
  if (!botInitialized) {
    await initBot();
    botInitialized = true;
  }

  const bot = getBot();
  if (!bot) {
    return new Response("Bot not initialized", { status: 500 });
  }

  try {
    const update = await request.json();
    // Process the update through the bot's internal handler
    (bot as any).processUpdate(update);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Error", { status: 500 });
  }
}

export async function GET() {
  return Response.json({ ok: true, message: "Telegram webhook endpoint is active" });
}
