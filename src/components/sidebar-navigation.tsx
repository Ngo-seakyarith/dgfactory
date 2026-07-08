"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

  const navigation = (
    <>
      <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-4">
        <Link href="/dashboard" className="min-w-0" onClick={() => setIsOpen(false)}>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-100">
            DG Academy
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-white">
            Training Production Factory
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
          <div className="space-y-1">
            {items.map((item) => {
              const Icon = icons[item.label] ?? Sparkles;
              const isActive = activeHref === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-teal-300/15 text-teal-50"
                      : "text-slate-300 hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ) : null}
      </nav>

      <div className="border-t border-white/10 p-3">
        <AccountButton isAuthenticated={isAuthenticated} className="w-full justify-start" />
      </div>
    </>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-[#081525]/95 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-100">
            DG Academy
          </div>
          <div className="truncate text-sm font-semibold text-white">Training Production Factory</div>
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

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-[#081525] lg:flex">
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
          <aside className="relative flex h-full w-[min(280px,86vw)] flex-col border-r border-white/10 bg-[#081525] shadow-2xl">
            {navigation}
          </aside>
        </div>
      ) : null}
    </>
  );
}
