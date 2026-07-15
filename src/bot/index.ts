import TelegramBot from "node-telegram-bot-api";
import {
  getOrCreateUser,
  getUserByTelegramId,
  getUserStats,
  getActivePlans,
  getPlanById,
  createInvestment,
  approveInvestment,
  completeInvestment,
  cancelInvestment,
  getUserInvestments,
  getAllInvestments,
  getInvestmentById,
  getPendingInvestments,
  getActiveInvestments,
  updateInvestmentDetails,
  addEarningsToInvestment,
  createDeposit,
  approveDeposit,
  rejectDeposit,
  getUserDeposits,
  getPendingDeposits,
  getDepositById,
  createWithdrawal,
  approveWithdrawal,
  completeWithdrawal,
  rejectWithdrawal,
  getPendingWithdrawals,
  getUserWithdrawals,
  getWithdrawalById,
  createReferral,
  getUserReferrals,
  getReferredUsers,
  getUserTransactions,
  getSetting,
  setSetting,
  recordBroadcast,
  getAdminStats,
  getAllUsers,
  banUser,
  unbanUser,
  getUserById,
  updateUserBalance,
  initializeDefaultPlans,
  getAllPlans,
  updatePlan,
  togglePlanActive,
  createPlan,
} from "./db";
import {
  mainMenuKeyboard,
  backToMainMenuKeyboard,
  plansKeyboard,
  investConfirmKeyboard,
  walletKeyboard,
  depositMethodKeyboard,
  depositConfirmKeyboard,
  withdrawMethodKeyboard,
  referralKeyboard,
  settingsKeyboard,
  paymentMethodKeyboard,
  adminMenuKeyboard,
  adminBackKeyboard,
  adminDepositKeyboard,
  adminWithdrawalKeyboard,
  adminInvestmentKeyboard,
  adminActiveInvestmentKeyboard,
  adminPlanKeyboard,
  adminUserKeyboard,
  helpKeyboard,
  paginationKeyboard,
} from "./keyboards";
import { UserState, getSession, setState, clearSession } from "./types";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // e.g. https://your-app.onrender.com

let bot: TelegramBot | null = null;

export function getBot(): TelegramBot | null {
  return bot;
}

export async function initBot() {
  if (!BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is not set");
    return null;
  }

  // Use webhook mode if WEBHOOK_URL is set, otherwise use polling
  const useWebhook = !!WEBHOOK_URL;
  if (useWebhook) {
    bot = new TelegramBot(BOT_TOKEN, { webHook: true });
  } else {
    bot = new TelegramBot(BOT_TOKEN, { polling: true });
  }
  console.log(`🤖 Telegram Bot is starting... (${useWebhook ? "webhook" : "polling"} mode)`);

  if (useWebhook && bot) {
    const webhookPath = `/webhook/${BOT_TOKEN}`;
    const fullUrl = `${WEBHOOK_URL}${webhookPath}`;
    await bot.setWebHook(fullUrl);
    console.log(`🔗 Webhook set: ${fullUrl}`);
  }

  // Initialize default plans
  await initializeDefaultPlans();

  // Register all handlers
  registerStartCommand(bot);
  registerCommandHandlers(bot);
  registerMessageHandler(bot);
  registerCallbackQueryHandler(bot);

  console.log("🤖 Telegram Bot is running!");
  return bot;
}

/**
 * Register all message/callback handlers on a bot instance.
 * Used by both initBot() and the webhook handler.
 */
export function registerAllHandlers(botInstance: TelegramBot) {
  registerStartCommand(botInstance);
  registerCommandHandlers(botInstance);
  registerMessageHandler(botInstance);
  registerCallbackQueryHandler(botInstance);
}

function isAdmin(telegramId: string): boolean {
  return telegramId === ADMIN_ID;
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

// ─── /start Command ──────────────────────────────────────────────────────────

function registerStartCommand(bot: TelegramBot) {
  bot.onText(/\/start(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const telegramId = String(msg.from?.id || chatId);
    const refCode = match?.[1]?.trim() || undefined;

    try {
      const user = await getOrCreateUser(
        telegramId,
        msg.from?.username,
        msg.from?.first_name,
        msg.from?.last_name,
        refCode && refCode.startsWith("ref_") ? refCode.replace("ref_", "") : undefined
      );

      const welcomeMsg = `🎉 *Welcome to PropInvest Bot!*

💰 *Your Gateway to Prop Firm Investments*

We manage your capital by buying and passing prop firm challenges. You earn *50% of all profits* from successful accounts!

📊 *How it works:*
1️⃣ Choose an investment plan
2️⃣ Deposit funds to your wallet
3️⃣ We buy prop firm accounts with your capital
4️⃣ Our team passes the challenges
5️⃣ You receive 50% of the profits!

👥 *Referral Bonus:* Invite friends and earn *10% commission* on their investments!

Your Referral Code: \`ref_${user.referralCode}\`

Use the buttons below to get started!`;

      await bot.sendMessage(chatId, welcomeMsg, {
        parse_mode: "Markdown",
        reply_markup: mainMenuKeyboard(),
      });
    } catch (error) {
      console.error("Error in /start:", error);
      await bot.sendMessage(chatId, "❌ An error occurred. Please try again later.");
    }
  });
}

// ─── Other Commands ──────────────────────────────────────────────────────────

function registerCommandHandlers(bot: TelegramBot) {
  bot.onText(/\/menu/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, "📋 *Main Menu*\n\nSelect an option below:", {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard(),
    });
  });

  bot.onText(/\/admin/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = String(msg.from?.id);

    if (!isAdmin(telegramId)) {
      await bot.sendMessage(chatId, "⛔ Access denied. Admin only.");
      return;
    }

    await bot.sendMessage(chatId, "🔧 *Admin Control Panel*\n\nSelect an option:", {
      parse_mode: "Markdown",
      reply_markup: adminMenuKeyboard(),
    });
  });

  bot.onText(/\/help/, async (msg) => {
    await sendHelpMessage(bot, msg.chat.id);
  });
}

// ─── Text Message Handler ────────────────────────────────────────────────────

function registerMessageHandler(bot: TelegramBot) {
  bot.on("message", async (msg) => {
    if (msg.text?.startsWith("/")) return; // Skip commands
    if (!msg.text && !msg.photo) return;

    const chatId = msg.chat.id;
    const telegramId = String(msg.from?.id || chatId);
    const session = getSession(telegramId);

    try {
      switch (session.state) {
        case UserState.ENTERING_DEPOSIT_AMOUNT:
          await handleDepositAmount(bot, chatId, telegramId, msg.text || "");
          break;
        case UserState.ENTERING_DEPOSIT_PROOF:
          await handleDepositProof(bot, chatId, telegramId, msg);
          break;
        case UserState.ENTERING_WITHDRAW_AMOUNT:
          await handleWithdrawAmount(bot, chatId, telegramId, msg.text || "");
          break;
        case UserState.ENTERING_WITHDRAW_WALLET:
          await handleWithdrawWallet(bot, chatId, telegramId, msg.text || "");
          break;
        case UserState.ENTERING_INVESTMENT_AMOUNT:
          await handleInvestmentAmount(bot, chatId, telegramId, msg.text || "");
          break;
        case UserState.ENTERING_WALLET_ADDRESS:
          await handleSetWalletAddress(bot, chatId, telegramId, msg.text || "");
          break;
        // Admin states
        case UserState.ADMIN_BROADCASTING:
          await handleAdminBroadcast(bot, chatId, telegramId, msg);
          break;
        case UserState.ADMIN_ADJUSTING_BALANCE:
          await handleAdminAdjustBalance(bot, chatId, telegramId, msg.text || "");
          break;
        case UserState.ADMIN_ADDING_EARNINGS:
          await handleAdminAddEarnings(bot, chatId, telegramId, msg.text || "");
          break;
        case UserState.ADMIN_ADDING_PLAN_NAME:
          await handleAdminAddPlanName(bot, chatId, telegramId, msg.text || "");
          break;
        case UserState.ADMIN_ADDING_PLAN_DESC:
          await handleAdminAddPlanDesc(bot, chatId, telegramId, msg.text || "");
          break;
        case UserState.ADMIN_ADDING_PLAN_MIN:
          await handleAdminAddPlanMin(bot, chatId, telegramId, msg.text || "");
          break;
        case UserState.ADMIN_ADDING_PLAN_MAX:
          await handleAdminAddPlanMax(bot, chatId, telegramId, msg.text || "");
          break;
        case UserState.ADMIN_ADDING_PLAN_DURATION:
          await handleAdminAddPlanDuration(bot, chatId, telegramId, msg.text || "");
          break;
        case UserState.ADMIN_ADDING_PLAN_RETURN:
          await handleAdminAddPlanReturn(bot, chatId, telegramId, msg.text || "");
          break;
        case UserState.ADMIN_EDITING_PLAN_NAME:
          await handleAdminEditPlanField(bot, chatId, telegramId, "name", msg.text || "");
          break;
        case UserState.ADMIN_EDITING_PLAN_DESC:
          await handleAdminEditPlanField(bot, chatId, telegramId, "description", msg.text || "");
          break;
        case UserState.ADMIN_EDITING_PLAN_MIN:
          await handleAdminEditPlanField(bot, chatId, telegramId, "minAmount", msg.text || "");
          break;
        case UserState.ADMIN_EDITING_PLAN_MAX:
          await handleAdminEditPlanField(bot, chatId, telegramId, "maxAmount", msg.text || "");
          break;
        case UserState.ADMIN_EDITING_PLAN_DURATION:
          await handleAdminEditPlanField(bot, chatId, telegramId, "durationDays", msg.text || "");
          break;
        case UserState.ADMIN_EDITING_PLAN_RETURN:
          await handleAdminEditPlanField(bot, chatId, telegramId, "expectedReturnPercent", msg.text || "");
          break;
        case UserState.ADMIN_SETTING_PROP_FIRM:
          await handleAdminSetPropFirm(bot, chatId, telegramId, msg.text || "");
          break;
        case UserState.ADMIN_SETTING_PROFIT_TARGET:
          await handleAdminSetProfitTarget(bot, chatId, telegramId, msg.text || "");
          break;
        case UserState.ADMIN_SETTING_INVESTMENT_NOTES:
          await handleAdminSetInvestmentNotes(bot, chatId, telegramId, msg.text || "");
          break;
        case UserState.ADMIN_DEPOSIT_NOTE:
          await handleAdminDepositNote(bot, chatId, telegramId, msg.text || "");
          break;
        case UserState.ADMIN_WITHDRAWAL_NOTE:
          await handleAdminWithdrawalNote(bot, chatId, telegramId, msg.text || "");
          break;
        default:
          break;
      }
    } catch (error) {
      console.error("Error handling message:", error);
      await bot.sendMessage(chatId, "❌ An error occurred. Please try again.");
      clearSession(telegramId);
    }
  });
}

