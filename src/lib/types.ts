export type TransactionType = 'income' | 'expense' | 'credit_card' | 'savings' | 'savings_withdrawal';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
}

export interface Transaction {
  id: string;
  date: string;
  category: string;
  subcategory: string;
  description: string;
  value: number;
  type: TransactionType;
  cardId?: string; // ID do cartão se for credit_card
  installments?: number;
  currentInstallment?: number;
  isRecurring?: boolean;
  isVirtual?: boolean; // Para identificar projeções no extrato
  isPaid?: boolean; // Novo campo para controle de pagamento
}

export interface RecurringExpense {
  id: string;
  description: string;
  value: number;
  dayOfMonth: number;
  category: string;
  subcategory: string;
  type: TransactionType;
  startDate: string; // Data de início da recorrência
}

export interface SummaryData {
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  netProfit: number;
}

export interface BillDetail {
  month: number;
  year: number;
  total: number;
  transactions: Transaction[];
}
