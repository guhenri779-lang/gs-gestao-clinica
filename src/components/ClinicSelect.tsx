"use client";

import { useTransition } from "react";
import { selectClinic } from "@/lib/actions";
import type { Clinic } from "@/lib/context";

export default function ClinicSelect({ clinics, value }: { clinics: Clinic[]; value: string | null }) {
  const [pending, start] = useTransition();
  return (
    <div className="mb-5 px-2">
      <label htmlFor="clinica" className="text-xs text-neutral-400">Clínica</label>
      <select
        id="clinica"
        disabled={pending}
        defaultValue={value ?? undefined}
        onChange={(e) => start(() => selectClinic(e.target.value))}
        className="mt-1 min-h-11 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-2 text-sm text-neutral-100"
      >
        {clinics.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}
