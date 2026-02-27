'use server';
/**
 * @fileOverview Financial data query functions.
 * Provides direct async functions to query user financial data from Supabase.
 */

import { supabase } from '@/lib/supabase/client';

// ── Helper: fetch data from Supabase ─────────────────────────────────────────

async function getTransactionsForUser(userId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function getRecurringForUser(userId: string) {
  const { data, error } = await supabase
    .from('recurring')
    .select('*')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function getCardsForUser(userId: string) {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── Exported financial query functions ───────────────────────────────────────

export async function getCardBill({
  userId,
  cardName,
  month,
  year,
}: {
  userId: string;
  cardName: string;
  month: number;
  year: number;
}): Promise<{ cardName: string; month: number; year: number; total: number; found: boolean }> {
  const [transactions, cards] = await Promise.all([
    getTransactionsForUser(userId),
    getCardsForUser(userId),
  ]);

  const card = cards.find(
    (c: any) => c.name.toLowerCase().includes(cardName.toLowerCase()),
  );

  if (!card) {
    return { cardName, month, year, total: 0, found: false };
  }

  const total = transactions
    .filter((t: any) => {
      if (t.type !== 'credit_card' || t.card_id !== card.id) return false;
      const tDate = new Date(t.date + 'T12:00:00');
      const tDay = tDate.getDate();
      let billMonth = tDate.getMonth() + 1; // 1-based
      let billYear = tDate.getFullYear();
      if (tDay > card.closing_day) {
        billMonth++;
        if (billMonth > 12) { billMonth = 1; billYear++; }
      }
      return billMonth === month && billYear === year;
    })
    .reduce((sum: number, t: any) => sum + t.value, 0);

  return { cardName: card.name, month, year, total: Number(total.toFixed(2)), found: true };
}

export async function getProjectedBalance({
  userId,
  targetDate,
  currentDate,
}: {
  userId: string;
  targetDate: string;
  currentDate: string;
}): Promise<{ targetDate: string; projectedBalance: number; currentBalance: number; explanation: string }> {
  const [transactions, recurring] = await Promise.all([
    getTransactionsForUser(userId),
    getRecurringForUser(userId),
  ]);

  const todayStr = currentDate;

  // Current balance = income + savings_withdrawal - expense - paid credit_card - savings
  const pastTxs = transactions.filter((t: any) => t.date <= todayStr);
  const income = pastTxs.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.value, 0);
  const withdrawal = pastTxs.filter((t: any) => t.type === 'savings_withdrawal').reduce((s: number, t: any) => s + t.value, 0);
  const expense = pastTxs.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.value, 0);
  const savings = pastTxs.filter((t: any) => t.type === 'savings').reduce((s: number, t: any) => s + t.value, 0);
  const paidCard = pastTxs.filter((t: any) => t.type === 'credit_card' && t.is_paid).reduce((s: number, t: any) => s + t.value, 0);
  const currentBalance = income + withdrawal - expense - savings - paidCard;

  // Project recurring from today+1 to targetDate
  const target = new Date(targetDate + 'T12:00:00');
  const current = new Date(currentDate + 'T12:00:00');
  let projectionDelta = 0;

  recurring.forEach((rec: any) => {
    const startDate = new Date(rec.start_date + 'T12:00:00');
    // Iterate months between current and target
    const iterStart = new Date(current);
    iterStart.setDate(1);
    const iterEnd = new Date(target);
    iterEnd.setDate(1);

    for (let d = new Date(iterStart); d <= iterEnd; d.setMonth(d.getMonth() + 1)) {
      const recDate = new Date(d.getFullYear(), d.getMonth(), rec.day_of_month);
      if (recDate <= current || recDate > target) continue;
      if (recDate < startDate) continue;

      const isExpense = rec.type === 'expense' || rec.type === 'savings' || rec.type === 'credit_card';
      const isIncome = rec.type === 'income' || rec.type === 'savings_withdrawal';
      if (isExpense) projectionDelta -= rec.value;
      else if (isIncome) projectionDelta += rec.value;
    }
  });

  // Also consider future non-recurring transactions already booked
  const futureTxs = transactions.filter((t: any) => t.date > todayStr && t.date <= targetDate && !t.is_virtual);
  futureTxs.forEach((t: any) => {
    if (t.type === 'income' || t.type === 'savings_withdrawal') projectionDelta += t.value;
    else if (t.type === 'expense' || t.type === 'savings') projectionDelta -= t.value;
    else if (t.type === 'credit_card' && t.is_paid) projectionDelta -= t.value;
  });

  const projectedBalance = Number((currentBalance + projectionDelta).toFixed(2));

  return {
    targetDate,
    projectedBalance,
    currentBalance: Number(currentBalance.toFixed(2)),
    explanation: `Saldo atual: R$ ${currentBalance.toFixed(2)}. Projeção de lançamentos até ${targetDate}: R$ ${projectionDelta.toFixed(2)}.`,
  };
}

export async function getMonthlySummary({
  userId,
  month,
  year,
}: {
  userId: string;
  month: number;
  year: number;
}): Promise<{ month: number; year: number; totalExpenses: number; totalIncome: number; breakdown: { category: string; total: number }[] }> {
  const [transactions, recurring] = await Promise.all([
    getTransactionsForUser(userId),
    getRecurringForUser(userId),
  ]);

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endYear = month === 12 ? year + 1 : year;
  const endMonth = month === 12 ? 1 : month + 1;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  const monthTxs = transactions.filter(
    (t: any) => t.date >= startDate && t.date < endDate,
  );

  const expenseTxs = monthTxs.filter((t: any) => t.type === 'expense' || t.type === 'credit_card');
  const incomeTxs = monthTxs.filter((t: any) => t.type === 'income' || t.type === 'savings_withdrawal');

  // Add recurring for this month
  const recurringExpenses: { category: string; value: number }[] = [];
  recurring.forEach((rec: any) => {
    const startD = new Date(rec.start_date + 'T12:00:00');
    const recDate = new Date(year, month - 1, rec.day_of_month);
    if (recDate < startD) return;
    if (rec.type === 'expense' || rec.type === 'credit_card') {
      recurringExpenses.push({ category: rec.category, value: rec.value });
    }
  });

  const categoryMap: Record<string, number> = {};
  expenseTxs.forEach((t: any) => {
    categoryMap[t.category] = (categoryMap[t.category] ?? 0) + t.value;
  });
  recurringExpenses.forEach((r) => {
    categoryMap[r.category] = (categoryMap[r.category] ?? 0) + r.value;
  });

  const totalExpenses = Number(
    (
      expenseTxs.reduce((s: number, t: any) => s + t.value, 0) +
      recurringExpenses.reduce((s, r) => s + r.value, 0)
    ).toFixed(2),
  );

  const totalIncome = Number(
    incomeTxs.reduce((s: number, t: any) => s + t.value, 0).toFixed(2),
  );

  const breakdown = Object.entries(categoryMap).map(([category, total]) => ({
    category,
    total: Number(total.toFixed(2)),
  }));

  return { month, year, totalExpenses, totalIncome, breakdown };
}

export async function getBiggestExpense({
  userId,
  month,
  year,
}: {
  userId: string;
  month: number;
  year: number;
}): Promise<{ month: number; year: number; description: string; value: number; category: string; found: boolean }> {
  const [transactions, recurring] = await Promise.all([
    getTransactionsForUser(userId),
    getRecurringForUser(userId),
  ]);

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endYear = month === 12 ? year + 1 : year;
  const endMonth = month === 12 ? 1 : month + 1;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  const expenseTxs = transactions
    .filter((t: any) => t.date >= startDate && t.date < endDate)
    .filter((t: any) => t.type === 'expense' || t.type === 'credit_card');

  const recurringItems = recurring
    .filter((rec: any) => {
      const startD = new Date(rec.start_date + 'T12:00:00');
      const recDate = new Date(year, month - 1, rec.day_of_month);
      return recDate >= startD && (rec.type === 'expense' || rec.type === 'credit_card');
    })
    .map((rec: any) => ({ description: rec.description, value: rec.value, category: rec.category }));

  const all = [
    ...expenseTxs.map((t: any) => ({ description: t.description, value: t.value, category: t.category })),
    ...recurringItems,
  ];

  if (all.length === 0) {
    return { month, year, description: '', value: 0, category: '', found: false };
  }

  const biggest = all.reduce((max, item) => (item.value > max.value ? item : max), all[0]);
  return { month, year, description: biggest.description, value: biggest.value, category: biggest.category, found: true };
}

export async function getFinancialHealthSummary({
  userId,
  month,
  year,
}: {
  userId: string;
  month: number;
  year: number;
}): Promise<{
  month: number;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  balance: number;
  topCategories: { category: string; total: number }[];
  recurringTotal: number;
  recurringCount: number;
}> {
  const [transactions, recurring] = await Promise.all([
    getTransactionsForUser(userId),
    getRecurringForUser(userId),
  ]);

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endYear = month === 12 ? year + 1 : year;
  const endMonth = month === 12 ? 1 : month + 1;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  const monthTxs = transactions.filter(
    (t: any) => t.date >= startDate && t.date < endDate,
  );

  const totalIncome = monthTxs
    .filter((t: any) => t.type === 'income' || t.type === 'savings_withdrawal')
    .reduce((s: number, t: any) => s + t.value, 0);

  const totalExpenses = monthTxs
    .filter((t: any) => t.type === 'expense' || t.type === 'credit_card')
    .reduce((s: number, t: any) => s + t.value, 0);

  const totalSavings = monthTxs
    .filter((t: any) => t.type === 'savings')
    .reduce((s: number, t: any) => s + t.value, 0);

  const recurringItems = recurring.filter((rec: any) => {
    const startD = new Date(rec.start_date + 'T12:00:00');
    const recDate = new Date(year, month - 1, rec.day_of_month);
    return recDate >= startD;
  });

  const recurringExpenses = recurringItems.filter(
    (r: any) => r.type === 'expense' || r.type === 'credit_card',
  );

  const recurringExpenseTotal = recurringExpenses.reduce((s: number, r: any) => s + r.value, 0);

  const categoryMap: Record<string, number> = {};
  monthTxs
    .filter((t: any) => t.type === 'expense' || t.type === 'credit_card')
    .forEach((t: any) => {
      categoryMap[t.category] = (categoryMap[t.category] ?? 0) + t.value;
    });
  recurringExpenses.forEach((r: any) => {
    categoryMap[r.category] = (categoryMap[r.category] ?? 0) + r.value;
  });

  const topCategories = Object.entries(categoryMap)
    .map(([category, total]) => ({ category, total: Number(total.toFixed(2)) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const recurringTotal = recurringItems.reduce((s: number, r: any) => s + r.value, 0);

  const combinedExpenses = totalExpenses + recurringExpenseTotal;

  return {
    month,
    year,
    totalIncome: Number(totalIncome.toFixed(2)),
    totalExpenses: Number(combinedExpenses.toFixed(2)),
    totalSavings: Number(totalSavings.toFixed(2)),
    balance: Number((totalIncome - combinedExpenses - totalSavings).toFixed(2)),
    topCategories,
    recurringTotal: Number(recurringTotal.toFixed(2)),
    recurringCount: recurringItems.length,
  };
}
