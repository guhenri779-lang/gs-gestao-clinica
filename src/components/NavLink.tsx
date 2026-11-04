"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const active = usePathname().startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center rounded-lg px-3 text-sm no-underline ${
        active ? "bg-neutral-800 font-semibold text-white" : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}
