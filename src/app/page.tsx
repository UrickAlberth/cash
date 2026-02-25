
"use client"

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FinanceDashboard } from '@/components/FinanceDashboard';
import { TransactionForm } from '@/components/TransactionForm';
import { FutureBalancePrediction } from '@/components/FutureBalancePrediction';
import { TransactionList } from '@/components/TransactionList';
import { CreditCardBills } from '@/components/CreditCardBills';
import { CreditCardManager } from '@/components/CreditCardManager';
import { AccountsPayable } from '@/components/AccountsPayable';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchTransactions, insertTransaction, upsertTransaction,
  deleteTransactionById, deleteTransactionsByBaseId, deleteTransactionsByPeriod,
  fetchCards, insertCard, updateCardById, deleteCardById,
  fetchCategories, insertCategory,
  fetchRecurring, insertRecurring, updateRecurringById, deleteRecurringById,
} from '@/lib/supabase/db';
import { INITIAL_CATEGORIES } from '@/lib/store';
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
  Palette,
  LogOut,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toaster } from '@/components/ui/toaster';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

// ── Auth screen ───────────────────────────────────────────────────────────────

function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password);
        toast({ title: 'Conta criada!', description: 'Verifique seu e-mail para confirmar o cadastro.' });
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message ?? 'Tente novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm border-none shadow-2xl bg-white/70 backdrop-blur-md">
        <CardHeader className="text-center space-y-2 pb-2">
          <div className="flex justify-center">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Heart className="text-white w-8 h-8 fill-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-primary font-headline">RosaCash</CardTitle>
          <p className="text-sm text-muted-foreground">
            {mode === 'signin' ? 'Entre na sua conta' : 'Crie sua conta'}
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="rounded-xl" placeholder="voce@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="rounded-xl" placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-xl h-11 bg-primary hover:bg-primary/90 text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'signin' ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>
          <p className="text-center text-sm mt-4 text-muted-foreground">
            {mode === 'signin' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
            <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="text-primary font-semibold hover:underline">
              {mode === 'signin' ? 'Criar conta' : 'Entrar'}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main app ──────────────────────────────────────────────────────────────────

export default function RosaCashApp() {
  const { user, loading: authLoading, signOut } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <AppContent userId={user.id} onSignOut={signOut} />;
}

function AppContent({ userId, onSignOut }: { userId: string; onSignOut: () => Promise<void> }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [themeHue, setThemeHue] = useState<number>(322);
  const [dataLoading, setDataLoading] = useState(true);
  const [editingRec, setEditingRec] = useState<RecurringExpense | null>(null);

  // Load all data from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setDataLoading(true);
      try {
        const [txs, cds, cats, recs] = await Promise.all([
          fetchTransactions(userId),
          fetchCards(userId),
          fetchCategories(userId),
          fetchRecurring(userId),
        ]);
        if (cancelled) return;
        setTransactions(txs);
        setCards(cds);
        // Seed default categories for new users
        setCategories(cats.length > 0 ? cats : []);
        setRecurring(recs);

        // If user has no categories yet, seed the defaults into Supabase
        if (cats.length === 0) {
          const seeded: Category[] = [];
          for (const cat of INITIAL_CATEGORIES) {
            try {
              const created = await insertCategory(userId, cat.name, cat.color);
              seeded.push(created);
            } catch { /* ignore */ }
          }
          if (!cancelled) setCategories(seeded);
        }
      } catch (err) {
        toast({ title: 'Erro ao carregar dados', description: 'Tente recarregar a página.', variant: 'destructive' });
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [userId]);

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

  const addTransaction = useCallback(async (newTx: any) => {
    if (newTx.isRecurring) {
      const recurringItem: Omit<RecurringExpense, 'id'> = {
        description: newTx.description,
        value: Number(newTx.value.toFixed(2)),
        dayOfMonth: parseInt(newTx.date.split('-')[2]),
        category: newTx.category,
        subcategory: newTx.subcategory || 'Fixo',
        type: newTx.type,
        startDate: newTx.date,
      };
      try {
        const created = await insertRecurring(userId, recurringItem);
        setRecurring(prev => [...prev, created]);
      } catch { toast({ title: 'Erro ao salvar recorrente', variant: 'destructive' }); }
    }

    if (newTx.type === 'credit_card' && newTx.installments && newTx.installments > 1) {
      const totalValue = Number(newTx.value);
      const installmentValue = Number((totalValue / newTx.installments).toFixed(2));
      const lastInstallmentValue = Number((totalValue - (installmentValue * (newTx.installments - 1))).toFixed(2));
      const baseDate = new Date(newTx.date + 'T12:00:00');
      const baseId = Math.random().toString(36).substr(2, 9);

      for (let i = 0; i < newTx.installments; i++) {
        const installmentDate = new Date(baseDate);
        if (i > 0) installmentDate.setMonth(baseDate.getMonth() + i);
        const txPayload: Omit<Transaction, 'id'> = {
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
          isPaid: false,
        };
        try {
          const created = await insertTransaction(userId, txPayload);
          setTransactions(prev => [created, ...prev]);
        } catch { toast({ title: 'Erro ao salvar parcela', variant: 'destructive' }); }
      }
    } else {
      const txPayload: Omit<Transaction, 'id'> = {
        ...newTx,
        value: Number(newTx.value.toFixed(2)),
        isRecurring: newTx.isRecurring,
        isPaid: false,
      };
      try {
        const created = await insertTransaction(userId, txPayload);
        setTransactions(prev => [created, ...prev]);
      } catch { toast({ title: 'Erro ao salvar transação', variant: 'destructive' }); }
    }
  }, [userId]);

  const deleteTransaction = useCallback(async (id: string, deleteMode: 'single' | 'all') => {
    if (deleteMode === 'single') {
      try {
        await deleteTransactionById(id);
        setTransactions(prev => prev.filter(t => t.id !== id));
        toast({ title: 'Lançamento excluído' });
      } catch { toast({ title: 'Erro ao excluir', variant: 'destructive' }); }
    } else {
      const baseId = id.includes('-') ? id.split('-')[0] : id;
      try {
        await deleteTransactionsByBaseId(baseId);
        await deleteRecurringById(userId, baseId).catch(() => {});
        await deleteRecurringById(userId, id).catch(() => {});
        setTransactions(prev => prev.filter(t => t.id !== id && !t.id.startsWith(baseId + '-')));
        setRecurring(prev => prev.filter(r => r.id !== baseId && r.id !== id));
        toast({ title: 'Exclusão Geral concluída' });
      } catch { toast({ title: 'Erro ao excluir', variant: 'destructive' }); }
    }
  }, [userId]);

  const deleteByPeriod = useCallback(async (month: string, year: string) => {
    try {
      await deleteTransactionsByPeriod(userId, month, year);
      setTransactions(prev => prev.filter(t => {
        const tDate = new Date(t.date + 'T12:00:00');
        const tMonth = (tDate.getMonth() + 1).toString().padStart(2, '0');
        const tYear = tDate.getFullYear().toString();
        return !(tMonth === month && tYear === year);
      }));
      toast({ title: 'Período limpo', description: `${month}/${year} removido.` });
    } catch { toast({ title: 'Erro ao limpar período', variant: 'destructive' }); }
  }, [userId]);

  const updateTransaction = useCallback(async (updatedTx: Transaction) => {
    const updated = { ...updatedTx, value: Number(updatedTx.value.toFixed(2)) };
    try {
      await upsertTransaction(userId, updated);
      setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
      toast({ title: 'Atualizado' });
    } catch { toast({ title: 'Erro ao atualizar', variant: 'destructive' }); }
  }, [userId]);

  const togglePaid = useCallback(async (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    const updated = { ...tx, isPaid: !tx.isPaid };
    try {
      await upsertTransaction(userId, updated);
      setTransactions(prev => prev.map(t => t.id === id ? updated : t));
    } catch { toast({ title: 'Erro ao atualizar', variant: 'destructive' }); }
  }, [userId, transactions]);

  const toggleBillPaid = useCallback(async (cardId: string, targetMonth: number, targetYear: number, newState: boolean) => {
    const affected = transactions.filter(t => {
      if (t.type !== 'credit_card' || t.cardId !== cardId) return false;
      const tDate = new Date(t.date + 'T12:00:00');
      const tDay = tDate.getDate();
      const card = cards.find(c => c.id === cardId);
      if (!card) return false;
      let billMonth = tDate.getMonth();
      let billYear = tDate.getFullYear();
      if (tDay > card.closingDay) {
        billMonth++;
        if (billMonth > 11) { billMonth = 0; billYear++; }
      }
      return billMonth === targetMonth && billYear === targetYear;
    });
    try {
      await Promise.all(affected.map(t => upsertTransaction(userId, { ...t, isPaid: newState })));
      setTransactions(prev => prev.map(t => affected.some(a => a.id === t.id) ? { ...t, isPaid: newState } : t));
    } catch { toast({ title: 'Erro ao atualizar', variant: 'destructive' }); }
  }, [userId, transactions, cards]);

  const addCard = useCallback(async (newCard: CreditCard) => {
    try {
      const created = await insertCard(userId, newCard);
      setCards(prev => [...prev, created]);
    } catch { toast({ title: 'Erro ao salvar cartão', variant: 'destructive' }); }
  }, [userId]);

  const updateCard = useCallback(async (updatedCard: CreditCard) => {
    try {
      await updateCardById(userId, updatedCard);
      setCards(prev => prev.map(c => c.id === updatedCard.id ? updatedCard : c));
    } catch { toast({ title: 'Erro ao atualizar cartão', variant: 'destructive' }); }
  }, [userId]);

  const deleteCard = useCallback(async (id: string) => {
    try {
      await deleteCardById(userId, id);
      setCards(prev => prev.filter(c => c.id !== id));
    } catch { toast({ title: 'Erro ao excluir cartão', variant: 'destructive' }); }
  }, [userId]);

  const addCategory = useCallback(async (name: string, color: string) => {
    try {
      const created = await insertCategory(userId, name, color);
      setCategories(prev => [...prev, created]);
    } catch { toast({ title: 'Erro ao salvar categoria', variant: 'destructive' }); }
  }, [userId]);

  const updateRecurring = useCallback(async (updated: RecurringExpense) => {
    const rec = { ...updated, value: Number(updated.value.toFixed(2)) };
    try {
      await updateRecurringById(userId, rec);
      setRecurring(prev => prev.map(r => r.id === rec.id ? rec : r));
      setEditingRec(null);
    } catch { toast({ title: 'Erro ao atualizar', variant: 'destructive' }); }
  }, [userId]);

  const deleteRecurring = useCallback(async (id: string) => {
    try {
      await deleteRecurringById(userId, id);
      setRecurring(prev => prev.filter(r => r.id !== id));
    } catch { toast({ title: 'Erro ao excluir', variant: 'destructive' }); }
  }, [userId]);

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Sair" onClick={() => onSignOut().catch(() => {})}><LogOut className="w-4 h-4" /></Button>
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

                <div className="pt-2 border-t">
                  <Button variant="outline" className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => onSignOut().catch(() => {})}>
                    <LogOut className="w-4 h-4 mr-2" /> Sair da conta
                  </Button>
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

