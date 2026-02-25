"use client"

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard as CardIcon, Plus, Trash2, Edit2, Settings2, X, Check } from 'lucide-react';
import { CreditCard } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Props {
  cards: CreditCard[];
  onAdd: (card: CreditCard) => void;
  onUpdate: (card: CreditCard) => void;
  onDelete: (id: string) => void;
}

export function CreditCardManager({ cards, onAdd, onUpdate, onDelete }: Props) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [formData, setFormData] = useState<Partial<CreditCard>>({
    name: '',
    limit: 0,
    closingDay: 1,
    dueDay: 10,
    color: '#E87DC0'
  });

  const handleOpenAdd = () => {
    setEditingCard(null);
    setFormData({ name: '', limit: 0, closingDay: 1, dueDay: 10, color: '#E87DC0' });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (card: CreditCard) => {
    setEditingCard(card);
    setFormData(card);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.limit) {
      toast({ title: "Erro", description: "Preencha o nome e o limite do cartão.", variant: "destructive" });
      return;
    }

    if (editingCard) {
      onUpdate({ ...editingCard, ...formData } as CreditCard);
    } else {
      onAdd({ ...formData, id: Math.random().toString(36).substr(2, 9) } as CreditCard);
    }
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
          <Settings2 className="w-6 h-6" /> Meus Cartões
        </h2>
        <Button onClick={handleOpenAdd} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Novo Cartão
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map(card => (
          <Card key={card.id} className="border-none shadow-xl bg-white/60 backdrop-blur-md overflow-hidden group">
            <div className="h-2 w-full" style={{ backgroundColor: card.color }} />
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: card.color }}>
                    <CardIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{card.name}</CardTitle>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Limite: R$ {card.limit.toLocaleString('pt-BR')}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => handleOpenEdit(card)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(card.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="bg-white/40 p-2 rounded-lg text-center">
                  <p className="text-[9px] uppercase font-bold text-muted-foreground">Fechamento</p>
                  <p className="font-bold text-primary">Dia {card.closingDay}</p>
                </div>
                <div className="bg-white/40 p-2 rounded-lg text-center">
                  <p className="text-[9px] uppercase font-bold text-muted-foreground">Vencimento</p>
                  <p className="font-bold text-accent">Dia {card.dueDay}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {cards.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white/20 rounded-3xl border border-dashed">
            <p className="text-muted-foreground">Nenhum cartão cadastrado ainda.</p>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-md rounded-3xl sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-primary font-headline">
              {editingCard ? 'Editar Cartão' : 'Novo Cartão'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nome do Cartão</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Nubank, Visa Rosa..."
                className="rounded-xl h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>Limite Total (R$)</Label>
              <Input 
                type="number" 
                value={formData.limit} 
                onChange={e => setFormData({ ...formData, limit: parseFloat(e.target.value) })}
                className="rounded-xl h-12"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dia de Fechamento</Label>
                <Input 
                  type="number" 
                  min="1" 
                  max="31"
                  value={formData.closingDay} 
                  onChange={e => setFormData({ ...formData, closingDay: parseInt(e.target.value) })}
                  className="rounded-xl h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Dia de Vencimento</Label>
                <Input 
                  type="number" 
                  min="1" 
                  max="31"
                  value={formData.dueDay} 
                  onChange={e => setFormData({ ...formData, dueDay: parseInt(e.target.value) })}
                  className="rounded-xl h-12"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cor de Identificação</Label>
              <div className="flex gap-2">
                {['#E87DC0', '#E052E0', '#FFB7D5', '#D462AD', '#B042B0', '#300070', '#FF7EB9'].map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${formData.color === c ? 'scale-125 border-primary shadow-lg' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setFormData({ ...formData, color: c })}
                  />
                ))}
              </div>
            </div>
            <DialogFooter className="pt-6">
              <Button type="submit" className="w-full h-12 rounded-xl text-white font-bold bg-primary hover:bg-primary/90 shadow-lg">
                {editingCard ? 'Salvar Alterações' : 'Criar Cartão'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
