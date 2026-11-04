"use client";

import { useActionState } from "react";
import { inviteUser } from "@/lib/actions";

export default function InviteForm({ clinics }: { clinics: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(inviteUser, null);
  return (
    <form action={action} className="card flex flex-[1_1_320px] flex-col gap-3">
      <h2 className="text-base font-semibold">Criar acesso</h2>
      <div><label className="label" htmlFor="fn">Nome</label><input id="fn" name="full_name" required className="input" /></div>
      <div><label className="label" htmlFor="em">E-mail</label><input id="em" name="email" type="email" required className="input" /></div>
      <div><label className="label" htmlFor="pw">Senha inicial</label><input id="pw" name="password" type="text" minLength={8} required className="input" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label" htmlFor="cl">Clínica</label>
          <select id="cl" name="clinic_id" required className="input">
            {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></div>
        <div><label className="label" htmlFor="rl">Perfil</label>
          <select id="rl" name="role" className="input">
            <option value="secretary">Secretária</option>
            <option value="owner">Dono</option>
          </select></div>
      </div>
      {state?.error && <p className="rounded-lg bg-black px-3 py-2 text-sm text-white">{state.error}</p>}
      {state?.ok && <p className="rounded-lg border border-black px-3 py-2 text-sm">{state.ok}</p>}
      <button className="btn" disabled={pending || !clinics.length}>{pending ? "Criando…" : "Criar acesso"}</button>
      <p className="text-xs text-neutral-500">Envie o e-mail e a senha para a pessoa. Ela pode trocar a senha depois.</p>
    </form>
  );
}
