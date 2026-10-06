export const demoSummary = [
  {
    label: 'Saldo total',
    value: 'R$ 18.420,80',
    comparison: '+4,8% este mês',
    tone: 'positive' as const,
    icon: 'wallet',
  },
  {
    label: 'Receitas',
    value: 'R$ 9.850,00',
    comparison: '+2,1% vs. mês anterior',
    tone: 'positive' as const,
    icon: 'income',
  },
  {
    label: 'Despesas',
    value: 'R$ 4.286,40',
    comparison: '8,4% menor que antes',
    tone: 'positive' as const,
    icon: 'expense',
  },
  {
    label: 'Economia do mês',
    value: 'R$ 5.563,60',
    comparison: '56,5% da receita',
    tone: 'positive' as const,
    icon: 'savings',
  },
];
export const demoTrend = [
  { label: 'Mai', value: 38 },
  { label: 'Jun', value: 46 },
  { label: 'Jul', value: 43 },
  { label: 'Ago', value: 58 },
  { label: 'Set', value: 64 },
  { label: 'Out', value: 73 },
];
export const demoCategories = [
  { name: 'Moradia', value: 'R$ 1.420,00', percent: 72 },
  { name: 'Alimentação', value: 'R$ 860,40', percent: 54 },
  { name: 'Transporte', value: 'R$ 480,00', percent: 38 },
  { name: 'Lazer', value: 'R$ 326,00', percent: 26 },
];
export const demoTransactions = [
  {
    name: 'Mercado Aurora',
    category: 'Alimentação · hoje',
    amount: '- R$ 182,40',
    icon: 'shopping',
  },
  {
    name: 'Salário mensal',
    category: 'Receita · 05 out',
    amount: '+ R$ 9.850,00',
    icon: 'briefcase',
    positive: true,
  },
  { name: 'Café & Co.', category: 'Alimentação · 04 out', amount: '- R$ 24,90', icon: 'coffee' },
  { name: 'Posto Central', category: 'Transporte · 03 out', amount: '- R$ 210,00', icon: 'car' },
];
export const demoBills = [
  { name: 'Aluguel', date: '10 out', amount: 'R$ 1.200,00', status: 'Em 5 dias' },
  { name: 'Internet residencial', date: '12 out', amount: 'R$ 119,90', status: 'Em 7 dias' },
  { name: 'Streaming e apps', date: '15 out', amount: 'R$ 84,90', status: 'Em 10 dias' },
];
