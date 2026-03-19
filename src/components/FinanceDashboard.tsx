
"use client"

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Transaction, SummaryData, Category } from '@/lib/types';
import { ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp } from 'lucide-react';

const FALLBACK_COLORS = ['#E87DC0', '#E052E0', '#FFB7D5', '#D462AD', '#B042B0', '#FF7EB9'];

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface Props {
  transactions: Transaction[];
  summary: SummaryData;
  categories?: Category[];
}

export function FinanceDashboard({ transactions, summary, categories = [] }: Props) {
  const now = new Date();
  const [monthFilter, setMonthFilter] = useState<string>(String(now.getMonth() + 1));
  const [yearFilter, setYearFilter] = useState<string>(String(now.getFullYear()));

  // Build list of available years from transactions
  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(t => t.date.split('-')[0]));
    years.add(String(now.getFullYear()));
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [transactions]);

  // Filter transactions by selected month/year
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const [txYear, txMonth] = t.date.split('-');
      const matchesMonth = monthFilter === 'all' || txMonth === monthFilter.padStart(2, '0');
      const matchesYear = yearFilter === 'all' || txYear === yearFilter;
      return matchesMonth && matchesYear;
    });
  }, [transactions, monthFilter, yearFilter]);

  // Build category color map
  const categoryColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach(c => { map[c.name] = c.color; });
    return map;
  }, [categories]);

  // Process data for pie chart (expenses by category)
  const categoryDataMap = filteredTransactions
    .filter(t => t.type !== 'income')
    .reduce((acc: Record<string, number>, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.value;
      return acc;
    }, {});

  const categoryChartData = Object.entries(categoryDataMap).map(([name, value]) => ({ name, value }));

  const getCategoryColor = (name: string) =>
    categoryColorMap[name] ?? hashColor(name);

  // Filtered summary values
  const filteredIncome = filteredTransactions.filter(t => t.type === 'income' || t.type === 'savings_withdrawal').reduce((s, t) => s + t.value, 0);
  const filteredExpense = filteredTransactions.filter(t => t.type === 'expense' || (t.type === 'credit_card' && t.isPaid)).reduce((s, t) => s + t.value, 0);
  const filteredProfit = filteredIncome - filteredExpense;

  const filterLabel = monthFilter === 'all'
    ? (yearFilter === 'all' ? 'Todos os períodos' : yearFilter)
    : `${MONTH_NAMES[Number(monthFilter) - 1]} ${yearFilter === 'all' ? '' : yearFilter}`.trim();

  return (
    <div className="space-y-6">
      {/* Month/Year filter */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-36 rounded-xl bg-white/70 border-white/50 shadow-sm">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {MONTH_NAMES.map((name, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-28 rounded-xl bg-white/70 border-white/50 shadow-sm">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {availableYears.map(y => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground italic">{filterLabel}</span>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/80 border-none shadow-md overflow-hidden group">
          <div className="h-1 bg-green-400" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Entradas</p>
                <h3 className="text-2xl font-bold text-green-600">R$ {(monthFilter === 'all' && yearFilter === 'all' ? summary.totalIncome : filteredIncome).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
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
                <h3 className="text-2xl font-bold text-primary">R$ {(monthFilter === 'all' && yearFilter === 'all' ? summary.totalExpense : filteredExpense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
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
                <h3 className="text-2xl font-bold text-accent">R$ {(monthFilter === 'all' && yearFilter === 'all' ? summary.netProfit : filteredProfit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
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
                    <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
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
            {(() => {
              const barData = filteredTransactions.filter(t => t.type !== 'income').slice(0, 10).reverse();
              return (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip 
                      formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={`bar-cell-${index}`} fill={getCategoryColor(entry.category)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
