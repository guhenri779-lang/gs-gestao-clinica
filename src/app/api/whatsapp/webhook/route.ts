// Receptor do WhatsApp Cloud API.
// GET  = verificação que a Meta faz uma vez ao configurar o webhook.
// POST = cada mensagem recebida / status de mensagem enviada.
import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

function validSignature(raw: string, header: string | null) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return true; // enquanto não configurado (somente testes)
  if (!header?.startsWith("sha256=")) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

type WaMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  button?: { text: string };
  interactive?: { button_reply?: { title: string }; list_reply?: { title: string } };
  referral?: {
    source_url?: string;
    source_id?: string;
    source_type?: string;
    headline?: string;
    body?: string;
    ctwa_clid?: string;
  };
};

function messageText(m: WaMessage) {
  return (
    m.text?.body ??
    m.button?.text ??
    m.interactive?.button_reply?.title ??
    m.interactive?.list_reply?.title ??
    `[${m.type}]`
  );
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  let body: { entry?: { changes?: { value?: Record<string, unknown> }[] }[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true });
  }

  const db = createAdminClient();

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value as {
        metadata?: { phone_number_id?: string };
        contacts?: { wa_id: string; profile?: { name?: string } }[];
        messages?: WaMessage[];
      };
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId || !value.messages?.length) continue;

      const { data: clinic } = await db
        .from("clinics")
        .select("id")
        .eq("whatsapp_phone_number_id", phoneNumberId)
        .maybeSingle();
      if (!clinic) continue; // número não ligado a nenhuma clínica

      for (const m of value.messages) {
        const waId = m.from;
        const name = value.contacts?.find((c) => c.wa_id === waId)?.profile?.name ?? waId;
        const sentAt = new Date(Number(m.timestamp) * 1000).toISOString();

        // 1. acha ou cria o lead
        let { data: lead } = await db
          .from("leads")
          .select("id, ctwa_clid")
          .eq("clinic_id", clinic.id)
          .eq("wa_id", waId)
          .maybeSingle();

        if (!lead) {
          const { data: first } = await db
            .from("pipeline_stages")
            .select("id")
            .eq("clinic_id", clinic.id)
            .order("position")
            .limit(1)
            .single();
          const r = m.referral;
          const { data: created } = await db
            .from("leads")
            .insert({
              clinic_id: clinic.id,
              stage_id: first?.id,
              name,
              phone: waId,
              wa_id: waId,
              source: r?.source_type === "ad" ? "meta" : "other",
              ctwa_clid: r?.ctwa_clid ?? null,
              ad_id: r?.source_type === "ad" ? r?.source_id ?? null : null,
              ad_headline: r?.headline ?? null,
              ad_source_url: r?.source_url ?? null,
              last_contact_at: sentAt,
            })
            .select("id, ctwa_clid")
            .single();
          lead = created;
        } else if (!lead.ctwa_clid && m.referral?.ctwa_clid) {
          // lead antigo que voltou por um anúncio: grava a origem nova
          await db
            .from("leads")
            .update({
              ctwa_clid: m.referral.ctwa_clid,
              ad_id: m.referral.source_id ?? null,
              ad_headline: m.referral.headline ?? null,
              ad_source_url: m.referral.source_url ?? null,
            })
            .eq("id", lead.id);
        }
        if (!lead) continue;

        // 2. salva a mensagem (wa_message_id único evita duplicar reenvios da Meta)
        await db.from("messages").upsert(
          {
            clinic_id: clinic.id,
            lead_id: lead.id,
            wa_message_id: m.id,
            direction: "in",
            type: m.type,
            body: messageText(m),
            payload: m,
            sent_at: sentAt,
          },
          { onConflict: "wa_message_id", ignoreDuplicates: true }
        );
        await db.from("leads").update({ last_contact_at: sentAt }).eq("id", lead.id);
      }
    }
  }

  // A Meta exige 200 rápido; qualquer erro acima não deve gerar reenvio em loop
  return NextResponse.json({ ok: true });
}