// ─── Callback Query Handler ──────────────────────────────────────────────────

function registerCallbackQueryHandler(bot: TelegramBot) {
  bot.on("callback_query", async (query) => {
    const chatId = query.message?.chat.id;
    const telegramId = String(query.from.id);
    const data = query.data;

    if (!chatId || !data) return;

    try {
      await bot.answerCallbackQuery(query.id);

      // Main menu
      if (data === "back_main") {
        clearSession(telegramId);
        await bot.editMessageText("📋 *Main Menu*\n\nSelect an option:", {
          chat_id: chatId,
          message_id: query.message?.message_id,
          parse_mode: "Markdown",
          reply_markup: mainMenuKeyboard(),
        });
        return;
      }

      if (data === "noop") return;

      // ─── Investment Plans ─────────────────────────────────────────────
      if (data === "menu_plans") {
        await handleShowPlans(bot, chatId, query.message?.message_id);
        return;
      }

      if (data.startsWith("plan_")) {
        const planId = parseInt(data.replace("plan_", ""));
        await handleShowPlanDetail(bot, chatId, telegramId, planId, query.message?.message_id);
        return;
      }

      if (data.startsWith("confirm_invest_")) {
        const planId = parseInt(data.replace("confirm_invest_", ""));
        await handleConfirmInvestment(bot, chatId, telegramId, planId);
        return;
      }

      // ─── My Investments ──────────────────────────────────────────────
      if (data === "menu_investments") {
        await handleShowMyInvestments(bot, chatId, telegramId, query.message?.message_id);
        return;
      }

      // ─── Wallet ──────────────────────────────────────────────────────
      if (data === "menu_wallet") {
        await handleShowWallet(bot, chatId, telegramId, query.message?.message_id);
        return;
      }

      // ─── Deposit ─────────────────────────────────────────────────────
      if (data === "menu_deposit") {
        clearSession(telegramId);
        await bot.editMessageText("📥 *Select Deposit Method:*", {
          chat_id: chatId,
          message_id: query.message?.message_id,
          parse_mode: "Markdown",
          reply_markup: depositMethodKeyboard(),
        });
        return;
      }

      if (data.startsWith("deposit_")) {
        const method = data.replace("deposit_", "").toUpperCase();
        await handleSelectDepositMethod(bot, chatId, telegramId, method);
        return;
      }

      if (data === "send_proof") {
        setState(telegramId, UserState.ENTERING_DEPOSIT_PROOF);
        await bot.sendMessage(chatId, "📸 *Send your payment proof*\n\nPlease send a screenshot or photo of your payment confirmation.", {
          parse_mode: "Markdown",
        });
        return;
      }

      // ─── Withdraw ────────────────────────────────────────────────────
      if (data === "menu_withdraw") {
        clearSession(telegramId);
        await bot.editMessageText("📤 *Select Withdrawal Method:*", {
          chat_id: chatId,
          message_id: query.message?.message_id,
          parse_mode: "Markdown",
          reply_markup: withdrawMethodKeyboard(),
        });
        return;
      }

      if (data.startsWith("withdraw_")) {
        const method = data.replace("withdraw_", "").toUpperCase();
        await handleSelectWithdrawMethod(bot, chatId, telegramId, method);
        return;
      }

      // ─── Referrals ───────────────────────────────────────────────────
      if (data === "menu_referrals") {
        await handleShowReferrals(bot, chatId, telegramId, query.message?.message_id);
        return;
      }

      if (data === "my_referrals") {
        await handleShowReferralList(bot, chatId, telegramId, query.message?.message_id);
        return;
      }

      // ─── Transactions ────────────────────────────────────────────────
      if (data === "menu_transactions") {
        await handleShowTransactions(bot, chatId, telegramId, query.message?.message_id);
        return;
      }

      // ─── Settings ────────────────────────────────────────────────────
      if (data === "menu_settings") {
        await bot.editMessageText("⚙️ *Settings*\n\nManage your account settings:", {
          chat_id: chatId,
          message_id: query.message?.message_id,
          parse_mode: "Markdown",
          reply_markup: settingsKeyboard(),
        });
        return;
      }

      if (data === "set_wallet") {
        setState(telegramId, UserState.ENTERING_WALLET_ADDRESS);
        await bot.sendMessage(chatId, "💳 *Enter your wallet address:*\n\nThis will be used for withdrawals.", {
          parse_mode: "Markdown",
        });
        return;
      }

      if (data === "set_payment_method") {
        await bot.editMessageText("💰 *Select your preferred payment method:*", {
          chat_id: chatId,
          message_id: query.message?.message_id,
          parse_mode: "Markdown",
          reply_markup: paymentMethodKeyboard(),
        });
        return;
      }

      if (data.startsWith("pm_")) {
        const method = data.replace("pm_", "").toUpperCase();
        const user = await getUserByTelegramId(telegramId);
        if (user) {
          await updateUserBalance(user.id, user.balance); // no-op but keeps consistent
          await setSetting(`payment_method_${user.id}`, method);
        }
        await bot.editMessageText(`✅ Payment method set to *${method}*.`, {
          chat_id: chatId,
          message_id: query.message?.message_id,
          parse_mode: "Markdown",
          reply_markup: settingsKeyboard(),
        });
        return;
      }

      // ─── Help ────────────────────────────────────────────────────────
      if (data === "menu_help") {
        await sendHelpMessage(bot, chatId, query.message?.message_id);
        return;
      }

      if (data === "contact_support") {
        await bot.sendMessage(chatId, "💬 *Contact Support*\n\nSend a message to our admin: @PropInvestSupport\n\nOr describe your issue and we'll get back to you.", {
          parse_mode: "Markdown",
          reply_markup: backToMainMenuKeyboard(),
        });
        return;
      }

      // ─── Admin Panel ─────────────────────────────────────────────────
      if (data === "admin_menu") {
        if (!isAdmin(telegramId)) {
          await bot.sendMessage(chatId, "⛔ Access denied.");
          return;
        }
        await bot.editMessageText("🔧 *Admin Control Panel*\n\nSelect an option:", {
          chat_id: chatId,
          message_id: query.message?.message_id,
          parse_mode: "Markdown",
          reply_markup: adminMenuKeyboard(),
        });
        return;
      }

      if (data === "admin_dashboard") {
        if (!isAdmin(telegramId)) return;
        await handleAdminDashboard(bot, chatId, query.message?.message_id);
        return;
      }

      if (data === "admin_stats") {
        if (!isAdmin(telegramId)) return;
        await handleAdminDashboard(bot, chatId, query.message?.message_id);
        return;
      }

      if (data === "admin_deposits") {
        if (!isAdmin(telegramId)) return;
        await handleAdminDeposits(bot, chatId, query.message?.message_id);
        return;
      }

      if (data.startsWith("admin_approve_deposit_")) {
        if (!isAdmin(telegramId)) return;
        const depositId = parseInt(data.replace("admin_approve_deposit_", ""));
        await handleAdminApproveDeposit(bot, chatId, depositId, query.message?.message_id);
        return;
      }

      if (data.startsWith("admin_reject_deposit_")) {
        if (!isAdmin(telegramId)) return;
        const depositId = parseInt(data.replace("admin_reject_deposit_", ""));
        await handleAdminRejectDeposit(bot, chatId, depositId, query.message?.message_id);
        return;
      }

      if (data.startsWith("admin_note_deposit_")) {
        if (!isAdmin(telegramId)) return;
        const depositId = parseInt(data.replace("admin_note_deposit_", ""));
        setState(telegramId, UserState.ADMIN_DEPOSIT_NOTE, { depositId });
        await bot.sendMessage(chatId, "📝 Enter note for this deposit:");
        return;
      }

      if (data === "admin_withdrawals") {
        if (!isAdmin(telegramId)) return;
        await handleAdminWithdrawals(bot, chatId, query.message?.message_id);
        return;
      }

      if (data.startsWith("admin_approve_withdrawal_")) {
        if (!isAdmin(telegramId)) return;
        const wid = parseInt(data.replace("admin_approve_withdrawal_", ""));
        await handleAdminApproveWithdrawal(bot, chatId, wid, query.message?.message_id);
        return;
      }

      if (data.startsWith("admin_reject_withdrawal_")) {
        if (!isAdmin(telegramId)) return;
        const wid = parseInt(data.replace("admin_reject_withdrawal_", ""));
        await handleAdminRejectWithdrawal(bot, chatId, wid, query.message?.message_id);
        return;
      }

      if (data.startsWith("admin_note_withdrawal_")) {
        if (!isAdmin(telegramId)) return;
        const wid = parseInt(data.replace("admin_note_withdrawal_", ""));
        setState(telegramId, UserState.ADMIN_WITHDRAWAL_NOTE, { withdrawalId: wid });
        await bot.sendMessage(chatId, "📝 Enter note for this withdrawal:");
        return;
      }

      if (data === "admin_pending_investments") {
        if (!isAdmin(telegramId)) return;
        await handleAdminPendingInvestments(bot, chatId, query.message?.message_id);
        return;
      }

      if (data === "admin_active_investments") {
        if (!isAdmin(telegramId)) return;
        await handleAdminActiveInvestments(bot, chatId, query.message?.message_id);
        return;
      }

      if (data.startsWith("admin_approve_invest_")) {
        if (!isAdmin(telegramId)) return;
        const invId = parseInt(data.replace("admin_approve_invest_", ""));
        await handleAdminApproveInvestment(bot, chatId, telegramId, invId, query.message?.message_id);
        return;
      }

      if (data.startsWith("admin_reject_invest_")) {
        if (!isAdmin(telegramId)) return;
        const invId = parseInt(data.replace("admin_reject_invest_", ""));
        await handleAdminRejectInvestment(bot, chatId, invId, query.message?.message_id);
        return;
      }

      if (data.startsWith("admin_complete_invest_")) {
        if (!isAdmin(telegramId)) return;
        const invId = parseInt(data.replace("admin_complete_invest_", ""));
        await handleAdminCompleteInvestment(bot, chatId, invId, query.message?.message_id);
        return;
      }

      if (data.startsWith("admin_cancel_invest_")) {
        if (!isAdmin(telegramId)) return;
        const invId = parseInt(data.replace("admin_cancel_invest_", ""));
        await handleAdminCancelInvestment(bot, chatId, invId, query.message?.message_id);
        return;
      }

      if (data.startsWith("admin_add_earnings_")) {
        if (!isAdmin(telegramId)) return;
        const invId = parseInt(data.replace("admin_add_earnings_", ""));
        setState(telegramId, UserState.ADMIN_ADDING_EARNINGS, { investmentId: invId });
        await bot.sendMessage(chatId, "💰 Enter earnings amount to add (USD):");
        return;
      }

      if (data.startsWith("admin_set_propfirm_")) {
        if (!isAdmin(telegramId)) return;
        const invId = parseInt(data.replace("admin_set_propfirm_", ""));
        setState(telegramId, UserState.ADMIN_SETTING_PROP_FIRM, { investmentId: invId });
        await bot.sendMessage(chatId, "🏢 Enter prop firm name and account:\n\nFormat: `Firm Name - Account #12345`", { parse_mode: "Markdown" });
        return;
      }

      if (data.startsWith("admin_set_target_")) {
        if (!isAdmin(telegramId)) return;
        const invId = parseInt(data.replace("admin_set_target_", ""));
        setState(telegramId, UserState.ADMIN_SETTING_PROFIT_TARGET, { investmentId: invId });
        await bot.sendMessage(chatId, "🎯 Enter profit target amount (USD):");
        return;
      }

      if (data.startsWith("admin_notes_invest_")) {
        if (!isAdmin(telegramId)) return;
        const invId = parseInt(data.replace("admin_notes_invest_", ""));
        setState(telegramId, UserState.ADMIN_SETTING_INVESTMENT_NOTES, { investmentId: invId });
        await bot.sendMessage(chatId, "📝 Enter notes for this investment:");
        return;
      }

      if (data.startsWith("admin_view_invest_")) {
        if (!isAdmin(telegramId)) return;
        const invId = parseInt(data.replace("admin_view_invest_", ""));
        await handleAdminViewInvestment(bot, chatId, invId, query.message?.message_id);
        return;
      }

      // ─── Admin Plans ─────────────────────────────────────────────────
      if (data === "admin_plans") {
        if (!isAdmin(telegramId)) return;
        await handleAdminPlans(bot, chatId, query.message?.message_id);
        return;
      }

      if (data === "admin_add_plan") {
        if (!isAdmin(telegramId)) return;
        setState(telegramId, UserState.ADMIN_ADDING_PLAN_NAME, {});
        await bot.sendMessage(chatId, "➕ *Add New Plan*\n\nEnter plan name:", { parse_mode: "Markdown" });
        return;
      }

      if (data.startsWith("admin_view_plan_")) {
        if (!isAdmin(telegramId)) return;
        const planId = parseInt(data.replace("admin_view_plan_", ""));
        await handleAdminViewPlan(bot, chatId, planId, query.message?.message_id);
        return;
      }

      if (data.startsWith("admin_edit_plan_name_")) {
        if (!isAdmin(telegramId)) return;
        const planId = parseInt(data.replace("admin_edit_plan_name_", ""));
        setState(telegramId, UserState.ADMIN_EDITING_PLAN_NAME, { planId });
        await bot.sendMessage(chatId, "✏️ Enter new plan name:");
        return;
      }

      if (data.startsWith("admin_edit_plan_desc_")) {
        if (!isAdmin(telegramId)) return;
        const planId = parseInt(data.replace("admin_edit_plan_desc_", ""));
        setState(telegramId, UserState.ADMIN_EDITING_PLAN_DESC, { planId });
        await bot.sendMessage(chatId, "📝 Enter new plan description:");
        return;
      }

      if (data.startsWith("admin_edit_plan_min_")) {
        if (!isAdmin(telegramId)) return;
        const planId = parseInt(data.replace("admin_edit_plan_min_", ""));
        setState(telegramId, UserState.ADMIN_EDITING_PLAN_MIN, { planId });
        await bot.sendMessage(chatId, "💵 Enter new minimum amount (USD):");
        return;
      }

      if (data.startsWith("admin_edit_plan_max_")) {
        if (!isAdmin(telegramId)) return;
        const planId = parseInt(data.replace("admin_edit_plan_max_", ""));
        setState(telegramId, UserState.ADMIN_EDITING_PLAN_MAX, { planId });
        await bot.sendMessage(chatId, "💵 Enter new maximum amount (USD):");
        return;
      }

      if (data.startsWith("admin_edit_plan_duration_")) {
        if (!isAdmin(telegramId)) return;
        const planId = parseInt(data.replace("admin_edit_plan_duration_", ""));
        setState(telegramId, UserState.ADMIN_EDITING_PLAN_DURATION, { planId });
        await bot.sendMessage(chatId, "📅 Enter new duration (days):");
        return;
      }

      if (data.startsWith("admin_edit_plan_return_")) {
        if (!isAdmin(telegramId)) return;
        const planId = parseInt(data.replace("admin_edit_plan_return_", ""));
        setState(telegramId, UserState.ADMIN_EDITING_PLAN_RETURN, { planId });
        await bot.sendMessage(chatId, "📈 Enter new expected return (%):");
        return;
      }

      if (data.startsWith("admin_toggle_plan_")) {
        if (!isAdmin(telegramId)) return;
        const planId = parseInt(data.replace("admin_toggle_plan_", ""));
        await handleAdminTogglePlan(bot, chatId, planId, query.message?.message_id);
        return;
      }

      // ─── Admin Users ─────────────────────────────────────────────────
      if (data === "admin_users") {
        if (!isAdmin(telegramId)) return;
        await handleAdminUsers(bot, chatId, query.message?.message_id);
        return;
      }

      if (data === "admin_find_user") {
        if (!isAdmin(telegramId)) return;
        setState(telegramId, UserState.ADMIN_ADJUSTING_BALANCE, { action: "find" });
        await bot.sendMessage(chatId, "🔍 Enter user's Telegram ID to find:");
        return;
      }

      if (data.startsWith("admin_view_user_")) {
        if (!isAdmin(telegramId)) return;
        const userId = parseInt(data.replace("admin_view_user_", ""));
        await handleAdminViewUser(bot, chatId, userId, query.message?.message_id);
        return;
      }

      if (data.startsWith("admin_adjust_balance_")) {
        if (!isAdmin(telegramId)) return;
        const userId = parseInt(data.replace("admin_adjust_balance_", ""));
        setState(telegramId, UserState.ADMIN_ADJUSTING_BALANCE, { userId, action: "adjust" });
        await bot.sendMessage(chatId, "💰 Enter amount to adjust (use negative for deduction, e.g., -50 or +100):");
        return;
      }

      if (data.startsWith("admin_toggle_ban_")) {
        if (!isAdmin(telegramId)) return;
        const userId = parseInt(data.replace("admin_toggle_ban_", ""));
        await handleAdminToggleBan(bot, chatId, userId, query.message?.message_id);
        return;
      }

      // ─── Admin Broadcast ─────────────────────────────────────────────
      if (data === "admin_broadcast") {
        if (!isAdmin(telegramId)) return;
        setState(telegramId, UserState.ADMIN_BROADCASTING);
        await bot.sendMessage(chatId, "📢 *Broadcast Message*\n\nEnter the message to broadcast to all users:", { parse_mode: "Markdown" });
        return;
      }

      // ─── Admin Settings ──────────────────────────────────────────────
      if (data === "admin_settings") {
        if (!isAdmin(telegramId)) return;
        await handleAdminSettings(bot, chatId, query.message?.message_id);
        return;
      }

      if (data.startsWith("admin_users_page_")) {
        if (!isAdmin(telegramId)) return;
        const page = parseInt(data.replace("admin_users_page_", ""));
        await handleAdminUsers(bot, chatId, query.message?.message_id, page);
        return;
      }
    } catch (error) {
      console.error("Error handling callback:", error);
      await bot.sendMessage(chatId, "❌ An error occurred. Please try again.");
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

async function sendHelpMessage(bot: TelegramBot, chatId: number, messageId?: number) {
  const text = `❓ *Help & Support*

*Available Commands:*
/start - Start the bot
/menu - Show main menu
/admin - Admin panel (admin only)
/help - Show this help

*How to Invest:*
1️⃣ Go to Investment Plans
2️⃣ Choose a plan that suits you
3️⃣ Enter the amount you want to invest
4️⃣ Confirm your investment
5️⃣ Admin will approve and manage your capital

*Deposit & Withdrawal:*
📥 Deposit funds to your wallet first
📤 Withdrawals are processed within 24-48 hours

*Referral Program:*
👥 Share your referral link with friends
💰 Earn 10% commission on their investments
📊 Track your referral earnings in the Referrals section

*Support:*
For any questions, contact our support team.`;

  if (messageId) {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: helpKeyboard(),
    });
  } else {
    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: helpKeyboard(),
    });
  }
}

