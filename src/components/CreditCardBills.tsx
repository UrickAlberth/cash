
"use client"

import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CreditCard, Transaction } from '@/lib/types';
import { 
  CreditCard as CardIcon, 
  ReceiptText,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  cards: CreditCard[];
  transactions: Transaction[];
}

export function CreditCardBills({ cards, transactions }: Props) {
  const [selectedBill, setSelectedBill] = useState<any | null>(null);

  const billsData = useMemo(() => {
    const now = new Date();
    const results: any = {};

    cards.forEach(card => {
      results[card.id] = [];
      
      for (let i = 0; i < 6; i++) {
        const billDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const month = billDate.getMonth();
        const year = billDate.getFullYear();
        
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
            if (targetMonth > 11) {
              targetMonth = 0;
              targetYear++;
            }
          }

          return targetMonth === month && targetYear === year;
        });

        const total = billTransactions.reduce((acc, t) => acc + t.value, 0);

        results[card.id].push({
          cardName: card.name,
          month,
          year,
          total,
          transactions: billTransactions,
          dueDay: card.dueDay,
          closingDay: card.closingDay
        });
      }
    });

    return results;
  }, [cards, transactions]);

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <div className="space-y-6">
      {cards.map(card => (
        <Card key={card.id} className="border-none shadow-xl bg-white/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: card.color }}>
                <CardIcon className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">{card.name}</CardTitle>
                <p className="text-xs text-muted-foreground">Fecha dia {card.closingDay} • Vence dia {card.dueDay}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Limite Total</p>
              <p className="font-bold text-primary">R$ {card.limit.toLocaleString('pt-BR')}</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {billsData[card.id].map((bill: any, idx: number) => (
                <div key={idx} className={`p-4 rounded-2xl border transition-all ${idx === 0 ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10' : 'bg-white/40 border-primary/5'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-sm">{monthNames[bill.month]} {bill.year}</h4>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Vencimento: {bill.dueDay}/{bill.month + 1}</p>
                    </div>
                    {idx === 0 && <span className="text-[9px] bg-primary text-white px-2 py-0.5 rounded-full font-bold uppercase">Atual</span>}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Valor da Fatura</p>
                      <p className="font-bold text-lg text-primary">R$ {bill.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <Progress value={(bill.total / card.limit) * 100} className="h-1.5" />
                    <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase">
                      <span>{((bill.total / card.limit) * 100).toFixed(1)}% usado</span>
                      <span>Disponível: R$ {(card.limit - bill.total).toFixed(0)}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-primary/5">
                    <button 
                      className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline w-full justify-between"
                      onClick={() => setSelectedBill(bill)}
                    >
                      <span className="flex items-center gap-1"><ReceiptText className="w-3 h-3" /> Ver {bill.transactions.length} lançamentos</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      
      {cards.length === 0 && (
        <div className="text-center py-20 bg-white/20 rounded-3xl border border-dashed border-primary/20">
          <AlertCircle className="w-10 h-10 text-primary/30 mx-auto mb-3" />
          <p className="text-muted-foreground italic">Nenhum cartão cadastrado. Adicione um para gerenciar faturas.</p>
        </div>
      )}

      <Dialog open={!!selectedBill} onOpenChange={() => setSelectedBill(null)}>
        <DialogContent className="bg-white/95 rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle>Lançamentos: {selectedBill?.cardName} ({monthNames[selectedBill?.month]} {selectedBill?.year})</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4 max-h-[400px] overflow-auto pr-2">
            {selectedBill?.transactions.length > 0 ? selectedBill.transactions.map((tx: Transaction) => (
              <div key={tx.id} className="flex justify-between items-center p-3 rounded-xl bg-white border border-primary/5">
                <div>
                  <p className="text-sm font-bold">{tx.description}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">{tx.date} • {tx.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">R$ {tx.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  {tx.installments && tx.installments > 1 && (
                    <p className="text-[9px] text-accent uppercase font-bold">{tx.currentInstallment}/{tx.installments}</p>
                  )}
                </div>
              </div>
            )) : (
              <p className="text-center py-8 text-muted-foreground italic text-sm">Nenhum lançamento nesta fatura.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
