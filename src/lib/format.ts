// O servidor roda em UTC; tudo que o usuário vê ou digita é horário de Brasília (UTC-3, sem horário de verão).
export const TZ = "America/Sao_Paulo";
const SP_OFFSET_MS = 3 * 3600e3;

export const brl = (v: number | null | undefined) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const pct = (num: number, den: number) => (den ? `${Math.round((num / den) * 100)}%` : "—");

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

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
  iso
    ? new Date(iso).toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "—";

// "2026-11-05T10:00" digitado em Brasília -> ISO em UTC
export function fromLocalInput(v: string | null) {
  if (!v) return null;
  return new Date(`${v}:00-03:00`).toISOString();
}

// ISO em UTC -> "2026-11-05T10:00" em Brasília (para inputs datetime-local)
export function toLocalInput(iso: string | null) {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() - SP_OFFSET_MS).toISOString().slice(0, 16);
}

// Converte texto digitado em número: aceita "2.400,50", "2400,50", "2400.50", "60.000" e "2400.5"
export function parseMoney(raw: string | null | undefined) {
  let s = String(raw ?? "").trim().replace(/[^\d.,-]/g, "");
  if (s === "") return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return isNaN(n) ? null : n;
}

export const sourceLabel: Record<string, string> = {
  meta: "Anúncio Meta",
  organic: "Orgânico",
  referral: "Indicação",
  google: "Google",
  other: "Outro",
};

export function eventText(description: string | null) {
  if (!description) return "";
  return description.replace(/\((meta|organic|referral|google|other)\)/, (_, k) => `(${sourceLabel[k]})`);
}

// Início do dia / mês em Brasília, devolvido como Date (UTC)
export function dayStart(d = new Date()) {
  const sp = new Date(d.getTime() - SP_OFFSET_MS);
  sp.setUTCHours(0, 0, 0, 0);
  return new Date(sp.getTime() + SP_OFFSET_MS);
}

export function monthStart(d = new Date()) {
  const sp = new Date(d.getTime() - SP_OFFSET_MS);
  const m = new Date(Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth(), 1));
  return new Date(m.getTime() + SP_OFFSET_MS);
}

// "2026-11-01" do mês corrente em Brasília
export function monthKey(d = new Date()) {
  const sp = new Date(d.getTime() - SP_OFFSET_MS);
  return `${sp.getUTCFullYear()}-${String(sp.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function periodStart(p: string | undefined) {
  const now = new Date();
  if (p === "7") return new Date(now.getTime() - 7 * 864e5);
  if (p === "90") return new Date(now.getTime() - 90 * 864e5);
  return monthStart(now);
}
