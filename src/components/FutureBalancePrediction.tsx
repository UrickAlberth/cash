
"use client"

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Transaction, RecurringExpense, CreditCard } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  CalendarIcon, 
  TrendingUp, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  CreditCard as CardIcon,
  PiggyBank,
  Wallet
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  currentBalance: number;
  transactions: Transaction[];
  recurringExpenses: RecurringExpense[];
  cards: CreditCard[];
}

// Compute balance up to (but not including) `beforeDate`, treating CC purchases as
// invoice totals on due dates rather than immediate cash deductions.
// This avoids double-counting individual CC transactions vs. their aggregated invoice.
function computeInvoiceBasedBalance(
  transactions: Transaction[],
  cards: CreditCard[],
  beforeDate: Date   // strictly before this date
): number {
  const cutoff = new Date(beforeDate);
  cutoff.setHours(0, 0, 0, 0);

  const pastTxs = transactions.filter(t => {
    const d = new Date(t.date + 'T12:00:00');
    d.setHours(0, 0, 0, 0);
    return d < cutoff;
  });

  // Non-CC balance: income/savings_withdrawal add, expense/savings subtract
  const cashBalance = pastTxs.reduce((acc, t) => {
    if (t.type === 'income' || t.type === 'savings_withdrawal') return acc + t.value;
    if (t.type === 'credit_card') return acc; // CC handled via invoice totals below
    return acc - t.value;
  }, 0);

  // CC invoice totals for billing periods whose due date is before `cutoff`
  const invoiceExpenses = cards.reduce((total, card) => {
    const billingTotals: Record<string, number> = {};
    pastTxs
      .filter(t => t.type === 'credit_card' && t.cardId === card.id)
      .forEach(t => {
        const tDate = new Date(t.date + 'T12:00:00');
        let billMonth = tDate.getMonth();
        let billYear = tDate.getFullYear();
        const tDay = tDate.getDate();
        if (tDay > card.closingDay) {
          billMonth++;
          if (billMonth > 11) { billMonth = 0; billYear++; }
        }
        const dueDate = new Date(billYear, billMonth, card.dueDay);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate < cutoff) {
          const key = `${billYear}-${billMonth}`;
          billingTotals[key] = (billingTotals[key] || 0) + t.value;
        }
      });
    return total + Object.values(billingTotals).reduce((s, v) => s + v, 0);
  }, 0);

  return cashBalance - invoiceExpenses;
}