// ─── Plans ───────────────────────────────────────────────────────────────────

async function handleShowPlans(bot: TelegramBot, chatId: number, messageId?: number) {
  const plans = await getActivePlans();

  if (plans.length === 0) {
    const text = "📊 *Investment Plans*\n\nNo plans available at the moment. Please check back later.";
    if (messageId) {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: backToMainMenuKeyboard(),
      });
    } else {
      await bot.sendMessage(chatId, text, {
        parse_mode: "Markdown",
        reply_markup: backToMainMenuKeyboard(),
      });
    }
    return;
  }

  let text = "📊 *Investment Plans*\n\nSelect a plan to view details:\n\n";
  plans.forEach((plan) => {
    text += `*${plan.name}*\n`;
    text += `💰 Range: $${plan.minAmount} - $${plan.maxAmount}\n`;
    text += `📅 Duration: ${plan.durationDays} days\n`;
    text += `📈 Expected Return: ${plan.expectedReturnPercent}%\n\n`;
  });

  const keyboard = plansKeyboard(plans);
  if (messageId) {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  } else {
    await bot.sendMessage(chatId, text, { parse_mode: "Markdown", reply_markup: keyboard });
  }
}

async function handleShowPlanDetail(bot: TelegramBot, chatId: number, telegramId: string, planId: number, messageId?: number) {
  const plan = await getPlanById(planId);
  if (!plan) {
    await bot.sendMessage(chatId, "❌ Plan not found.");
    return;
  }

  const text = `📊 *${plan.name}*

${plan.description || "No description available."}

💰 *Investment Range:* $${plan.minAmount} - $${plan.maxAmount}
📅 *Duration:* ${plan.durationDays} days
📈 *Expected Return:* ${plan.expectedReturnPercent}%
💼 *Your Share:* 50% of profits

_Example: If you invest $${plan.minAmount}, you could earn ~$${(parseFloat(plan.minAmount) * parseFloat(plan.expectedReturnPercent) / 100 * 0.5).toFixed(2)} in profits._

Enter the amount you want to invest (USD):`;

  setState(telegramId, UserState.ENTERING_INVESTMENT_AMOUNT, { planId });

  if (messageId) {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
    });
  } else {
    await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  }
}

