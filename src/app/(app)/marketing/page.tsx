import { redirect } from "next/navigation";
import { getContext, requireClinic } from "@/lib/context";
import { brl, periodStart } from "@/lib/format";
import { addAdSpend } from "@/lib/actions";
import PeriodSelect from "@/components/PeriodSelect";

type Row = { name: string; spend: number; leads: number; sched: number; closed: number; revenue: number };

export default async function MarketingPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const ctx = await getContext();
  if (!ctx.isAgency) redirect("/funil");
  const clinic = requireClinic(ctx);
  const since = periodStart(p).toISOString();

  const [{ data: spend }, { data: leads }] = await Promise.all([
    ctx.supabase.from("ad_spend").select("campaign, creative, spend").eq("clinic_id", clinic.id).gte("date", since.slice(0, 10)),
    ctx.supabase.from("leads").select("campaign, creative, source, scheduled_at, closed_at, closed_value").eq("clinic_id", clinic.id).gte("created_at", since),
  ]);

  const byCampaign = new Map<string, Row>();
  const get = (m: Map<string, Row>, k: string) => {
    if (!m.has(k)) m.set(k, { name: k, spend: 0, leads: 0, sched: 0, closed: 0, revenue: 0 });
    return m.get(k)!;
  };
  for (const s of spend ?? []) get(byCampaign, s.campaign || "Sem campanha").spend += Number(s.spend);
  const paid = (leads ?? []).filter((l) => l.campaign || l.source === "meta" || l.source === "google");
  for (const l of paid) {
    const r = get(byCampaign, l.campaign || "Sem campanha");
    r.leads++;
    if (l.scheduled_at) r.sched++;
    if (l.closed_at) { r.closed++; r.revenue += l.closed_value ?? 0; }
  }
  const campaigns = [...byCampaign.values()].sort((a, b) => b.revenue - a.revenue);

  const byCreative = new Map<string, Row>();
  for (const s of spend ?? []) if (s.creative) get(byCreative, s.creative).spend += Number(s.spend);
  for (const l of paid) if (l.creative) {
    const r = get(byCreative, l.creative);
    r.leads++;
    if (l.closed_at) { r.closed++; r.revenue += l.closed_value ?? 0; }
  }
  const creatives = [...byCreative.values()].sort((a, b) => b.closed - a.closed || b.revenue - a.revenue).slice(0, 8);

  const T = campaigns.reduce((t, r) => ({ spend: t.spend + r.spend, leads: t.leads + r.leads, sched: t.sched + r.sched, closed: t.closed + r.closed, revenue: t.revenue + r.revenue }), { spend: 0, leads: 0, sched: 0, closed: 0, revenue: 0 });
  const div = (a: number, b: number) => (b ? a / b : null);
  const roas = (r: { spend: number; revenue: number }) => (r.spend ? `${(r.revenue / r.spend).toFixed(1).replace(".", ",")}x` : "—");

  const kpis = [
    { label: "Investimento", value: brl(T.spend) },
    { label: "Custo por lead", value: brl(div(T.spend, T.leads)) },
    { label: "Custo por avaliação", value: brl(div(T.spend, T.sched)) },
    { label: "Custo por paciente", value: brl(div(T.spend, T.closed)) },
    { label: "ROAS real (CRM)", value: roas(T) },
  ];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="title">Marketing</h1>
            <span className="rounded-full bg-black px-2 py-1 text-xs text-white">Só agência</span>
          </div>
          <p className="text-sm text-neutral-600">{clinic.name} · do anúncio ao paciente fechado</p>
        </div>
        <PeriodSelect value={p ?? "month"} />
      </header>

      <section aria-label="Indicadores de mídia" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="card flex flex-col gap-1.5 p-4">
            <span className="text-[13px] text-neutral-600">{k.label}</span>
            <span className="text-2xl font-bold">{k.value}</span>
          </div>
        ))}
      </section>

      <section aria-labelledby="campanhas" className="card flex flex-col gap-3">
        <h2 id="campanhas" className="text-base font-semibold">Campanhas</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead><tr>
              <th className="th">Campanha</th><th className="th">Investimento</th><th className="th">Leads</th><th className="th">Custo por lead</th>
              <th className="th">Agendados</th><th className="th">Fechados</th><th className="th">Custo por paciente</th><th className="th">Faturamento</th><th className="th">ROAS</th>
            </tr></thead>
            <tbody>
              {campaigns.map((r) => (
                <tr key={r.name}>
                  <td className="td font-semibold">{r.name}</td><td className="td">{brl(r.spend)}</td><td className="td">{r.leads}</td>
                  <td className="td">{brl(div(r.spend, r.leads))}</td><td className="td">{r.sched}</td><td className="td">{r.closed}</td>
                  <td className="td">{brl(div(r.spend, r.closed))}</td><td className="td">{brl(r.revenue)}</td><td className="td font-bold">{roas(r)}</td>
                </tr>
              ))}
              {!campaigns.length && <tr><td className="td text-neutral-500" colSpan={9}>Lance o investimento abaixo e marque a campanha nos leads.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap gap-4">
        <section aria-labelledby="criativos" className="card flex flex-[3_1_420px] flex-col gap-3">
          <h2 id="criativos" className="text-base font-semibold">Criativos que mais geram pacientes</h2>
          {creatives.map((c, i) => (
            <div key={c.name} className="flex items-center gap-3.5 border-b border-neutral-100 pb-3">
              <span className="w-7 font-serif text-3xl">{i + 1}</span>
              <span className="min-w-0 flex-1 text-sm font-semibold">{c.name}</span>
              <div className="text-right">
                <p className="text-sm font-bold">{c.closed} pacientes</p>
                <p className="text-xs text-neutral-600">{brl(div(c.spend, c.closed))} por paciente</p>
              </div>
            </div>
          ))}
          {!creatives.length && <p className="text-sm text-neutral-500">Preencha o campo “Criativo” nos leads para ver o ranking.</p>}
        </section>

        <form action={addAdSpend} className="flex flex-[2_1_300px] flex-col gap-3 rounded-xl bg-black p-5 text-neutral-100">
          <h2 className="text-base font-semibold">Lançar investimento</h2>
          <div><label htmlFor="date" className="text-sm text-neutral-300">Data</label><input id="date" name="date" type="date" defaultValue={today} required className="input mt-1 text-black" /></div>
          <div><label htmlFor="campaign" className="text-sm text-neutral-300">Campanha</label><input id="campaign" name="campaign" required className="input mt-1 text-black" /></div>
          <div><label htmlFor="creative" className="text-sm text-neutral-300">Criativo (opcional)</label><input id="creative" name="creative" className="input mt-1 text-black" /></div>
          <div><label htmlFor="spend" className="text-sm text-neutral-300">Valor investido (R$)</label><input id="spend" name="spend" inputMode="decimal" required className="input mt-1 text-black" /></div>
          <button className="btn-ghost">Salvar</button>
          <p className="text-xs text-neutral-400">Fase 2: importação automática da Meta Ads.</p>
        </form>
      </div>
    </>
  );
}