export function FutureBalancePrediction({ currentBalance, transactions, recurringExpenses, cards }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [detailsDay, setDetailsDay] = useState<number | null>(null);

  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  
  // Gerar anos dinamicamente baseados na data atual até 5 anos a frente
  const years = useMemo(() => {
    const currentY = new Date().getFullYear();
    const list = [];
    for (let i = -1; i <= 5; i++) {
      list.push(currentY + i);
    }
    return list;
  }, []);

  const getDayProfit = (day: number, month: number, year: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const targetDate = new Date(year, month, day);
    targetDate.setHours(0, 0, 0, 0);

    const dayTransactions = transactions.filter(t => t.date === dateStr && t.type !== 'credit_card');
    
    const dayRecurring = recurringExpenses.filter(r => {
      if (r.dayOfMonth !== day) return false;
      
      const startDate = new Date(r.startDate + 'T12:00:00');
      // Só projetamos se a data for igual ou superior ao início
      if (targetDate < startDate) return false;

      // Se for no futuro (>= hoje), verificamos se já foi lançado
      if (targetDate >= now) {
        const alreadyLaunched = transactions.some(t => 
           t.date === dateStr && 
           t.description.includes(r.description) && 
           Math.abs(t.value - r.value) < 0.01
        );
        return !alreadyLaunched;
      }
      return false; // No passado, só conta o que está no extrato real
    });

    const cardBillItems = targetDate >= now ? cards.map(card => {
      if (card.dueDay !== day) return null;
      
      const billTransactions = transactions.filter(t => {
        if (t.type !== 'credit_card' || t.cardId !== card.id) return false;
        const tDate = new Date(t.date + 'T12:00:00');
        const tDay = tDate.getDate();
        let tMonth = tDate.getMonth();
        let tYear = tDate.getFullYear();
        if (tDay > card.closingDay) {
          tMonth++;
          if (tMonth > 11) { tMonth = 0; tYear++; }
        }
        return tMonth === month && tYear === year;
      });

      const total = billTransactions.reduce((acc, t) => acc + t.value, 0);
      if (total === 0) return null;

      return {
        id: `bill-${card.id}-${month}-${year}`,
        description: `Fatura: ${card.name}`,
        value: total,
        type: 'expense' as const,
        category: 'Cartão de Crédito',
        isBill: true
      };
    }).filter(Boolean) : [];

    const incomeItems = [
      ...dayTransactions.filter(t => t.type === 'income' || t.type === 'savings_withdrawal'),
      ...dayRecurring.filter(r => r.type === 'income' || r.type === 'savings_withdrawal')
    ];
    
    const expenseItems = [
      ...dayTransactions.filter(t => t.type === 'expense' || t.type === 'credit_card'),
      ...dayRecurring.filter(r => r.type === 'expense'),
      ...(cardBillItems as any[])
    ];
    
    const savingsItems = [
      ...dayTransactions.filter(t => t.type === 'savings'),
      ...dayRecurring.filter(r => r.type === 'savings')
    ];

    const income = incomeItems.reduce((s, t) => s + t.value, 0);
    const expense = expenseItems.reduce((s, t) => s + t.value, 0);
    const savings = savingsItems.reduce((s, t) => s + t.value, 0);

    const profit = income - (expense + savings);

    return {
      income,
      expense: expense + savings,
      profit,
      items: { income: incomeItems, expense: expenseItems, savings: savingsItems }
    };
  };

  const projectedStartBalance = useMemo(() => {
    let balance = 0;
    const now = new Date();
    now.setHours(0,0,0,0);
    const targetStartDate = new Date(selectedYear, selectedMonth, 1);

    const pastTransactions = transactions.filter(t => new Date(t.date + 'T12:00:00') < targetStartDate);

    // Non-CC past balance (income adds, expense/savings subtracts; CC skipped here)
    const pastCashBalance = pastTransactions.reduce((acc, t) => {
      if (t.type === 'income' || t.type === 'savings_withdrawal') return acc + t.value;
      if (t.type === 'credit_card') return acc; // CC counted via invoice totals below
      return acc - t.value;
    }, 0);

    // Past CC invoice totals: only for billing periods already due (due date < now).
    // Invoices from `now` onwards are handled by getDayProfit's cardBillItems in the loop below.
    const pastInvoiceExpenses = cards.reduce((total, card) => {
      const billingTotals: Record<string, number> = {};
      pastTransactions
        .filter(t => t.type === 'credit_card' && t.cardId === card.id)
        .forEach(t => {
          const tDate = new Date(t.date + 'T12:00:00');
          let billMonth = tDate.getMonth();
          let billYear = tDate.getFullYear();
          const tDay = tDate.getDate();
          if (tDay > card.closingDay) {
            billMonth++;
            if (billMonth > 11) { billMonth = 0; billYear++; }
          }
          const dueDate = new Date(billYear, billMonth, card.dueDay);
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate < now) {
            const key = `${billYear}-${billMonth}`;
            billingTotals[key] = (billingTotals[key] || 0) + t.value;
          }
        });
      return total + Object.values(billingTotals).reduce((s, v) => s + v, 0);
    }, 0);

    balance = pastCashBalance - pastInvoiceExpenses;

    if (targetStartDate > now) {
      let tempDate = new Date(now);
      while (tempDate < targetStartDate) {
        const dayData = getDayProfit(tempDate.getDate(), tempDate.getMonth(), tempDate.getFullYear());
        balance += dayData.profit;
        tempDate.setDate(tempDate.getDate() + 1);
      }
    }

    return balance;
  }, [selectedMonth, selectedYear, transactions, recurringExpenses, cards]);

  const dailyData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const data = [];
    let runningBalance = projectedStartBalance;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = getDayProfit(day, selectedMonth, selectedYear);
      runningBalance += dayData.profit;

      data.push({
        day,
        ...dayData,
        balance: runningBalance
      });
    }
    return data;
  }, [selectedMonth, selectedYear, projectedStartBalance, transactions, recurringExpenses, cards]);

  const monthlyChartData = useMemo(() => {
    const data = [];
    const now = new Date();
    now.setHours(0,0,0,0);
    // Use invoice-based balance for today so that isPaid status has no effect on the chart
    let chartBalance = computeInvoiceBasedBalance(transactions, cards, now);
    
    for (let i = 0; i < 12; i++) {
      const mDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const m = mDate.getMonth();
      const y = mDate.getFullYear();
      const daysInM = new Date(y, m + 1, 0).getDate();

      for (let d = 1; d <= daysInM; d++) {
        const loopDate = new Date(y, m, d);
        if (loopDate >= now) {
           const dayData = getDayProfit(d, m, y);
           chartBalance += dayData.profit;
        }
      }
      
      data.push({
        name: months[m].substring(0, 3),
        balance: parseFloat(chartBalance.toFixed(2))
      });
    }
    return data;
  }, [recurringExpenses, transactions, cards]);

  const currentDayData = detailsDay !== null ? dailyData.find(d => d.day === detailsDay) : null;

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl bg-white/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> Evolução de Saldo Projetada (Próximos 12 Meses)
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis dataKey="name" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis fontSize={12} axisLine={false} tickLine={false} />
              <Tooltip 
                formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
              />
              <Line type="monotone" dataKey="balance" name="Saldo" stroke="#E87DC0" strokeWidth={4} dot={{ r: 4, fill: '#E87DC0', strokeWidth: 2, stroke: '#fff' }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl bg-white/60 backdrop-blur-md overflow-hidden">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-primary text-lg flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" /> Fluxo de Caixa: {months[selectedMonth]} {selectedYear}
          </CardTitle>
          <div className="flex gap-2">
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-[140px] rounded-xl bg-white/50"><SelectValue /></SelectTrigger>
              <SelectContent>{months.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[100px] rounded-xl bg-white/50"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow>
                  <TableHead className="w-16">Dia</TableHead>
                  <TableHead>Entrada (+)</TableHead>
                  <TableHead>Saída (-)</TableHead>
                  <TableHead>Lucro (Dia)</TableHead>
                  <TableHead className="text-right">Saldo Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyData.map((row) => (
                  <TableRow key={row.day} className="hover:bg-primary/5 cursor-pointer group" onClick={() => setDetailsDay(row.day)}>
                    <TableCell className="font-bold text-muted-foreground">{row.day}</TableCell>
                    <TableCell className="text-green-600 font-medium">{row.income > 0 ? `+ R$ ${row.income.toFixed(2)}` : '-'}</TableCell>
                    <TableCell className="text-red-500 font-medium">{row.expense > 0 ? `- R$ ${row.expense.toFixed(2)}` : '-'}</TableCell>
                    <TableCell className={row.profit >= 0 ? 'text-green-600' : 'text-red-500'}>
                      {row.profit !== 0 ? `${row.profit > 0 ? '+' : ''} R$ ${row.profit.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">R$ {row.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailsDay !== null} onOpenChange={() => setDetailsDay(null)}>
        <DialogContent className="bg-white/95 backdrop-blur-md rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary font-headline">Detalhamento: {detailsDay}/{selectedMonth + 1}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Entradas</h4>
              {currentDayData?.items.income.length ? currentDayData.items.income.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between p-3 rounded-xl bg-green-50/50 border border-green-100">
                  <div className="flex items-center gap-2">
                    {item.type === 'savings_withdrawal' ? <Wallet className="w-4 h-4 text-green-500" /> : <ArrowUpCircle className="w-4 h-4 text-green-500" />}
                    <div><p className="text-sm font-bold">{item.description}</p><p className="text-[10px] opacity-60 uppercase">{item.category}</p></div>
                  </div>
                  <p className="font-bold text-green-600">+ R$ {item.value.toFixed(2)}</p>
                </div>
              )) : <p className="text-xs text-muted-foreground italic">Nenhuma entrada registrada para este dia.</p>}
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Saídas</h4>
              {currentDayData?.items.expense.length ? currentDayData.items.expense.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between p-3 rounded-xl bg-red-50/50 border border-red-100">
                  <div className="flex items-center gap-2">
                    {item.isBill ? <CardIcon className="w-4 h-4 text-red-500" /> : <ArrowDownCircle className="w-4 h-4 text-red-500" />}
                    <div><p className="text-sm font-bold">{item.description}</p><p className="text-[10px] opacity-60 uppercase">{item.category}</p></div>
                  </div>
                  <p className="font-bold text-red-500">- R$ {item.value.toFixed(2)}</p>
                </div>
              )) : null}
              {currentDayData?.items.savings.length ? currentDayData.items.savings.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2">
                    <PiggyBank className="w-4 h-4 text-primary" />
                    <div><p className="text-sm font-bold">{item.description}</p><p className="text-[10px] opacity-60 uppercase">{item.category}</p></div>
                  </div>
                  <p className="font-bold text-primary">- R$ {item.value.toFixed(2)}</p>
                </div>
              )) : null}
              {(!currentDayData?.items.expense.length && !currentDayData?.items.savings.length) && (
                <p className="text-xs text-muted-foreground italic">Nenhuma saída registrada para este dia.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
