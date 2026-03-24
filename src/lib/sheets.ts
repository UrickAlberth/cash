import type { Transaction } from './types';

const SHEETS_API_URL =
  process.env.NEXT_PUBLIC_SHEETS_API_URL ??
  'https://script.google.com/macros/s/AKfycbxqsp25QdTWpyvBa7nV3k_QrO9VvGr1RSYcp71fpVxO3OzdZP0N5sLT3g_ze6_c7tcrOg/exec';

export function sendToSheets(tx: Transaction): void {
  const isCredit = tx.type === 'income';

  const body = isCredit
    ? {
        action: 'addCredit',
        date: tx.date,
        categoria: tx.category,
        subcategoria: tx.subcategory ?? '',
        descricao: tx.description,
        valor: tx.value,
        repetitions: tx.installments ?? 1,
      }
    : {
        action: 'addDebit',
        date: tx.date,
        categoria: tx.category,
        subcategoria: tx.subcategory ?? '',
        descricao: tx.description,
        tipo: tx.type,
        valor: tx.value,
      };

  fetch(SHEETS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch((err) => console.error('[sheets] sync failed:', err));
}
