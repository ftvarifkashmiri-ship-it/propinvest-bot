type InlineKeyboardButton = {
  text: string;
  callback_data?: string;
  url?: string;
};

type InlineKeyboardMarkup = {
  inline_keyboard: InlineKeyboardButton[][];
};

// ─── Main Menu Keyboard ──────────────────────────────────────────────────────

export function mainMenuKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "📊 Investment Plans", callback_data: "menu_plans" },
        { text: "💰 My Investments", callback_data: "menu_investments" },
      ],
      [
        { text: "💳 Wallet", callback_data: "menu_wallet" },
        { text: "👥 Referrals", callback_data: "menu_referrals" },
      ],
      [
        { text: "📥 Deposit Funds", callback_data: "menu_deposit" },
        { text: "📤 Withdraw", callback_data: "menu_withdraw" },
      ],
      [
        { text: "📋 Transaction History", callback_data: "menu_transactions" },
        { text: "⚙️ Settings", callback_data: "menu_settings" },
      ],
      [
        { text: "❓ Help & Support", callback_data: "menu_help" },
      ],
    ],
  };
}

// ─── Back to Main Menu ───────────────────────────────────────────────────────

export function backToMainMenuKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "🔙 Back to Main Menu", callback_data: "back_main" }],
    ],
  };
}

// ─── Investment Plans Keyboard ───────────────────────────────────────────────

export function plansKeyboard(
  plans: Array<{ id: number; name: string; minAmount: string; maxAmount: string }>
): InlineKeyboardMarkup {
  const buttons = plans.map((plan) => [
    {
      text: `${plan.name} ($${plan.minAmount} - $${plan.maxAmount})`,
      callback_data: `plan_${plan.id}`,
    },
  ]);
  buttons.push([{ text: "🔙 Back to Main Menu", callback_data: "back_main" }]);
  return { inline_keyboard: buttons };
}

export function investConfirmKeyboard(planId: number): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "✅ Confirm Investment", callback_data: `confirm_invest_${planId}` },
        { text: "❌ Cancel", callback_data: "menu_plans" },
      ],
      [{ text: "🔙 Back to Main Menu", callback_data: "back_main" }],
    ],
  };
}

// ─── Wallet Keyboard ─────────────────────────────────────────────────────────

export function walletKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "📥 Deposit", callback_data: "menu_deposit" },
        { text: "📤 Withdraw", callback_data: "menu_withdraw" },
      ],
      [{ text: "📋 Transaction History", callback_data: "menu_transactions" }],
      [{ text: "🔙 Back to Main Menu", callback_data: "back_main" }],
    ],
  };
}

// ─── Deposit Keyboard ────────────────────────────────────────────────────────

export function depositMethodKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "₿ Bitcoin (BTC)", callback_data: "deposit_btc" },
        { text: "💎 USDT (TRC20)", callback_data: "deposit_usdt_trc20" },
      ],
      [
        { text: "💎 USDT (ERC20)", callback_data: "deposit_usdt_erc20" },
        { text: "⟠ Ethereum (ETH)", callback_data: "deposit_eth" },
      ],
      [{ text: "🔙 Back", callback_data: "menu_wallet" }],
    ],
  };
}

export function depositConfirmKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "📸 Send Payment Proof", callback_data: "send_proof" }],
      [{ text: "❌ Cancel Deposit", callback_data: "menu_wallet" }],
      [{ text: "🔙 Back to Main Menu", callback_data: "back_main" }],
    ],
  };
}

// ─── Withdraw Keyboard ───────────────────────────────────────────────────────

export function withdrawMethodKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "₿ Bitcoin (BTC)", callback_data: "withdraw_btc" },
        { text: "💎 USDT (TRC20)", callback_data: "withdraw_usdt_trc20" },
      ],
      [
        { text: "💎 USDT (ERC20)", callback_data: "withdraw_usdt_erc20" },
        { text: "⟠ Ethereum (ETH)", callback_data: "withdraw_eth" },
      ],
      [{ text: "🔙 Back", callback_data: "menu_wallet" }],
    ],
  };
}

// ─── Referral Keyboard ───────────────────────────────────────────────────────

export function referralKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "👥 My Referrals", callback_data: "my_referrals" }],
      [{ text: "🔙 Back to Main Menu", callback_data: "back_main" }],
    ],
  };
}

// ─── Settings Keyboard ───────────────────────────────────────────────────────

export function settingsKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "💳 Set Wallet Address", callback_data: "set_wallet" }],
      [{ text: "💰 Set Payment Method", callback_data: "set_payment_method" }],
      [{ text: "🔙 Back to Main Menu", callback_data: "back_main" }],
    ],
  };
}

export function paymentMethodKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "₿ Bitcoin", callback_data: "pm_btc" },
        { text: "💎 USDT", callback_data: "pm_usdt" },
      ],
      [
        { text: "⟠ Ethereum", callback_data: "pm_eth" },
        { text: "💵 Other", callback_data: "pm_other" },
      ],
      [{ text: "🔙 Back", callback_data: "menu_settings" }],
    ],
  };
}

// ─── Admin Keyboard ──────────────────────────────────────────────────────────

export function adminMenuKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "📊 Dashboard", callback_data: "admin_dashboard" },
        { text: "📈 Stats", callback_data: "admin_stats" },
      ],
      [
        { text: "💰 Pending Deposits", callback_data: "admin_deposits" },
        { text: "📤 Pending Withdrawals", callback_data: "admin_withdrawals" },
      ],
      [
        { text: "📋 Pending Investments", callback_data: "admin_pending_investments" },
        { text: "✅ Active Investments", callback_data: "admin_active_investments" },
      ],
      [
        { text: "📝 Manage Plans", callback_data: "admin_plans" },
        { text: "➕ Add New Plan", callback_data: "admin_add_plan" },
      ],
      [
        { text: "👥 All Users", callback_data: "admin_users" },
        { text: "🔍 Find User", callback_data: "admin_find_user" },
      ],
      [
        { text: "📢 Broadcast Message", callback_data: "admin_broadcast" },
        { text: "⚙️ Bot Settings", callback_data: "admin_settings" },
      ],
      [{ text: "🔙 Back to Main Menu", callback_data: "back_main" }],
    ],
  };
}

