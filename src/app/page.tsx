
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { FinanceDashboard } from '@/components/FinanceDashboard';
import { TransactionForm } from '@/components/TransactionForm';
import { FutureBalancePrediction } from '@/components/FutureBalancePrediction';
import { TransactionList } from '@/components/TransactionList';
import { CreditCardBills } from '@/components/CreditCardBills';
import { CreditCardManager } from '@/components/CreditCardManager';
import { AccountsPayable } from '@/components/AccountsPayable';
import { 
  INITIAL_CATEGORIES, 
  MOCK_TRANSACTIONS, 
  MOCK_RECURRING,
  MOCK_CARDS
} from '@/lib/store';
import { Transaction, SummaryData, RecurringExpense, CreditCard, Category } from '@/lib/types';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  TrendingUp, 
  Heart,
  Settings,
  ListRestart,
  CreditCard as CardIcon,
  CheckCircle2,
  Edit2,
  Trash2,
  Palette
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toaster } from '@/components/ui/toaster';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

export default function RosaCashApp() {
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [recurring, setRecurring] = useState<RecurringExpense[]>(MOCK_RECURRING);
  const [cards, setCards] = useState<CreditCard[]>(MOCK_CARDS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [themeHue, setThemeHue] = useState<number>(322); // Rosa original

  const [editingRec, setEditingRec] = useState<RecurringExpense | null>(null);

  // Injetar cores dinâmicas
  const dynamicStyles = useMemo(() => {
    return `
      :root {
        --primary: ${themeHue} 68% 70%;
        --primary-foreground: 0 0% 100%;
        --secondary: ${themeHue} 20% 90%;
        --secondary-foreground: ${themeHue} 68% 40%;
        --accent: ${(themeHue + 300) % 360} 70% 60%;
        --accent-foreground: 0 0% 100%;
        --ring: ${themeHue} 68% 70%;
        --chart-1: ${themeHue} 68% 70%;
        --chart-2: ${(themeHue + 40) % 360} 70% 60%;
        --chart-3: ${(themeHue + 80) % 360} 70% 60%;
      }
    `;
  }, [themeHue]);

  const summary = useMemo<SummaryData>(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayTransactions = transactions.filter(t => t.date <= todayStr);

    const totalIncome = todayTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.value, 0);
    
    const totalWithdrawals = todayTransactions
      .filter(t => t.type === 'savings_withdrawal')
      .reduce((sum, t) => sum + t.value, 0);

    const totalExpense = todayTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.value, 0);

    const totalSavings = todayTransactions
      .filter(t => t.type === 'savings')
      .reduce((sum, t) => sum + t.value, 0);

    const paidCardBillsTotal = todayTransactions
      .filter(t => t.type === 'credit_card' && t.isPaid)
      .reduce((sum, t) => sum + t.value, 0);

    const allSavings = transactions
      .filter(t => t.type === 'savings')
      .reduce((sum, t) => sum + t.value, 0);
    const allWithdrawals = transactions
      .filter(t => t.type === 'savings_withdrawal')
      .reduce((sum, t) => sum + t.value, 0);

    return {
      totalIncome: totalIncome + totalWithdrawals,
      totalExpense: totalExpense + paidCardBillsTotal,
      totalSavings: allSavings - allWithdrawals,
      netProfit: (totalIncome + totalWithdrawals) - (totalExpense + paidCardBillsTotal + totalSavings)
    };
  }, [transactions]);

  const addTransaction = (newTx: any) => {
    const id = Math.random().toString(36).substr(2, 9);
    if (newTx.isRecurring) {
      const recurringItem: RecurringExpense = {
        id,
        description: newTx.description,
        value: Number(newTx.value.toFixed(2)),
        dayOfMonth: parseInt(newTx.date.split('-')[2]),
        category: newTx.category,
        subcategory: newTx.subcategory || 'Fixo',
        type: newTx.type,
        startDate: newTx.date,
      };
      setRecurring(prev => [...prev, recurringItem]);
    }

    if (newTx.type === 'credit_card' && newTx.installments && newTx.installments > 1) {
      const totalValue = Number(newTx.value);
      const installmentValue = Number((totalValue / newTx.installments).toFixed(2));
      const lastInstallmentValue = Number((totalValue - (installmentValue * (newTx.installments - 1))).toFixed(2));
      const baseDate = new Date(newTx.date + 'T12:00:00');
      const generatedTransactions: Transaction[] = [];

      for (let i = 0; i < newTx.installments; i++) {
        const installmentDate = new Date(baseDate);
        if (i > 0) installmentDate.setMonth(baseDate.getMonth() + i);

        generatedTransactions.push({
          id: `${id}-${i + 1}`,
          description: `${newTx.description} (${i + 1}/${newTx.installments})`,
          value: i === newTx.installments - 1 ? lastInstallmentValue : installmentValue,
          date: installmentDate.toISOString().split('T')[0],
          type: 'credit_card',
          category: newTx.category,
          subcategory: newTx.subcategory,
          cardId: newTx.cardId,
          installments: newTx.installments,
          currentInstallment: i + 1,
          isRecurring: false,
          isPaid: false
        });
      }
      setTransactions(prev => [...generatedTransactions, ...prev]);
    } else {
      setTransactions(prev => [{ ...newTx, id, value: Number(newTx.value.toFixed(2)), isRecurring: newTx.isRecurring, isPaid: false }, ...prev]);
    }
  };

  const deleteTransaction = (id: string, deleteMode: 'single' | 'all') => {
    if (deleteMode === 'single') {
      setTransactions(prev => prev.filter(t => t.id !== id));
      toast({ title: "Lançamento excluído" });
    } else {
      const baseId = id.includes('-') ? id.split('-')[0] : id;
      setTransactions(prev => prev.filter(t => t.id !== id && !t.id.startsWith(baseId + '-')));
      setRecurring(prev => prev.filter(r => r.id !== baseId && r.id !== id));
      toast({ title: "Exclusão Geral concluída" });
    }
  };

  const deleteByPeriod = (month: string, year: string) => {
    setTransactions(prev => prev.filter(t => {
      const tDate = new Date(t.date + 'T12:00:00');
      const tMonth = (tDate.getMonth() + 1).toString().padStart(2, '0');
      const tYear = tDate.getFullYear().toString();
      return !(tMonth === month && tYear === year);
    }));
    toast({ title: "Período limpo", description: `${month}/${year} removido.` });
  };

  const updateTransaction = (updatedTx: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updatedTx.id ? { ...updatedTx, value: Number(updatedTx.value.toFixed(2)) } : t));
    toast({ title: "Atualizado" });
  };

  const togglePaid = (id: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, isPaid: !t.isPaid } : t));
  };

  const toggleBillPaid = (cardId: string, targetMonth: number, targetYear: number, newState: boolean) => {
    setTransactions(prev => prev.map(t => {
      if (t.type !== 'credit_card' || t.cardId !== cardId) return t;
      const tDate = new Date(t.date + 'T12:00:00');
      const tDay = tDate.getDate();
      const card = cards.find(c => c.id === cardId);
      if (!card) return t;

      let billMonth = tDate.getMonth();
      let billYear = tDate.getFullYear();
      if (tDay > card.closingDay) {
        billMonth++;
        if (billMonth > 11) { billMonth = 0; billYear++; }
      }
      return (billMonth === targetMonth && billYear === targetYear) ? { ...t, isPaid: newState } : t;
    }));
  };

  const addCard = (newCard: CreditCard) => setCards(prev => [...prev, newCard]);
  const updateCard = (updatedCard: CreditCard) => setCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
  const deleteCard = (id: string) => setCards(prev => prev.filter(c => c.id !== id));

  const addCategory = (name: string, color: string) => {
    const newCat = { id: Math.random().toString(36).substr(2, 9), name, color };
    setCategories(prev => [...prev, newCat]);
  };

  const updateRecurring = (updated: RecurringExpense) => {
    setRecurring(prev => prev.map(r => r.id === updated.id ? { ...updated, value: Number(updated.value.toFixed(2)) } : r));
    setEditingRec(null);
  };

  const deleteRecurring = (id: string) => setRecurring(prev => prev.filter(r => r.id !== id));

  return (
    <div className="min-h-screen bg-background font-body pb-20 md:pb-0">
      <style>{dynamicStyles}</style>
      <Toaster />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="flex items-center justify-between mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Heart className="text-white w-7 h-7 fill-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary font-headline tracking-tight">RosaCash</h1>
              <p className="text-sm text-muted-foreground font-medium">Finanças Inteligentes</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            <div className="bg-white/50 backdrop-blur-sm p-3 rounded-2xl border border-white/50 flex items-center gap-4">
               <div className="text-right border-r pr-4 border-primary/10">
                <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-tighter">Poupança Total</p>
                <p className="text-md font-bold text-primary">R$ {summary.totalSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-tighter">Saldo Hoje</p>
                <p className="text-md font-bold text-accent">R$ {summary.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        </header>

        <Tabs defaultValue="dashboard" className="space-y-8">
          <TabsList className="grid grid-cols-4 md:grid-cols-8 w-full md:w-full h-auto bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-white/50 shadow-sm overflow-x-auto gap-1">
            <TabsTrigger value="dashboard" className="rounded-xl py-2 px-1"><LayoutDashboard className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Dashboard</span></TabsTrigger>
            <TabsTrigger value="transactions" className="rounded-xl py-2 px-1"><PlusCircle className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Lançar</span></TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl py-2 px-1"><History className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Extrato</span></TabsTrigger>
            <TabsTrigger value="payable" className="rounded-xl py-2 px-1"><CheckCircle2 className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Pagar</span></TabsTrigger>
            <TabsTrigger value="cards" className="rounded-xl py-2 px-1"><CardIcon className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Cartões</span></TabsTrigger>
            <TabsTrigger value="prediction" className="rounded-xl py-2 px-1"><TrendingUp className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Previsão</span></TabsTrigger>
            <TabsTrigger value="recurring" className="rounded-xl py-2 px-1"><ListRestart className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Fixas</span></TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl py-2 px-1"><Settings className="w-4 h-4 md:mr-2" /><span className="hidden md:inline">Ajustes</span></TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <FinanceDashboard transactions={transactions} summary={summary} />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionForm categories={categories} cards={cards} onAdd={addTransaction} onAddCategory={addCategory} />
          </TabsContent>

          <TabsContent value="history">
            <TransactionList 
              transactions={transactions} 
              recurring={recurring}
              categories={categories}
              cards={cards}
              onDelete={deleteTransaction} 
              onUpdate={updateTransaction}
              onDeleteByPeriod={deleteByPeriod}
            />
          </TabsContent>

          <TabsContent value="payable">
            <AccountsPayable transactions={transactions} cards={cards} onTogglePaid={togglePaid} onToggleBillPaid={toggleBillPaid} />
          </TabsContent>

          <TabsContent value="cards">
            <CreditCardBills cards={cards} transactions={transactions} />
          </TabsContent>

          <TabsContent value="prediction">
            <FutureBalancePrediction currentBalance={summary.netProfit} transactions={transactions} recurringExpenses={recurring} cards={cards} />
          </TabsContent>

          <TabsContent value="recurring">
            <Card className="border-none shadow-xl bg-white/60 backdrop-blur-md">
              <CardHeader><CardTitle>Contas Fixas Mensais</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recurring.length > 0 ? recurring.map(r => (
                  <div key={r.id} className="p-4 rounded-xl border bg-white flex justify-between items-center group relative overflow-hidden">
                    <div className="absolute inset-y-0 left-0 w-1 bg-primary/20" />
                    <div>
                      <p className="font-bold">{r.description}</p>
                      <p className="text-[10px] uppercase text-muted-foreground">Dia {r.dayOfMonth} • {r.category}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className={`font-bold ${r.type === 'income' || r.type === 'savings_withdrawal' ? 'text-green-600' : 'text-primary'}`}>R$ {r.value.toFixed(2)}</p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => setEditingRec(r)}><Edit2 className="w-3 h-3" /></Button>
                         <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteRecurring(r.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  </div>
                )) : <div className="col-span-full py-12 text-center bg-white/20 rounded-3xl border border-dashed"><p className="text-muted-foreground">Nenhuma conta fixa.</p></div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="border-none shadow-xl bg-white/60 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Palette className="w-6 h-6" /> Personalização do Tema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 max-w-md">
                  <div className="flex justify-between">
                    <Label className="text-sm font-bold uppercase text-muted-foreground">Cor de Matiz (Hue)</Label>
                    <span className="text-xs font-bold text-primary">{themeHue}°</span>
                  </div>
                  <Slider 
                    min={0} 
                    max={360} 
                    step={1} 
                    value={[themeHue]} 
                    onValueChange={(v) => setThemeHue(v[0])}
                    className="cursor-pointer"
                  />
                  <div className="grid grid-cols-7 gap-2">
                    {[322, 10, 45, 140, 200, 260, 290].map(h => (
                      <button 
                        key={h} 
                        onClick={() => setThemeHue(h)}
                        className={`w-full h-8 rounded-lg border-2 transition-all ${themeHue === h ? 'border-primary scale-110 shadow-lg' : 'border-transparent'}`}
                        style={{ backgroundColor: `hsl(${h}, 68%, 70%)` }}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground italic mt-2">
                    Mova o slider acima para escolher sua cor favorita. As cores secundárias e de acento serão calculadas automaticamente para manter a elegância.
                  </p>
                </div>
              </CardContent>
            </Card>

            <CreditCardManager cards={cards} onAdd={addCard} onUpdate={updateCard} onDelete={deleteCard} />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!editingRec} onOpenChange={() => setEditingRec(null)}>
        <DialogContent className="bg-white rounded-3xl sm:max-w-[425px]">
          <DialogHeader><DialogTitle className="text-primary font-headline">Editar Conta Fixa</DialogTitle></DialogHeader>
          {editingRec && (
            <div className="space-y-4 pt-4">
               <div className="space-y-2"><Label>Descrição</Label><Input value={editingRec.description} onChange={e => setEditingRec({...editingRec, description: e.target.value})} className="rounded-xl"/></div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" value={editingRec.value} onChange={e => setEditingRec({...editingRec, value: parseFloat(e.target.value)})} className="rounded-xl"/></div>
                 <div className="space-y-2"><Label>Dia do Mês</Label><Input type="number" min="1" max="31" value={editingRec.dayOfMonth} onChange={e => setEditingRec({...editingRec, dayOfMonth: parseInt(e.target.value)})} className="rounded-xl"/></div>
               </div>
               <div className="space-y-2"><Label>Data de Início</Label><Input type="date" value={editingRec.startDate} onChange={e => setEditingRec({...editingRec, startDate: e.target.value})} className="rounded-xl"/></div>
               <DialogFooter className="pt-4"><Button onClick={() => updateRecurring(editingRec)} className="w-full rounded-xl">Salvar</Button></DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
