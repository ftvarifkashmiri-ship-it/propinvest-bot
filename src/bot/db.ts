import { db } from "@/db";
import {
  users,
  investmentPlans,
  investments,
  referrals,
  deposits,
  withdrawals,
  transactions,
  botSettings,
  broadcasts,
} from "@/db/schema";
import { eq, and, desc, sql, count, gte, lte } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// ─── User Operations ─────────────────────────────────────────────────────────

export async function getOrCreateUser(
  telegramId: string,
  username?: string,
  firstName?: string,
  lastName?: string,
  refCode?: string
) {
  let user = await db.query.users.findFirst({
    where: eq(users.telegramId, telegramId),
  });

  if (!user) {
    const referralCode = uuidv4().replace(/-/g, "").substring(0, 10).toUpperCase();
    let referredByUserId: number | null = null;

    if (refCode) {
      const referrer = await db.query.users.findFirst({
        where: eq(users.referralCode, refCode),
      });
      if (referrer) {
        referredByUserId = referrer.id;
      }
    }

    const inserted = await db
      .insert(users)
      .values({
        telegramId,
        username: username || null,
        firstName: firstName || null,
        lastName: lastName || null,
        referralCode,
        referredBy: referredByUserId,
      })
      .returning();

    user = inserted[0];
  }

  return user;
}

export async function getUserByTelegramId(telegramId: string) {
  return db.query.users.findFirst({
    where: eq(users.telegramId, telegramId),
  });
}

export async function getUserById(id: number) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

