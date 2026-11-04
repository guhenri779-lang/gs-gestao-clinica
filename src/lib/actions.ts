"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "./supabase/server";
import { getContext, requireClinic } from "./context";
import { fromLocalInput, parseMoney } from "./format";

const num = (v: FormDataEntryValue | null) => parseMoney(v == null ? null : String(v));
const str = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

// ---------- sessão ----------
export async function signIn(_: unknown, form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email")),
    password: String(form.get("password")),
  });
  if (error) return { error: "E-mail ou senha inválidos." };
  redirect("/funil");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function selectClinic(clinicId: string) {
  (await cookies()).set("clinic_id", clinicId, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}

// ---------- leads ----------
export async function createLead(form: FormData) {
  const ctx = await getContext();
  const clinic = requireClinic(ctx);
  const { data: first } = await ctx.supabase
    .from("pipeline_stages")
    .select("id")
    .eq("clinic_id", clinic.id)
    .order("position")
    .limit(1)
    .single();
  await ctx.supabase.from("leads").insert({
    clinic_id: clinic.id,
    stage_id: first?.id,
    name: str(form.get("name")) ?? "Sem nome",
    phone: str(form.get("phone")),
    source: str(form.get("source")) ?? "other",
    procedure: str(form.get("procedure")),
    campaign: str(form.get("campaign")),
    owner_id: ctx.user.id,
  });
  revalidatePath("/funil");
}

export async function moveLead(leadId: string, stageId: string) {
  const ctx = await getContext();
  await ctx.supabase.from("leads").update({ stage_id: stageId }).eq("id", leadId);
  revalidatePath("/funil");
  revalidatePath(`/leads/${leadId}`);
}

export async function updateLead(leadId: string, form: FormData) {
  const ctx = await getContext();
  const scheduled = str(form.get("scheduled_at"));
  await ctx.supabase
    .from("leads")
    .update({
      name: str(form.get("name")) ?? "Sem nome",
      phone: str(form.get("phone")),
      email: str(form.get("email")),
      source: str(form.get("source")) ?? "other",
      campaign: str(form.get("campaign")),
      creative: str(form.get("creative")),
      procedure: str(form.get("procedure")),
      quote_value: num(form.get("quote_value")),
      closed_value: num(form.get("closed_value")),
      lost_reason: str(form.get("lost_reason")),
      notes: str(form.get("notes")),
      scheduled_at: fromLocalInput(scheduled),
      stage_id: str(form.get("stage_id")),
    })
    .eq("id", leadId);
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/funil");
}

export async function addEvent(leadId: string, clinicId: string, form: FormData) {
  const ctx = await getContext();
  const text = str(form.get("text"));
  if (!text) return;
  await ctx.supabase.from("lead_events").insert({
    lead_id: leadId,
    clinic_id: clinicId,
    type: "note",
    description: text,
    created_by: ctx.user.id,
  });
  await ctx.supabase.from("leads").update({ last_contact_at: new Date().toISOString() }).eq("id", leadId);
  revalidatePath(`/leads/${leadId}`);
}

// ---------- tarefas ----------
export async function addTask(leadId: string, clinicId: string, form: FormData) {
  const ctx = await getContext();
  const title = str(form.get("title"));
  if (!title) return;
  const due = str(form.get("due_at"));
  await ctx.supabase.from("tasks").insert({
    lead_id: leadId,
    clinic_id: clinicId,
    title,
    due_at: fromLocalInput(due),
    assigned_to: ctx.user.id,
  });
  revalidatePath(`/leads/${leadId}`);
}

export async function toggleTask(taskId: string, done: boolean, leadId: string) {
  const ctx = await getContext();
  await ctx.supabase.from("tasks").update({ done }).eq("id", taskId);
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/funil");
}

// ---------- financeiro ----------
export async function saveMonthlyRevenue(form: FormData) {
  const ctx = await getContext();
  const clinic = requireClinic(ctx);
  if (!ctx.canFinance) return;
  await ctx.supabase.from("clinic_monthly_revenue").upsert({
    clinic_id: clinic.id,
    month: String(form.get("month")),
    revenue: num(form.get("revenue")) ?? 0,
  });
  revalidatePath("/painel");
  revalidatePath("/agencia");
}

export async function addAdSpend(form: FormData) {
  const ctx = await getContext();
  const clinic = requireClinic(ctx);
  if (!ctx.isAgency) return;
  await ctx.supabase.from("ad_spend").insert({
    clinic_id: clinic.id,
    date: String(form.get("date")),
    campaign: str(form.get("campaign")),
    creative: str(form.get("creative")),
    spend: num(form.get("spend")) ?? 0,
  });
  revalidatePath("/marketing");
}

// ---------- agência ----------
export async function createClinic(form: FormData) {
  const ctx = await getContext();
  if (!ctx.isAgency) return;
  const { data } = await ctx.supabase
    .from("clinics")
    .insert({
      name: str(form.get("name")) ?? "Nova clínica",
      specialty: str(form.get("specialty")),
      fixed_fee: num(form.get("fixed_fee")) ?? 0,
      variable_pct: num(form.get("variable_pct")) ?? 10,
      baseline_revenue: num(form.get("baseline_revenue")) ?? 0,
    })
    .select("id")
    .single();
  if (data) await selectClinic(data.id);
  revalidatePath("/agencia");
}

export async function inviteUser(_: unknown, form: FormData) {
  const ctx = await getContext();
  if (!ctx.isAgency) return { error: "Só a agência cria acessos." };
  const admin = createAdminClient();
  const email = String(form.get("email")).trim().toLowerCase();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: String(form.get("password")),
    email_confirm: true,
    user_metadata: { full_name: str(form.get("full_name")) },
  });
  if (error || !data.user) return { error: error?.message ?? "Não foi possível criar o usuário." };
  const { error: mErr } = await admin.from("clinic_members").insert({
    clinic_id: String(form.get("clinic_id")),
    user_id: data.user.id,
    role: String(form.get("role")),
  });
  if (mErr) return { error: mErr.message };
  revalidatePath("/agencia");
  return { ok: `Acesso criado para ${email}.` };
}
