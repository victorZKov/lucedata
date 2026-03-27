"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function SidebarLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-md px-3 py-2 text-sm transition-colors",
        "hover:bg-muted/60 hover:text-foreground",
        isActive
          ? "bg-muted text-foreground font-medium"
          : "text-muted-foreground"
      )}
    >
      {label}
    </Link>
  );
}
