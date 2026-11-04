import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export type Role = "agency" | "owner" | "secretary";

export type Clinic = {
  id: string;
  name: string;
  specialty: string | null;
  fixed_fee: number | null;
  variable_pct: number | null;
  baseline_revenue: number | null;
};

export async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: clinics }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, is_agency").eq("id", user.id).single(),
    supabase.from("clinics").select("id, name, specialty, fixed_fee, variable_pct, baseline_revenue").order("name"),
    supabase.from("clinic_members").select("clinic_id, role").eq("user_id", user.id),
  ]);

  const isAgency = !!profile?.is_agency;
  const list = (clinics ?? []) as Clinic[];
  const selected = (await cookies()).get("clinic_id")?.value;
  const clinic = list.find((c) => c.id === selected) ?? list[0] ?? null;
  const memberRole = memberships?.find((m) => m.clinic_id === clinic?.id)?.role as Role | undefined;
  const role: Role = isAgency ? "agency" : memberRole ?? "secretary";

  return {
    supabase,
    user,
    profile,
    isAgency,
    clinics: list,
    clinic,
    role,
    canFinance: role === "agency" || role === "owner",
  };
}

export function requireClinic<T extends { clinic: Clinic | null }>(ctx: T) {
  if (!ctx.clinic) redirect("/sem-clinica");
  return ctx.clinic;
}