async function handleInvestmentAmount(bot: TelegramBot, chatId: number, telegramId: string, text: string) {
  const session = getSession(telegramId);
  const planId = session.data.planId as number;
  const amount = parseFloat(text);

  if (isNaN(amount) || amount <= 0) {
    await bot.sendMessage(chatId, "❌ Please enter a valid amount:");
    return;
  }

  const plan = await getPlanById(planId);
  if (!plan) {
    await bot.sendMessage(chatId, "❌ Plan not found.");
    clearSession(telegramId);
    return;
  }

  if (amount < parseFloat(plan.minAmount)) {
    await bot.sendMessage(chatId, `❌ Minimum investment for this plan is $${plan.minAmount}.`);
    return;
  }

  if (amount > parseFloat(plan.maxAmount)) {
    await bot.sendMessage(chatId, `❌ Maximum investment for this plan is $${plan.maxAmount}.`);
    return;
  }

  const user = await getUserByTelegramId(telegramId);
  if (!user) {
    await bot.sendMessage(chatId, "❌ User not found.");
    clearSession(telegramId);
    return;
  }

  const balance = parseFloat(user.balance);
  if (balance < amount) {
    await bot.sendMessage(chatId, `❌ *Insufficient Balance!*

Your balance: $${balance.toFixed(2)}
Required: $${amount.toFixed(2)}
Short: $${(amount - balance).toFixed(2)}

Please deposit funds first.`, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📥 Deposit Now", callback_data: "menu_deposit" }],
          [{ text: "🔙 Back to Plans", callback_data: "menu_plans" }],
        ],
      },
    });
    return;
  }

  setState(telegramId, UserState.CONFIRMING_INVESTMENT, { planId, amount });

  const expectedProfit = (amount * parseFloat(plan.expectedReturnPercent) / 100 * 0.5).toFixed(2);

  await bot.sendMessage(chatId, `✅ *Confirm Your Investment*

📊 *Plan:* ${plan.name}
💰 *Amount:* $${amount.toFixed(2)}
📅 *Duration:* ${plan.durationDays} days
📈 *Expected Return:* ${plan.expectedReturnPercent}%
💼 *Your Share (50%):* ~$${expectedProfit}

Your balance after: $${(balance - amount).toFixed(2)}`, {
    parse_mode: "Markdown",
    reply_markup: investConfirmKeyboard(planId),
  });
}

async function handleConfirmInvestment(bot: TelegramBot, chatId: number, telegramId: string, planId: number) {
  const session = getSession(telegramId);
  const amount = session.data.amount as number;

  if (!amount || session.state !== UserState.CONFIRMING_INVESTMENT) {
    await bot.sendMessage(chatId, "❌ Session expired. Please start over.");
    clearSession(telegramId);
    return;
  }

  const user = await getUserByTelegramId(telegramId);
  if (!user) {
    await bot.sendMessage(chatId, "❌ User not found.");
    clearSession(telegramId);
    return;
  }

  const balance = parseFloat(user.balance);
  if (balance < amount) {
    await bot.sendMessage(chatId, "❌ Insufficient balance.");
    clearSession(telegramId);
    return;
  }

  // Deduct from balance
  await updateUserBalance(user.id, (balance - amount).toFixed(2));

  // Create investment
  const investment = await createInvestment(user.id, planId, amount.toFixed(2));

  clearSession(telegramId);

  await bot.sendMessage(chatId, `🎉 *Investment Created Successfully!*

📋 Investment ID: #${investment.id}
💰 Amount: $${amount.toFixed(2)}
⏳ Status: Pending Approval

Your investment will be reviewed and activated by our team shortly. We'll notify you once it's approved!

Thank you for investing with PropInvest! 🚀`, {
    parse_mode: "Markdown",
    reply_markup: mainMenuKeyboard(),
  });

  // Notify admin
  if (ADMIN_ID) {
    try {
      await bot.sendMessage(parseInt(ADMIN_ID), `🔔 *New Investment!*

📋 ID: #${investment.id}
👤 User: ${user.firstName || user.username || user.telegramId}
💰 Amount: $${amount.toFixed(2)}
📊 Plan: #${planId}

Use /admin to review.`, {
        parse_mode: "Markdown",
        reply_markup: adminInvestmentKeyboard(investment.id),
      });
    } catch {
      // Admin might not have started the bot
    }
  }
}

// ─── My Investments ──────────────────────────────────────────────────────────

async function handleShowMyInvestments(bot: TelegramBot, chatId: number, telegramId: string, messageId?: number) {
  const user = await getUserByTelegramId(telegramId);
  if (!user) {
    await bot.sendMessage(chatId, "❌ User not found.");
    return;
  }

  const investments = await getUserInvestments(user.id);

  if (investments.length === 0) {
    const text = "💰 *My Investments*\n\nYou don't have any investments yet.\n\nStart investing now to grow your capital!";
    if (messageId) {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📊 View Plans", callback_data: "menu_plans" }],
            [{ text: "🔙 Back to Main Menu", callback_data: "back_main" }],
          ],
        },
      });
    } else {
      await bot.sendMessage(chatId, text, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📊 View Plans", callback_data: "menu_plans" }],
            [{ text: "🔙 Back to Main Menu", callback_data: "back_main" }],
          ],
        },
      });
    }
    return;
  }

  let text = "💰 *My Investments*\n\n";
  investments.forEach((inv) => {
    const statusEmoji = inv.status === "active" ? "🟢" : inv.status === "pending" ? "🟡" : inv.status === "completed" ? "✅" : "🔴";
    text += `${statusEmoji} *Investment #${inv.id}*\n`;
    text += `   📊 Plan: ${inv.plan?.name || "N/A"}\n`;
    text += `   💰 Amount: $${inv.amount}\n`;
    text += `   📈 Earnings: $${inv.earnings}\n`;
    text += `   📌 Status: ${inv.status.toUpperCase()}\n`;
    if (inv.propFirmName) {
      text += `   🏢 Prop Firm: ${inv.propFirmName}\n`;
    }
    if (inv.startDate) {
      text += `   📅 Started: ${new Date(inv.startDate).toLocaleDateString()}\n`;
    }
    if (inv.endDate) {
      text += `   📅 Ends: ${new Date(inv.endDate).toLocaleDateString()}\n`;
    }
    text += "\n";
  });

  if (messageId) {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: backToMainMenuKeyboard(),
    });
  } else {
    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: backToMainMenuKeyboard(),
    });
  }
}

// ─── Wallet ──────────────────────────────────────────────────────────────────

async function handleShowWallet(bot: TelegramBot, chatId: number, telegramId: string, messageId?: number) {
  const user = await getUserByTelegramId(telegramId);
  if (!user) {
    await bot.sendMessage(chatId, "❌ User not found.");
    return;
  }

  const text = `💳 *Your Wallet*

💰 *Balance:* $${parseFloat(user.balance).toFixed(2)}
📊 *Total Invested:* $${parseFloat(user.totalInvested).toFixed(2)}
📈 *Total Earned:* $${parseFloat(user.totalEarned).toFixed(2)}
👥 *Referral Earnings:* $${parseFloat(user.totalReferralEarnings).toFixed(2)}
💳 *Wallet Address:* ${user.walletAddress || "Not set"}
💰 *Payment Method:* ${user.paymentMethod || "Not set"}`;

  if (messageId) {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: walletKeyboard(),
    });
  } else {
    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: walletKeyboard(),
    });
  }
}

// ─── Deposit Flow ────────────────────────────────────────────────────────────

async function handleSelectDepositMethod(bot: TelegramBot, chatId: number, telegramId: string, method: string) {
  const walletAddresses: Record<string, string> = {
    BTC: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    USDT_TRC20: "TN2YbEJgnMSVh7VUD8AdKoMaA8oJ3V3FpS",
    USDT_ERC20: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
    ETH: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
  };

  const address = walletAddresses[method] || "Contact admin for address";

  setState(telegramId, UserState.ENTERING_DEPOSIT_AMOUNT, { method });

  await bot.sendMessage(chatId, `📥 *Deposit via ${method.replace("_", " ")}*

Send your deposit to this address:
\`${address}\`

⚠️ *Important:*
- Only send ${method.replace("_", " ")} to this address
- Minimum deposit: $50
- After sending, enter the amount below and send proof

💰 *Enter deposit amount (USD):*`, {
    parse_mode: "Markdown",
  });
}

