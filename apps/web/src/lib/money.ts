export function formatMoney(value: string): string {
  const normalized = value.trim().replace(',', '.');
  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole = '0', fraction = ''] = unsigned.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}R$ ${grouped},${fraction.padEnd(2, '0')}`;
}
