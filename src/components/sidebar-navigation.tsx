"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Archive,
  BadgeCheck,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  ChartNoAxesCombined,
  ClipboardCheck,
  FileCog,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  Lightbulb,
  Menu,
  MessageSquareCode,
  PackagePlus,
  Repeat2,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";

import { AccountButton } from "@/components/account-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SidebarItem = {
  label: string;
  href: string;
  section?: string;
};

const icons: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  Product: Boxes,
  ROI: Gauge,
  "Adaptive Growth": ChartNoAxesCombined,
  Pilot: FlaskConical,
  Clients: Building2,
  Pipeline: BriefcaseBusiness,
  Delivery: CalendarCheck,
  Prompts: MessageSquareCode,
  Knowledge: BookOpen,
  Quality: BadgeCheck,
  Evals: ClipboardCheck,
  Approvals: ClipboardCheck,
  Loops: Repeat2,
  Improvements: Lightbulb,
  "New Package": PackagePlus,
  "Saved Packages": Archive,
  "New System Proposal": FileCog,
  "System Proposals": FileCog,
};

type SidebarNavigationProps = {
  items: SidebarItem[];
  isAuthenticated: boolean;
};

export function SidebarNavigation({ items, isAuthenticated }: SidebarNavigationProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const activeHref = useMemo(
    () =>
      items.reduce<string | null>((current, item) => {
        const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return matches && (!current || item.href.length > current.length) ? item.href : current;
      }, null),
    [items, pathname],
  );

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const groups = useMemo(() => {
    const grouped = new Map<string, SidebarItem[]>();
    for (const item of items) {
      const section = item.section ?? "Workspace";
      grouped.set(section, [...(grouped.get(section) ?? []), item]);
    }
    return [...grouped.entries()];
  }, [items]);

  const navigation = (
    <>
      <div className="flex h-[88px] items-center justify-between border-b border-white/10 px-4">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3" onClick={() => setIsOpen(false)}>
          <Image
            src="/app-logo.png"
            alt="DG Academy"
            width={40}
            height={40}
            className="h-10 w-10 rounded-sm object-cover"
            priority
            unoptimized
          />
          <div className="min-w-0">
            <div className="font-mono text-[10px] font-semibold uppercase text-[#f4772e]">
              DG Academy
            </div>
            <div className="mt-1 truncate text-sm font-semibold text-stone-50">
              Production Factory
            </div>
          </div>
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setIsOpen(false)}
          title="Close navigation"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="Primary navigation">
        {items.length ? (
          <div className="space-y-5">
            {groups.map(([section, sectionItems]) => (
              <div key={section}>
                <div className="mb-1.5 px-3 font-mono text-[10px] font-semibold uppercase text-stone-500">
                  {section}
                </div>
                <div className="space-y-1">
                  {sectionItems.map((item) => {
                    const Icon = icons[item.label] ?? Sparkles;
                    const isActive = activeHref === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "relative flex min-h-10 items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-white/[0.08] text-stone-50 before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:bg-[#f4772e]"
                            : "text-stone-400 hover:bg-white/[0.05] hover:text-stone-50",
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-[#f4772e]")} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-2 px-3 py-1 text-xs text-stone-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Internal workspace
        </div>
        <AccountButton isAuthenticated={isAuthenticated} className="w-full justify-start" />
      </div>
    </>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-[#141816]/95 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
          <Image src="/app-logo.png" alt="DG Academy" width={32} height={32} className="h-8 w-8 rounded-sm object-cover" unoptimized />
          <div>
            <div className="font-mono text-[9px] font-semibold uppercase text-[#f4772e]">DG Academy</div>
            <div className="truncate text-sm font-semibold text-stone-50">Production Factory</div>
          </div>
        </Link>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(true)}
          title="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col border-r border-white/10 bg-[#141816] lg:flex">
        {navigation}
      </aside>

      {isOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/65"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="relative flex h-full w-[min(300px,88vw)] flex-col border-r border-white/10 bg-[#141816] shadow-2xl">
            {navigation}
          </aside>
        </div>
      ) : null}
    </>
  );
}