async function handleDepositAmount(bot: TelegramBot, chatId: number, telegramId: string, text: string) {
  const amount = parseFloat(text);
  if (isNaN(amount) || amount < 50) {
    await bot.sendMessage(chatId, "❌ Minimum deposit is $50. Please enter a valid amount:");
    return;
  }

  const session = getSession(telegramId);
  setState(telegramId, UserState.ENTERING_DEPOSIT_PROOF, { ...session.data, amount });

  await bot.sendMessage(chatId, `✅ Amount: $${amount.toFixed(2)}

📸 Now send your payment proof (screenshot/photo):`, {
    parse_mode: "Markdown",
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleDepositProof(bot: TelegramBot, chatId: number, telegramId: string, msg: any) {
  const session = getSession(telegramId);
  const amount = session.data.amount as number;
  const method = session.data.method as string;

  const proofFileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : undefined;

  const user = await getUserByTelegramId(telegramId);
  if (!user) {
    await bot.sendMessage(chatId, "❌ User not found.");
    clearSession(telegramId);
    return;
  }

  const deposit = await createDeposit(user.id, amount.toFixed(2), method, proofFileId);
  clearSession(telegramId);

  await bot.sendMessage(chatId, `✅ *Deposit Request Submitted!*

📋 Deposit ID: #${deposit.id}
💰 Amount: $${amount.toFixed(2)}
💰 Method: ${method}
📌 Status: Pending Review

Your deposit will be reviewed by our team. You'll be notified once it's approved!`, {
    parse_mode: "Markdown",
    reply_markup: mainMenuKeyboard(),
  });

  // Notify admin
  if (ADMIN_ID) {
    try {
      let notifText = `🔔 *New Deposit Request!*

📋 ID: #${deposit.id}
👤 User: ${user.firstName || user.username || user.telegramId}
💰 Amount: $${amount.toFixed(2)}
💰 Method: ${method}`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opts: any = {
        parse_mode: "Markdown",
        reply_markup: adminDepositKeyboard(deposit.id),
      };

      if (proofFileId) {
        await bot.sendPhoto(parseInt(ADMIN_ID), proofFileId, {
          caption: notifText + "\n\n📸 Payment proof attached above.",
          parse_mode: "Markdown",
          reply_markup: adminDepositKeyboard(deposit.id),
        });
      } else {
        await bot.sendMessage(parseInt(ADMIN_ID), notifText, opts);
      }
    } catch {
      // Admin might not have started the bot
    }
  }
}

// ─── Withdraw Flow ───────────────────────────────────────────────────────────

async function handleSelectWithdrawMethod(bot: TelegramBot, chatId: number, telegramId: string, method: string) {
  const user = await getUserByTelegramId(telegramId);
  if (!user) {
    await bot.sendMessage(chatId, "❌ User not found.");
    return;
  }

  if (parseFloat(user.balance) <= 0) {
    await bot.sendMessage(chatId, "❌ *Insufficient Balance!*\n\nYou don't have any funds to withdraw.", {
      parse_mode: "Markdown",
      reply_markup: backToMainMenuKeyboard(),
    });
    return;
  }

  setState(telegramId, UserState.ENTERING_WITHDRAW_AMOUNT, { method });

  await bot.sendMessage(chatId, `📤 *Withdraw via ${method.replace("_", " ")}*

💰 Your balance: $${parseFloat(user.balance).toFixed(2)}
💳 Wallet: ${user.walletAddress || "Not set"}

💰 *Enter withdrawal amount (USD):*`, {
    parse_mode: "Markdown",
  });
}

async function handleWithdrawAmount(bot: TelegramBot, chatId: number, telegramId: string, text: string) {
  const amount = parseFloat(text);
  if (isNaN(amount) || amount <= 0) {
    await bot.sendMessage(chatId, "❌ Please enter a valid amount:");
    return;
  }

  const user = await getUserByTelegramId(telegramId);
  if (!user) {
    await bot.sendMessage(chatId, "❌ User not found.");
    clearSession(telegramId);
    return;
  }

  if (amount > parseFloat(user.balance)) {
    await bot.sendMessage(chatId, `❌ Insufficient balance. Your balance: $${parseFloat(user.balance).toFixed(2)}`);
    return;
  }

  const session = getSession(telegramId);
  setState(telegramId, UserState.ENTERING_WITHDRAW_WALLET, { ...session.data, amount });

  await bot.sendMessage(chatId, `💳 *Enter your wallet address:*

This is where we'll send your $${amount.toFixed(2)} withdrawal.`, {
    parse_mode: "Markdown",
  });
}

async function handleWithdrawWallet(bot: TelegramBot, chatId: number, telegramId: string, wallet: string) {
  const session = getSession(telegramId);
  const amount = session.data.amount as number;
  const method = session.data.method as string;

  if (!wallet || wallet.length < 10) {
    await bot.sendMessage(chatId, "❌ Please enter a valid wallet address:");
    return;
  }

  const user = await getUserByTelegramId(telegramId);
  if (!user) {
    await bot.sendMessage(chatId, "❌ User not found.");
    clearSession(telegramId);
    return;
  }

  // Deduct from balance immediately
  await updateUserBalance(user.id, (parseFloat(user.balance) - amount).toFixed(2));

  const withdrawal = await createWithdrawal(user.id, amount.toFixed(2), wallet, method);
  clearSession(telegramId);

  await bot.sendMessage(chatId, `✅ *Withdrawal Request Submitted!*

📋 Withdrawal ID: #${withdrawal.id}
💰 Amount: $${amount.toFixed(2)}
💰 Method: ${method}
💳 Wallet: \`${wallet}\`
📌 Status: Pending Review

Your withdrawal will be processed within 24-48 hours.`, {
    parse_mode: "Markdown",
    reply_markup: mainMenuKeyboard(),
  });

  // Notify admin
  if (ADMIN_ID) {
    try {
      await bot.sendMessage(parseInt(ADMIN_ID), `🔔 *New Withdrawal Request!*

📋 ID: #${withdrawal.id}
👤 User: ${user.firstName || user.username || user.telegramId}
💰 Amount: $${amount.toFixed(2)}
💰 Method: ${method}
💳 Wallet: \`${wallet}\``, {
        parse_mode: "Markdown",
        reply_markup: adminWithdrawalKeyboard(withdrawal.id),
      });
    } catch {
      // Admin might not have started the bot
    }
  }
}

// ─── Referrals ───────────────────────────────────────────────────────────────

async function handleShowReferrals(bot: TelegramBot, chatId: number, telegramId: string, messageId?: number) {
  const user = await getUserByTelegramId(telegramId);
  if (!user) {
    await bot.sendMessage(chatId, "❌ User not found.");
    return;
  }

  const referredUsers = await getReferredUsers(user.id);
  const botUsername = (await bot.getMe()).username;
  const referralLink = `https://t.me/${botUsername}?start=ref_${user.referralCode}`;

  const text = `👥 *Referral Program*

🔗 *Your Referral Link:*
\`${referralLink}\`

📋 *Your Code:* \`ref_${user.referralCode}\`

👥 *Referred Users:* ${referredUsers.length}
💰 *Total Referral Earnings:* $${parseFloat(user.totalReferralEarnings).toFixed(2)}
📊 *Commission Rate:* 10%

💡 *How it works:*
Share your referral link with friends. When they register and invest, you earn *10% commission* on their investment amount!

_Example: If your referral invests $1000, you earn $100!_`;

  if (messageId) {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: referralKeyboard(),
    });
  } else {
    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: referralKeyboard(),
    });
  }
}

async function handleShowReferralList(bot: TelegramBot, chatId: number, telegramId: string, messageId?: number) {
  const user = await getUserByTelegramId(telegramId);
  if (!user) {
    await bot.sendMessage(chatId, "❌ User not found.");
    return;
  }

  const referralsList = await getUserReferrals(user.id);

  if (referralsList.length === 0) {
    const text = "👥 *My Referrals*\n\nYou haven't referred anyone yet.\n\nShare your referral link to start earning!";
    if (messageId) {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: referralKeyboard(),
      });
    } else {
      await bot.sendMessage(chatId, text, {
        parse_mode: "Markdown",
        reply_markup: referralKeyboard(),
      });
    }
    return;
  }

  let text = "👥 *My Referrals*\n\n";
  referralsList.slice(0, 20).forEach((ref, idx) => {
    text += `${idx + 1}. ${ref.referred?.firstName || "User"} ${ref.isPaid ? "✅" : "⏳"} - $${ref.commissionAmount}\n`;
  });

  if (messageId) {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: referralKeyboard(),
    });
  } else {
    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: referralKeyboard(),
    });
  }
}

// ─── Transactions ────────────────────────────────────────────────────────────

async function handleShowTransactions(bot: TelegramBot, chatId: number, telegramId: string, messageId?: number) {
  const user = await getUserByTelegramId(telegramId);
  if (!user) {
    await bot.sendMessage(chatId, "❌ User not found.");
    return;
  }

  const transactionsList = await getUserTransactions(user.id, 15);

  if (transactionsList.length === 0) {
    const text = "📋 *Transaction History*\n\nNo transactions yet.";
    if (messageId) {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: backToMainMenuKeyboard(),
      });
    } else {
      await bot.sendMessage(chatId, text, {
        parse_mode: "Markdown",
        reply_markup: backToMainMenuKeyboard(),
      });
    }
    return;
  }

  const typeEmojis: Record<string, string> = {
    deposit: "📥",
    withdrawal: "📤",
    investment: "📊",
    earning: "💰",
    referral_commission: "👥",
    admin_adjustment: "⚙️",
    refund: "🔄",
  };

  let text = "📋 *Transaction History*\n\n";
  transactionsList.forEach((tx) => {
    const emoji = typeEmojis[tx.type] || "📌";
    const sign = parseFloat(tx.amount) >= 0 ? "+" : "";
    text += `${emoji} *${tx.type.replace(/_/g, " ").toUpperCase()}*\n`;
    text += `   💰 ${sign}$${parseFloat(tx.amount).toFixed(2)}\n`;
    if (tx.description) {
      text += `   📝 ${tx.description}\n`;
    }
    text += `   📅 ${new Date(tx.createdAt).toLocaleDateString()}\n\n`;
  });

  if (messageId) {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: backToMainMenuKeyboard(),
    });
  } else {
    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: backToMainMenuKeyboard(),
    });
  }
}

// ─── Settings Handlers ───────────────────────────────────────────────────────

async function handleSetWalletAddress(bot: TelegramBot, chatId: number, telegramId: string, address: string) {
  const user = await getUserByTelegramId(telegramId);
  if (!user) {
    await bot.sendMessage(chatId, "❌ User not found.");
    clearSession(telegramId);
    return;
  }

  await updateUserBalance(user.id, user.balance); // no-op
  // Update wallet address directly
  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  await db.update(users).set({ walletAddress: address, updatedAt: new Date() }).where(eq(users.id, user.id));

  clearSession(telegramId);
  await bot.sendMessage(chatId, `✅ Wallet address updated!\n\n💳 \`${address}\``, {
    parse_mode: "Markdown",
    reply_markup: settingsKeyboard(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

async function handleAdminDashboard(bot: TelegramBot, chatId: number, messageId?: number) {
  const stats = await getAdminStats();

  const text = `📊 *Admin Dashboard*

👥 *Total Users:* ${stats.totalUsers}
💰 *Total Invested:* $${stats.totalInvested}
📥 *Total Deposited:* $${stats.totalDeposited}

⏳ *Pending Actions:*
  📥 Pending Deposits: ${stats.pendingDeposits}
  📤 Pending Withdrawals: ${stats.pendingWithdrawals}
  📋 Pending Investments: ${stats.pendingInvestments}

✅ *Active Investments:* ${stats.activeInvestments}`;

  if (messageId) {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: adminBackKeyboard(),
    });
  } else {
    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: adminBackKeyboard(),
    });
  }
}

