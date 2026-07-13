export enum UserState {
  IDLE = "idle",
  // Deposit flow
  ENTERING_DEPOSIT_AMOUNT = "entering_deposit_amount",
  ENTERING_DEPOSIT_PROOF = "entering_deposit_proof",
  // Withdraw flow
  ENTERING_WITHDRAW_AMOUNT = "entering_withdraw_amount",
  ENTERING_WITHDRAW_WALLET = "entering_withdraw_wallet",
  // Investment flow
  SELECTING_PLAN = "selecting_plan",
  ENTERING_INVESTMENT_AMOUNT = "entering_investment_amount",
  CONFIRMING_INVESTMENT = "confirming_investment",
  // Settings
  ENTERING_WALLET_ADDRESS = "entering_wallet_address",
  SELECTING_PAYMENT_METHOD = "selecting_payment_method",
  // Admin states
  ADMIN_EDITING_PLAN_NAME = "admin_editing_plan_name",
  ADMIN_EDITING_PLAN_DESC = "admin_editing_plan_desc",
  ADMIN_EDITING_PLAN_MIN = "admin_editing_plan_min",
  ADMIN_EDITING_PLAN_MAX = "admin_editing_plan_max",
  ADMIN_EDITING_PLAN_DURATION = "admin_editing_plan_duration",
  ADMIN_EDITING_PLAN_RETURN = "admin_editing_plan_return",
  ADMIN_BROADCASTING = "admin_broadcasting",
  ADMIN_ADJUSTING_BALANCE = "admin_adjusting_balance",
  ADMIN_ADDING_EARNINGS = "admin_adding_earnings",
  ADMIN_ADDING_PLAN_NAME = "admin_adding_plan_name",
  ADMIN_ADDING_PLAN_DESC = "admin_adding_plan_desc",
  ADMIN_ADDING_PLAN_MIN = "admin_adding_plan_min",
  ADMIN_ADDING_PLAN_MAX = "admin_adding_plan_max",
  ADMIN_ADDING_PLAN_DURATION = "admin_adding_plan_duration",
  ADMIN_ADDING_PLAN_RETURN = "admin_adding_plan_return",
  ADMIN_SETTING_PROP_FIRM = "admin_setting_prop_firm",
  ADMIN_SETTING_PROFIT_TARGET = "admin_setting_profit_target",
  ADMIN_SETTING_INVESTMENT_NOTES = "admin_setting_investment_notes",
  ADMIN_DEPOSIT_NOTE = "admin_deposit_note",
  ADMIN_WITHDRAWAL_NOTE = "admin_withdrawal_note",
}

export interface SessionData {
  state: UserState;
  data: Record<string, unknown>;
}

// Global session store
const sessions = new Map<string, SessionData>();

export function getSession(telegramId: string): SessionData {
  if (!sessions.has(telegramId)) {
    sessions.set(telegramId, { state: UserState.IDLE, data: {} });
  }
  return sessions.get(telegramId)!;
}

export function setState(telegramId: string, state: UserState, data: Record<string, unknown> = {}) {
  sessions.set(telegramId, { state, data });
}

export function clearSession(telegramId: string) {
  sessions.set(telegramId, { state: UserState.IDLE, data: {} });
}
