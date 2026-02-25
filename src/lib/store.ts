import { Transaction, Category, RecurringExpense, CreditCard } from './types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: '1', name: 'Alimentação', color: '#E87DC0' },
  { id: '2', name: 'Lazer', color: '#E052E0' },
  { id: '3', name: 'Transporte', color: '#FFB7D5' },
  { id: '4', name: 'Saúde', color: '#D462AD' },
  { id: '5', name: 'Moradia', color: '#B042B0' },
  { id: '6', name: 'Educação', color: '#FF7EB9' },
  { id: '7', name: 'Poupança', color: '#300070' },
];

export const MOCK_CARDS: CreditCard[] = [
  {
    id: 'card-1',
    name: 'Rosa Principal',
    limit: 5000,
    closingDay: 5,
    dueDay: 15,
    color: '#E87DC0'
  }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    date: new Date().toISOString().split('T')[0],
    category: 'Alimentação',
    subcategory: 'Restaurante',
    description: 'Jantar Romântico',
    value: 150.00,
    type: 'expense',
    isPaid: true
  },
  {
    id: 't2',
    date: new Date().toISOString().split('T')[0],
    category: 'Salário',
    subcategory: 'Principal',
    description: 'Salário Mensal',
    value: 5000.00,
    type: 'income',
    isPaid: true
  }
];

export const MOCK_RECURRING: RecurringExpense[] = [
  {
    id: 'r1',
    description: 'Aluguel',
    value: 1200,
    dayOfMonth: 10,
    category: 'Moradia',
    subcategory: 'Aluguel',
    type: 'expense',
    startDate: '2024-01-01'
  }
];