async function handleAdminDeposits(bot: TelegramBot, chatId: number, messageId?: number) {
  const pendingDeposits = await getPendingDeposits();

  if (pendingDeposits.length === 0) {
    const text = "💰 *Pending Deposits*\n\nNo pending deposits.";
    if (messageId) {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: adminBackKeyboard(),
      });
    } else {
      await bot.sendMessage(chatId, text, {
        parse_mode: "Markdown",
        reply_markup: adminBackKeyboard(),
      });
    }
    return;
  }

  for (const dep of pendingDeposits.slice(0, 5)) {
    const text = `💰 *Deposit #${dep.id}*

👤 User: ${dep.user?.firstName || dep.user?.username || dep.user?.telegramId}
💰 Amount: $${dep.amount}
💳 Method: ${dep.paymentMethod || "N/A"}
📅 Date: ${new Date(dep.createdAt).toLocaleString()}`;

    const opts = {
      parse_mode: "Markdown" as const,
      reply_markup: adminDepositKeyboard(dep.id),
    };

    if (dep.proofFileId) {
      await bot.sendPhoto(chatId, dep.proofFileId, { caption: text, ...opts });
    } else {
      await bot.sendMessage(chatId, text, opts);
    }
  }

  if (pendingDeposits.length > 5) {
    await bot.sendMessage(chatId, `... and ${pendingDeposits.length - 5} more pending deposits.`);
  }
}

async function handleAdminApproveDeposit(bot: TelegramBot, chatId: number, depositId: number, messageId?: number) {
  try {
    const deposit = await approveDeposit(depositId);
    if (!deposit) throw new Error("Deposit not found");

    await bot.sendMessage(chatId, `✅ Deposit #${depositId} approved! $${deposit.amount} added to user's balance.`);

    // Notify user
    try {
      const user = await getUserById(deposit.userId);
      if (user) {
        await bot.sendMessage(parseInt(user.telegramId), `✅ *Deposit Approved!*

💰 Amount: $${deposit.amount} has been added to your wallet.
📋 Deposit ID: #${depositId}`, { parse_mode: "Markdown" });
      }
    } catch { /* User might not have started the bot */ }
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Error approving deposit: ${error}`);
  }
}

async function handleAdminRejectDeposit(bot: TelegramBot, chatId: number, depositId: number, messageId?: number) {
  try {
    const deposit = await rejectDeposit(depositId);
    if (!deposit) throw new Error("Deposit not found");

    await bot.sendMessage(chatId, `❌ Deposit #${depositId} rejected.`);

    // Notify user
    try {
      const user = await getUserById(deposit.userId);
      if (user) {
        await bot.sendMessage(parseInt(user.telegramId), `❌ *Deposit Rejected*

📋 Deposit ID: #${depositId}
💰 Amount: $${deposit.amount}

Please contact support if you believe this is an error.`, { parse_mode: "Markdown" });
      }
    } catch { /* User might not have started the bot */ }
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Error rejecting deposit: ${error}`);
  }
}

async function handleAdminDepositNote(bot: TelegramBot, chatId: number, telegramId: string, note: string) {
  const session = getSession(telegramId);
  const depositId = session.data.depositId as number;
  clearSession(telegramId);

  await bot.sendMessage(chatId, `✅ Note added to deposit #${depositId}: "${note}"`);
}

async function handleAdminWithdrawals(bot: TelegramBot, chatId: number, messageId?: number) {
  const pendingWithdrawals = await getPendingWithdrawals();

  if (pendingWithdrawals.length === 0) {
    const text = "📤 *Pending Withdrawals*\n\nNo pending withdrawals.";
    if (messageId) {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: adminBackKeyboard(),
      });
    } else {
      await bot.sendMessage(chatId, text, {
        parse_mode: "Markdown",
        reply_markup: adminBackKeyboard(),
      });
    }
    return;
  }

  for (const w of pendingWithdrawals.slice(0, 10)) {
    const text = `📤 *Withdrawal #${w.id}*

👤 User: ${w.user?.firstName || w.user?.username || w.user?.telegramId}
💰 Amount: $${w.amount}
💳 Method: ${w.paymentMethod || "N/A"}
💳 Wallet: \`${w.walletAddress || "N/A"}\`
📅 Date: ${new Date(w.createdAt).toLocaleString()}`;

    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: adminWithdrawalKeyboard(w.id),
    });
  }
}

async function handleAdminApproveWithdrawal(bot: TelegramBot, chatId: number, withdrawalId: number, messageId?: number) {
  try {
    await approveWithdrawal(withdrawalId);
    const w = await getWithdrawalById(withdrawalId);
    await bot.sendMessage(chatId, `✅ Withdrawal #${withdrawalId} approved!`);

    if (w) {
      try {
        const user = await getUserById(w.userId);
        if (user) {
          await bot.sendMessage(parseInt(user.telegramId), `✅ *Withdrawal Approved!*

💰 Amount: $${w.amount}
📋 ID: #${withdrawalId}

Your withdrawal is being processed.`, { parse_mode: "Markdown" });
        }
      } catch { /* ignore */ }
    }
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Error: ${error}`);
  }
}

async function handleAdminRejectWithdrawal(bot: TelegramBot, chatId: number, withdrawalId: number, messageId?: number) {
  try {
    const w = await rejectWithdrawal(withdrawalId);
    await bot.sendMessage(chatId, `❌ Withdrawal #${withdrawalId} rejected. Balance refunded.`);

    if (w) {
      try {
        const user = await getUserById(w.userId);
        if (user) {
          await bot.sendMessage(parseInt(user.telegramId), `❌ *Withdrawal Rejected*

📋 ID: #${withdrawalId}
💰 Amount: $${w.amount}
🔄 Balance has been refunded.

Contact support for details.`, { parse_mode: "Markdown" });
        }
      } catch { /* ignore */ }
    }
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Error: ${error}`);
  }
}

async function handleAdminWithdrawalNote(bot: TelegramBot, chatId: number, telegramId: string, note: string) {
  const session = getSession(telegramId);
  const withdrawalId = session.data.withdrawalId as number;
  clearSession(telegramId);
  await bot.sendMessage(chatId, `✅ Note added to withdrawal #${withdrawalId}: "${note}"`);
}

// ─── Admin Investments ───────────────────────────────────────────────────────

async function handleAdminPendingInvestments(bot: TelegramBot, chatId: number, messageId?: number) {
  const pendingInvestments = await getPendingInvestments();

  if (pendingInvestments.length === 0) {
    const text = "📋 *Pending Investments*\n\nNo pending investments.";
    if (messageId) {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: adminBackKeyboard(),
      });
    } else {
      await bot.sendMessage(chatId, text, {
        parse_mode: "Markdown",
        reply_markup: adminBackKeyboard(),
      });
    }
    return;
  }

  for (const inv of pendingInvestments.slice(0, 10)) {
    const text = `📋 *Investment #${inv.id}*

👤 User: ${inv.user?.firstName || inv.user?.username || inv.user?.telegramId}
💰 Amount: $${inv.amount}
📊 Plan: ${inv.plan?.name || "N/A"}
📅 Date: ${new Date(inv.createdAt).toLocaleString()}`;

    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: adminInvestmentKeyboard(inv.id),
    });
  }
}

async function handleAdminActiveInvestments(bot: TelegramBot, chatId: number, messageId?: number) {
  const activeInvestments = await getActiveInvestments();

  if (activeInvestments.length === 0) {
    const text = "✅ *Active Investments*\n\nNo active investments.";
    if (messageId) {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: adminBackKeyboard(),
      });
    } else {
      await bot.sendMessage(chatId, text, {
        parse_mode: "Markdown",
        reply_markup: adminBackKeyboard(),
      });
    }
    return;
  }

  for (const inv of activeInvestments.slice(0, 10)) {
    const text = `✅ *Investment #${inv.id}*

👤 User: ${inv.user?.firstName || inv.user?.username || inv.user?.telegramId}
💰 Amount: $${inv.amount}
📊 Plan: ${inv.plan?.name || "N/A"}
📈 Earnings: $${inv.earnings}
🏢 Prop Firm: ${inv.propFirmName || "Not set"}
🎯 Target: ${inv.profitTarget ? "$" + inv.profitTarget : "Not set"}
📅 Started: ${inv.startDate ? new Date(inv.startDate).toLocaleDateString() : "N/A"}
📅 Ends: ${inv.endDate ? new Date(inv.endDate).toLocaleDateString() : "N/A"}`;

    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: adminActiveInvestmentKeyboard(inv.id),
    });
  }
}

async function handleAdminViewInvestment(bot: TelegramBot, chatId: number, investmentId: number, messageId?: number) {
  const inv = await getInvestmentById(investmentId);
  if (!inv) {
    await bot.sendMessage(chatId, "❌ Investment not found.");
    return;
  }

  const text = `📋 *Investment #${inv.id}*

👤 User: ${inv.user?.firstName || inv.user?.username || inv.user?.telegramId} (ID: ${inv.user?.telegramId})
💰 Amount: $${inv.amount}
📊 Plan: ${inv.plan?.name || "N/A"}
📌 Status: ${inv.status.toUpperCase()}
📈 Earnings: $${inv.earnings}
🏢 Prop Firm: ${inv.propFirmName || "Not set"}
🎯 Profit Target: ${inv.profitTarget ? "$" + inv.profitTarget : "Not set"}
📝 Notes: ${inv.notes || "None"}
📅 Created: ${new Date(inv.createdAt).toLocaleString()}
📅 Started: ${inv.startDate ? new Date(inv.startDate).toLocaleString() : "N/A"}
📅 Ends: ${inv.endDate ? new Date(inv.endDate).toLocaleString() : "N/A"}`;

  const keyboard = inv.status === "active"
    ? adminActiveInvestmentKeyboard(inv.id)
    : adminInvestmentKeyboard(inv.id);

  if (messageId) {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  } else {
    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  }
}

