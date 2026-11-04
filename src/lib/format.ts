export const brl = (v: number | null | undefined) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const pct = (num: number, den: number) => (den ? `${Math.round((num / den) * 100)}%` : "—");

export function duration(seconds: number | null | undefined) {
  if (seconds == null || isNaN(seconds)) return "—";
  const s = Math.round(seconds);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${s % 60} s`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}

export const dateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

export const sourceLabel: Record<string, string> = {
  meta: "Anúncio Meta",
  organic: "Orgânico",
  referral: "Indicação",
  google: "Google",
  other: "Outro",
};

export function monthStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function periodStart(p: string | undefined) {
  const now = new Date();
  if (p === "7") return new Date(now.getTime() - 7 * 864e5);
  if (p === "90") return new Date(now.getTime() - 90 * 864e5);
  return monthStart(now);
}
