import { ensureTablesExist } from "@/bot/setup";
import { initializeDefaultPlans } from "@/bot/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tablesCreated = await ensureTablesExist();
    if (!tablesCreated) {
      return Response.json(
        { ok: false, error: "Failed to create database tables. Check your DATABASE_URL." },
        { status: 500 }
      );
    }

    // Insert default investment plans
    await initializeDefaultPlans();

    return Response.json({
      ok: true,
      message: "Database setup complete! All tables created and default plans inserted. Visit /api/bot to start the bot.",
    });
  } catch (error) {
    console.error("Setup error:", error);
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