async function handleAdminApproveInvestment(bot: TelegramBot, chatId: number, telegramId: string, investmentId: number, messageId?: number) {
  try {
    const inv = await approveInvestment(investmentId, parseInt(telegramId));

    await bot.sendMessage(chatId, `✅ Investment #${investmentId} approved!

🏢 Prop Firm: Not set (use buttons to set)
🎯 Profit Target: Not set (use buttons to set)

Investment is now active!`, {
      reply_markup: adminActiveInvestmentKeyboard(investmentId),
    });

    // Notify user
    try {
      const user = await getUserById(inv.userId);
      if (user) {
        await bot.sendMessage(parseInt(user.telegramId), `✅ *Investment Approved!*

📋 Investment ID: #${investmentId}
💰 Amount: $${inv.amount}
📅 Start Date: ${new Date().toLocaleDateString()}
📅 End Date: ${inv.endDate ? new Date(inv.endDate).toLocaleDateString() : "N/A"}

Our team will now manage your capital with prop firm accounts. You'll be notified of any earnings! 🚀`, {
          parse_mode: "Markdown",
        });
      }
    } catch { /* ignore */ }
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Error: ${error}`);
  }
}

async function handleAdminRejectInvestment(bot: TelegramBot, chatId: number, investmentId: number, messageId?: number) {
  try {
    await cancelInvestment(investmentId);
    const inv = await getInvestmentById(investmentId);

    await bot.sendMessage(chatId, `❌ Investment #${investmentId} rejected. Balance refunded.`);

    if (inv) {
      try {
        const user = await getUserById(inv.userId);
        if (user) {
          await bot.sendMessage(parseInt(user.telegramId), `❌ *Investment Rejected*

📋 Investment ID: #${investmentId}
💰 Amount: $${inv.amount} has been refunded to your wallet.

Contact support for details.`, { parse_mode: "Markdown" });
        }
      } catch { /* ignore */ }
    }
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Error: ${error}`);
  }
}

async function handleAdminCompleteInvestment(bot: TelegramBot, chatId: number, investmentId: number, messageId?: number) {
  try {
    const inv = await getInvestmentById(investmentId);
    if (!inv) throw new Error("Investment not found");

    const earnings = parseFloat(inv.earnings);
    if (earnings <= 0) {
      await bot.sendMessage(chatId, `⚠️ Investment #${investmentId} has no earnings recorded. Add earnings first before completing.`);
      return;
    }

    await completeInvestment(investmentId, inv.earnings);

    await bot.sendMessage(chatId, `✅ Investment #${investmentId} completed! Earnings: $${inv.earnings} added to user's balance.`);

    try {
      const user = await getUserById(inv.userId);
      if (user) {
        await bot.sendMessage(parseInt(user.telegramId), `🎉 *Investment Completed!*

📋 Investment ID: #${investmentId}
💰 Investment: $${inv.amount}
📈 Earnings: $${inv.earnings}

Your earnings have been added to your wallet! 🎉`, {
          parse_mode: "Markdown",
          reply_markup: walletKeyboard(),
        });
      }
    } catch { /* ignore */ }
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Error: ${error}`);
  }
}

async function handleAdminCancelInvestment(bot: TelegramBot, chatId: number, investmentId: number, messageId?: number) {
  try {
    await cancelInvestment(investmentId);
    await bot.sendMessage(chatId, `❌ Investment #${investmentId} cancelled and refunded.`);

    const inv = await getInvestmentById(investmentId);
    if (inv) {
      try {
        const user = await getUserById(inv.userId);
        if (user) {
          await bot.sendMessage(parseInt(user.telegramId), `🔄 *Investment Cancelled*

📋 Investment ID: #${investmentId}
💰 Amount: $${inv.amount} has been refunded to your wallet.`, {
            parse_mode: "Markdown",
          });
        }
      } catch { /* ignore */ }
    }
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Error: ${error}`);
  }
}

async function handleAdminAddEarnings(bot: TelegramBot, chatId: number, telegramId: string, text: string) {
  const amount = parseFloat(text);
  if (isNaN(amount) || amount <= 0) {
    await bot.sendMessage(chatId, "❌ Please enter a valid amount:");
    return;
  }

  const session = getSession(telegramId);
  const investmentId = session.data.investmentId as number;
  clearSession(telegramId);

  try {
    await addEarningsToInvestment(investmentId, amount.toFixed(2));
    await bot.sendMessage(chatId, `✅ $${amount.toFixed(2)} earnings added to investment #${investmentId}!`);

    const inv = await getInvestmentById(investmentId);
    if (inv) {
      try {
        const user = await getUserById(inv.userId);
        if (user) {
          await bot.sendMessage(parseInt(user.telegramId), `📈 *New Earnings!*

📋 Investment ID: #${investmentId}
💰 Earnings Added: $${amount.toFixed(2)}
📈 Total Earnings: $${inv.earnings}

Your earnings have been added to your wallet! 💰`, {
            parse_mode: "Markdown",
          });
        }
      } catch { /* ignore */ }
    }
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Error: ${error}`);
  }
}

async function handleAdminSetPropFirm(bot: TelegramBot, chatId: number, telegramId: string, text: string) {
  const session = getSession(telegramId);
  const investmentId = session.data.investmentId as number;
  clearSession(telegramId);

  try {
    await updateInvestmentDetails(investmentId, { propFirmName: text });
    await bot.sendMessage(chatId, `✅ Prop firm set for investment #${investmentId}: "${text}"`, {
      reply_markup: adminActiveInvestmentKeyboard(investmentId),
    });
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Error: ${error}`);
  }
}

async function handleAdminSetProfitTarget(bot: TelegramBot, chatId: number, telegramId: string, text: string) {
  const amount = parseFloat(text);
  if (isNaN(amount) || amount <= 0) {
    await bot.sendMessage(chatId, "❌ Please enter a valid amount:");
    return;
  }

  const session = getSession(telegramId);
  const investmentId = session.data.investmentId as number;
  clearSession(telegramId);

  try {
    await updateInvestmentDetails(investmentId, { profitTarget: amount.toFixed(2) });
    await bot.sendMessage(chatId, `✅ Profit target set for investment #${investmentId}: $${amount.toFixed(2)}`, {
      reply_markup: adminActiveInvestmentKeyboard(investmentId),
    });
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Error: ${error}`);
  }
}

async function handleAdminSetInvestmentNotes(bot: TelegramBot, chatId: number, telegramId: string, text: string) {
  const session = getSession(telegramId);
  const investmentId = session.data.investmentId as number;
  clearSession(telegramId);

  try {
    await updateInvestmentDetails(investmentId, { notes: text });
    await bot.sendMessage(chatId, `✅ Notes added to investment #${investmentId}.`);
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Error: ${error}`);
  }
}

// ─── Admin Plans ─────────────────────────────────────────────────────────────

async function handleAdminPlans(bot: TelegramBot, chatId: number, messageId?: number) {
  const plans = await getAllPlans();

  if (plans.length === 0) {
    const text = "📝 *Manage Plans*\n\nNo plans found.";
    if (messageId) {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: adminBackKeyboard(),
      });
    } else {
      await bot.sendMessage(chatId, text, {
        parse_mode: "Markdown",
        reply_markup: adminBackKeyboard(),
      });
    }
    return;
  }

  const buttons = plans.map((plan) => [{
    text: `${plan.isActive ? "🟢" : "🔴"} ${plan.name}`,
    callback_data: `admin_view_plan_${plan.id}`,
  }]);
  buttons.push([{ text: "🔙 Admin Panel", callback_data: "admin_menu" }]);

  const text = `📝 *Manage Plans*

Click on a plan to view/edit:`;

  if (messageId) {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons },
    });
  } else {
    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons },
    });
  }
}

async function handleAdminViewPlan(bot: TelegramBot, chatId: number, planId: number, messageId?: number) {
  const plan = await getPlanById(planId);
  if (!plan) {
    await bot.sendMessage(chatId, "❌ Plan not found.");
    return;
  }

  const text = `📝 *Plan: ${plan.name}*

📝 Description: ${plan.description || "N/A"}
💵 Min Amount: $${plan.minAmount}
💵 Max Amount: $${plan.maxAmount}
📅 Duration: ${plan.durationDays} days
📈 Expected Return: ${plan.expectedReturnPercent}%
📌 Status: ${plan.isActive ? "🟢 Active" : "🔴 Inactive"}`;

  if (messageId) {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: adminPlanKeyboard(planId, plan.isActive),
    });
  } else {
    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: adminPlanKeyboard(planId, plan.isActive),
    });
  }
}

async function handleAdminTogglePlan(bot: TelegramBot, chatId: number, planId: number, messageId?: number) {
  const plan = await getPlanById(planId);
  if (!plan) {
    await bot.sendMessage(chatId, "❌ Plan not found.");
    return;
  }

  await togglePlanActive(planId, !plan.isActive);
  await bot.sendMessage(chatId, `✅ Plan "${plan.name}" ${!plan.isActive ? "activated" : "deactivated"}.`);

  await handleAdminViewPlan(bot, chatId, planId);
}

async function handleAdminEditPlanField(bot: TelegramBot, chatId: number, telegramId: string, field: string, value: string) {
  const session = getSession(telegramId);
  const planId = session.data.planId as number;
  clearSession(telegramId);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (field === "durationDays") {
      updateData[field] = parseInt(value);
      if (isNaN(updateData[field])) {
        await bot.sendMessage(chatId, "❌ Please enter a valid number:");
        return;
      }
    } else if (field === "minAmount" || field === "maxAmount" || field === "expectedReturnPercent") {
      const num = parseFloat(value);
      if (isNaN(num)) {
        await bot.sendMessage(chatId, "❌ Please enter a valid number:");
        return;
      }
      updateData[field] = num.toFixed(2);
    } else {
      updateData[field] = value;
    }

    await updatePlan(planId, updateData);
    await bot.sendMessage(chatId, `✅ Plan ${field} updated successfully!`, {
      reply_markup: adminBackKeyboard(),
    });
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Error: ${error}`);
  }
}

// ─── Admin Add Plan Flow ─────────────────────────────────────────────────────

async function handleAdminAddPlanName(bot: TelegramBot, chatId: number, telegramId: string, name: string) {
  setState(telegramId, UserState.ADMIN_ADDING_PLAN_DESC, { name });
  await bot.sendMessage(chatId, `✅ Name: ${name}\n\n📝 Enter plan description:`);
}

async function handleAdminAddPlanDesc(bot: TelegramBot, chatId: number, telegramId: string, desc: string) {
  const session = getSession(telegramId);
  setState(telegramId, UserState.ADMIN_ADDING_PLAN_MIN, { ...session.data, description: desc });
  await bot.sendMessage(chatId, `✅ Description saved.\n\n💵 Enter minimum investment amount (USD):`);
}

async function handleAdminAddPlanMin(bot: TelegramBot, chatId: number, telegramId: string, text: string) {
  const min = parseFloat(text);
  if (isNaN(min) || min <= 0) {
    await bot.sendMessage(chatId, "❌ Please enter a valid amount:");
    return;
  }
  const session = getSession(telegramId);
  setState(telegramId, UserState.ADMIN_ADDING_PLAN_MAX, { ...session.data, minAmount: min.toFixed(2) });
  await bot.sendMessage(chatId, `✅ Min: $${min.toFixed(2)}\n\n💵 Enter maximum investment amount (USD):`);
}

async function handleAdminAddPlanMax(bot: TelegramBot, chatId: number, telegramId: string, text: string) {
  const max = parseFloat(text);
  if (isNaN(max) || max <= 0) {
    await bot.sendMessage(chatId, "❌ Please enter a valid amount:");
    return;
  }
  const session = getSession(telegramId);
  const minAmount = parseFloat(session.data.minAmount as string);
  if (max <= minAmount) {
    await bot.sendMessage(chatId, `❌ Maximum must be greater than minimum ($${minAmount}):`);
    return;
  }
  setState(telegramId, UserState.ADMIN_ADDING_PLAN_DURATION, { ...session.data, maxAmount: max.toFixed(2) });
  await bot.sendMessage(chatId, `✅ Max: $${max.toFixed(2)}\n\n📅 Enter duration (days):`);
}

