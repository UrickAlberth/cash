import type { Transaction } from './types';
import type { CreditCard } from './types';

const SHEETS_API_URL =
  process.env.NEXT_PUBLIC_SHEETS_API_URL ??
  'https://script.google.com/macros/s/AKfycbxqsp25QdTWpyvBa7nV3k_QrO9VvGr1RSYcp71fpVxO3OzdZP0N5sLT3g_ze6_c7tcrOg/exec';

export function sendToSheets(tx: Transaction, cc: CreditCard): void {
  let body;

  // 🔠 Normaliza texto para MAIÚSCULO
  const categoria = tx.category?.toUpperCase() ?? '';
  const subcategoria = tx.subcategory?.toUpperCase() ?? '';

  if (tx.type === 'credit_card') {
    // 💳 Cartão de crédito
    body = {
      action: 'addCredit',
      date: tx.date,
      categoria: cc.name,
      subcategoria: categoria,
      descricao: tx.description,
      valor: tx.value,
      repetitions: tx.installments ?? 1,
    };

  } else {
    const labels = {
  income: 'ENTRADA',
  expense: 'SAÍDA'
};

const tipo = labels[tx.type] || tx.type;
const valor = tx.type === 'expense' ? -Math.abs(tx.value) : tx.value;

    body = {
      action: 'addDebit',
      date: tx.date,
      categoria,
      subcategoria,
      descricao: tx.description,
      tipo,
      valor,
    };
  }

  console.log(body);

  fetch(SHEETS_API_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify(body),
  }).catch((err) => console.error('[sheets] sync failed:', err));
}
