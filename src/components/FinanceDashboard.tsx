
"use client"

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Transaction, SummaryData } from '@/lib/types';
import { ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  summary: SummaryData;
}

export function FinanceDashboard({ transactions, summary }: Props) {
  // Process data for charts
  const categoryDataMap = transactions
    .filter(t => t.type !== 'income')
    .reduce((acc: Record<string, number>, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.value;
      return acc;
    }, {});

  const categoryChartData = Object.entries(categoryDataMap).map(([name, value]) => ({ name, value }));
  
  const COLORS = ['#E87DC0', '#E052E0', '#FFB7D5', '#D462AD', '#B042B0', '#FF7EB9'];

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/80 border-none shadow-md overflow-hidden group">
          <div className="h-1 bg-green-400" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Entradas</p>
                <h3 className="text-2xl font-bold text-green-600">R$ {summary.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>
              <ArrowUpCircle className="w-10 h-10 text-green-200 group-hover:text-green-400 transition-colors" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 border-none shadow-md overflow-hidden group">
          <div className="h-1 bg-primary" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Saídas Totais</p>
                <h3 className="text-2xl font-bold text-primary">R$ {summary.totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>
              <ArrowDownCircle className="w-10 h-10 text-pink-200 group-hover:text-primary transition-colors" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 border-none shadow-md overflow-hidden group">
          <div className="h-1 bg-accent" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Lucro / Saldo</p>
                <h3 className="text-2xl font-bold text-accent">R$ {summary.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-200 group-hover:text-accent transition-colors" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/10 border-none shadow-md overflow-hidden group">
          <div className="h-1 bg-white" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary uppercase tracking-wider">Investimento</p>
                <h3 className="text-2xl font-bold text-primary-foreground text-primary">Previsão Ativa</h3>
              </div>
              <Wallet className="w-10 h-10 text-primary/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-xl bg-white/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="font-headline text-primary">Distribuição por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="font-headline text-primary">Gastos Recentes</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={transactions.slice(0, 10).reverse()}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" fill="#E87DC0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
