"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageCircle, Bot, User, Loader2, Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreditCard, Transaction, RecurringExpense } from '@/lib/types';
import {
  getCardBill,
  getProjectedBalance,
  getMonthlySummary,
  getBiggestExpense,
  getFinancialHealthSummary,
} from '@/ai/flows/financial-assistant-chat';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface Props {
  userId: string;
  cards: CreditCard[];
  transactions: Transaction[];
  recurring: RecurringExpense[];
}

type QuestionId = 'card_bill' | 'projected_balance' | 'monthly_summary' | 'biggest_expense' | 'financial_health';

interface ParamState {
  questionId: QuestionId;
  cardName: string;
  month: string;
  year: string;
  targetDate: string;
}

const QUESTION_BLOCKS: { id: QuestionId; template: string }[] = [
  { id: 'card_bill', template: 'Qual o valor da fatura do cartão [nome do cartão] no mês [mês] de [ano]?' },
  { id: 'projected_balance', template: 'Qual será o meu saldo projetado em [data alvo]?' },
  { id: 'monthly_summary', template: 'Pode me dar um resumo do meu mês de [mês] de [ano]?' },
  { id: 'biggest_expense', template: 'Qual foi minha maior despesa no mês de [mês] de [ano]?' },
  { id: 'financial_health', template: 'Como está a minha saúde financeira no mês de [mês] de [ano]?' },
];

function formatCardBillResult(result: Awaited<ReturnType<typeof getCardBill>>): string {
  if (!result.found) {
    return `Não encontrei o cartão informado.`;
  }
  return `A fatura do cartão ${result.cardName} no mês ${MONTH_NAMES[result.month - 1]} de ${result.year} é de R$ ${result.total.toFixed(2)}.`;
}

function formatProjectedBalanceResult(result: Awaited<ReturnType<typeof getProjectedBalance>>): string {
  return `Saldo atual: R$ ${result.currentBalance.toFixed(2)}\nSaldo projetado em ${result.targetDate}: R$ ${result.projectedBalance.toFixed(2)}\n${result.explanation}`;
}

function formatMonthlySummaryResult(result: Awaited<ReturnType<typeof getMonthlySummary>>): string {
  const breakdown = result.breakdown
    .sort((a, b) => b.total - a.total)
    .map((b) => `  • ${b.category}: R$ ${b.total.toFixed(2)}`)
    .join('\n');
  return `Resumo de ${MONTH_NAMES[result.month - 1]} de ${result.year}:\n\nReceitas: R$ ${result.totalIncome.toFixed(2)}\nDespesas: R$ ${result.totalExpenses.toFixed(2)}\n\nCategorias de despesa:\n${breakdown || '  Nenhuma'}`;
}

function formatBiggestExpenseResult(result: Awaited<ReturnType<typeof getBiggestExpense>>): string {
  if (!result.found) {
    return `Não encontrei despesas em ${MONTH_NAMES[result.month - 1]} de ${result.year}.`;
  }
  return `Maior despesa em ${MONTH_NAMES[result.month - 1]} de ${result.year}:\n\n${result.description}\nValor: R$ ${result.value.toFixed(2)}\nCategoria: ${result.category}`;
}

function formatFinancialHealthResult(result: Awaited<ReturnType<typeof getFinancialHealthSummary>>): string {
  const topCats = result.topCategories
    .map((c) => `  • ${c.category}: R$ ${c.total.toFixed(2)}`)
    .join('\n');
  return `Saúde financeira em ${MONTH_NAMES[result.month - 1]} de ${result.year}:\n\nReceitas: R$ ${result.totalIncome.toFixed(2)}\nDespesas: R$ ${result.totalExpenses.toFixed(2)}\nPoupança: R$ ${result.totalSavings.toFixed(2)}\nSaldo: R$ ${result.balance.toFixed(2)}\n\nRecorrências: ${result.recurringCount} (R$ ${result.recurringTotal.toFixed(2)})\n\nTop categorias:\n${topCats || '  Nenhuma'}`;
}

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));

