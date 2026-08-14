// Mirrors admin-app/src/types/index.ts formatAmount exactly — amounts are
// always integers in the smallest currency unit, never render one raw.
export function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount / 100);
  } catch {
    return `${currency} ${(amount / 100).toFixed(2)}`;
  }
}
