import Link from "next/link";
import { notFound } from "next/navigation";
import { getContext } from "@/lib/context";
import { addEvent, addTask, toggleTask, updateLead } from "@/lib/actions";
import { dateTime, sourceLabel } from "@/lib/format";

const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
};

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getContext();
  const { data: lead } = await ctx.supabase.from("leads").select("*").eq("id", id).single();
  if (!lead) notFound();

  const [{ data: stages }, { data: events }, { data: tasks }] = await Promise.all([
    ctx.supabase.from("pipeline_stages").select("id, name").eq("clinic_id", lead.clinic_id).order("position"),
    ctx.supabase.from("lead_events").select("id, type, description, created_at, author:profiles(full_name)").eq("lead_id", id).order("created_at", { ascending: false }),
    ctx.supabase.from("tasks").select("id, title, due_at, done").eq("lead_id", id).order("done").order("due_at"),
  ]);

  const stage = stages?.find((s) => s.id === lead.stage_id);
  const phoneDigits = (lead.phone ?? "").replace(/\D/g, "");
  const wa = phoneDigits ? `https://wa.me/${phoneDigits.startsWith("55") ? phoneDigits : "55" + phoneDigits}` : null;
  const initials = lead.name.split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();
  const save = updateLead.bind(null, id);
  const note = addEvent.bind(null, id, lead.clinic_id);
  const task = addTask.bind(null, id, lead.clinic_id);

  return (
    <>
      <Link href="/funil" className="text-sm">← Voltar ao funil</Link>
      <header className="card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-13 w-13 items-center justify-center rounded-full bg-neutral-200 text-lg font-bold">{initials}</div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-serif text-3xl">{lead.name}</h1>
              {stage && <span className="rounded-full bg-black px-2.5 py-1 text-xs font-semibold text-white">{stage.name}</span>}
            </div>
            <p className="text-sm text-neutral-600">{[lead.phone, lead.email].filter(Boolean).join(" · ") || "Sem contato cadastrado"}</p>
          </div>
        </div>
        {wa && <a href={wa} target="_blank" rel="noreferrer" className="btn no-underline">Abrir WhatsApp</a>}
      </header>

      <div className="flex flex-wrap items-start gap-4">
        <form action={save} className="card flex flex-[1_1_300px] flex-col gap-3">
          <h2 className="text-base font-semibold">Dados do lead</h2>
          <div><label className="label" htmlFor="stage_id">Etapa</label>
            <select id="stage_id" name="stage_id" defaultValue={lead.stage_id ?? ""} className="input">
              {stages?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></div>
          <div><label className="label" htmlFor="name">Nome</label><input id="name" name="name" defaultValue={lead.name} className="input" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="phone">WhatsApp</label><input id="phone" name="phone" defaultValue={lead.phone ?? ""} className="input" /></div>
            <div><label className="label" htmlFor="email">E-mail</label><input id="email" name="email" defaultValue={lead.email ?? ""} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="source">Origem</label>
              <select id="source" name="source" defaultValue={lead.source} className="input">
                {Object.entries(sourceLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
            <div><label className="label" htmlFor="procedure">Procedimento</label><input id="procedure" name="procedure" defaultValue={lead.procedure ?? ""} className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="campaign">Campanha</label><input id="campaign" name="campaign" defaultValue={lead.campaign ?? ""} className="input" /></div>
            <div><label className="label" htmlFor="creative">Criativo</label><input id="creative" name="creative" defaultValue={lead.creative ?? ""} className="input" /></div>
          </div>
          <div><label className="label" htmlFor="scheduled_at">Avaliação agendada</label><input id="scheduled_at" name="scheduled_at" type="datetime-local" defaultValue={toLocalInput(lead.scheduled_at)} className="input" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="quote_value">Orçamento (R$)</label><input id="quote_value" name="quote_value" inputMode="decimal" defaultValue={lead.quote_value ?? ""} className="input" /></div>
            <div><label className="label" htmlFor="closed_value">Valor fechado (R$)</label><input id="closed_value" name="closed_value" inputMode="decimal" defaultValue={lead.closed_value ?? ""} className="input" /></div>
          </div>
          <div><label className="label" htmlFor="lost_reason">Motivo de perda</label><input id="lost_reason" name="lost_reason" defaultValue={lead.lost_reason ?? ""} className="input" /></div>
          <div><label className="label" htmlFor="notes">Anotações</label><textarea id="notes" name="notes" rows={4} defaultValue={lead.notes ?? ""} className="input" /></div>
          <button className="btn">Salvar alterações</button>
        </form>

        <section aria-labelledby="hist" className="card flex flex-[2_1_380px] flex-col gap-3">
          <h2 id="hist" className="text-base font-semibold">Histórico</h2>
          <form action={note} className="flex gap-2">
            <label htmlFor="text" className="sr-only">Registrar contato</label>
            <input id="text" name="text" placeholder="Registrar contato ou observação" className="input" />
            <button className="btn shrink-0">Registrar</button>
          </form>
          <ol className="mt-2">
            {(events ?? []).map((ev) => (
              <li key={ev.id} className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-black" />
                  <span className="min-h-9 w-0.5 flex-1 bg-neutral-200" />
                </div>
                <div className="pb-3.5">
                  <p className="text-sm font-semibold">{ev.description}</p>
                  <p className="text-xs text-neutral-500">
                    {dateTime(ev.created_at)}
                    {(ev.author as unknown as { full_name: string | null } | null)?.full_name ? ` · ${(ev.author as unknown as { full_name: string }).full_name}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="tarefas" className="card flex flex-[1_1_280px] flex-col gap-3">
          <h2 id="tarefas" className="text-base font-semibold">Follow-ups</h2>
          {(tasks ?? []).map((t) => (
            <form key={t.id} action={toggleTask.bind(null, t.id, !t.done, id)} className="flex items-start gap-2.5">
              <button aria-label={t.done ? "Reabrir tarefa" : "Concluir tarefa"} className={`mt-0.5 h-5 w-5 shrink-0 rounded border cursor-pointer ${t.done ? "border-black bg-black" : "border-neutral-400 bg-white"}`} />
              <div className={t.done ? "text-neutral-400 line-through" : ""}>
                <p className="text-sm">{t.title}</p>
                <p className="text-xs text-neutral-500">{t.due_at ? dateTime(t.due_at) : "Sem data"}</p>
              </div>
            </form>
          ))}
          <form action={task} className="mt-2 space-y-2 border-t border-neutral-100 pt-3">
            <label htmlFor="title" className="label">Nova tarefa</label>
            <input id="title" name="title" placeholder="Ex.: follow-up do orçamento" className="input" />
            <label htmlFor="due_at" className="sr-only">Vencimento</label>
            <input id="due_at" name="due_at" type="datetime-local" className="input" />
            <button className="btn-ghost w-full">+ Adicionar</button>
          </form>
        </section>
      </div>
    </>
  );
}