async function handleAdminAddPlanDuration(bot: TelegramBot, chatId: number, telegramId: string, text: string) {
  const days = parseInt(text);
  if (isNaN(days) || days <= 0) {
    await bot.sendMessage(chatId, "❌ Please enter a valid number of days:");
    return;
  }
  const session = getSession(telegramId);
  setState(telegramId, UserState.ADMIN_ADDING_PLAN_RETURN, { ...session.data, durationDays: days });
  await bot.sendMessage(chatId, `✅ Duration: ${days} days\n\n📈 Enter expected return (%):`);
}

async function handleAdminAddPlanReturn(bot: TelegramBot, chatId: number, telegramId: string, text: string) {
  const returnPercent = parseFloat(text);
  if (isNaN(returnPercent) || returnPercent <= 0) {
    await bot.sendMessage(chatId, "❌ Please enter a valid percentage:");
    return;
  }

  const session = getSession(telegramId);
  const data = session.data;

  try {
    const plan = await createPlan({
      name: data.name as string,
      description: data.description as string,
      minAmount: data.minAmount as string,
      maxAmount: data.maxAmount as string,
      durationDays: data.durationDays as number,
      expectedReturnPercent: returnPercent.toFixed(2),
    });

    clearSession(telegramId);

    await bot.sendMessage(chatId, `✅ *New Plan Created!*

📊 *${plan.name}*
📝 ${plan.description}
💵 Range: $${plan.minAmount} - $${plan.maxAmount}
📅 Duration: ${plan.durationDays} days
📈 Expected Return: ${plan.expectedReturnPercent}%`, {
      parse_mode: "Markdown",
      reply_markup: adminBackKeyboard(),
    });
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Error: ${error}`);
    clearSession(telegramId);
  }
}

// ─── Admin Users ─────────────────────────────────────────────────────────────

async function handleAdminUsers(bot: TelegramBot, chatId: number, messageId?: number, page = 1) {
  const allUsers = await getAllUsers();
  const perPage = 10;
  const totalPages = Math.ceil(allUsers.length / perPage);
  const pageUsers = allUsers.slice((page - 1) * perPage, page * perPage);

  if (allUsers.length === 0) {
    const text = "👥 *All Users*\n\nNo users found.";
    if (messageId) {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: adminBackKeyboard(),
      });
    } else {
      await bot.sendMessage(chatId, text, {
        parse_mode: "Markdown",
        reply_markup: adminBackKeyboard(),
      });
    }
    return;
  }

  let text = `👥 *All Users* (${allUsers.length} total, page ${page}/${totalPages})\n\n`;
  pageUsers.forEach((u, idx) => {
    text += `${(page - 1) * perPage + idx + 1}. ${u.isBanned ? "🚫" : "✅"} ${u.firstName || u.username || "Unknown"}\n`;
    text += `   ID: \`${u.telegramId}\`\n`;
    text += `   💰 Balance: $${parseFloat(u.balance).toFixed(2)} | Invested: $${parseFloat(u.totalInvested).toFixed(2)}\n\n`;
  });

  const buttons = pageUsers.map((u) => [{
    text: `${u.firstName || u.username || u.telegramId} (ID: ${u.telegramId})`,
    callback_data: `admin_view_user_${u.id}`,
  }]);

  if (totalPages > 1) {
    const navRow = [];
    if (page > 1) navRow.push({ text: "⬅️", callback_data: `admin_users_page_${page - 1}` });
    navRow.push({ text: `${page}/${totalPages}`, callback_data: "noop" });
    if (page < totalPages) navRow.push({ text: "➡️", callback_data: `admin_users_page_${page + 1}` });
    buttons.push(navRow);
  }
  buttons.push([{ text: "🔙 Admin Panel", callback_data: "admin_menu" }]);

  if (messageId) {
    try {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: buttons },
      });
    } catch {
      await bot.sendMessage(chatId, text, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: buttons },
      });
    }
  } else {
    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons },
    });
  }
}

async function handleAdminViewUser(bot: TelegramBot, chatId: number, userId: number, messageId?: number) {
  const user = await getUserById(userId);
  if (!user) {
    await bot.sendMessage(chatId, "❌ User not found.");
    return;
  }

  const stats = await getUserStats(userId);

  const text = `👤 *User Profile*

🆔 ID: \`${user.telegramId}\`
📛 Name: ${user.firstName || "N/A"} ${user.lastName || ""}
👤 Username: @${user.username || "N/A"}
📌 Status: ${user.isBanned ? "🚫 Banned" : "✅ Active"}

💰 *Financial:*
  Balance: $${parseFloat(user.balance).toFixed(2)}
  Total Invested: $${parseFloat(user.totalInvested).toFixed(2)}
  Total Earned: $${parseFloat(user.totalEarned).toFixed(2)}
  Referral Earnings: $${parseFloat(user.totalReferralEarnings).toFixed(2)}

📊 *Stats:*
  Active Investments: ${stats?.activeInvestments || 0}
  Referred Users: ${stats?.totalReferrals || 0}
  Referral Code: \`${user.referralCode}\`
  Referred By: ${user.referredBy || "None"}

📅 Joined: ${new Date(user.createdAt).toLocaleString()}`;

  if (messageId) {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: adminUserKeyboard(userId, user.isBanned),
    });
  } else {
    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: adminUserKeyboard(userId, user.isBanned),
    });
  }
}

async function handleAdminAdjustBalance(bot: TelegramBot, chatId: number, telegramId: string, text: string) {
  const session = getSession(telegramId);
  const action = session.data.action as string;

  if (action === "find") {
    const targetTelegramId = text.trim();
    const user = await getUserByTelegramId(targetTelegramId);
    clearSession(telegramId);

    if (!user) {
      await bot.sendMessage(chatId, "❌ User not found with that Telegram ID.");
      return;
    }

    await handleAdminViewUser(bot, chatId, user.id);
    return;
  }

  const userId = session.data.userId as number;
  const amount = parseFloat(text);
  if (isNaN(amount)) {
    await bot.sendMessage(chatId, "❌ Please enter a valid amount (e.g., 100 or -50):");
    return;
  }

  clearSession(telegramId);

  try {
    const user = await getUserById(userId);
    if (!user) throw new Error("User not found");

    const currentBalance = parseFloat(user.balance);
    const newBalance = (currentBalance + amount).toFixed(2);

    if (parseFloat(newBalance) < 0) {
      await bot.sendMessage(chatId, "❌ Balance cannot be negative.");
      return;
    }

    await updateUserBalance(userId, newBalance);

    // Record transaction
    const { db } = await import("@/db");
    const { transactions } = await import("@/db/schema");
    await db.insert(transactions).values({
      userId,
      type: "admin_adjustment",
      amount: amount.toFixed(2),
      description: `Admin adjustment by ${telegramId}`,
    });

    await bot.sendMessage(chatId, `✅ Balance adjusted!

👤 User: ${user.firstName || user.telegramId}
💰 Previous: $${currentBalance.toFixed(2)}
💰 Adjustment: ${amount >= 0 ? "+" : ""}$${amount.toFixed(2)}
💰 New Balance: $${newBalance}`, {
      reply_markup: adminUserKeyboard(userId, user.isBanned),
    });

    // Notify user
    try {
      await bot.sendMessage(parseInt(user.telegramId), `💰 *Balance Updated*

Your balance has been adjusted by an admin.
💰 Adjustment: ${amount >= 0 ? "+" : ""}$${amount.toFixed(2)}
💰 New Balance: $${newBalance}`, {
        parse_mode: "Markdown",
      });
    } catch { /* ignore */ }
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Error: ${error}`);
  }
}

async function handleAdminToggleBan(bot: TelegramBot, chatId: number, userId: number, messageId?: number) {
  const user = await getUserById(userId);
  if (!user) {
    await bot.sendMessage(chatId, "❌ User not found.");
    return;
  }

  if (user.isBanned) {
    await unbanUser(userId);
    await bot.sendMessage(chatId, `✅ User ${user.firstName || user.telegramId} has been unbanned.`);
  } else {
    await banUser(userId);
    await bot.sendMessage(chatId, `🚫 User ${user.firstName || user.telegramId} has been banned.`);
  }

  await handleAdminViewUser(bot, chatId, userId);
}

// ─── Admin Broadcast ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleAdminBroadcast(bot: TelegramBot, chatId: number, telegramId: string, msg: any) {
  const message = msg.text || msg.caption || "";
  if (!message) {
    await bot.sendMessage(chatId, "❌ Please enter a message to broadcast:");
    return;
  }

  clearSession(telegramId);

  const allUsers = await getAllUsers();
  let sentCount = 0;
  let failedCount = 0;

  await bot.sendMessage(chatId, `📢 Broadcasting to ${allUsers.length} users...`);

  for (const user of allUsers) {
    try {
      await bot.sendMessage(parseInt(user.telegramId), `📢 *Announcement*\n\n${message}`, {
        parse_mode: "Markdown",
      });
      sentCount++;
    } catch {
      failedCount++;
    }
    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  const adminUser = await getUserByTelegramId(telegramId);
  if (adminUser) {
    await recordBroadcast(adminUser.id, message, sentCount, failedCount);
  }

  await bot.sendMessage(chatId, `✅ *Broadcast Complete!*

📤 Sent: ${sentCount}
❌ Failed: ${failedCount}
👥 Total: ${allUsers.length}`, {
    parse_mode: "Markdown",
    reply_markup: adminBackKeyboard(),
  });
}

// ─── Admin Settings ──────────────────────────────────────────────────────────

async function handleAdminSettings(bot: TelegramBot, chatId: number, messageId?: number) {
  const referralPercent = await getSetting("referral_percent") || "10";
  const minDeposit = await getSetting("min_deposit") || "50";
  const minWithdrawal = await getSetting("min_withdrawal") || "50";

  const text = `⚙️ *Bot Settings*

📊 Referral Commission: ${referralPercent}%
📥 Minimum Deposit: $${minDeposit}
📤 Minimum Withdrawal: $${minWithdrawal}

_Use commands to change settings:_
/referral_percent [number]
/min_deposit [amount]
/min_withdrawal [amount]`;

  if (messageId) {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: adminBackKeyboard(),
    });
  } else {
    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: adminBackKeyboard(),
    });
  }
}