export async function updateUserBalance(userId: number, amount: string) {
  await db
    .update(users)
    .set({
      balance: amount,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function addToBalance(userId: number, amount: number) {
  await db
    .update(users)
    .set({
      balance: sql`${users.balance} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function subtractFromBalance(userId: number, amount: number) {
  await db
    .update(users)
    .set({
      balance: sql`${users.balance} - ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function getUserStats(userId: number) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) return null;

  const activeInvestments = await db.query.investments.findMany({
    where: and(
      eq(investments.userId, userId),
      eq(investments.status, "active")
    ),
  });

  const totalActiveInvested = activeInvestments.reduce(
    (sum: number, inv: { amount: string }) => sum + parseFloat(inv.amount),
    0
  );

  const referralCount = await db
    .select({ count: count() })
    .from(referrals)
    .where(eq(referrals.referrerId, userId));

  const totalReferrals = referralCount[0]?.count || 0;

  return {
    ...user,
    activeInvestments: activeInvestments.length,
    totalActiveInvested: totalActiveInvested.toFixed(2),
    totalReferrals,
  };
}

export async function getAllUsers() {
  return db.query.users.findMany({
    orderBy: desc(users.createdAt),
  });
}

export async function banUser(userId: number) {
  await db.update(users).set({ isBanned: true, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function unbanUser(userId: number) {
  await db.update(users).set({ isBanned: false, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function getTotalUsers() {
  const result = await db.select({ count: count() }).from(users);
  return result[0]?.count || 0;
}

// ─── Plan Operations ─────────────────────────────────────────────────────────

export async function getActivePlans() {
  return db.query.investmentPlans.findMany({
    where: eq(investmentPlans.isActive, true),
    orderBy: investmentPlans.sortOrder,
  });
}

export async function getAllPlans() {
  return db.query.investmentPlans.findMany({
    orderBy: investmentPlans.sortOrder,
  });
}

export async function getPlanById(id: number) {
  return db.query.investmentPlans.findFirst({
    where: eq(investmentPlans.id, id),
  });
}

export async function createPlan(data: {
  name: string;
  description: string;
  minAmount: string;
  maxAmount: string;
  durationDays: number;
  expectedReturnPercent: string;
}) {
  const inserted = await db
    .insert(investmentPlans)
    .values(data)
    .returning();
  return inserted[0];
}

export async function updatePlan(id: number, data: Partial<typeof investmentPlans.$inferInsert>) {
  await db
    .update(investmentPlans)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(investmentPlans.id, id));
}

export async function togglePlanActive(id: number, isActive: boolean) {
  await db
    .update(investmentPlans)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(investmentPlans.id, id));
}

// ─── Investment Operations ───────────────────────────────────────────────────

export async function createInvestment(userId: number, planId: number, amount: string) {
  const inserted = await db
    .insert(investments)
    .values({
      userId,
      planId,
      amount,
      status: "pending",
    })
    .returning();
  return inserted[0];
}

export async function approveInvestment(investmentId: number, adminId: number) {
  const inv = await db.query.investments.findFirst({
    where: eq(investments.id, investmentId),
  });
  if (!inv) throw new Error("Investment not found");

  const now = new Date();
  const plan = await getPlanById(inv.planId);
  if (!plan) throw new Error("Plan not found");

  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + plan.durationDays);

  await db
    .update(investments)
    .set({
      status: "active",
      startDate: now,
      endDate,
      updatedAt: new Date(),
    })
    .where(eq(investments.id, investmentId));

  // Update user total invested
  await db
    .update(users)
    .set({
      totalInvested: sql`${users.totalInvested} + ${inv.amount}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, inv.userId));

  // Create transaction
  await db.insert(transactions).values({
    userId: inv.userId,
    type: "investment",
    amount: `-${inv.amount}`,
    description: `Investment in plan #${inv.planId}`,
    relatedId: investmentId,
  });

  return { ...inv, endDate };
}

export async function completeInvestment(investmentId: number, earnings: string) {
  await db
    .update(investments)
    .set({
      status: "completed",
      earnings,
      updatedAt: new Date(),
    })
    .where(eq(investments.id, investmentId));

  const inv = await db.query.investments.findFirst({
    where: eq(investments.id, investmentId),
  });
  if (!inv) return;

  // Add earnings to user balance (50% of prop firm profit)
  const earningAmount = parseFloat(earnings);
  await addToBalance(inv.userId, earningAmount);

  // Update user total earned
  await db
    .update(users)
    .set({
      totalEarned: sql`${users.totalEarned} + ${earnings}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, inv.userId));

  // Create transaction
  await db.insert(transactions).values({
    userId: inv.userId,
    type: "earning",
    amount: earnings,
    description: `Earnings from investment #${investmentId}`,
    relatedId: investmentId,
  });
}

export async function cancelInvestment(investmentId: number) {
  const inv = await db.query.investments.findFirst({
    where: eq(investments.id, investmentId),
  });
  if (!inv) return;

  await db
    .update(investments)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(investments.id, investmentId));

  // Refund to balance
  await addToBalance(inv.userId, parseFloat(inv.amount));

  await db.insert(transactions).values({
    userId: inv.userId,
    type: "refund",
    amount: inv.amount,
    description: `Refund from cancelled investment #${investmentId}`,
    relatedId: investmentId,
  });
}

export async function getUserInvestments(userId: number) {
  return db.query.investments.findMany({
    where: eq(investments.userId, userId),
    orderBy: desc(investments.createdAt),
    with: { plan: true },
  });
}

export async function getAllInvestments() {
  return db.query.investments.findMany({
    orderBy: desc(investments.createdAt),
    with: { plan: true, user: true },
  });
}

export async function getInvestmentById(id: number) {
  return db.query.investments.findFirst({
    where: eq(investments.id, id),
    with: { plan: true, user: true },
  });
}

export async function getPendingInvestments() {
  return db.query.investments.findMany({
    where: eq(investments.status, "pending"),
    orderBy: desc(investments.createdAt),
    with: { plan: true, user: true },
  });
}

export async function getActiveInvestments() {
  return db.query.investments.findMany({
    where: eq(investments.status, "active"),
    orderBy: desc(investments.createdAt),
    with: { plan: true, user: true },
  });
}

export async function updateInvestmentDetails(
  investmentId: number,
  data: { propFirmName?: string; propFirmAccount?: string; profitTarget?: string; notes?: string }
) {
  await db
    .update(investments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(investments.id, investmentId));
}

export async function addEarningsToInvestment(investmentId: number, earnings: string) {
  const inv = await db.query.investments.findFirst({
    where: eq(investments.id, investmentId),
  });
  if (!inv) return;

  const currentEarnings = parseFloat(inv.earnings);
  const newEarning = parseFloat(earnings);
  const totalEarnings = (currentEarnings + newEarning).toFixed(2);

  await db
    .update(investments)
    .set({ earnings: totalEarnings, updatedAt: new Date() })
    .where(eq(investments.id, investmentId));

  // Add to user balance and total earned
  await addToBalance(inv.userId, newEarning);
  await db
    .update(users)
    .set({
      totalEarned: sql`${users.totalEarned} + ${earnings}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, inv.userId));

  await db.insert(transactions).values({
    userId: inv.userId,
    type: "earning",
    amount: earnings,
    description: `Earnings added to investment #${investmentId}`,
    relatedId: investmentId,
  });
}

// ─── Deposit Operations ──────────────────────────────────────────────────────

export async function createDeposit(
  userId: number,
  amount: string,
  paymentMethod: string,
  proofFileId?: string
) {
  const inserted = await db
    .insert(deposits)
    .values({
      userId,
      amount,
      paymentMethod,
      proofFileId: proofFileId || null,
    })
    .returning();
  return inserted[0];
}

export async function approveDeposit(depositId: number, adminNotes?: string) {
  const dep = await db.query.deposits.findFirst({
    where: eq(deposits.id, depositId),
  });
  if (!dep) throw new Error("Deposit not found");

  await db
    .update(deposits)
    .set({
      status: "approved",
      adminNotes: adminNotes || null,
      updatedAt: new Date(),
    })
    .where(eq(deposits.id, depositId));

  // Add to user balance
  await addToBalance(dep.userId, parseFloat(dep.amount));

  // Create transaction
  await db.insert(transactions).values({
    userId: dep.userId,
    type: "deposit",
    amount: dep.amount,
    description: `Deposit approved #${depositId}`,
    relatedId: depositId,
  });

  return dep;
}

export async function rejectDeposit(depositId: number, adminNotes?: string) {
  await db
    .update(deposits)
    .set({
      status: "rejected",
      adminNotes: adminNotes || null,
      updatedAt: new Date(),
    })
    .where(eq(deposits.id, depositId));

  return db.query.deposits.findFirst({
    where: eq(deposits.id, depositId),
  });
}

export async function getUserDeposits(userId: number) {
  return db.query.deposits.findMany({
    where: eq(deposits.userId, userId),
    orderBy: desc(deposits.createdAt),
  });
}

export async function getPendingDeposits() {
  return db.query.deposits.findMany({
    where: eq(deposits.status, "pending"),
    orderBy: desc(deposits.createdAt),
    with: { user: true },
  });
}

export async function getDepositById(id: number) {
  return db.query.deposits.findFirst({
    where: eq(deposits.id, id),
    with: { user: true },
  });
}

// ─── Withdrawal Operations ───────────────────────────────────────────────────

export async function createWithdrawal(
  userId: number,
  amount: string,
  walletAddress: string,
  paymentMethod: string
) {
  const inserted = await db
    .insert(withdrawals)
    .values({
      userId,
      amount,
      walletAddress,
      paymentMethod,
    })
    .returning();
  return inserted[0];
}

export async function approveWithdrawal(withdrawalId: number, txHash?: string, adminNotes?: string) {
  await db
    .update(withdrawals)
    .set({
      status: "approved",
      transactionHash: txHash || null,
      adminNotes: adminNotes || null,
      updatedAt: new Date(),
    })
    .where(eq(withdrawals.id, withdrawalId));
}

export async function completeWithdrawal(withdrawalId: number) {
  const w = await db.query.withdrawals.findFirst({
    where: eq(withdrawals.id, withdrawalId),
  });
  if (!w) throw new Error("Withdrawal not found");

  await db
    .update(withdrawals)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(withdrawals.id, withdrawalId));

  // Deduct from balance
  await subtractFromBalance(w.userId, parseFloat(w.amount));

  await db.insert(transactions).values({
    userId: w.userId,
    type: "withdrawal",
    amount: `-${w.amount}`,
    description: `Withdrawal completed #${withdrawalId}`,
    relatedId: withdrawalId,
  });

  return w;
}

export async function rejectWithdrawal(withdrawalId: number, adminNotes?: string) {
  const w = await db.query.withdrawals.findFirst({
    where: eq(withdrawals.id, withdrawalId),
  });
  if (!w) throw new Error("Withdrawal not found");

  await db
    .update(withdrawals)
    .set({
      status: "rejected",
      adminNotes: adminNotes || null,
      updatedAt: new Date(),
    })
    .where(eq(withdrawals.id, withdrawalId));

  // Refund balance
  await addToBalance(w.userId, parseFloat(w.amount));

  return w;
}

export async function getPendingWithdrawals() {
  return db.query.withdrawals.findMany({
    where: eq(withdrawals.status, "pending"),
    orderBy: desc(withdrawals.createdAt),
    with: { user: true },
  });
}

export async function getUserWithdrawals(userId: number) {
  return db.query.withdrawals.findMany({
    where: eq(withdrawals.userId, userId),
    orderBy: desc(withdrawals.createdAt),
  });
}

export async function getWithdrawalById(id: number) {
  return db.query.withdrawals.findFirst({
    where: eq(withdrawals.id, id),
    with: { user: true },
  });
}

// ─── Referral Operations ─────────────────────────────────────────────────────

export async function createReferral(
  referrerId: number,
  referredId: number,
  investmentId: number,
  commissionAmount: string
) {
  await db.insert(referrals).values({
    referrerId,
    referredId,
    investmentId,
    commissionAmount,
    isPaid: true,
  });

  // Add commission to referrer balance
  await addToBalance(referrerId, parseFloat(commissionAmount));

  // Update referrer total referral earnings
  await db
    .update(users)
    .set({
      totalReferralEarnings: sql`${users.totalReferralEarnings} + ${commissionAmount}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, referrerId));

  await db.insert(transactions).values({
    userId: referrerId,
    type: "referral_commission",
    amount: commissionAmount,
    description: `Referral commission from user #${referredId}`,
  });
}

export async function getUserReferrals(userId: number) {
  return db.query.referrals.findMany({
    where: eq(referrals.referrerId, userId),
    orderBy: desc(referrals.createdAt),
    with: { referred: true },
  });
}

export async function getReferredUsers(userId: number) {
  const refs = await db.query.referrals.findMany({
    where: eq(referrals.referrerId, userId),
    with: { referred: true },
  });

  // Unique referred users
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uniqueUsers = new Map<number, any>();
  refs.forEach((r) => {
    if (r.referred && !uniqueUsers.has(r.referred.id)) {
      uniqueUsers.set(r.referred.id, r.referred);
    }
  });

  return Array.from(uniqueUsers.values());
}

// ─── Transaction Operations ──────────────────────────────────────────────────

export async function getUserTransactions(userId: number, limit = 20) {
  return db.query.transactions.findMany({
    where: eq(transactions.userId, userId),
    orderBy: desc(transactions.createdAt),
    limit,
  });
}

// ─── Bot Settings ────────────────────────────────────────────────────────────

export async function getSetting(key: string) {
  const setting = await db.query.botSettings.findFirst({
    where: eq(botSettings.key, key),
  });
  return setting?.value || null;
}

export async function setSetting(key: string, value: string) {
  const existing = await db.query.botSettings.findFirst({
    where: eq(botSettings.key, key),
  });

  if (existing) {
    await db
      .update(botSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(botSettings.key, key));
  } else {
    await db.insert(botSettings).values({ key, value });
  }
}

// ─── Broadcast ───────────────────────────────────────────────────────────────

export async function recordBroadcast(adminId: number, message: string, sentCount: number, failedCount: number) {
  await db.insert(broadcasts).values({
    message,
    sentCount,
    failedCount,
    sentBy: adminId,
  });
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export async function getAdminStats() {
  const totalUsers = await getTotalUsers();

  const totalInvestedResult = await db
    .select({ total: sql<string>`COALESCE(SUM(${investments.amount}), 0)` })
    .from(investments)
    .where(eq(investments.status, "active"));

  const totalDepositedResult = await db
    .select({ total: sql<string>`COALESCE(SUM(${deposits.amount}), 0)` })
    .from(deposits)
    .where(eq(deposits.status, "approved"));

  const pendingDepositsCount = await db
    .select({ count: count() })
    .from(deposits)
    .where(eq(deposits.status, "pending"));

  const pendingWithdrawalsCount = await db
    .select({ count: count() })
    .from(withdrawals)
    .where(eq(withdrawals.status, "pending"));

  const pendingInvestmentsCount = await db
    .select({ count: count() })
    .from(investments)
    .where(eq(investments.status, "pending"));

  const activeInvestmentsCount = await db
    .select({ count: count() })
    .from(investments)
    .where(eq(investments.status, "active"));

  return {
    totalUsers,
    totalInvested: parseFloat(totalInvestedResult[0]?.total || "0").toFixed(2),
    totalDeposited: parseFloat(totalDepositedResult[0]?.total || "0").toFixed(2),
    pendingDeposits: pendingDepositsCount[0]?.count || 0,
    pendingWithdrawals: pendingWithdrawalsCount[0]?.count || 0,
    pendingInvestments: pendingInvestmentsCount[0]?.count || 0,
    activeInvestments: activeInvestmentsCount[0]?.count || 0,
  };
}

// ─── Initialize Default Plans ────────────────────────────────────────────────

export async function initializeDefaultPlans() {
  const existingPlans = await db.query.investmentPlans.findMany();
  if (existingPlans.length > 0) return;

  await db.insert(investmentPlans).values([
    {
      name: "🚀 Starter Plan",
      description: "Perfect for beginners. Low risk, steady returns. We buy and pass prop firm accounts with your capital.",
      minAmount: "100",
      maxAmount: "999",
      durationDays: 30,
      expectedReturnPercent: "30.00",
      sortOrder: 1,
    },
    {
      name: "💎 Pro Plan",
      description: "For serious investors. Medium capital, higher returns. Dedicated prop firm account management.",
      minAmount: "1000",
      maxAmount: "4999",
      durationDays: 30,
      expectedReturnPercent: "45.00",
      sortOrder: 2,
    },
    {
      name: "👑 Elite Plan",
      description: "Maximum returns for elite investors. Premium prop firm accounts, fastest challenge completion.",
      minAmount: "5000",
      maxAmount: "50000",
      durationDays: 30,
      expectedReturnPercent: "60.00",
      sortOrder: 3,
    },
  ]);
}
