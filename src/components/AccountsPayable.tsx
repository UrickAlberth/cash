
"use client"

import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Transaction, CreditCard } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Receipt, 
  CheckCircle2, 
  Circle, 
  TrendingDown, 
  ArrowRightLeft,
  CreditCard as CardIcon
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Props {
  transactions: Transaction[];
  cards: CreditCard[];
  onTogglePaid: (id: string) => void;
  onToggleBillPaid: (cardId: string, month: number, year: number, newState: boolean) => void;
}

export function AccountsPayable({ transactions, cards, onTogglePaid, onToggleBillPaid }: Props) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const filteredItems = useMemo(() => {
    // 1. Despesas individuais (não cartão) do mês atual
    const individualExpenses = transactions.filter(t => {
      if (t.type === 'credit_card') return false;
      
      const tDate = new Date(t.date + 'T12:00:00');
      const isCurrentMonth = tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
      const isExpense = t.type === 'expense' || t.type === 'savings';
      return isCurrentMonth && isExpense;
    }).map(t => ({
      ...t,
      isBill: false,
      sortDate: new Date(t.date).getTime()
    }));

    // 2. Faturas de Cartão consolidadas para o mês atual
    const cardBills = cards.map(card => {
      const billTransactions = transactions.filter(t => {
        if (t.type !== 'credit_card' || t.cardId !== card.id) return false;
        
        const tDate = new Date(t.date + 'T12:00:00');
        const tMonth = tDate.getMonth();
        const tYear = tDate.getFullYear();
        const tDay = tDate.getDate();

        let targetMonth = tMonth;
        let targetYear = tYear;
        
        if (tDay > card.closingDay) {
          targetMonth++;
          if (targetMonth > 11) { targetMonth = 0; targetYear++; }
        }

        return targetMonth === currentMonth && targetYear === currentYear;
      });

      if (billTransactions.length === 0) return null;

      const totalValue = billTransactions.reduce((acc, t) => acc + t.value, 0);
      const isPaid = billTransactions.every(t => t.isPaid);

      return {
        id: `bill-${card.id}-${currentMonth}-${currentYear}`,
        description: `Fatura: ${card.name}`,
        value: totalValue,
        category: 'Cartão de Crédito',
        date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(card.dueDay).padStart(2, '0')}`,
        isPaid,
        isBill: true,
        cardId: card.id,
        sortDate: new Date(currentYear, currentMonth, card.dueDay).getTime()
      };
    }).filter(Boolean);

    return [...individualExpenses, ...(cardBills as any[])].sort((a, b) => a.sortDate - b.sortDate);
  }, [transactions, cards, currentMonth, currentYear]);

  const totals = useMemo(() => {
    const paid = filteredItems
      .filter(t => t.isPaid)
      .reduce((acc, t) => acc + t.value, 0);
    
    const pending = filteredItems
      .filter(t => !t.isPaid)
      .reduce((acc, t) => acc + t.value, 0);

    return { paid, pending, total: paid + pending };
  }, [filteredItems]);

  const percentPaid = totals.total > 0 ? (totals.paid / totals.total) * 100 : 0;

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/80 border-none shadow-md overflow-hidden">
          <div className="h-1 bg-primary" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total do Mês</p>
                <h3 className="text-xl font-bold text-primary">R$ {totals.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>
              <Receipt className="w-8 h-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 border-none shadow-md overflow-hidden border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Já Pago</p>
                <h3 className="text-xl font-bold text-green-600">R$ {totals.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-none shadow-lg overflow-hidden ring-2 ring-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Restante (Pendente)</p>
                <h3 className="text-2xl font-bold text-accent animate-pulse">R$ {totals.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                <p className="text-[9px] text-muted-foreground mt-1">Este valor diminui conforme você abate as contas.</p>
              </div>
              <div className="bg-primary/10 p-3 rounded-full">
                <ArrowRightLeft className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl bg-white/60 backdrop-blur-md">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-end">
            <div>
              <CardTitle className="text-primary font-headline flex items-center gap-2">
                <TrendingDown className="w-5 h-5" /> Checklist de {monthNames[currentMonth]}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">As faturas consolidam todos os gastos individuais do cartão.</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">{percentPaid.toFixed(0)}% Quitado</p>
              <Progress value={percentPaid} className="w-32 h-2 mt-1" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mt-4">
            {filteredItems.length > 0 ? filteredItems.map((item) => (
              <div 
                key={item.id} 
                className={`flex items-center justify-between p-4 rounded-2xl transition-all border ${
                  item.isPaid 
                    ? 'bg-green-50/30 border-green-100 opacity-60 grayscale-[0.5]' 
                    : 'bg-white border-primary/5 hover:border-primary/20 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center">
                    <Checkbox 
                      id={`paid-${item.id}`} 
                      checked={item.isPaid} 
                      onCheckedChange={() => {
                        if (item.isBill) {
                          onToggleBillPaid(item.cardId, currentMonth, currentYear, !item.isPaid);
                        } else {
                          onTogglePaid(item.id);
                        }
                      }}
                      className="w-7 h-7 rounded-xl border-primary/20 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${item.isBill ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
                      {item.isBill ? <CardIcon className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${item.isPaid ? 'line-through text-muted-foreground' : 'text-gray-800'}`}>
                        {item.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.category}</span>
                        <span className="text-[10px] text-muted-foreground font-medium bg-primary/5 px-2 py-0.5 rounded">Vence: {item.date.split('-')[2]}/{item.date.split('-')[1]}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-lg ${item.isPaid ? 'text-muted-foreground' : 'text-primary'}`}>
                    R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className={`text-[9px] uppercase font-bold tracking-tighter ${item.isPaid ? 'text-green-600' : 'text-accent'}`}>
                    {item.isPaid ? 'PAGO' : 'PENDENTE'}
                  </p>
                </div>
              </div>
            )) : (
              <div className="text-center py-20 bg-white/20 rounded-3xl border border-dashed border-primary/10">
                <Circle className="w-10 h-10 text-primary/10 mx-auto mb-3" />
                <p className="text-muted-foreground italic text-sm">Nenhuma conta ou fatura encontrada para este mês.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
