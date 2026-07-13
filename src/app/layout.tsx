import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

// Auto-start the bot on server (not during build)
if (typeof window === "undefined" && process.env.NEXT_PHASE !== "phase-production-build") {
  import("@/startup").then((m) => m.ensureBotStarted()).catch(() => {});
}

export const metadata: Metadata = {
  title: "PropInvest - Prop Firm Investment Bot",
  description: "Invest in prop firm challenges and earn 50% of profits. Telegram-based investment platform.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white antialiased">{children}</body>
    </html>
  );
}
