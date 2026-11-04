"use client";

import { usePathname, useRouter } from "next/navigation";

export default function PeriodSelect({ value }: { value: string }) {
  const router = useRouter();
  const path = usePathname();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="periodo" className="text-sm text-neutral-700">Período</label>
      <select
        id="periodo"
        defaultValue={value}
        onChange={(e) => router.push(e.target.value === "month" ? path : `${path}?p=${e.target.value}`)}
        className="input w-auto"
      >
        <option value="month">Este mês</option>
        <option value="7">Últimos 7 dias</option>
        <option value="90">Últimos 90 dias</option>
      </select>
    </div>
  );
}