export function FinancialChatbot({ userId, cards, transactions, recurring }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Olá! Sou seu assistente financeiro. Escolha uma pergunta abaixo para consultar suas finanças.',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [pendingParams, setPendingParams] = useState<ParamState | null>(null);
  const [freeText, setFreeText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open, pendingParams]);

  const handleQuestionBlock = (questionId: QuestionId) => {
    const now = new Date();
    const month = String(now.getMonth() + 1);
    const year = String(now.getFullYear());
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const targetDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const defaultCard = cards.length > 0 ? cards[0].name : '';
    setPendingParams({ questionId, cardName: defaultCard, month, year, targetDate });
  };

  const handleParamSubmit = async () => {
    if (!pendingParams || loading) return;

    const { questionId, cardName, month, year, targetDate } = pendingParams;
    const m = parseInt(month);
    const y = parseInt(year);

    if (questionId !== 'projected_balance' && (isNaN(m) || m < 1 || m > 12 || isNaN(y) || y < 1900 || y > 2100)) return;

    const monthName = MONTH_NAMES[m - 1];

    let userText = '';
    switch (questionId) {
      case 'card_bill':
        userText = `Qual o valor da fatura do cartão ${cardName} no mês ${monthName} de ${year}?`;
        break;
      case 'projected_balance':
        userText = `Qual será o meu saldo projetado em ${targetDate}?`;
        break;
      case 'monthly_summary':
        userText = `Pode me dar um resumo do meu mês de ${monthName} de ${year}?`;
        break;
      case 'biggest_expense':
        userText = `Qual foi minha maior despesa no mês de ${monthName} de ${year}?`;
        break;
      case 'financial_health':
        userText = `Como está a minha saúde financeira no mês de ${monthName} de ${year}?`;
        break;
    }

    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setPendingParams(null);
    setLoading(true);

    try {
      let resultText = '';

      switch (questionId) {
        case 'card_bill': {
          const result = await getCardBill({ userId, cardName, month: m, year: y });
          resultText = formatCardBillResult(result);
          break;
        }
        case 'projected_balance': {
          const currentDate = new Date().toISOString().split('T')[0];
          const result = await getProjectedBalance({ userId, targetDate, currentDate });
          resultText = formatProjectedBalanceResult(result);
          break;
        }
        case 'monthly_summary': {
          const result = await getMonthlySummary({ userId, month: m, year: y });
          resultText = formatMonthlySummaryResult(result);
          break;
        }
        case 'biggest_expense': {
          const result = await getBiggestExpense({ userId, month: m, year: y });
          resultText = formatBiggestExpenseResult(result);
          break;
        }
        case 'financial_health': {
          const result = await getFinancialHealthSummary({ userId, month: m, year: y });
          resultText = formatFinancialHealthResult(result);
          break;
        }
      }

      setMessages((prev) => [...prev, { role: 'assistant', text: resultText }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Desculpe, ocorreu um erro. Por favor, tente novamente.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFreeTextSubmit = async () => {
    const text = freeText.trim();
    if (!text || loading) return;
    setFreeText('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, userId, transactions, recurring, cards }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: data.text ?? data.error ?? 'Sem resposta.' },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Desculpe, ocorreu um erro. Por favor, tente novamente.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const showQuestionBlocks = messages.length > 0 && messages[messages.length - 1].role === 'assistant' && !pendingParams && !loading;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary rounded-full shadow-lg shadow-primary/40 flex items-center justify-center text-white hover:bg-primary/90 transition-all hover:scale-110 active:scale-95"
        aria-label="Abrir assistente financeiro"
      >
        <MessageCircle className="w-7 h-7" />
      </button>

      {/* Chat dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px] h-[600px] flex flex-col p-0 gap-0 rounded-3xl bg-white/95 backdrop-blur-md border border-white/50">
          <DialogHeader className="px-5 py-4 border-b border-primary/10 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-primary font-headline">
              <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              Assistente Financeiro
            </DialogTitle>
            <DialogDescription className="sr-only">
              Assistente financeiro pessoal. Faça perguntas sobre suas finanças.
            </DialogDescription>
          </DialogHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-3">
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
                      msg.role === 'user' ? 'bg-primary/20' : 'bg-primary'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <User className="w-4 h-4 text-primary" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-primary text-white rounded-tr-sm'
                        : 'bg-primary/10 text-foreground rounded-tl-sm border border-primary/10'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Question blocks – shown after every assistant message */}
              {showQuestionBlocks && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs text-muted-foreground text-center">O que deseja consultar?</p>
                  {QUESTION_BLOCKS.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => handleQuestionBlock(q.id)}
                      className="w-full text-left text-sm px-3 py-2 rounded-xl bg-primary/5 border border-primary/15 text-foreground hover:bg-primary/10 transition-colors"
                    >
                      {q.template}
                    </button>
                  ))}
                </div>
              )}

              {/* Parameter form */}
              {pendingParams && (
                <div className="bg-primary/5 border border-primary/15 rounded-2xl p-3 space-y-2">
                  <p className="text-xs font-medium text-primary">Preencha os dados:</p>
                  {pendingParams.questionId === 'card_bill' && (
                    cards.length > 0 ? (
                      <Select
                        value={pendingParams.cardName}
                        onValueChange={(v) => setPendingParams((p) => p ? { ...p, cardName: v } : p)}
                      >
                        <SelectTrigger className="h-8 text-sm rounded-lg">
                          <SelectValue placeholder="Selecione o cartão" />
                        </SelectTrigger>
                        <SelectContent>
                          {cards.map((c) => (
                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-xs text-muted-foreground">Nenhum cartão cadastrado.</p>
                    )
                  )}
                  {pendingParams.questionId !== 'projected_balance' ? (
                    <div className="flex gap-2">
                      <Select
                        value={pendingParams.month}
                        onValueChange={(v) => setPendingParams((p) => p ? { ...p, month: v } : p)}
                      >
                        <SelectTrigger className="h-8 text-sm rounded-lg w-1/2">
                          <SelectValue placeholder="Mês" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTH_NAMES.map((name, idx) => (
                            <SelectItem key={idx + 1} value={String(idx + 1)}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={pendingParams.year}
                        onValueChange={(v) => setPendingParams((p) => p ? { ...p, year: v } : p)}
                      >
                        <SelectTrigger className="h-8 text-sm rounded-lg w-1/2">
                          <SelectValue placeholder="Ano" />
                        </SelectTrigger>
                        <SelectContent>
                          {YEAR_OPTIONS.map((y) => (
                            <SelectItem key={y} value={y}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <Input
                      placeholder="Data alvo (AAAA-MM-DD)"
                      value={pendingParams.targetDate}
                      onChange={(e) => setPendingParams((p) => p ? { ...p, targetDate: e.target.value } : p)}
                      className="h-8 text-sm rounded-lg"
                      type="date"
                    />
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setPendingParams(null)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleParamSubmit}
                      disabled={
                        (pendingParams.questionId === 'card_bill' && !pendingParams.cardName.trim()) ||
                        (pendingParams.questionId !== 'projected_balance' && (
                          !pendingParams.month || !pendingParams.year
                        ))
                      }
                    >
                      Consultar
                    </Button>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex gap-2 flex-row">
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center bg-primary">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-primary/10 border border-primary/10 rounded-2xl rounded-tl-sm px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {/* Free text input */}
          <div className="px-4 py-3 border-t border-primary/10 flex-shrink-0 flex gap-2">
            <Input
              placeholder="Pergunte algo sobre suas finanças..."
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFreeTextSubmit(); } }}
              disabled={loading}
              className="rounded-xl text-sm flex-1"
            />
            <Button
              size="icon"
              onClick={handleFreeTextSubmit}
              disabled={loading || !freeText.trim()}
              className="rounded-xl h-10 w-10 flex-shrink-0"
              aria-label="Enviar pergunta"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
