// Auto-start the bot when the server starts (NOT during build)
import { initBot } from "@/bot/index";
import { ensureTablesExist } from "@/bot/setup";

let initialized = false;

export async function ensureBotStarted() {
  if (initialized) return;
  if (typeof window !== "undefined") return; // Client side
  if (process.env.NEXT_PHASE === "phase-production-build") return; // Skip during build
  initialized = true;

  try {
    // Step 1: Ensure all database tables exist
    const tablesReady = await ensureTablesExist();
    if (!tablesReady) {
      console.error("❌ Database tables could not be created. Bot will not start.");
      initialized = false;
      return;
    }

    // Step 2: Start the Telegram bot
    console.log("🚀 Initializing Telegram Bot...");
    await initBot();
    console.log("✅ Telegram Bot is live!");
  } catch (error) {
    console.error("❌ Failed to initialize bot:", error);
    initialized = false;
  }
}
