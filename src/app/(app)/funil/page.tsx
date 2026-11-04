import { getContext, requireClinic } from "@/lib/context";
import { brl, duration, monthStart } from "@/lib/format";
import { createLead } from "@/lib/actions";
import Kanban, { type KanbanLead, type Stage } from "./Kanban";

export default async function FunilPage() {
  const ctx = await getContext();
  const clinic = requireClinic(ctx);
  const since = monthStart().toISOString();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [{ data: stages }, { data: leads }, { data: tasks }] = await Promise.all([
    ctx.supabase.from("pipeline_stages").select("id, name, position, is_won, is_lost").eq("clinic_id", clinic.id).order("position"),
    ctx.supabase
      .from("leads")
      .select("id, name, procedure, quote_value, closed_value, source, stage_id, last_contact_at, created_at, scheduled_at, closed_at, first_response_seconds, owner:profiles(full_name)")
      .eq("clinic_id", clinic.id)
      .order("updated_at", { ascending: false })
      .limit(500),
    ctx.supabase.from("tasks").select("lead_id, due_at").eq("clinic_id", clinic.id).eq("done", false),
  ]);

  const all = leads ?? [];
  const month = all.filter((l) => l.created_at >= since);
  const todayCount = all.filter((l) => new Date(l.created_at) >= today).length;
  const resp = month.map((l) => l.first_response_seconds).filter((v): v is number => v != null);
  const weekAhead = Date.now() + 7 * 864e5;
  const scheduledWeek = all.filter((l) => l.scheduled_at && new Date(l.scheduled_at).getTime() >= Date.now() && new Date(l.scheduled_at).getTime() <= weekAhead).length;
  const closedMonth = all.filter((l) => l.closed_at && l.closed_at >= since).reduce((s, l) => s + (l.closed_value ?? 0), 0);

  const dueToday = new Set(
    (tasks ?? []).filter((t) => t.due_at && new Date(t.due_at).getTime() < today.getTime() + 864e5).map((t) => t.lead_id)
  );

  const kanbanLeads: KanbanLead[] = all
    .filter((l) => {
      // esconde perdidos/fechados com mais de 30 dias para o quadro não pesar
      const st = stages?.find((s) => s.id === l.stage_id);
      if (st && (st.is_won || st.is_lost) && l.closed_at) return Date.now() - new Date(l.closed_at).getTime() < 30 * 864e5;
      return true;
    })
    .map((l) => ({
      id: l.id,
      name: l.name,
      procedure: l.procedure,
      value: l.closed_value ?? l.quote_value,
      source: l.source,
      stageId: l.stage_id,
      owner: (l.owner as unknown as { full_name: string | null } | null)?.full_name ?? null,
      lastContactAt: l.last_contact_at ?? l.created_at,
      taskDue: dueToday.has(l.id),
    }));

  const kpis = [
    { label: "Leads hoje", value: String(todayCount) },
    { label: "Tempo médio de resposta", value: duration(resp.length ? resp.reduce((a, b) => a + b, 0) / resp.length : null) },
    { label: "Avaliações nos próximos 7 dias", value: String(scheduledWeek) },
    ...(ctx.canFinance ? [{ label: "Vendas fechadas no mês", value: brl(closedMonth) }] : []),
  ];

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="title">Funil de vendas</h1>
          <p className="text-sm text-neutral-600">{clinic.name}{clinic.specialty ? ` · ${clinic.specialty}` : ""}</p>
        </div>
        <details className="relative">
          <summary className="btn list-none">+ Novo lead</summary>
          <form action={createLead} className="card absolute right-0 z-10 mt-2 w-80 space-y-3 shadow-lg">
            <div><label htmlFor="n" className="label">Nome</label><input id="n" name="name" required className="input" /></div>
            <div><label htmlFor="p" className="label">WhatsApp</label><input id="p" name="phone" placeholder="(11) 9 0000-0000" className="input" /></div>
            <div>
              <label htmlFor="s" className="label">Origem</label>
              <select id="s" name="source" className="input">
                <option value="meta">Anúncio Meta</option><option value="organic">Orgânico</option>
                <option value="referral">Indicação</option><option value="google">Google</option><option value="other">Outro</option>
              </select>
            </div>
            <div><label htmlFor="pr" className="label">Procedimento de interesse</label><input id="pr" name="procedure" className="input" /></div>
            <div><label htmlFor="c" className="label">Campanha (opcional)</label><input id="c" name="campaign" className="input" /></div>
            <button className="btn w-full">Salvar lead</button>
          </form>
        </details>
      </header>

      <section aria-label="Resumo" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card flex flex-col gap-1.5 p-4">
            <span className="text-[13px] text-neutral-600">{k.label}</span>
            <span className="text-2xl font-bold">{k.value}</span>
          </div>
        ))}
      </section>

      <Kanban stages={(stages ?? []) as Stage[]} leads={kanbanLeads} showValues />
    </>
  );
}