export function adminBackKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "🔙 Admin Panel", callback_data: "admin_menu" }],
      [{ text: "🏠 Main Menu", callback_data: "back_main" }],
    ],
  };
}

export function adminDepositKeyboard(depositId: number): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `admin_approve_deposit_${depositId}` },
        { text: "❌ Reject", callback_data: `admin_reject_deposit_${depositId}` },
      ],
      [
        { text: "📝 Add Note", callback_data: `admin_note_deposit_${depositId}` },
      ],
      [{ text: "🔙 Back to Deposits", callback_data: "admin_deposits" }],
    ],
  };
}

export function adminWithdrawalKeyboard(withdrawalId: number): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `admin_approve_withdrawal_${withdrawalId}` },
        { text: "❌ Reject", callback_data: `admin_reject_withdrawal_${withdrawalId}` },
      ],
      [
        { text: "📝 Add Note", callback_data: `admin_note_withdrawal_${withdrawalId}` },
      ],
      [{ text: "🔙 Back to Withdrawals", callback_data: "admin_withdrawals" }],
    ],
  };
}

export function adminInvestmentKeyboard(investmentId: number): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `admin_approve_invest_${investmentId}` },
        { text: "❌ Reject", callback_data: `admin_reject_invest_${investmentId}` },
      ],
      [
        { text: "🏢 Set Prop Firm", callback_data: `admin_set_propfirm_${investmentId}` },
        { text: "🎯 Set Profit Target", callback_data: `admin_set_target_${investmentId}` },
      ],
      [
        { text: "💰 Add Earnings", callback_data: `admin_add_earnings_${investmentId}` },
        { text: "✅ Complete", callback_data: `admin_complete_invest_${investmentId}` },
      ],
      [
        { text: "📝 Add Notes", callback_data: `admin_notes_invest_${investmentId}` },
      ],
      [{ text: "🔙 Back", callback_data: "admin_pending_investments" }],
    ],
  };
}

export function adminActiveInvestmentKeyboard(investmentId: number): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "💰 Add Earnings", callback_data: `admin_add_earnings_${investmentId}` },
        { text: "✅ Complete", callback_data: `admin_complete_invest_${investmentId}` },
      ],
      [
        { text: "🏢 Set Prop Firm", callback_data: `admin_set_propfirm_${investmentId}` },
        { text: "🎯 Set Profit Target", callback_data: `admin_set_target_${investmentId}` },
      ],
      [
        { text: "❌ Cancel & Refund", callback_data: `admin_cancel_invest_${investmentId}` },
      ],
      [
        { text: "📝 Add Notes", callback_data: `admin_notes_invest_${investmentId}` },
      ],
      [{ text: "🔙 Back", callback_data: "admin_active_investments" }],
    ],
  };
}

export function adminPlanKeyboard(planId: number, isActive: boolean): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "✏️ Edit Name", callback_data: `admin_edit_plan_name_${planId}` },
        { text: "📝 Edit Desc", callback_data: `admin_edit_plan_desc_${planId}` },
      ],
      [
        { text: "💵 Edit Min Amount", callback_data: `admin_edit_plan_min_${planId}` },
        { text: "💵 Edit Max Amount", callback_data: `admin_edit_plan_max_${planId}` },
      ],
      [
        { text: "📅 Edit Duration", callback_data: `admin_edit_plan_duration_${planId}` },
        { text: "📈 Edit Return %", callback_data: `admin_edit_plan_return_${planId}` },
      ],
      [
        {
          text: isActive ? "🔴 Deactivate" : "🟢 Activate",
          callback_data: `admin_toggle_plan_${planId}`,
        },
      ],
      [{ text: "🔙 Back to Plans", callback_data: "admin_plans" }],
    ],
  };
}

export function adminUserKeyboard(userId: number, isBanned: boolean): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "💰 Adjust Balance", callback_data: `admin_adjust_balance_${userId}` },
      ],
      [
        {
          text: isBanned ? "🟢 Unban User" : "🔴 Ban User",
          callback_data: `admin_toggle_ban_${userId}`,
        },
      ],
      [{ text: "🔙 Back to Users", callback_data: "admin_users" }],
    ],
  };
}

// ─── Help Keyboard ───────────────────────────────────────────────────────────

export function helpKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "💬 Contact Support", callback_data: "contact_support" },
      ],
      [{ text: "🔙 Back to Main Menu", callback_data: "back_main" }],
    ],
  };
}

// ─── Navigation Pagination ───────────────────────────────────────────────────

export function paginationKeyboard(
  prefix: string,
  current: number,
  total: number
): InlineKeyboardMarkup {
  const buttons: InlineKeyboardButton[][] = [];
  const navRow: InlineKeyboardButton[] = [];

  if (current > 1) {
    navRow.push({ text: "⬅️ Prev", callback_data: `${prefix}_${current - 1}` });
  }
  navRow.push({ text: `${current}/${total}`, callback_data: "noop" });
  if (current < total) {
    navRow.push({ text: "Next ➡️", callback_data: `${prefix}_${current + 1}` });
  }

  if (navRow.length > 1) {
    buttons.push(navRow);
  }
  buttons.push([{ text: "🔙 Back", callback_data: "admin_menu" }]);

  return { inline_keyboard: buttons };
}
