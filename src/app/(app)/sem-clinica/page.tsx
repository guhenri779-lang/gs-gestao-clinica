import Link from "next/link";
import { getContext } from "@/lib/context";

export default async function NoClinic() {
  const ctx = await getContext();
  return (
    <div className="card max-w-lg space-y-3">
      <h1 className="title">Nenhuma clínica ainda</h1>
      {ctx.isAgency ? (
        <p className="text-sm text-neutral-600">
          Cadastre a primeira clínica na <Link href="/agencia" className="underline">Visão da agência</Link>.
        </p>
      ) : (
        <p className="text-sm text-neutral-600">Seu acesso ainda não foi ligado a uma clínica. Fale com a agência.</p>
      )}
    </div>
  );
}
