import { initBot, getBot } from "@/bot/index";

export const dynamic = "force-dynamic";

let botStarted = false;

export async function GET() {
  if (!botStarted) {
    try {
      await initBot();
      botStarted = true;
      return Response.json({ ok: true, message: "Bot started successfully" });
    } catch (error) {
      console.error("Failed to start bot:", error);
      return Response.json({ ok: false, error: String(error) }, { status: 500 });
    }
  }
  return Response.json({ ok: true, message: "Bot is already running" });
}
