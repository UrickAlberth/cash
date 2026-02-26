'use server';
/**
 * @fileOverview Financial assistant chatbot flow.
 * Answers user financial questions based on real Supabase data.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { supabase } from '@/lib/supabase/client';

// ── Input / Output schemas ────────────────────────────────────────────────────

const FinancialAssistantInputSchema = z.object({
  message: z.string().describe('User message/question.'),
  userId: z.string().describe('Authenticated user ID.'),
  currentDate: z.string().describe('Current date in YYYY-MM-DD format.'),
});
export type FinancialAssistantInput = z.infer<typeof FinancialAssistantInputSchema>;

const FinancialAssistantOutputSchema = z.object({
  response: z.string().describe('Assistant text response.'),
});
export type FinancialAssistantOutput = z.infer<typeof FinancialAssistantOutputSchema>;

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

// ── Tool definitions ──────────────────────────────────────────────────────────

const getCardBillByMonth = ai.defineTool(
  {
    name: 'getCardBillByMonth',
    description:
      'Returns the total credit card bill for a specific card in a given month/year. Use when user asks about a card invoice/fatura.',
    inputSchema: z.object({
      userId: z.string(),
      cardName: z.string().describe('Card name, e.g. "Santander"'),
      month: z.number().min(1).max(12).describe('Month number (1-12)'),
      year: z.number().describe('4-digit year'),
    }),
    outputSchema: z.object({
      cardName: z.string(),
      month: z.number(),
      year: z.number(),
      total: z.number(),
      found: z.boolean(),
    }),
  },
  async ({ userId, cardName, month, year }) => {
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
  },
);

const getProjectedBalance = ai.defineTool(
  {
    name: 'getProjectedBalance',
    description:
      'Calculates the projected balance on a given target date, considering current balance derived from transactions and future recurring expenses/incomes up to that date.',
    inputSchema: z.object({
      userId: z.string(),
      targetDate: z.string().describe('Target date in YYYY-MM-DD format'),
      currentDate: z.string().describe('Current date in YYYY-MM-DD format'),
    }),
    outputSchema: z.object({
      targetDate: z.string(),
      projectedBalance: z.number(),
      currentBalance: z.number(),
      explanation: z.string(),
    }),
  },
  async ({ userId, targetDate, currentDate }) => {
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
  },
);

const getTotalExpensesByMonth = ai.defineTool(
  {
    name: 'getTotalExpensesByMonth',
    description:
      'Returns the total expenses (despesas, contas a pagar) for a given month/year, including recurring expenses and booked transactions.',
    inputSchema: z.object({
      userId: z.string(),
      month: z.number().min(1).max(12),
      year: z.number(),
    }),
    outputSchema: z.object({
      month: z.number(),
      year: z.number(),
      totalExpenses: z.number(),
      totalIncome: z.number(),
      breakdown: z.array(z.object({ category: z.string(), total: z.number() })),
    }),
  },
  async ({ userId, month, year }) => {
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
  },
);

const getBiggestExpenseOfMonth = ai.defineTool(
  {
    name: 'getBiggestExpenseOfMonth',
    description:
      'Returns the single biggest expense transaction or recurring bill in a given month/year.',
    inputSchema: z.object({
      userId: z.string(),
      month: z.number().min(1).max(12),
      year: z.number(),
    }),
    outputSchema: z.object({
      month: z.number(),
      year: z.number(),
      description: z.string(),
      value: z.number(),
      category: z.string(),
      found: z.boolean(),
    }),
  },
  async ({ userId, month, year }) => {
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
  },
);

const getFinancialSummary = ai.defineTool(
  {
    name: 'getFinancialSummary',
    description:
      'Returns a financial summary with aggregated data: total income, expenses, savings, balance, top spending categories, and recurring expenses. Use for general financial health analysis and suggestions.',
    inputSchema: z.object({
      userId: z.string(),
      month: z.number().min(1).max(12).describe('Reference month'),
      year: z.number().describe('Reference year'),
    }),
    outputSchema: z.object({
      month: z.number(),
      year: z.number(),
      totalIncome: z.number(),
      totalExpenses: z.number(),
      totalSavings: z.number(),
      balance: z.number(),
      topCategories: z.array(z.object({ category: z.string(), total: z.number() })),
      recurringTotal: z.number(),
      recurringCount: z.number(),
    }),
  },
  async ({ userId, month, year }) => {
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

    const categoryMap: Record<string, number> = {};
    monthTxs
      .filter((t: any) => t.type === 'expense' || t.type === 'credit_card')
      .forEach((t: any) => {
        categoryMap[t.category] = (categoryMap[t.category] ?? 0) + t.value;
      });

    const topCategories = Object.entries(categoryMap)
      .map(([category, total]) => ({ category, total: Number(total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const recurringItems = recurring.filter((rec: any) => {
      const startD = new Date(rec.start_date + 'T12:00:00');
      const recDate = new Date(year, month - 1, rec.day_of_month);
      return recDate >= startD;
    });

    const recurringTotal = recurringItems.reduce((s: number, r: any) => s + r.value, 0);

    return {
      month,
      year,
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      totalSavings: Number(totalSavings.toFixed(2)),
      balance: Number((totalIncome - totalExpenses - totalSavings).toFixed(2)),
      topCategories,
      recurringTotal: Number(recurringTotal.toFixed(2)),
      recurringCount: recurringItems.length,
    };
  },
);

// ── Flow ──────────────────────────────────────────────────────────────────────

const financialAssistantFlow = ai.defineFlow(
  {
    name: 'financialAssistantFlow',
    inputSchema: FinancialAssistantInputSchema,
    outputSchema: FinancialAssistantOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      tools: [
        getCardBillByMonth,
        getProjectedBalance,
        getTotalExpensesByMonth,
        getBiggestExpenseOfMonth,
        getFinancialSummary,
      ],
      system: `Você é um assistente financeiro pessoal do app RosaCash. Responda sempre em português brasileiro.
Você tem acesso a ferramentas que consultam dados reais do usuário no banco de dados.
NUNCA invente números. Se não souber uma informação, use as ferramentas disponíveis para buscá-la.
O userId do usuário é: ${input.userId}.
A data atual é: ${input.currentDate}.
Seja objetivo, claro e amigável. Quando apresentar valores monetários, use o formato R$ X.XXX,XX.`,
      prompt: input.message,
    });

    return { response: output?.text ?? 'Desculpe, não consegui processar sua pergunta. Tente novamente.' };
  },
);

export async function financialAssistantChat(
  input: FinancialAssistantInput,
): Promise<FinancialAssistantOutput> {
  return financialAssistantFlow(input);
}
