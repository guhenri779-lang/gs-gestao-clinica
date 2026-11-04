"use client";

import { useActionState } from "react";
import { signIn } from "@/lib/actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-6">
      <form action={action} className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-8">
        <div className="space-y-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black font-serif text-lg text-white">GS</div>
          <h1 className="title pt-3">GS Gestão Clínica</h1>
          <p className="text-sm text-neutral-600">Entre com seu e-mail e senha.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="label">E-mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="label">Senha</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
        </div>
        {state?.error && <p className="rounded-lg bg-black px-3 py-2 text-sm text-white">{state.error}</p>}
        <button className="btn w-full" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</button>
      </form>
    </main>
  );
}
