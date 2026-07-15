export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { ensureTablesExist } = await import("@/bot/setup");
    const tablesReady = await ensureTablesExist();

    if (!tablesReady) {
      return Response.json(
        { ok: false, error: "Failed to create tables. Check DATABASE_URL." },
        { status: 500 }
      );
    }

    const { initializeDefaultPlans } = await import("@/bot/db");
    await initializeDefaultPlans();

    return Response.json({
      ok: true,
      message: "Database tables created and default plans inserted successfully!",
    });
  } catch (error) {
    console.error("Setup error:", error);
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
