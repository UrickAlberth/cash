import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { supabase } from '@/lib/supabase/client';

async function fetchUserData(userId: string) {
  const [txRes, recRes, cardRes] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(100),
    supabase.from('recurring').select('*').eq('user_id', userId),
    supabase.from('cards').select('*').eq('user_id', userId),
  ]);
  return {
    transactions: txRes.data ?? [],
    recurring: recRes.data ?? [],
    cards: cardRes.data ?? [],
  };
}

function buildContext(data: Awaited<ReturnType<typeof fetchUserData>>): string {
  const today = new Date().toISOString().split('T')[0];
  const txSummary = data.transactions
    .map(
      (t: Record<string, unknown>) =>
        `[${t.date}] ${t.type} | ${t.description} | R$${Number(t.value).toFixed(2)} | cat:${t.category}${t.card_id ? ` | card:${t.card_id}` : ''}${t.is_paid ? ' | pago' : ''}`,
    )
    .join('\n');

  const recSummary = data.recurring
    .map(
      (r: Record<string, unknown>) =>
        `dia ${r.day_of_month} | ${r.type} | ${r.description} | R$${Number(r.value).toFixed(2)} | cat:${r.category}`,
    )
    .join('\n');

  const cardSummary = data.cards
    .map(
      (c: Record<string, unknown>) =>
        `id:${c.id} | nome:${c.name} | fechamento:dia ${c.closing_day} | vencimento:dia ${c.due_day}`,
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
    const { message, userId } = await req.json();

    if (!message || !userId) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    const data = await fetchUserData(userId);
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
