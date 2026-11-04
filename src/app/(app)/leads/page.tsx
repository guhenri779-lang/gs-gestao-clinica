import Link from "next/link";
import { getContext, requireClinic } from "@/lib/context";
import { brl, dateTime, sourceLabel } from "@/lib/format";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const ctx = await getContext();
  const clinic = requireClinic(ctx);
  let query = ctx.supabase
    .from("leads")
    .select("id, name, phone, procedure, source, quote_value, closed_value, created_at, stage:pipeline_stages(name)")
    .eq("clinic_id", clinic.id)
    .order("created_at", { ascending: false })
    .limit(300);
  if (q) query = query.or(`name.ilike.%${q.replace(/[%,()]/g, "")}%,phone.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const { data: leads } = await query;

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="title">Leads</h1>
        <form className="flex gap-2">
          <label htmlFor="q" className="sr-only">Buscar</label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Buscar por nome ou telefone" className="input min-w-64" />
          <button className="btn-ghost">Buscar</button>
        </form>
      </header>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead><tr>
            <th className="th">Nome</th><th className="th">Telefone</th><th className="th">Procedimento</th>
            <th className="th">Origem</th><th className="th">Etapa</th><th className="th">Valor</th><th className="th">Criado</th>
          </tr></thead>
          <tbody>
            {(leads ?? []).map((l) => (
              <tr key={l.id}>
                <td className="td font-semibold"><Link href={`/leads/${l.id}`} className="text-black">{l.name}</Link></td>
                <td className="td">{l.phone ?? "—"}</td>
                <td className="td">{l.procedure ?? "—"}</td>
                <td className="td">{sourceLabel[l.source] ?? l.source}</td>
                <td className="td">{(l.stage as unknown as { name: string } | null)?.name ?? "—"}</td>
                <td className="td">{brl(l.closed_value ?? l.quote_value)}</td>
                <td className="td">{dateTime(l.created_at)}</td>
              </tr>
            ))}
            {!leads?.length && <tr><td className="td text-neutral-500" colSpan={7}>Nenhum lead encontrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
