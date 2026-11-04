import { redirect } from "next/navigation";
import { getContext, requireClinic } from "@/lib/context";
import { brl, duration, monthStart, pct, periodStart, sourceLabel } from "@/lib/format";
import { saveMonthlyRevenue } from "@/lib/actions";
import PeriodSelect from "@/components/PeriodSelect";

export default async function PainelPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const ctx = await getContext();
  if (!ctx.canFinance) redirect("/funil");
  const clinic = requireClinic(ctx);
  const since = periodStart(p).toISOString();
  const month = monthStart();
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-01`;

  const [{ data: leads }, { data: spend }, { data: rev }] = await Promise.all([
    ctx.supabase.from("leads").select("source, created_at, scheduled_at, closed_at, closed_value, first_response_seconds, stage:pipeline_stages(name, position)").eq("clinic_id", clinic.id).gte("created_at", since),
    ctx.supabase.from("ad_spend").select("spend").eq("clinic_id", clinic.id).gte("date", since.slice(0, 10)),
    ctx.supabase.from("clinic_monthly_revenue").select("revenue").eq("clinic_id", clinic.id).eq("month", monthKey).maybeSingle(),
  ]);

  const L = leads ?? [];
  const scheduled = L.filter((l) => l.scheduled_at).length;
  const attended = L.filter((l) => ((l.stage as unknown as { position: number } | null)?.position ?? 0) >= 4 || l.closed_at).length;
  const closed = L.filter((l) => l.closed_at);
  const revenue = closed.reduce((s, l) => s + (l.closed_value ?? 0), 0);
  const invest = (spend ?? []).reduce((s, r) => s + Number(r.spend), 0);
  const resp = L.map((l) => l.first_response_seconds).filter((v): v is number => v != null);

  const kpis = [
    { label: "Leads", value: String(L.length), note: "no período" },
    { label: "Tempo médio de resposta", value: duration(resp.length ? resp.reduce((a, b) => a + b, 0) / resp.length : null), note: "meta: menos de 5 min" },
    { label: "Taxa de agendamento", value: pct(scheduled, L.length), note: `${scheduled} avaliações` },
    { label: "Comparecimento", value: pct(attended, scheduled), note: `${attended} de ${scheduled}` },
    { label: "Taxa de fechamento", value: pct(closed.length, attended), note: `${closed.length} de ${attended}` },
    { label: "Ticket médio", value: closed.length ? brl(revenue / closed.length) : "—", note: "procedimentos fechados" },
    { label: "Vendas pelo CRM", value: brl(revenue), note: "no período" },
    { label: "Custo por paciente", value: closed.length && invest ? brl(invest / closed.length) : "—", note: "investimento / fechados" },
  ];

  const funnel = [
    { label: "Leads", n: L.length },
    { label: "Avaliação agendada", n: scheduled },
    { label: "Compareceu", n: attended },
    { label: "Fechou", n: closed.length },
  ];

  const origins = Object.keys(sourceLabel)
    .map((k) => {
      const ls = L.filter((l) => l.source === k);
      return {
        name: sourceLabel[k],
        leads: ls.length,
        sched: ls.filter((l) => l.scheduled_at).length,
        closed: ls.filter((l) => l.closed_at).length,
        revenue: ls.reduce((s, l) => s + (l.closed_at ? l.closed_value ?? 0 : 0), 0),
      };
    })
    .filter((o) => o.leads > 0);

  const baseline = Number(clinic.baseline_revenue ?? 0);
  const monthRevenue = rev ? Number(rev.revenue) : null;
  const newMoney = monthRevenue != null ? Math.max(monthRevenue - baseline, 0) : null;
  const variable = newMoney != null ? (newMoney * Number(clinic.variable_pct ?? 10)) / 100 : null;

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="title">Painel de números</h1>
          <p className="text-sm text-neutral-600">{clinic.name}</p>
        </div>
        <PeriodSelect value={p ?? "month"} />
      </header>

      <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card flex flex-col gap-1.5 p-4">
            <span className="text-[13px] text-neutral-600">{k.label}</span>
            <span className="text-2xl font-bold">{k.value}</span>
            <span className="text-xs text-neutral-600">{k.note}</span>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap gap-4">
        <section aria-labelledby="funil" className="card flex flex-[3_1_420px] flex-col gap-3.5">
          <h2 id="funil" className="text-base font-semibold">Funil do período</h2>
          {funnel.map((s) => (
            <div key={s.label} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{s.label}</span>
                <span className="text-neutral-700">{s.n} · {pct(s.n, L.length)}</span>
              </div>
              <div className="h-3.5 overflow-hidden rounded-full bg-neutral-100">
                <div className="h-3.5 rounded-full bg-black" style={{ width: L.length ? `${(s.n / L.length) * 100}%` : "0%" }} />
              </div>
            </div>
          ))}
        </section>

        <section aria-labelledby="variavel" className="flex flex-[2_1_320px] flex-col gap-3 rounded-xl bg-black p-5 text-neutral-100">
          <h2 id="variavel" className="text-base font-semibold">Dinheiro novo do mês</h2>
          <div className="flex justify-between border-b border-neutral-800 pb-2.5 text-sm">
            <span className="text-neutral-300">Média base (3 meses antes)</span><span className="font-semibold">{brl(baseline)}</span>
          </div>
          <form action={saveMonthlyRevenue} className="flex items-end gap-2 border-b border-neutral-800 pb-3">
            <input type="hidden" name="month" value={monthKey} />
            <div className="flex-1">
              <label htmlFor="revenue" className="text-sm text-neutral-300">Faturamento total da clínica no mês</label>
              <input id="revenue" name="revenue" inputMode="decimal" defaultValue={monthRevenue ?? ""} placeholder="Informe o valor" className="input mt-1 text-black" />
            </div>
            <button className="btn-ghost">Salvar</button>
          </form>
          <div className="flex justify-between border-b border-neutral-800 pb-2.5 text-sm">
            <span className="text-neutral-300">Dinheiro novo</span><span className="font-semibold">{brl(newMoney)}</span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-sm text-neutral-300">Variável ({Number(clinic.variable_pct ?? 10)}%)</span>
            <span className="font-serif text-4xl text-white">{brl(variable)}</span>
          </div>
          <p className="text-xs text-neutral-400">Dinheiro novo = faturamento do mês acima da média dos 3 meses anteriores ao contrato.</p>
        </section>
      </div>

      <section aria-labelledby="origens" className="card flex flex-col gap-3">
        <h2 id="origens" className="text-base font-semibold">Resultado por origem</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead><tr><th className="th">Origem</th><th className="th">Leads</th><th className="th">Agendados</th><th className="th">Fechados</th><th className="th">Faturamento</th></tr></thead>
            <tbody>
              {origins.map((o) => (
                <tr key={o.name}><td className="td font-semibold">{o.name}</td><td className="td">{o.leads}</td><td className="td">{o.sched}</td><td className="td">{o.closed}</td><td className="td">{brl(o.revenue)}</td></tr>
              ))}
              {!origins.length && <tr><td className="td text-neutral-500" colSpan={5}>Sem leads no período.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
