import { format, parseISO, formatDistanceToNow } from "date-fns";

export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatKWh(value: number): string {
  if (value >= 1000) return `${formatNumber(value / 1000, 2)} MWh`;
  return `${formatNumber(value, 2)} kWh`;
}

export function formatPower(value: number): string {
  if (value >= 1000) return `${formatNumber(value / 1000, 2)} MW`;
  return `${formatNumber(value, 2)} kW`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${formatNumber(value, decimals)}%`;
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd MMM yyyy");
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd MMM yyyy, HH:mm");
  } catch {
    return dateStr;
  }
}

export function formatRelative(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}
