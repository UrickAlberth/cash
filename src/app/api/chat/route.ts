import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import type { Transaction, RecurringExpense, CreditCard } from '@/lib/types';

interface UserData {
  transactions: Transaction[];
  recurring: RecurringExpense[];
  cards: CreditCard[];
}

function buildContext(data: UserData): string {
  const today = new Date().toISOString().split('T')[0];
  const txSummary = data.transactions
    .slice(0, 100)
    .map(
      (t) =>
        `[${t.date}] ${t.type} | ${t.description} | R$${Number(t.value).toFixed(2)} | cat:${t.category}${t.cardId ? ` | card:${t.cardId}` : ''}${t.isPaid ? ' | pago' : ''}`,
    )
    .join('\n');

  const recSummary = data.recurring
    .map(
      (r) =>
        `dia ${r.dayOfMonth} | ${r.type} | ${r.description} | R$${Number(r.value).toFixed(2)} | cat:${r.category}`,
    )
    .join('\n');

  const cardSummary = data.cards
    .map(
      (c) =>
        `id:${c.id} | nome:${c.name} | fechamento:dia ${c.closingDay} | vencimento:dia ${c.dueDay}`,
    )
    .join('\n');

  return `Hoje: ${today}

TRANSAÇÕES (últimas 100):
${txSummary || 'Nenhuma'}

RECORRÊNCIAS MENSAIS:
${recSummary || 'Nenhuma'}

CARTÕES DE CRÉDITO:
${cardSummary || 'Nenhum'}`;
}

export async function POST(req: NextRequest) {
  try {
    const { message, userId, transactions, recurring, cards } = await req.json();

    if (!message || !userId) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    const hasData =
      (Array.isArray(transactions) && transactions.length > 0) ||
      (Array.isArray(recurring) && recurring.length > 0) ||
      (Array.isArray(cards) && cards.length > 0);

    if (!hasData) {
      return NextResponse.json({
        text: 'Não encontrei dados financeiros registrados ainda. Adicione transações, recorrências ou cartões para que eu possa te ajudar com análises.',
      });
    }

    const data: UserData = {
      transactions: Array.isArray(transactions) ? transactions : [],
      recurring: Array.isArray(recurring) ? recurring : [],
      cards: Array.isArray(cards) ? cards : [],
    };

    const context = buildContext(data);

    const prompt = `Você é um assistente financeiro pessoal amigável e preciso chamado RosaCash.
Responda sempre em português brasileiro, de forma clara e objetiva.
Use os dados financeiros do usuário abaixo para responder à pergunta.
Se não houver dados suficientes para responder, diga isso educadamente.
Formate valores monetários como R$ X.XX.

DADOS FINANCEIROS DO USUÁRIO:
${context}

PERGUNTA DO USUÁRIO:
${message}`;

    const { text } = await ai.generate(prompt);

    return NextResponse.json({ text });
  } catch (err: unknown) {
    console.error('[/api/chat]', err);
    return NextResponse.json({ error: 'Erro ao processar sua pergunta.' }, { status: 500 });
  }
}
