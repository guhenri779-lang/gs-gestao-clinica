"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { moveLead } from "@/lib/actions";
import { brl, sourceLabel } from "@/lib/format";

export type Stage = { id: string; name: string; position: number; is_won: boolean; is_lost: boolean };
export type KanbanLead = {
  id: string;
  name: string;
  procedure: string | null;
  value: number | null;
  source: string;
  stageId: string | null;
  owner: string | null;
  lastContactAt: string;
  taskDue: boolean;
};

const tagClass: Record<string, string> = {
  meta: "bg-black text-white",
  organic: "border border-black text-black",
  referral: "bg-neutral-200 text-black",
  google: "border border-neutral-400 text-neutral-800",
  other: "bg-neutral-100 text-neutral-700",
};

function since(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)} dias`;
}

export default function Kanban({ stages, leads, showValues }: { stages: Stage[]; leads: KanbanLead[]; showValues: boolean }) {
  const [, start] = useTransition();
  const [items, setOptimistic] = useOptimistic(leads, (state, m: { id: string; stageId: string }) =>
    state.map((l) => (l.id === m.id ? { ...l, stageId: m.stageId } : l))
  );

  function drop(e: React.DragEvent, stageId: string) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    start(async () => {
      setOptimistic({ id, stageId });
      await moveLead(id, stageId);
    });
  }

  const firstTwo = stages.slice(0, 2).map((s) => s.id);

  return (
    <section aria-label="Etapas do funil" className="overflow-x-auto pb-2">
      <div className="flex min-w-[1100px] gap-3.5">
        {stages.map((st) => {
          const cards = items.filter((l) => l.stageId === st.id);
          return (
            <div
              key={st.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => drop(e, st.id)}
              className="flex min-h-[420px] flex-[1_0_230px] flex-col gap-2.5 rounded-xl bg-neutral-100 p-3"
            >
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold">{st.name}</h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-neutral-700">{cards.length}</span>
              </div>
              {cards.map((c) => {
                const ageMin = (Date.now() - new Date(c.lastContactAt).getTime()) / 60000;
                const stale = firstTwo.includes(st.id) && ageMin > 120;
                return (
                  <Link
                    key={c.id}
                    href={`/leads/${c.id}`}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                    className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-black no-underline hover:border-black"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="text-sm font-semibold">{c.name}</span>
                      {showValues && c.value != null && <span className="text-[13px] font-semibold">{brl(c.value)}</span>}
                    </div>
                    {c.procedure && <span className="text-[13px] text-neutral-600">{c.procedure}</span>}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tagClass[c.source] ?? tagClass.other}`}>
                        {sourceLabel[c.source] ?? c.source}
                      </span>
                      {c.owner && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-700">{c.owner}</span>}
                    </div>
                    {stale ? (
                      <span className="rounded-md bg-black px-2 py-1.5 text-xs font-semibold text-white">Sem contato há {since(c.lastContactAt)}</span>
                    ) : c.taskDue ? (
                      <span className="rounded-md bg-black px-2 py-1.5 text-xs font-semibold text-white">Follow-up vence hoje</span>
                    ) : (
                      <span className="text-xs text-neutral-500">Último contato há {since(c.lastContactAt)}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
