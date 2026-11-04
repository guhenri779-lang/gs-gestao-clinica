"use client";

import { useRef } from "react";
import { createLead } from "@/lib/actions";

export default function NewLeadForm() {
  const details = useRef<HTMLDetailsElement>(null);
  const form = useRef<HTMLFormElement>(null);

  async function action(data: FormData) {
    await createLead(data);
    form.current?.reset();
    if (details.current) details.current.open = false;
  }

  return (
    <details ref={details} className="relative">
      <summary className="btn list-none">+ Novo lead</summary>
      <form ref={form} action={action} className="card absolute right-0 z-10 mt-2 w-80 space-y-3 shadow-lg">
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
  );
}
