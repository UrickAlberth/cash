
"use client"

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TransactionType, Category, CreditCard } from '@/lib/types';
import { intelligentTransactionCategorization } from '@/ai/flows/intelligent-transaction-categorization';
import { Sparkles, Plus, CreditCard as CardIcon, ArrowUpCircle, ArrowDownCircle, PiggyBank, ListRestart, Wallet, PlusCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Props {
  categories: Category[];
  cards: CreditCard[];
  onAdd: (transaction: any) => void;
  onAddCategory: (name: string, color: string) => void;
}

export function TransactionForm({ categories, cards, onAdd, onAddCategory }: Props) {
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [installments, setInstallments] = useState('1');
  const [cardId, setCardId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);

  // Modal para nova categoria
  const [isNewCatOpen, setIsNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#E87DC0');

  const handleCategorize = async () => {
    if (!description) {
      toast({ title: "Descrição vazia", description: "Digite uma descrição para a IA." });
      return;
    }
    setIsCategorizing(true);
    try {
      const result = await intelligentTransactionCategorization({
        transactionDescription: description,
        availableCategories: categories.map(c => c.name),
      });
      setCategory(result.suggestedCategory);
      setSubcategory(result.suggestedSubcategory);
      toast({ title: "Sugerido!", description: result.suggestedCategory });
    } catch (error) {
      toast({ title: "Erro na IA", description: "Tente novamente." });
    } finally {
      setIsCategorizing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !value || !category) {
      toast({ title: "Campos obrigatórios", description: "Preencha o formulário." });
      return;
    }

    if (type === 'credit_card' && !cardId) {
      toast({ title: "Selecione o Cartão", description: "Escolha um cartão para esta compra." });
      return;
    }
    
    onAdd({
      description,
      value: parseFloat(value),
      date,
      type,
      category,
      subcategory,
      isRecurring,
      cardId: type === 'credit_card' ? cardId : undefined,
      installments: type === 'credit_card' ? parseInt(installments) : 1
    });
    
    toast({ title: "Sucesso!", description: "Lançamento realizado." });
    setDescription('');
    setValue('');
    setCategory('');
    setSubcategory('');
    setIsRecurring(false);
  };

  const handleAddCategory = () => {
    if (!newCatName) return;
    onAddCategory(newCatName, newCatColor);
    setCategory(newCatName);
    setIsNewCatOpen(false);
    setNewCatName('');
  };

  return (
    <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 font-headline text-primary">
          <Plus className="w-5 h-5" /> Novo Lançamento
        </CardTitle>
        <div className="flex items-center space-x-2 bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10">
          <Label htmlFor="recurring" className="text-[10px] font-bold text-primary uppercase">Conta Fixa?</Label>
          <Switch id="recurring" checked={isRecurring} onCheckedChange={setIsRecurring} disabled={type === 'credit_card'} />
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <Button type="button" variant={type === 'income' ? 'default' : 'outline'} className="rounded-2xl h-12 text-xs" onClick={() => setType('income')}><ArrowUpCircle className="w-3 h-3 mr-1" /> Entrada</Button>
            <Button type="button" variant={type === 'expense' ? 'default' : 'outline'} className="rounded-2xl h-12 text-xs" onClick={() => setType('expense')}><ArrowDownCircle className="w-3 h-3 mr-1" /> Saída</Button>
            <Button type="button" variant={type === 'credit_card' ? 'default' : 'outline'} className="rounded-2xl h-12 text-xs" onClick={() => setType('credit_card')}><CardIcon className="w-3 h-3 mr-1" /> Cartão</Button>
            <Button type="button" variant={type === 'savings' ? 'default' : 'outline'} className="rounded-2xl h-12 text-xs" onClick={() => setType('savings')}><PiggyBank className="w-3 h-3 mr-1" /> Guardar</Button>
            <Button type="button" variant={type === 'savings_withdrawal' ? 'default' : 'outline'} className="rounded-2xl h-12 text-xs" onClick={() => setType('savings_withdrawal')}><Wallet className="w-3 h-3 mr-1" /> Resgatar</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl h-12" />
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0,00" className="rounded-xl h-12" />
            </div>
            {type === 'credit_card' && (
              <div className="space-y-2">
                <Label>Qual Cartão?</Label>
                <Select value={cardId} onValueChange={setCardId}>
                  <SelectTrigger className="rounded-xl h-12">
                    <SelectValue placeholder="Escolha" />
                  </SelectTrigger>
                  <SelectContent>
                    {cards.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <div className="relative">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que foi?" className="pr-12 h-12 rounded-xl" />
              <Button type="button" size="icon" variant="ghost" className="absolute right-1 top-1 text-primary" onClick={handleCategorize} disabled={isCategorizing}>
                <Sparkles className={`w-5 h-5 ${isCategorizing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex justify-between">
                Categoria 
                <button type="button" onClick={() => setIsNewCatOpen(true)} className="text-primary text-[10px] uppercase font-bold hover:underline flex items-center gap-1">
                  <PlusCircle className="w-3 h-3" /> Nova
                </button>
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {type === 'credit_card' && (
               <div className="space-y-2">
                <Label>Parcelas</Label>
                <Select value={installments} onValueChange={setInstallments}>
                  <SelectTrigger className="rounded-xl h-12">
                    <SelectValue placeholder="1x" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,10,12].map(n => <SelectItem key={n} value={n.toString()}>{n}x</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-14 rounded-2xl shadow-lg">
            Salvar Lançamento
          </Button>
        </form>
      </CardContent>

      <Dialog open={isNewCatOpen} onOpenChange={setIsNewCatOpen}>
        <DialogContent className="bg-white rounded-3xl sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-primary">Nova Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Ex: Assinaturas, Beleza..." className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2">
                {['#E87DC0', '#E052E0', '#FFB7D5', '#D462AD', '#B042B0', '#300070', '#FF7EB9', '#4287f5', '#42f59e'].map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${newCatColor === c ? 'scale-125 border-primary' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setNewCatColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="pt-6">
            <Button onClick={handleAddCategory} className="w-full rounded-xl">Criar Categoria</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
