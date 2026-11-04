import Link from "next/link";
import { signOut } from "@/lib/actions";
import type { Clinic, Role } from "@/lib/context";
import ClinicSelect from "./ClinicSelect";
import NavLink from "./NavLink";

export default function Sidebar({
  clinics,
  clinicId,
  role,
  userName,
}: {
  clinics: Clinic[];
  clinicId: string | null;
  role: Role;
  userName: string;
}) {
  const roleLabel = { agency: "Agência", owner: "Dono", secretary: "Secretária" }[role];
  return (
    <nav aria-label="Menu principal" className="flex flex-[1_1_220px] flex-col gap-1 bg-black px-4 py-6 text-neutral-200">
      <Link href="/funil" className="flex items-center gap-2.5 px-2 pb-5 text-white no-underline">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white font-serif text-base text-black">GS</span>
        <span className="font-serif text-xl leading-tight">GS Gestão Clínica</span>
      </Link>
      {clinics.length > 0 && <ClinicSelect clinics={clinics} value={clinicId} />}
      <NavLink href="/funil">Funil</NavLink>
      <NavLink href="/leads">Leads</NavLink>
      {role !== "secretary" && <NavLink href="/painel">Painel</NavLink>}
      <span className="flex min-h-11 items-center px-3 text-sm text-neutral-500">Conversas (fase 2)</span>
      {role === "agency" && (
        <>
          <div className="mx-2 my-4 h-px bg-neutral-800" />
          <span className="px-3 pb-1 text-[11px] uppercase tracking-widest text-neutral-400">Agência</span>
          <NavLink href="/marketing">Marketing</NavLink>
          <NavLink href="/agencia">Visão da agência</NavLink>
        </>
      )}
      <div className="mt-auto space-y-2 px-3 pt-6 text-sm">
        <p className="text-neutral-300">{userName}</p>
        <p className="text-xs text-neutral-400">{roleLabel}</p>
        <form action={signOut}>
          <button className="text-sm text-neutral-300 underline hover:text-white cursor-pointer">Sair</button>
        </form>
      </div>
    </nav>
  );
}
