import { supabase } from './client';
import type { Transaction, RecurringExpense, CreditCard, Category } from '../types';

// ── Transactions ────────────────────────────────────────────────────────────

export async function fetchTransactions(userId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(row => ({
    id: row.id,
    date: row.date,
    category: row.category,
    subcategory: row.subcategory,
    description: row.description,
    value: row.value,
    type: row.type,
    cardId: row.card_id ?? undefined,
    installments: row.installments ?? undefined,
    currentInstallment: row.current_installment ?? undefined,
    isRecurring: row.is_recurring ?? false,
    isVirtual: row.is_virtual ?? false,
    isPaid: row.is_paid ?? false,
  }));
}

export async function insertTransaction(userId: string, tx: Omit<Transaction, 'id'>): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      date: tx.date,
      category: tx.category,
      subcategory: tx.subcategory,
      description: tx.description,
      value: tx.value,
      type: tx.type,
      card_id: tx.cardId ?? null,
      installments: tx.installments ?? null,
      current_installment: tx.currentInstallment ?? null,
      is_recurring: tx.isRecurring ?? false,
      is_virtual: tx.isVirtual ?? false,
      is_paid: tx.isPaid ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    date: data.date,
    category: data.category,
    subcategory: data.subcategory,
    description: data.description,
    value: data.value,
    type: data.type,
    cardId: data.card_id ?? undefined,
    installments: data.installments ?? undefined,
    currentInstallment: data.current_installment ?? undefined,
    isRecurring: data.is_recurring ?? false,
    isVirtual: data.is_virtual ?? false,
    isPaid: data.is_paid ?? false,
  };
}

export async function upsertTransaction(userId: string, tx: Transaction): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .upsert({
      id: tx.id,
      user_id: userId,
      date: tx.date,
      category: tx.category,
      subcategory: tx.subcategory,
      description: tx.description,
      value: tx.value,
      type: tx.type,
      card_id: tx.cardId ?? null,
      installments: tx.installments ?? null,
      current_installment: tx.currentInstallment ?? null,
      is_recurring: tx.isRecurring ?? false,
      is_virtual: tx.isVirtual ?? false,
      is_paid: tx.isPaid ?? false,
    });
  if (error) throw error;
}

export async function deleteTransactionById(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteTransactionsByBaseId(baseId: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .or(`id.eq.${baseId},id.like.${baseId}-%`);
  if (error) throw error;
}

export async function deleteTransactionsByPeriod(userId: string, month: string, year: string): Promise<void> {
  const startDate = `${year}-${month}-01`;
  const endYear = month === '12' ? String(Number(year) + 1) : year;
  const endMonth = month === '12' ? '01' : String(Number(month) + 1).padStart(2, '0');
  const endDate = `${endYear}-${endMonth}-01`;
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('user_id', userId)
    .gte('date', startDate)
    .lt('date', endDate);
  if (error) throw error;
}

// ── Cards ────────────────────────────────────────────────────────────────────

export async function fetchCards(userId: string): Promise<CreditCard[]> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name,
    limit: row.limit,
    closingDay: row.closing_day,
    dueDay: row.due_day,
    color: row.color,
  }));
}

export async function insertCard(userId: string, card: Omit<CreditCard, 'id'>): Promise<CreditCard> {
  const { data, error } = await supabase
    .from('cards')
    .insert({
      user_id: userId,
      name: card.name,
      limit: card.limit,
      closing_day: card.closingDay,
      due_day: card.dueDay,
      color: card.color,
    })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, limit: data.limit, closingDay: data.closing_day, dueDay: data.due_day, color: data.color };
}

export async function updateCardById(userId: string, card: CreditCard): Promise<void> {
  const { error } = await supabase
    .from('cards')
    .update({ name: card.name, limit: card.limit, closing_day: card.closingDay, due_day: card.dueDay, color: card.color })
    .eq('id', card.id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function deleteCardById(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from('cards').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

// ── Categories ───────────────────────────────────────────────────────────────

export async function fetchCategories(userId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(row => ({ id: row.id, name: row.name, color: row.color, icon: row.icon ?? undefined }));
}

export async function insertCategory(userId: string, name: string, color: string): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ user_id: userId, name, color })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, color: data.color };
}

// ── Recurring expenses ────────────────────────────────────────────────────────

export async function fetchRecurring(userId: string): Promise<RecurringExpense[]> {
  const { data, error } = await supabase
    .from('recurring')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(row => ({
    id: row.id,
    description: row.description,
    value: row.value,
    dayOfMonth: row.day_of_month,
    category: row.category,
    subcategory: row.subcategory,
    type: row.type,
    startDate: row.start_date,
  }));
}

export async function insertRecurring(userId: string, rec: Omit<RecurringExpense, 'id'>): Promise<RecurringExpense> {
  const { data, error } = await supabase
    .from('recurring')
    .insert({
      user_id: userId,
      description: rec.description,
      value: rec.value,
      day_of_month: rec.dayOfMonth,
      category: rec.category,
      subcategory: rec.subcategory,
      type: rec.type,
      start_date: rec.startDate,
    })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, description: data.description, value: data.value, dayOfMonth: data.day_of_month, category: data.category, subcategory: data.subcategory, type: data.type, startDate: data.start_date };
}

export async function updateRecurringById(userId: string, rec: RecurringExpense): Promise<void> {
  const { error } = await supabase
    .from('recurring')
    .update({ description: rec.description, value: rec.value, day_of_month: rec.dayOfMonth, category: rec.category, subcategory: rec.subcategory, type: rec.type, start_date: rec.startDate })
    .eq('id', rec.id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function deleteRecurringById(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from('recurring').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}
