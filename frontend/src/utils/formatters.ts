export function formatQuantity(num: number): string {
  if (typeof num !== 'number' || isNaN(num)) return '0';
  if (num < 1000) return num.toString();
  if (num < 1_000_000) {
    const val = num / 1000;
    return val % 1 === 0 ? `${val}k` : `${val.toFixed(1).replace('.0', '')}k`;
  }
  if (num < 1_000_000_000) {
    const val = num / 1_000_000;
    return val % 1 === 0 ? `${val}M` : `${val.toFixed(1).replace('.0', '')}M`;
  }
  const val = num / 1_000_000_000;
  return val % 1 === 0 ? `${val}B` : `${val.toFixed(1).replace('.0', '')}B`;
}