import Sidebar from "@/components/Sidebar";
import { getContext } from "@/lib/context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContext();
  return (
    <div className="flex min-h-screen flex-wrap">
      <Sidebar
        clinics={ctx.clinics}
        clinicId={ctx.clinic?.id ?? null}
        role={ctx.role}
        userName={ctx.profile?.full_name || ctx.user.email || ""}
      />
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-5 px-8 py-7">{children}</main>
    </div>
  );
}
