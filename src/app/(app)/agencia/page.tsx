import Link from "next/link";
import { redirect } from "next/navigation";
import { getContext } from "@/lib/context";
import { brl, duration, monthKey } from "@/lib/format";
import { createClinic } from "@/lib/actions";
import InviteForm from "./InviteForm";

export default async function AgenciaPage() {
  const ctx = await getContext();
  if (!ctx.isAgency) redirect("/funil");
  const mk = monthKey();

  const [{ data: stats }, { data: revs }, { data: members }] = await Promise.all([
    ctx.supabase.from("clinic_month_stats").select("*").order("name"),
    ctx.supabase.from("clinic_monthly_revenue").select("clinic_id, revenue").eq("month", mk),
    ctx.supabase.from("clinic_members").select("clinic_id, role, user:profiles(full_name)"),
  ]);

  const rows = (stats ?? []).map((s) => {
    const rev = revs?.find((r) => r.clinic_id === s.clinic_id);
    const newMoney = rev ? Math.max(Number(rev.revenue) - Number(s.baseline_revenue ?? 0), 0) : null;
    const variable = newMoney != null ? (newMoney * Number(s.variable_pct ?? 10)) / 100 : 0;
    const slow = s.avg_response_seconds != null && s.avg_response_seconds > 600;
    return { ...s, newMoney, variable, warn: slow ? "resposta lenta" : rev ? null : "faturamento não informado" };
  });
  const fixed = rows.reduce((t, r) => t + Number(r.fixed_fee ?? 0), 0);
  const variable = rows.reduce((t, r) => t + r.variable, 0);

  const totals = [
    { label: "Clínicas ativas", value: String(rows.length) },
    { label: "Fixo mensal", value: brl(fixed) },
    { label: "Variável do mês", value: brl(variable) },
    { label: "Total do mês", value: brl(fixed + variable) },
  ];

  return (
    <>
      <header>
        <h1 className="title">Visão da agência</h1>
        <p className="text-sm text-neutral-600">Todas as clínicas · mês corrente</p>
      </header>

      <section aria-label="Totais" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {totals.map((t) => (
          <div key={t.label} className="card flex flex-col gap-1.5 p-4">
            <span className="text-[13px] text-neutral-600">{t.label}</span>
            <span className="font-serif text-4xl">{t.value}</span>
          </div>
        ))}
      </section>

      <section aria-labelledby="clinicas" className="card flex flex-col gap-3">
        <h2 id="clinicas" className="text-base font-semibold">Clínicas</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead><tr>
              <th className="th">Clínica</th><th className="th">Leads (mês)</th><th className="th">Tempo de resposta</th><th className="th">Fechados</th>
              <th className="th">Dinheiro novo</th><th className="th">Seu fixo</th><th className="th">Seu variável</th><th className="th">Situação</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.clinic_id}>
                  <td className="td font-semibold">{r.name}</td>
                  <td className="td">{r.leads_month}</td>
                  <td className="td">{duration(r.avg_response_seconds)}</td>
                  <td className="td">{r.closed_month}</td>
                  <td className="td">{brl(r.newMoney)}</td>
                  <td className="td">{brl(Number(r.fixed_fee ?? 0))}</td>
                  <td className="td font-bold">{brl(r.variable)}</td>
                  <td className="td">
                    {r.warn
                      ? <span className="rounded-full bg-black px-2.5 py-1 text-xs font-semibold text-white">Atenção: {r.warn}</span>
                      : <span className="rounded-full border border-black px-2.5 py-1 text-xs font-semibold">Saudável</span>}
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td className="td text-neutral-500" colSpan={8}>Cadastre a primeira clínica abaixo.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-neutral-500">Para abrir uma clínica, escolha no seletor do menu lateral e vá ao <Link href="/funil" className="underline">Funil</Link>.</p>
      </section>

      <div className="flex flex-wrap gap-4">
        <form action={createClinic} className="card flex flex-[1_1_320px] flex-col gap-3">
          <h2 className="text-base font-semibold">Nova clínica</h2>
          <div><label className="label" htmlFor="cn">Nome</label><input id="cn" name="name" required className="input" /></div>
          <div><label className="label" htmlFor="sp">Especialidade</label><input id="sp" name="specialty" placeholder="Ex.: Harmonização facial" className="input" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="ff">Seu fixo (R$)</label><input id="ff" name="fixed_fee" inputMode="decimal" defaultValue="1500" className="input" /></div>
            <div><label className="label" htmlFor="vp">Variável (%)</label><input id="vp" name="variable_pct" inputMode="decimal" defaultValue="10" className="input" /></div>
          </div>
          <div><label className="label" htmlFor="br">Média de faturamento dos 3 meses anteriores (R$)</label><input id="br" name="baseline_revenue" inputMode="decimal" className="input" /></div>
          <button className="btn">Cadastrar clínica</button>
          <p className="text-xs text-neutral-500">O funil com as etapas padrão é criado automaticamente.</p>
        </form>

        <InviteForm clinics={ctx.clinics.map((c) => ({ id: c.id, name: c.name }))} />

        <section aria-labelledby="acessos" className="card flex flex-[1_1_320px] flex-col gap-3">
          <h2 id="acessos" className="text-base font-semibold">Acessos ativos</h2>
          {ctx.clinics.map((c) => (
            <div key={c.id} className="border-b border-neutral-100 pb-2.5">
              <p className="text-sm font-semibold">{c.name}</p>
              <ul className="text-sm text-neutral-600">
                {(members ?? []).filter((m) => m.clinic_id === c.id).map((m, i) => (
                  <li key={i}>{(m.user as unknown as { full_name: string | null } | null)?.full_name ?? "Sem nome"} · {m.role === "owner" ? "Dono" : "Secretária"}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
