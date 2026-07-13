"use client";

import { useEffect, useState } from "react";

export default function HomePage() {
  const [botStatus, setBotStatus] = useState<string>("checking");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setBotStatus(d.ok ? "online" : "offline"))
      .catch(() => setBotStatus("offline"));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950 to-slate-950"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-8">
              <span className={`inline-block w-2 h-2 rounded-full ${botStatus === "online" ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`}></span>
              {botStatus === "online" ? "Bot is Live" : botStatus === "checking" ? "Checking..." : "Bot is Offline"}
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                PropInvest
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-300 mb-4 max-w-3xl mx-auto">
              Professional Prop Firm Investment Platform
            </p>
            <p className="text-lg text-slate-400 mb-12 max-w-2xl mx-auto">
              We buy and pass prop firm challenges with your capital. Earn{" "}
              <span className="text-emerald-400 font-semibold">50% of all profits</span>{" "}
              from successful accounts.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <a
                href="https://t.me/PropInvestBot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-lg transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.441-.751-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141a.506.506 0 0 1 .171.325c.016.093.036.306.02.472z"/>
                </svg>
                Open Telegram Bot
              </a>
              <a
                href="#plans"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-800/50 hover:bg-slate-700/50 text-white font-semibold rounded-xl text-lg transition-all duration-200 border border-slate-700 hover:border-slate-600"
              >
                View Plans
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            How It Works
          </span>
        </h2>

        <div className="grid md:grid-cols-4 gap-8">
          {[
            { icon: "📊", title: "Choose a Plan", desc: "Select an investment plan that suits your budget and goals" },
            { icon: "💳", title: "Deposit Funds", desc: "Add funds to your wallet via crypto payment" },
            { icon: "🏢", title: "We Trade", desc: "Our team buys prop firm accounts and passes challenges" },
            { icon: "💰", title: "Earn Profits", desc: "Receive 50% of all profits directly to your wallet" },
          ].map((step, i) => (
            <div key={i} className="relative group">
              <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-8 hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1">
                <div className="text-4xl mb-4">{step.icon}</div>
                <div className="text-sm text-emerald-400 font-semibold mb-2">Step {i + 1}</div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-slate-400">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Investment Plans */}
      <div id="plans" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Investment Plans
          </span>
        </h2>
        <p className="text-center text-slate-400 mb-16 text-lg">Choose the plan that fits your investment goals</p>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              name: "🚀 Starter",
              min: "$100",
              max: "$999",
              duration: "30 Days",
              returnRate: "30%",
              features: ["Low risk investment", "Steady returns", "Prop firm account management", "50% profit sharing", "WhatsApp support"],
              popular: false,
            },
            {
              name: "💎 Pro",
              min: "$1,000",
              max: "$4,999",
              duration: "30 Days",
              returnRate: "45%",
              features: ["Medium capital investment", "Higher returns", "Dedicated account management", "50% profit sharing", "Priority support", "Detailed reports"],
              popular: true,
            },
            {
              name: "👑 Elite",
              min: "$5,000",
              max: "$50,000",
              duration: "30 Days",
              returnRate: "60%",
              features: ["Premium investment", "Maximum returns", "VIP account management", "50% profit sharing", "24/7 support", "Custom strategies", "Fastest challenge completion"],
              popular: false,
            },
          ].map((plan, i) => (
            <div
              key={i}
              className={`relative group ${plan.popular ? "md:-translate-y-4" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold rounded-full z-10">
                  Most Popular
                </div>
              )}
              <div className={`bg-slate-800/50 backdrop-blur border rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 ${
                plan.popular ? "border-emerald-500/50 shadow-lg shadow-emerald-500/10" : "border-slate-700/50 hover:border-emerald-500/30"
              }`}>
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-emerald-400">{plan.returnRate}</span>
                  <span className="text-slate-400">expected return</span>
                </div>
                <div className="space-y-3 mb-8">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Range</span>
                    <span className="font-semibold">{plan.min} - {plan.max}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Duration</span>
                    <span className="font-semibold">{plan.duration}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Your Share</span>
                    <span className="font-semibold text-emerald-400">50% of profits</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-slate-300">
                      <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="https://t.me/PropInvestBot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block text-center py-3 rounded-xl font-semibold transition-all duration-200 ${
                    plan.popular
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25"
                      : "bg-slate-700/50 hover:bg-slate-600/50 text-white border border-slate-600"
                  }`}
                >
                  Start Investing
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Referral Program */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 rounded-3xl p-12 border border-emerald-500/20">
          <div className="text-center">
            <div className="text-5xl mb-6">👥</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Referral Program</h2>
            <p className="text-xl text-slate-300 mb-2">
              Earn <span className="text-emerald-400 font-bold text-2xl">10%</span> commission on every referral investment
            </p>
            <p className="text-slate-400 mb-8">
              Share your unique referral link. When someone you invite invests, you earn 10% of their investment amount instantly!
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800/50 rounded-xl border border-slate-700">
              <span className="text-slate-400">Example:</span>
              <span className="text-white">Referral invests $1,000</span>
              <span className="text-emerald-400 font-bold">→ You earn $100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-800">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-2">
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              PropInvest
            </span>
          </h3>
          <p className="text-slate-400 mb-6">Professional Prop Firm Investment Platform</p>
          <div className="flex justify-center gap-6">
            <a href="https://t.me/PropInvestBot" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-400 transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.441-.751-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141a.506.506 0 0 1 .171.325c.016.093.036.306.02.472z"/>
              </svg>
            </a>
          </div>
          <p className="text-slate-500 text-sm mt-6">© 2026 PropInvest. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
