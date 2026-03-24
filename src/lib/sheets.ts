import type { Transaction, CreditCard } from './types';
import { supabase } from './supabase/client'; 

const SHEETS_API_URL =
  process.env.NEXT_PUBLIC_SHEETS_API_URL ??
  'https://script.google.com/macros/s/AKfycbxqsp25QdTWpyvBa7nV3k_QrO9VvGr1RSYcp71fpVxO3OzdZP0N5sLT3g_ze6_c7tcrOg/exec';


/**
 * Busca cartão no banco pelo ID
 */
async function getCardById(cardId?: string): Promise<CreditCard | null> {
  if (!cardId) return null;

  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('id', cardId)
    .single();

  if (error) {
    console.error('[supabase] erro ao buscar cartão:', error.message);
    return null;
  }

  return data;
}

/**
 * Envia transação para Google Sheets
 */
export async function sendToSheets(tx: Transaction): Promise<void> {
  let body: any;

  const categoria = tx.category?.toUpperCase() ?? '';
  const subcategoria = tx.subcategory?.toUpperCase() ?? '';

  // =========================
  // 💳 CARTÃO DE CRÉDITO
  // =========================
  if (tx.type === 'credit_card') {
    const cc = await getCardById(tx.cardId);

    if (!cc) {
      console.error('[sheets] Cartão não encontrado:', tx.cardId);
      return;
    }

    body = {
      action: 'addCredit',
      date: tx.date,
      categoria: cc.name, // vem do banco
      subcategoria: categoria,
      descricao: tx.description,
      valor: tx.value,
      repetitions: tx.installments ?? 1,
    };
  }

  // =========================
  // 💸 ENTRADA / SAÍDA
  // =========================
  else {
    const labels: Record<string, string> = {
      income: 'ENTRADA',
      expense: 'SAÍDA',
    };

    const tipo = labels[tx.type] || tx.type;

    // 🔥 REGRA IMPORTANTE
    const valor =
      tx.type === 'expense'
        ? -Math.abs(tx.value)
        : Math.abs(tx.value);

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

  console.log('[sheets] payload:', body);

  try {
    await fetch(SHEETS_API_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('[sheets] erro ao enviar:', err);
  }
}
