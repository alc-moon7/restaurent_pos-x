export function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function padEnd(str: string, width: number) {
  const s = str ?? "";
  if (s.length === width) return s;
  if (s.length > width) return s.slice(0, Math.max(0, width));
  return s + " ".repeat(width - s.length);
}

export function padStart(str: string, width: number) {
  const s = str ?? "";
  if (s.length === width) return s;
  if (s.length > width) return s.slice(Math.max(0, s.length - width));
  return " ".repeat(width - s.length) + s;
}

