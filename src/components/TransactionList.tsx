
"use client"

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  CreditCard as CreditCardIcon, 
  PiggyBank, 
  Search, 
  Trash2, 
  Edit2,
  Filter,
  ListRestart,
  AlertCircle,
  Wallet,
  CalendarDays,
  XCircle,
  ReceiptText,
  History
} from 'lucide-react';
import { Transaction, Category, RecurringExpense, CreditCard } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface Props {
  transactions: Transaction[];
  recurring: RecurringExpense[];
  categories: Category[];
  cards: CreditCard[];
  onDelete: (id: string, deleteMode: 'single' | 'all') => void;
  onUpdate: (transaction: Transaction) => void;
  onDeleteByPeriod?: (month: string, year: string) => void;
}

export function TransactionList({ transactions, recurring, categories, cards, onDelete, onUpdate, onDeleteByPeriod }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [statementType, setStatementType] = useState<'cash' | 'credit'>('cash');
  const [cardFilter, setCardFilter] = useState<string>('all');

  const months = [
    { value: 'all', label: 'Todos os meses' },
    { value: '01', label: 'Janeiro' }, { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' }, { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' }, { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' }, { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' }, { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' }
  ];

  const cashStatement = useMemo(() => {
    // 1. Transações reais que não são de cartão de crédito individual
    const realTx = transactions.filter(tx => {
      if (tx.type === 'credit_card') return false;
      
      const txDate = new Date(tx.date + 'T12:00:00');
      const txMonth = (txDate.getMonth() + 1).toString().padStart(2, '0');
      const txYear = txDate.getFullYear().toString();
      const matchesMonth = monthFilter === 'all' || txMonth === monthFilter;
      const matchesYear = yearFilter === 'all' || txYear === yearFilter;
      return matchesMonth && matchesYear;
    });

    // 2. Contas fixas projetadas
    let virtualTx: Transaction[] = [];
    if (monthFilter !== 'all' && yearFilter !== 'all') {
      const targetMonth = parseInt(monthFilter) - 1;
      const targetYear = parseInt(yearFilter);
      
      recurring.forEach(rec => {
        if (rec.type === 'credit_card') return; // Recorrência de cartão não vai no caixa agora

        const dateStr = `${targetYear}-${monthFilter}-${String(rec.dayOfMonth).padStart(2, '0')}`;
        const targetDate = new Date(dateStr + 'T12:00:00');
        const startDate = new Date(rec.startDate + 'T12:00:00');

        if (targetDate >= startDate) {
          const alreadyLaunched = realTx.some(t => 
            t.description.includes(rec.description) && 
            Math.abs(t.value - rec.value) < 0.01 &&
            t.date === dateStr
          );

          if (!alreadyLaunched) {
            virtualTx.push({
              id: `v-${rec.id}-${targetMonth}-${targetYear}`,
              description: rec.description,
              value: rec.value,
              date: dateStr,
              category: rec.category,
              subcategory: rec.subcategory,
              type: rec.type,
              isVirtual: true,
              isRecurring: true
            });
          }
        }
      });

      // 3. Totais de Faturas de Cartão (Vencimentos)
      cards.forEach(card => {
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
          return tMonth === targetMonth && tYear === targetYear;
        });

        const total = billTransactions.reduce((acc, t) => acc + t.value, 0);
        if (total > 0) {
          const dateStr = `${targetYear}-${monthFilter}-${String(card.dueDay).padStart(2, '0')}`;
          virtualTx.push({
            id: `bill-summary-${card.id}-${targetMonth}-${targetYear}`,
            description: `Fatura: ${card.name}`,
            value: Number(total.toFixed(2)),
            date: dateStr,
            category: 'Cartão de Crédito',
            subcategory: 'Fatura',
            type: 'expense',
            isVirtual: true,
            isRecurring: false
          });
        }
      });
    }

    return [...realTx, ...virtualTx].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter(tx => tx.description.toLowerCase().includes(searchTerm.toLowerCase()) || tx.category.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [transactions, recurring, searchTerm, monthFilter, yearFilter, cards]);

  const creditStatement = useMemo(() => {
    return transactions.filter(tx => {
      if (tx.type !== 'credit_card') return false;
      
      const txDate = new Date(tx.date + 'T12:00:00');
      const txMonth = (txDate.getMonth() + 1).toString().padStart(2, '0');
      const txYear = txDate.getFullYear().toString();
      const matchesMonth = monthFilter === 'all' || txMonth === monthFilter;
      const matchesYear = yearFilter === 'all' || txYear === yearFilter;
      const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) || tx.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCard = cardFilter === 'all' || tx.cardId === cardFilter;
      return matchesMonth && matchesYear && matchesSearch && matchesCard;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, monthFilter, yearFilter, cardFilter]);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTransaction) {
      onUpdate(editingTransaction);
      setEditingTransaction(null);
    }
  };

  const handleDelete = (mode: 'single' | 'all') => {
    if (confirmDeleteId) {
      onDelete(confirmDeleteId, mode);
      setConfirmDeleteId(null);
    }
  };

  return (
    <Card className="border-none shadow-xl bg-white/60 backdrop-blur-md">
      <CardHeader>
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-primary flex items-center gap-2 text-xl font-headline">
              <History className="w-5 h-5" /> Extrato Rosa
            </CardTitle>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar..." 
                  className="pl-9 bg-white/50 rounded-xl" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-full sm:w-32 bg-white/50 rounded-xl">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-full sm:w-24 bg-white/50 rounded-xl">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {statementType === 'credit' && (
                <Select value={cardFilter} onValueChange={setCardFilter}>
                  <SelectTrigger className="w-full sm:w-36 bg-white/50 rounded-xl">
                    <SelectValue placeholder="Cartão" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {cards.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {monthFilter !== 'all' && yearFilter !== 'all' && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10"
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  title="Limpar período"
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          
          <Tabs value={statementType} onValueChange={(v) => setStatementType(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-primary/5 p-1 rounded-xl">
              <TabsTrigger value="cash" className="rounded-lg gap-2">
                <Wallet className="w-4 h-4" /> Fluxo de Caixa
              </TabsTrigger>
              <TabsTrigger value="credit" className="rounded-lg gap-2">
                <CreditCardIcon className="w-4 h-4" /> Lançamentos Cartão
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {statementType === 'cash' ? (
            cashStatement.length > 0 ? cashStatement.map((tx) => (
              <div key={tx.id} className={`flex items-center justify-between p-4 rounded-2xl bg-white/40 hover:bg-white/80 transition-all border border-transparent hover:border-primary/10 group relative ${tx.isVirtual ? 'opacity-60 border-dashed border-primary/20 bg-primary/[0.02]' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                    tx.type === 'income' || tx.type === 'savings_withdrawal' ? 'bg-green-100 text-green-600' : 
                    tx.category === 'Cartão de Crédito' ? 'bg-accent/10 text-accent' : 
                    tx.type === 'savings' ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'
                  }`}>
                    {tx.type === 'income' ? <ArrowUpCircle className="w-6 h-6" /> : 
                     tx.type === 'savings_withdrawal' ? <Wallet className="w-6 h-6" /> :
                     tx.category === 'Cartão de Crédito' ? <ReceiptText className="w-6 h-6" /> : 
                     tx.type === 'savings' ? <PiggyBank className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 flex items-center gap-2">
                      {tx.description}
                      {tx.isRecurring && (
                        <span title="Item Recorrente" className="text-primary opacity-50"><ListRestart className="w-3 h-3" /></span>
                      )}
                      {tx.isVirtual && (
                        <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest flex items-center gap-1">
                          <CalendarDays className="w-2 h-2" /> {tx.category === 'Cartão de Crédito' ? 'Vencimento' : 'Agendado'}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase">{tx.category}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">{tx.date}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className={`text-lg font-bold ${tx.type === 'income' || tx.type === 'savings_withdrawal' ? 'text-green-600' : tx.type === 'savings' || tx.category === 'Cartão de Crédito' ? 'text-primary' : 'text-gray-900'}`}>
                      {tx.type === 'income' || tx.type === 'savings_withdrawal' ? '+' : '-'} R$ {tx.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  {!tx.isVirtual && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-9 w-9 text-primary hover:bg-primary/10 rounded-xl"
                        onClick={() => setEditingTransaction(tx)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl"
                        onClick={() => setConfirmDeleteId(tx.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )) : (
              <div className="text-center py-20 bg-white/20 rounded-3xl border border-dashed">
                 <p className="text-muted-foreground italic">Nenhum lançamento no fluxo de caixa para este período</p>
              </div>
            )
          ) : (
            creditStatement.length > 0 ? creditStatement.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/40 hover:bg-white/80 transition-all border border-transparent hover:border-primary/10 group relative">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-accent/10 text-accent transition-transform group-hover:scale-110">
                    <CreditCardIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 flex items-center gap-2">
                      {tx.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-bold uppercase">{tx.category}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">{tx.date}</span>
                      {tx.installments && tx.installments > 1 && (
                        <span className="text-[9px] text-accent font-bold uppercase border border-accent/20 px-1.5 rounded">
                          {tx.currentInstallment}/{tx.installments}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      R$ {tx.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">
                      {cards.find(c => c.id === tx.cardId)?.name || 'Cartão'}
                    </p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-9 w-9 text-primary hover:bg-primary/10 rounded-xl"
                      onClick={() => setEditingTransaction(tx)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl"
                      onClick={() => setConfirmDeleteId(tx.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-20 bg-white/20 rounded-3xl border border-dashed">
                 <p className="text-muted-foreground italic">Nenhum lançamento individual de cartão neste período</p>
              </div>
            )
          )}
        </div>
      </CardContent>

      {/* Confirmation Dialog Bulk Delete */}
      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent className="sm:max-w-[450px] bg-white rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Limpeza de Período
            </DialogTitle>
            <DialogDescription className="py-2">
              Você tem certeza que deseja excluir TODOS os lançamentos reais de **{monthFilter}/{yearFilter}**? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="ghost" onClick={() => setShowBulkDeleteConfirm(false)} className="rounded-xl flex-1">Cancelar</Button>
            <Button variant="destructive" onClick={() => {
              onDeleteByPeriod?.(monthFilter, yearFilter);
              setShowBulkDeleteConfirm(false);
            }} className="rounded-xl flex-1">Excluir Tudo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="sm:max-w-[450px] bg-white rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Opções de Exclusão
            </DialogTitle>
            <DialogDescription className="py-2">
              Este lançamento pode fazer parte de um parcelamento ou ser uma conta fixa. Como deseja prosseguir?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 py-4">
             <Button variant="outline" onClick={() => handleDelete('single')} className="rounded-xl justify-start text-left h-auto p-4 flex flex-col items-start gap-1">
                <span className="font-bold">Excluir apenas este lançamento</span>
                <span className="text-xs opacity-60">Mantém as parcelas futuras e a regra de recorrência.</span>
             </Button>
             <Button variant="destructive" onClick={() => handleDelete('all')} className="rounded-xl justify-start text-left h-auto p-4 flex flex-col items-start gap-1">
                <span className="font-bold">Excluir tudo (Geral)</span>
                <span className="text-xs opacity-80">Remove este lançamento, todas as parcelas futuras e a regra mensal.</span>
             </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDeleteId(null)} className="rounded-xl w-full">Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
        <DialogContent className="sm:max-w-[425px] bg-white/95 backdrop-blur-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-primary font-headline">Editar Lançamento</DialogTitle>
          </DialogHeader>
          {editingTransaction && (
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input 
                  value={editingTransaction.description} 
                  className="rounded-xl"
                  onChange={(e) => setEditingTransaction({...editingTransaction, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    className="rounded-xl"
                    value={editingTransaction.value} 
                    onChange={(e) => setEditingTransaction({...editingTransaction, value: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input 
                    type="date"
                    className="rounded-xl"
                    value={editingTransaction.date} 
                    onChange={(e) => setEditingTransaction({...editingTransaction, date: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select 
                  value={editingTransaction.category} 
                  onValueChange={(val) => setEditingTransaction({...editingTransaction, category: val})}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-12">Salvar Alterações</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
